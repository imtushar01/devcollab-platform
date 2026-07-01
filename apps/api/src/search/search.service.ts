import { Inject, Injectable, Logger } from '@nestjs/common';
import { Pool } from 'pg';
import Redis from 'ioredis';
import { PG_POOL, REDIS_CLIENT } from '../database/database.module';
import { tokenize, computeTermFrequencies } from './tokenizer';
import { CacheService } from '../cache/cache.service';
import { CacheKeys } from '../cache/cache-keys';

const INDEX_PREFIX = 'search:index';
const DOC_COUNT_KEY = 'search:doc_count';

export interface SearchResult {
  entityType: string;
  entityId: string;
  title: string;
  metadata: Record<string, any>;
  score: number;
}

@Injectable()
export class SearchService {
  private readonly logger = new Logger(SearchService.name);

  constructor(
    @Inject(PG_POOL) private readonly pool: Pool,
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
  ) {}

  // Index a document — called whenever a repo/org/user is created or updated
  async indexDocument(
    entityType: string,
    entityId: string,
    title: string,
    body: string,
    metadata: Record<string, any> = {},
  ): Promise<void> {
    // 1. Store document in Postgres for retrieval
    await this.pool.query(
      `INSERT INTO search_documents (entity_type, entity_id, title, body, metadata)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (entity_type, entity_id)
       DO UPDATE SET title = $3, body = $4, metadata = $5, indexed_at = now()`,
      [entityType, entityId, title, body, JSON.stringify(metadata)],
    );

    // 2. Tokenize and compute TF
    const tokens = tokenize(`${title} ${title} ${body}`); // title weighted 2x
    const termFreqs = computeTermFrequencies(tokens);

    // 3. Update inverted index in Redis
    // Key: search:index:{term} → sorted set of {entityType:entityId} with TF score
    const docKey = `${entityType}:${entityId}`;
    const pipeline = this.redis.pipeline();

    for (const [term, tf] of termFreqs) {
      const indexKey = `${INDEX_PREFIX}:${term}`;
      pipeline.zadd(indexKey, tf, docKey);
    }

    // 4. Track total document count for IDF calculation
    pipeline.incr(`${DOC_COUNT_KEY}:${entityType}`);
    await pipeline.exec();

    this.logger.log(`Indexed ${entityType}:${entityId} with ${termFreqs.size} unique terms`);
  }

  async search(query: string, entityType?: string, limit = 10): Promise<SearchResult[]> {
    const queryTokens = tokenize(query);
    if (queryTokens.length === 0) return [];

    // Get total document count for IDF
    const countKey = entityType
      ? `${DOC_COUNT_KEY}:${entityType}`
      : `${DOC_COUNT_KEY}:repository`;
    const totalDocs = parseInt((await this.redis.get(countKey)) ?? '1');

    // For each query token, get matching documents and their TF scores
    const docScores = new Map<string, number>();

    for (const token of queryTokens) {
      const indexKey = `${INDEX_PREFIX}:${token}`;

      // Get all docs matching this term with their TF scores
      const matches = await this.redis.zrangebyscore(
        indexKey, '-inf', '+inf', 'WITHSCORES',
      );

      // matches = [docKey, score, docKey, score, ...]
      for (let i = 0; i < matches.length; i += 2) {
        const docKey = matches[i];
        const tf = parseFloat(matches[i + 1]);

        // Filter by entity type if specified
        if (entityType && !docKey.startsWith(`${entityType}:`)) continue;

        // Get document frequency for IDF
        const docsWithTerm = await this.redis.zcard(indexKey);
        const idf = Math.log(totalDocs / (docsWithTerm + 1));

        // TF-IDF score
        const tfidf = tf * idf;
        docScores.set(docKey, (docScores.get(docKey) ?? 0) + tfidf);
      }
    }

    if (docScores.size === 0) return [];

    // Sort by score descending
    const ranked = Array.from(docScores.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit);

    // Fetch document metadata from Postgres
    const results: SearchResult[] = [];
    for (const [docKey, score] of ranked) {
      const [type, id] = docKey.split(':');
      const result = await this.pool.query(
        `SELECT * FROM search_documents WHERE entity_type = $1 AND entity_id = $2`,
        [type, id],
      );
      if (result.rows[0]) {
        results.push({
          entityType: type,
          entityId: id,
          title: result.rows[0].title,
          metadata: result.rows[0].metadata,
          score: Math.round(score * 1000) / 1000,
        });
      }
    }

    return results;
  }

  // Re-index all existing repositories — run once on startup or via admin endpoint
  async reindexRepositories(): Promise<void> {
    const result = await this.pool.query(
      `SELECT r.*, o.handle as org_handle, o.display_name as org_name
       FROM repositories r JOIN organizations o ON o.id = r.org_id
       WHERE r.visibility = 'public'`,
    );

    for (const repo of result.rows) {
      await this.indexDocument(
        'repository',
        repo.id,
        repo.name,
        `${repo.description ?? ''} ${repo.org_name} ${repo.org_handle}`,
        {
          orgHandle: repo.org_handle,
          repoName: repo.name,
          visibility: repo.visibility,
        },
      );
    }

    this.logger.log(`Reindexed ${result.rows.length} repositories`);
  }
}
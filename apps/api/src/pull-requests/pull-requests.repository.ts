import { Inject, Injectable } from '@nestjs/common';
import { Pool } from 'pg';
import { PG_POOL } from '../database/database.module';

@Injectable()
export class PullRequestsRepository {
  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  async create(
    repoId: string,
    authorId: string,
    title: string,
    description: string | undefined,
    sourceBranch: string,
    targetBranch: string,
    status: string,
  ) {
    const result = await this.pool.query(
      `INSERT INTO pull_requests (repo_id, author_id, title, description, source_branch, target_branch, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [repoId, authorId, title, description ?? null, sourceBranch, targetBranch, status],
    );
    return result.rows[0];
  }

  async findById(id: string) {
    const result = await this.pool.query(
      `SELECT pr.*, 
        u.email as author_email,
        r.name as repo_name,
        o.id as org_id,
        o.handle as org_handle
       FROM pull_requests pr
       JOIN users u ON u.id = pr.author_id
       JOIN repositories r ON r.id = pr.repo_id
       JOIN organizations o ON o.id = r.org_id
       WHERE pr.id = $1`,
      [id],
    );
    return result.rows[0] ?? null;
  }

  async findByRepo(repoId: string, status?: string) {
    const query = status
      ? `SELECT pr.*, u.email as author_email FROM pull_requests pr
         JOIN users u ON u.id = pr.author_id
         WHERE pr.repo_id = $1 AND pr.status = $2 ORDER BY pr.created_at DESC`
      : `SELECT pr.*, u.email as author_email FROM pull_requests pr
         JOIN users u ON u.id = pr.author_id
         WHERE pr.repo_id = $1 ORDER BY pr.created_at DESC`;

    const params = status ? [repoId, status] : [repoId];
    const result = await this.pool.query(query, params);
    return result.rows;
  }

  async updateStatus(id: string, status: string, extra: Record<string, any> = {}) {
    const extraFields = Object.keys(extra)
      .map((key, i) => `${key} = $${i + 3}`)
      .join(', ');

    const query = extraFields
      ? `UPDATE pull_requests SET status = $2, updated_at = now(), ${extraFields} WHERE id = $1 RETURNING *`
      : `UPDATE pull_requests SET status = $2, updated_at = now() WHERE id = $1 RETURNING *`;

    const params = [id, status, ...Object.values(extra)];
    const result = await this.pool.query(query, params);
    return result.rows[0];
  }

  async upsertReview(prId: string, reviewerId: string, status: string, body?: string) {
    const result = await this.pool.query(
      `INSERT INTO pr_reviews (pr_id, reviewer_id, status, body)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (pr_id, reviewer_id)
       DO UPDATE SET status = EXCLUDED.status, body = EXCLUDED.body, updated_at = now()
       RETURNING *`,
      [prId, reviewerId, status, body ?? null],
    );
    return result.rows[0];
  }

  async getReviews(prId: string) {
    const result = await this.pool.query(
      `SELECT pr.*, u.email as reviewer_email FROM pr_reviews pr
       JOIN users u ON u.id = pr.reviewer_id
       WHERE pr.pr_id = $1`,
      [prId],
    );
    return result.rows;
  }

  async addComment(prId: string, authorId: string, body: string, filePath?: string, lineNumber?: number) {
    const result = await this.pool.query(
      `INSERT INTO pr_comments (pr_id, author_id, body, file_path, line_number)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [prId, authorId, body, filePath ?? null, lineNumber ?? null],
    );
    return result.rows[0];
  }

  async getComments(prId: string) {
    const result = await this.pool.query(
      `SELECT c.*, u.email as author_email FROM pr_comments c
       JOIN users u ON u.id = c.author_id
       WHERE c.pr_id = $1 ORDER BY c.created_at ASC`,
      [prId],
    );
    return result.rows;
  }
}
import { Inject, Injectable } from '@nestjs/common';
import { Pool } from 'pg';
import { PG_POOL } from '../database/database.module';

@Injectable()
export class IssuesRepository {
  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  async create(
    repoId: string,
    authorId: string,
    title: string,
    description: string | undefined,
    assigneeId: string | undefined,
  ) {
    const result = await this.pool.query(
      `INSERT INTO issues (repo_id, author_id, title, description, assignee_id)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [repoId, authorId, title, description ?? null, assigneeId ?? null],
    );
    return result.rows[0];
  }

  async findById(id: string) {
    const result = await this.pool.query(
      `SELECT i.*, 
        u.email as author_email,
        a.email as assignee_email,
        r.name as repo_name,
        o.handle as org_handle,
        o.id as org_id
       FROM issues i
       JOIN users u ON u.id = i.author_id
       LEFT JOIN users a ON a.id = i.assignee_id
       JOIN repositories r ON r.id = i.repo_id
       JOIN organizations o ON o.id = r.org_id
       WHERE i.id = $1`,
      [id],
    );
    return result.rows[0] ?? null;
  }

  async findByRepo(repoId: string, status?: string) {
    const query = status
      ? `SELECT i.*, u.email as author_email, a.email as assignee_email
         FROM issues i
         JOIN users u ON u.id = i.author_id
         LEFT JOIN users a ON a.id = i.assignee_id
         WHERE i.repo_id = $1 AND i.status = $2
         ORDER BY i.created_at DESC`
      : `SELECT i.*, u.email as author_email, a.email as assignee_email
         FROM issues i
         JOIN users u ON u.id = i.author_id
         LEFT JOIN users a ON a.id = i.assignee_id
         WHERE i.repo_id = $1
         ORDER BY i.created_at DESC`;

    const result = await this.pool.query(query, status ? [repoId, status] : [repoId]);
    return result.rows;
  }

  async updateStatus(id: string, status: string) {
    const extra = status === 'closed' ? `, closed_at = now()` : `, closed_at = NULL`;
    const result = await this.pool.query(
      `UPDATE issues SET status = $2, updated_at = now()${extra} WHERE id = $1 RETURNING *`,
      [id, status],
    );
    return result.rows[0];
  }

  async addComment(issueId: string, authorId: string, body: string) {
    const result = await this.pool.query(
      `INSERT INTO issue_comments (issue_id, author_id, body) VALUES ($1, $2, $3) RETURNING *`,
      [issueId, authorId, body],
    );
    return result.rows[0];
  }

  async getComments(issueId: string) {
    const result = await this.pool.query(
      `SELECT c.*, u.email as author_email FROM issue_comments c
       JOIN users u ON u.id = c.author_id
       WHERE c.issue_id = $1 ORDER BY c.created_at ASC`,
      [issueId],
    );
    return result.rows;
  }
}
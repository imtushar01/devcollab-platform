import { Inject, Injectable } from '@nestjs/common';
import { Pool } from 'pg';
import { PG_POOL } from '../database/database.module';

@Injectable()
export class RepositoriesRepository {
  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  async create(orgId: string, name: string, description: string | undefined, visibility: string) {
    const result = await this.pool.query(
      `INSERT INTO repositories (org_id, name, description, visibility)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [orgId, name, description ?? null, visibility],
    );
    return result.rows[0];
  }

  async findByOrgAndName(orgHandle: string, repoName: string) {
    const result = await this.pool.query(
      `SELECT r.*, o.handle as org_handle, o.display_name as org_display_name
       FROM repositories r
       JOIN organizations o ON o.id = r.org_id
       WHERE o.handle = $1 AND r.name = $2`,
      [orgHandle, repoName],
    );
    return result.rows[0] ?? null;
  }

  async findByOrg(orgId: string) {
    const result = await this.pool.query(
      `SELECT * FROM repositories WHERE org_id = $1 ORDER BY created_at DESC`,
      [orgId],
    );
    return result.rows;
  }

  async findById(id: string) {
    const result = await this.pool.query(`SELECT * FROM repositories WHERE id = $1`, [id]);
    return result.rows[0] ?? null;
  }
}
import { Inject, Injectable } from '@nestjs/common';
import { Pool } from 'pg';
import { PG_POOL } from '../database/database.module';

@Injectable()
export class OrganizationsRepository {
  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  async create(handle: string, displayName: string, description: string | undefined, ownerId: string) {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      const orgResult = await client.query(
        `INSERT INTO organizations (handle, display_name, description, owner_id)
         VALUES ($1, $2, $3, $4) RETURNING *`,
        [handle, displayName, description ?? null, ownerId],
      );
      const org = orgResult.rows[0];

      await client.query(
        `INSERT INTO org_members (org_id, user_id, role) VALUES ($1, $2, 'owner')`,
        [org.id, ownerId],
      );

      await client.query('COMMIT');
      return org;
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  async findByHandle(handle: string) {
    const result = await this.pool.query(
      `SELECT o.*, 
        (SELECT COUNT(*) FROM org_members WHERE org_id = o.id) as member_count,
        (SELECT COUNT(*) FROM repositories WHERE org_id = o.id) as repo_count
       FROM organizations o WHERE o.handle = $1`,
      [handle],
    );
    return result.rows[0] ?? null;
  }

  async findUserOrgs(userId: string) {
    const result = await this.pool.query(
      `SELECT o.*, om.role as member_role
       FROM organizations o
       JOIN org_members om ON om.org_id = o.id
       WHERE om.user_id = $1
       ORDER BY o.created_at DESC`,
      [userId],
    );
    return result.rows;
  }

  async getMembership(orgId: string, userId: string) {
    const result = await this.pool.query(
      `SELECT * FROM org_members WHERE org_id = $1 AND user_id = $2`,
      [orgId, userId],
    );
    return result.rows[0] ?? null;
  }

  async findById(id: string) {
    const result = await this.pool.query(`SELECT * FROM organizations WHERE id = $1`, [id]);
    return result.rows[0] ?? null;
  }
}
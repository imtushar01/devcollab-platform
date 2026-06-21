import { Inject, Injectable } from '@nestjs/common';
import { Pool } from 'pg';
import { PG_POOL } from '../database/database.module';

@Injectable()
export class NotificationsRepository {
  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  async create(userId: string, type: string, payload: Record<string, any>) {
    const result = await this.pool.query(
      `INSERT INTO notifications (user_id, type, payload) VALUES ($1, $2, $3) RETURNING *`,
      [userId, type, JSON.stringify(payload)],
    );
    return result.rows[0];
  }

  async findForUser(userId: string, unreadOnly = false) {
    const query = unreadOnly
      ? `SELECT * FROM notifications WHERE user_id = $1 AND read = FALSE ORDER BY created_at DESC LIMIT 50`
      : `SELECT * FROM notifications WHERE user_id = $1 ORDER BY created_at DESC LIMIT 50`;
    const result = await this.pool.query(query, [userId]);
    return result.rows;
  }

  async markAllRead(userId: string) {
    await this.pool.query(
      `UPDATE notifications SET read = TRUE WHERE user_id = $1 AND read = FALSE`,
      [userId],
    );
  }

  async markRead(id: string, userId: string) {
    await this.pool.query(
      `UPDATE notifications SET read = TRUE WHERE id = $1 AND user_id = $2`,
      [id, userId],
    );
  }
}
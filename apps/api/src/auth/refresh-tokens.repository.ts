import { Inject, Injectable } from '@nestjs/common';
import { Pool } from 'pg';
import { PG_POOL } from '../database/database.module';

@Injectable()
export class RefreshTokensRepository {
  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  async create(userId: string, tokenHash: string, familyId: string, expiresAt: Date) {
    await this.pool.query(
      `INSERT INTO refresh_tokens (user_id, token_hash, family_id, expires_at) VALUES ($1, $2, $3, $4)`,
      [userId, tokenHash, familyId, expiresAt],
    );
  }

  async findValidByHash(tokenHash: string) {
    const result = await this.pool.query(
      `SELECT * FROM refresh_tokens WHERE token_hash = $1 AND revoked = false AND expires_at > now()`,
      [tokenHash],
    );
    return result.rows[0] ?? null;
  }

  async revoke(id: string) {
    await this.pool.query(`UPDATE refresh_tokens SET revoked = true WHERE id = $1`, [id]);
  }
}
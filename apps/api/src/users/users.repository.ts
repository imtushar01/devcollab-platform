import { Inject, Injectable } from '@nestjs/common';
import { Pool } from 'pg';
import { PG_POOL } from '../database/database.module';
import { User } from './user.entity';

@Injectable()
export class UsersRepository {
  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  async findByEmail(email: string): Promise<User | null> {
    const result = await this.pool.query<User>('SELECT * FROM users WHERE email = $1', [email]);
    return result.rows[0] ?? null;
  }

  async findById(id: string): Promise<User | null> {
    const result = await this.pool.query<User>('SELECT * FROM users WHERE id = $1', [id]);
    return result.rows[0] ?? null;
  }

  async create(email: string, passwordHash: string): Promise<User> {
    const result = await this.pool.query<User>(
      `INSERT INTO users (email, password_hash) VALUES ($1, $2) RETURNING *`,
      [email, passwordHash],
    );
    return result.rows[0];
  }
}
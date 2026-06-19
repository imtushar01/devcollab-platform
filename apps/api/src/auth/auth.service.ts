import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import * as argon2 from 'argon2';
import * as crypto from 'crypto';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import { RefreshTokensRepository } from './refresh-tokens.repository';

const REFRESH_TOKEN_TTL_DAYS = 7;

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly refreshTokensRepository: RefreshTokensRepository,
  ) {}

  async register(email: string, password: string) {
    const existing = await this.usersService.findByEmail(email);
    if (existing) throw new ConflictException('Email already registered');

    const passwordHash = await argon2.hash(password, { type: argon2.argon2id });
    const user = await this.usersService.create(email, passwordHash);
    return this.issueTokens(user.id);
  }

  async login(email: string, password: string) {
    const user = await this.usersService.findByEmail(email);
    if (!user) {
      await argon2.hash(password, { type: argon2.argon2id }); // burn comparable time either way
      throw new UnauthorizedException('Invalid credentials');
    }
    const valid = await argon2.verify(user.password_hash, password);
    if (!valid) throw new UnauthorizedException('Invalid credentials');
    return this.issueTokens(user.id);
  }

  async refresh(rawRefreshToken: string) {
    if (!rawRefreshToken) throw new UnauthorizedException('Missing refresh token');
    const tokenHash = this.hashToken(rawRefreshToken);
    const existing = await this.refreshTokensRepository.findValidByHash(tokenHash);
    if (!existing) throw new UnauthorizedException('Invalid or expired refresh token');

    await this.refreshTokensRepository.revoke(existing.id); // single-use rotation
    return this.issueTokens(existing.user_id, existing.family_id);
  }

  private async issueTokens(userId: string, familyId: string = crypto.randomUUID()) {
    const accessToken = this.jwtService.sign({ sub: userId });

    const rawRefreshToken = crypto.randomBytes(48).toString('hex');
    const tokenHash = this.hashToken(rawRefreshToken);
    const expiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000);

    await this.refreshTokensRepository.create(userId, tokenHash, familyId, expiresAt);
    return { accessToken, refreshToken: rawRefreshToken };
  }

  private hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }
}
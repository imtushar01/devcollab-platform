import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

const JWT_ACCESS_SECRET = process.env.JWT_ACCESS_SECRET as string;
if (!JWT_ACCESS_SECRET) {
  throw new Error('JWT_ACCESS_SECRET is not set — check your .env file');
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: JWT_ACCESS_SECRET,
    });
  }
  async validate(payload: { sub: string }) {
    return { userId: payload.sub };
  }
}
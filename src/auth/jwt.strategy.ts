import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service.js';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private configService: ConfigService,
    private authService: AuthService
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET', 'default_secret_key'), // ✅ Provide fallback
    });
  }

  async validate(payload: any) {
    console.log('✅ JWT Strategy Validate:', payload); // ✅ Debug log

    if (!payload.sub) {
      throw new UnauthorizedException('Invalid token: Missing subject');
    }

    return { id: payload.sub, email: payload.email, role: payload.role };
  }
}

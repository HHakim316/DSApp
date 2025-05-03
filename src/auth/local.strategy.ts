import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-local';
import { AuthService } from './auth.service.js';
import { Request } from 'express';

@Injectable()
export class LocalStrategy extends PassportStrategy(Strategy) {
  constructor(private authService: AuthService) {
    super({
       // WARNING: Frontend sends 'email' field but we process as emailOrPhone
      usernameField: 'emailOrPhone',
      passwordField: 'password',
      passReqToCallback: true // Enables request access in validate()
    });
    console.log('🔥 LocalStrategy initialized with email/phone support');
  }

  async validate(
    req: Request,
    emailOrPhone: string, 
    password: string
  ): Promise<any> {
    console.log('🔑 Authentication attempt for:', emailOrPhone);

    // Determine if input is email or phone
    const isEmail = emailOrPhone.includes('@');
    let user;

    try {
      if (isEmail) {
        console.log('📧 Attempting email login');
        user = await this.authService.validateUser(emailOrPhone, '', password);
      } else {
        console.log('📱 Attempting phone login');
        user = await this.authService.validateUser('', emailOrPhone, password);
      }

      if (!user) {
        console.log('❌ No user found or password mismatch');
        throw new UnauthorizedException('Invalid credentials');
      }

      console.log('✅ Successfully authenticated user:', {
        id: user.id,
        email: user.email,
        role: user.role
      });

      return user;
    } catch (error) {
      console.error('⚠️ Authentication error:', error.message);
      throw new UnauthorizedException('Login failed');
    }
  }
}
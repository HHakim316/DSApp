import { Injectable, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  canActivate(context: ExecutionContext) {
    console.log('✅ JwtAuthGuard triggered'); // Log when the guard is triggered

    const request = context.switchToHttp().getRequest();
    console.log('🔐 Auth Header:', request.headers.authorization); // 👈 New log
    console.log('🔍 Headers Received:', request.headers); // ✅ Moved this below the request declaration
    console.log('🔍 Headers Received:', request.headers);
    const authHeader = request.headers.authorization;

    if (!authHeader) {
      console.error('🚨 No Authorization Header Found');
      throw new UnauthorizedException('Authorization header missing');
    }

    if (!authHeader.startsWith('Bearer ')) {
      console.error('🚨 Invalid Authorization Header Format:', authHeader);
      throw new UnauthorizedException('Invalid authorization header format');
    }

    const token = authHeader.split(' ')[1];
    console.log('🔑 Extracted Token:', token);

    return super.canActivate(context);
  }
}

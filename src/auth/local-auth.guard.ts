import { Injectable, ExecutionContext } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Request } from 'express';

@Injectable()
export class LocalAuthGuard extends AuthGuard('local') {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    console.log('🔐 STEP 1: LocalAuthGuard activated');

    const request = context.switchToHttp().getRequest<Request>();
    console.log('📦 Request body:', request.body);

    try {
      

      const result = await super.canActivate(context);
      console.log('✅ Auth result:', result);
      return result as boolean;
    } catch (error) {
      console.error('❌ Auth error:', error);
      throw error;
    }
  }
}

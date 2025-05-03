import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserRole } from '../users/enums/roles.enum.js';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    console.log('RolesGuard triggered'); // 👈 Log when the guard is triggered

    const requiredRoles = this.reflector.get<UserRole[]>('roles', context.getHandler());
    if (!requiredRoles) {
      return true; // No roles required, allow access
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      console.log('❌ Access denied: No user found');
      throw new ForbiddenException('Access denied: You are not logged in');
    }

    console.log('User:', user); // 👈 Log the user object
    console.log('Required Roles:', requiredRoles); // 👈 Log the required roles

    const hasRole = requiredRoles.includes(user.role);
    if (!hasRole) {
      console.log(`❌ Access denied: User role "${user.role}" does not match required roles`);
      throw new ForbiddenException('Access denied: Insufficient permissions');
    }

    return true;
  }
}

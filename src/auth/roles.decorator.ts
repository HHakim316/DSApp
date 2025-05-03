import { SetMetadata } from '@nestjs/common';
import { UserRole } from '../users/enums/roles.enum.js';

export const Roles = (...roles: UserRole[]) => SetMetadata('roles', roles);
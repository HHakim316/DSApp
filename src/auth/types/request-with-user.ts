import { Request } from 'express';
import { User } from '../../users/entities/user.entity.js';

export interface RequestWithUser extends Request {
  user: User;
}
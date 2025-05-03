// src/auth/dto/login.dto.ts

import { IsString } from 'class-validator';

export class LoginDto {
  @IsString()
  emailOrPhone: string; // This will accept either email or phone number for login

  @IsString()
  password: string; // Password field
}

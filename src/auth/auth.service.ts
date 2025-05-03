import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service.js';
import * as bcrypt from 'bcrypt';
import { User } from '../users/entities/user.entity.js';
import { UserRole } from '../users/enums/roles.enum.js';
import { CreateUserDto } from '../users/dto/create-user.dto.js';
import { LogsService } from '../logs/logs.service.js';
import { LogType } from '../logs/entities/log.entity.js';

@Injectable()
export class AuthService {
  constructor(
    private readonly logsService: LogsService, // ✅ Logging system added
    private usersService: UsersService,
    private jwtService: JwtService,
  ) {}

  // ✅ Register a new user
  async register(createUserDto: CreateUserDto, requestingUser?: User) {
    const { name, email, password, role = UserRole.CUSTOMER, phoneNumber } = createUserDto;

    // 🔥 Only admins can create admin users
    if (role === UserRole.ADMIN) {
      if (!requestingUser || requestingUser.role !== UserRole.ADMIN) {
        throw new UnauthorizedException('Only admins can create admin users');
      }
    }

    // 🔒 Hash the password before storing
    const hashedPassword = await bcrypt.hash(password, 10);

    // ✅ Create the user
    const newUser = await this.usersService.create({ 
      name, 
      email, 
      password: hashedPassword, 
      role, 
      phoneNumber 
    });

    // 📝 Log the user registration
    await this.logsService.log(LogType.USER_REGISTERED, `User ${newUser.email} registered`, newUser.id);

    return newUser;
  }

  // ✅ Validate user credentials (Login Process)
  async validateUser(email: string, phoneNumber: string, password: string): Promise<any> {
    console.log(`validateUser() called with: email=${email}, phone=${phoneNumber}`); // ✅ Corrected
    let user: User | null = null;

    if (email) {
      console.log('🔍 Searching user by email...');
      user = await this.usersService.findOne(email);
    } else if (phoneNumber) {
      console.log('🔍 Searching user by phone number...');
      user = await this.usersService.findOneByPhoneNumber(phoneNumber);
    }

    if (!user) {
      console.log('🔴 No user found');
      return null;
    }

    // 🔑 Compare passwords
    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      console.log('✅ User found:', user);
      return null;
    }

    // ✅ Remove password from the returned object
    const { password: _, ...result } = user;
    return result;
  }

  // ✅ Login a user and generate JWT token
  async login(user: User) {
    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };

    // 📝 Log the user login
    await this.logsService.log(LogType.USER_LOGGED_IN, `User ${user.email} logged in`, user.id);

    return {
      access_token: this.jwtService.sign(payload),
      user: { id: user.id, email: user.email, role: user.role },
    };
  }

  // ✅ Logout a user (optional - frontend handles it usually)
  async logout(userId: string) {
    // 📝 Log the user logout
    await this.logsService.log(LogType.USER_LOGGED_OUT, `User ID ${userId} logged out`, userId);
    return { message: 'Logged out successfully' };
  }
  
}

import { Controller, Post, Body, Request, UseGuards, Get } from '@nestjs/common';
import { AuthService } from './auth.service.js';
import { LocalAuthGuard } from './local-auth.guard.js';
import { JwtAuthGuard } from './jwt-auth.guard.js';
import { Roles } from './roles.decorator.js';
import { RolesGuard } from './roles.guard.js';
import { UserRole } from '../users/enums/roles.enum.js';
import { ApiBody, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { RequestWithUser } from './types/request-with-user.js';
import { CreateUserDto } from '../users/dto/create-user.dto.js';
import { UnauthorizedException, Logger } from '@nestjs/common';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  private readonly logger = new Logger(AuthController.name);
  constructor(private authService: AuthService) {}

  @Post('register')
  @ApiOperation({ summary: 'Register a new user' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        name: { type: 'string', example: 'Hossam AbdELHakim' },
        email: { type: 'string', example: 'test@example.com' },
        password: { type: 'string', example: 'Secure123!' },
        role: { type: 'string', enum: ['ADMIN', 'CUSTOMER', 'SALES', 'STORE_MANAGER'], example: 'CUSTOMER' },
        phoneNumber: { type: 'string', example: '123456789' }
      },
      required: ['name', 'email', 'password', 'role', 'phoneNumber'],
    },
  })
  @ApiResponse({ status: 201, description: 'User registered successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  async register(@Body() createUserDto: CreateUserDto) {
    return this.authService.register(createUserDto);
  }

  
  @Post('login')
  @UseGuards(LocalAuthGuard)
  @ApiOperation({ summary: 'Login with email or phone number and password' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        email: { type: 'string', example: 'test@example.com' },
        phoneNumber: { type: 'string', example: '123456789' },
        password: { type: 'string', example: 'Secure123!' },
      },
      required: ['password'],
    },
  })
  @ApiResponse({ status: 200, description: 'Login successful' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async login(@Request() req: RequestWithUser) {
    console.log('🏁 Login successful for:', req.user);
    if (!req.user) {
      throw new UnauthorizedException('Invalid email or password');
    }
    return this.authService.login(req.user);
  }

  // ✅ Role-based routes
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Get('admin')
  async adminRoute() {
    return 'This is an admin-only route!';
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SALES)
  @Get('sales')
  async salesRoute() {
    return 'This is a sales-only route!';
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.STORE_MANAGER)
  @Get('store-manager')
  async storeManagerRoute() {
    return 'This is a store manager-only route!';
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.CUSTOMER)
  @Get('customer')
  async customerRoute() {
    return 'This is a customer-only route!';
  }
}

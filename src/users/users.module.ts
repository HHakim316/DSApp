import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './entities/user.entity.js';
import { UsersService } from './users.service.js';
import { UsersController } from './users.controller.js';
import { OrdersModule } from '../orders/orders.module.js'; // ✅ Import OrdersModule with forwardRef

@Module({
  imports: [TypeOrmModule.forFeature([User]), forwardRef(() => OrdersModule)], // ✅ Fix circular dependency
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}

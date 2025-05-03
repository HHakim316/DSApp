import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Order } from './entities/order.entity.js';
import { OrderItem } from './entities/order-item.entity.js';
import { OrdersService } from './orders.service.js';
import { OrdersController } from './orders.controller.js';
import { UsersModule } from '../users/users.module.js';
import { Product } from '../products/entities/product.entity.js';
import { User } from '../users/entities/user.entity.js';
import { LogsModule } from '../logs/logs.module.js'; // ✅ Import LogsModule


@Module({
  imports: [
    TypeOrmModule.forFeature([Order, OrderItem, Product, User]),
    forwardRef(() => UsersModule),
    forwardRef(() => LogsModule), // Use forwardRef to avoid circular dependency
    LogsModule,
  ],
  providers: [OrdersService,],
  controllers: [OrdersController],
  exports: [OrdersService],
})
export class OrdersModule {}

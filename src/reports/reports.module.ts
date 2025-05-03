import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ReportsService } from './reports.service.js';
import { ReportsController } from './reports.controller.js';
import { Product } from '../products/entities/product.entity.js';
import { Order } from '../orders/entities/order.entity.js';

@Module({
  imports: [TypeOrmModule.forFeature([Product, Order])],
  controllers: [ReportsController],
  providers: [ReportsService],
})
export class ReportsModule {}

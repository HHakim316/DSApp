import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Product } from './entities/product.entity.js';
import { ProductsService } from './products.service.js';
import { ProductsController } from './products.controller.js';
import { Category } from '../categories/entities/category.entity.js'; // 👈 Add this

@Module({
  imports: [TypeOrmModule.forFeature([Product, Category])],
  providers: [ProductsService],
  controllers: [ProductsController],
  exports: [TypeOrmModule.forFeature([Product])],
})
export class ProductsModule {}
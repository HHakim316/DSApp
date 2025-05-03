import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Product } from '../products/entities/product.entity.js';
import { Order } from '../orders/entities/order.entity.js';

@Injectable()
export class ReportsService {
  constructor(
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,
  ) {}

  // 📦 Inventory Report - Lists all products with stock levels
  async getInventoryReport() {
    return this.productRepository.find({
      select: ['id', 'name', 'stock'],
    });
  }

  // 💰 Sales Report - Shows total sales & best-selling products
  async getSalesReport() {
    const totalSales = await this.orderRepository.count();
    const totalRevenue = await this.orderRepository
      .createQueryBuilder('order')
      .select('SUM(order.totalPrice)', 'totalRevenue')
      .getRawOne();

    return {
      totalSales,
      totalRevenue: totalRevenue.totalRevenue || 0,
    };
  }
}

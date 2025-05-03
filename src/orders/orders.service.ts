import { 
  Injectable, 
  ForbiddenException, 
  BadRequestException, 
  NotFoundException 
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Order } from './entities/order.entity.js';
import { OrderItem } from './entities/order-item.entity.js';
import { CreateOrderDto } from './dto/create-order.dto.js';
import { User } from '../users/entities/user.entity.js';
import { Product } from '../products/entities/product.entity.js';
import { OrderStatus } from './entities/order.entity.js';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto.js';
import { RequestReturnDto } from './dto/request-return.dto.js';
import dayjs from 'dayjs';
import { LogsService } from '../logs/logs.service.js';
import { LogType } from '../logs/entities/log.entity.js';

@Injectable()
export class OrdersService {
  constructor(
    private readonly logsService: LogsService, // Logging system ✅

    @InjectRepository(Order)
    private ordersRepository: Repository<Order>,

    @InjectRepository(OrderItem)
    private orderItemsRepository: Repository<OrderItem>,

    @InjectRepository(User)
    private usersRepository: Repository<User>,

    @InjectRepository(Product)
    private productsRepository: Repository<Product>,
  ) {}

  // ✅ Create Order
  async createOrder(userId: string, createOrderDto: CreateOrderDto) {
    const user = await this.usersRepository.findOne({ where: { id: userId } });
    if (!user) throw new ForbiddenException('User not found');

    const { products } = createOrderDto;
    const productIds = products.map(p => p.id);
    const productEntities = await this.productsRepository.find({ where: { id: In(productIds) } });

    if (productEntities.length !== products.length) {
      throw new ForbiddenException('Some products are invalid or not found');
    }

    let totalPrice = 0;
    const orderItems: OrderItem[] = [];

    const order = this.ordersRepository.create({
      totalPrice: 0,
      customer: user,
      status: OrderStatus.PENDING,
      createdAt: new Date(),
    });

    const savedOrder = await this.ordersRepository.save(order);

    for (const product of productEntities) {
      const quantity = products.find(p => p.id === product.id)?.quantity || 1;
      const subtotal = product.price * quantity;
      totalPrice += subtotal;

      const orderItem = this.orderItemsRepository.create({
        order: savedOrder,
        product,
        quantity,
        price: product.price,
        subtotal,
      });

      await this.orderItemsRepository.save(orderItem);
      orderItems.push(orderItem);
    }

    savedOrder.totalPrice = totalPrice;
    savedOrder.items = orderItems;

    // ✅ Log order creation
    await this.logsService.log(LogType.ORDER_CREATED, `Order #${savedOrder.id} created`, userId);

    return this.ordersRepository.save(savedOrder);
  }

  // ✅ Get Orders with Pagination & Filtering
  async getOrders(userId: string, userRole: string, filters: any, page = 1, limit = 10, sort = 'desc') {
    const query = this.ordersRepository.createQueryBuilder('order')
      .leftJoinAndSelect('order.customer', 'customer')
      .leftJoinAndSelect('order.items', 'items')
      .leftJoinAndSelect('items.product', 'product');

    if (userRole !== 'admin' && userRole !== 'store_manager') {
      query.andWhere('customer.id = :userId', { userId });
    }

    if (filters?.status) {
      query.andWhere('order.status = :status', { status: filters.status });
    }

    if (filters?.dateFrom && filters?.dateTo) {
      query.andWhere('order.createdAt BETWEEN :dateFrom AND :dateTo', {
        dateFrom: filters.dateFrom,
        dateTo: filters.dateTo,
      });
    }

    const totalCount = await query.getCount();
    const orders = await query
      .orderBy('order.createdAt', sort.toUpperCase() === 'ASC' ? 'ASC' : 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .getMany();

    return { totalCount, orders };
  }

  // ✅ Update Order Status
  async updateOrderStatus(orderId: string, updateOrderStatusDto: UpdateOrderStatusDto, userRole: string) {
    if (userRole !== 'admin' && userRole !== 'store_manager') {
      throw new ForbiddenException('You do not have permission to update order status');
    }

    const order = await this.ordersRepository.findOne({ where: { id: orderId } });
    if (!order) throw new NotFoundException('Order not found');

    order.status = updateOrderStatusDto.status;
    
    // ✅ Log status update
    await this.logsService.log(order.customer.id, LogType.ORDER_STATUS_UPDATED, `Order #${orderId} status updated to ${order.status}`);

    return this.ordersRepository.save(order);
  }

  // ✅ Request Order Return (Within 14 Days)
  async requestReturn(userId: string, orderId: string, requestReturnDto: RequestReturnDto) {
    const order = await this.ordersRepository.findOne({ where: { id: orderId }, relations: ['customer'] });
    if (!order) throw new NotFoundException('Order not found');

    if (order.customer.id !== userId) {
      throw new ForbiddenException('You can only request a return for your own orders');
    }

    const receivedDate = dayjs(order.createdAt);
    const currentDate = dayjs();
    if (currentDate.diff(receivedDate, 'day') > 14) {
      throw new BadRequestException('Return request denied: 14-day return period has expired');
    }

    order.status = OrderStatus.RETURN_REQUESTED;

    // ✅ Log return request
    await this.logsService.log(LogType.ORDER_RETURN_REQUESTED, `Return requested for Order #${orderId}`, userId);

    return this.ordersRepository.save(order);
  }
}

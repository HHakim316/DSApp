import { Controller, Get, Post, Put, Body, Request, UseGuards, Query, Param } from '@nestjs/common';
import { OrdersService } from './orders.service.js';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { CreateOrderDto } from './dto/create-order.dto.js';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto.js';
import { RequestReturnDto } from './dto/request-return.dto.js';
import { Request as ExpressRequest } from 'express';

interface AuthenticatedRequest extends ExpressRequest {
  user: { id: string; role: string };
}

@Controller('orders')
@UseGuards(JwtAuthGuard)
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post()
  async createOrder(@Request() req: AuthenticatedRequest, @Body() createOrderDto: CreateOrderDto) {
    return this.ordersService.createOrder(req.user.id, createOrderDto);
  }

  @Get()
  async getOrders(
    @Request() req: AuthenticatedRequest,
    @Query('status') status?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
    @Query('page') page = '1',
    @Query('limit') limit = '10',
    @Query('sort') sort = 'desc'
  ) {
    const filters: Record<string, any> = {};
    if (status) filters['status'] = status;
    if (dateFrom && dateTo) filters['dateFrom'] = dateFrom, filters['dateTo'] = dateTo;

    return this.ordersService.getOrders(req.user.id, req.user.role, filters, parseInt(page), parseInt(limit), sort);
  }

  @Put(':id/status')
  async updateOrderStatus(
    @Request() req: AuthenticatedRequest,
    @Param('id') orderId: string,
    @Body() updateOrderStatusDto: UpdateOrderStatusDto
  ) {
    return this.ordersService.updateOrderStatus(orderId, updateOrderStatusDto, req.user.role);
  }

  @Post(':id/return')
  async requestReturn(
    @Request() req: AuthenticatedRequest,
    @Param('id') orderId: string,
    @Body() requestReturnDto: RequestReturnDto
  ) {
    return this.ordersService.requestReturn(req.user.id, orderId, requestReturnDto);
  }
}

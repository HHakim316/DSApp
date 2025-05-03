import { Controller, Get } from '@nestjs/common';
import { ReportsService } from './reports.service.js';

@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  // 📦 GET /reports/inventory - Fetch Inventory Report
  @Get('inventory')
  getInventoryReport() {
    return this.reportsService.getInventoryReport();
  }

  // 💰 GET /reports/sales - Fetch Sales Report
  @Get('sales')
  getSalesReport() {
    return this.reportsService.getSalesReport();
  }
}

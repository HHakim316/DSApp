import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller.js';
import { AuthModule } from './auth/auth.module.js';
import { UsersModule } from './users/users.module.js';
import { ProductsModule } from './products/products.module.js';
import { OrdersModule } from './orders/orders.module.js';
import { ReportsModule } from './reports/reports.module.js';
import { LogsModule } from './logs/logs.module.js'; // Import logs module
import { CategoriesModule } from './categories/categories.module.js';

@Module({
  imports: [
    LogsModule,
    OrdersModule,
    CategoriesModule,
    ConfigModule.forRoot({
      envFilePath: '.env', // ✅ Load environment file explicitly
      isGlobal: true,
    }), // ❌ Removed incorrect semicolon
    
    TypeOrmModule.forRoot({
      type: 'mysql',
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '3306'),
      username: process.env.DB_USERNAME || 'root',
      password: process.env.DB_PASSWORD || 'Leader=316??',
      database: process.env.DB_DATABASE || 'DS_db',
      autoLoadEntities: true,
      synchronize: false, // ✅ Keep false for production
    }),

    AuthModule,
    ProductsModule,
    UsersModule,
    ReportsModule,
  ],
  controllers: [AppController],
})
export class AppModule {}

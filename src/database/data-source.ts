import 'reflect-metadata';
import 'dotenv/config';
import { DataSource } from 'typeorm';
import { fileURLToPath } from 'url';
import path from 'path';
import { Product } from '../products/entities/product.entity.js'; // ✅ Product Entity
import { User } from '../users/entities/user.entity.js'; // ✅ User Entity
import { Order } from '../orders/entities/order.entity.js'; // ✅ Order Entity (NEW)
import { OrderItem } from '../orders/entities/order-item.entity.js';
import { Log } from '../logs/entities/log.entity.js';
import { Category } from '../categories/entities/category.entity.js'; // 👈 Explicit import

// Get the directory name using import.meta.url
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const AppDataSource = new DataSource({
  type: 'mysql',
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT) || 3306,
  username: process.env.DB_USERNAME || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_DATABASE || 'dsapp_db',
  entities: [User, Product, Order, OrderItem, Log, Category ], // ✅ Added Order entity
  migrations: [path.join(__dirname, 'migrations', `*.${process.env.NODE_ENV === 'production' ? 'js' : 'ts'}`)], // ✅ Use .js for compiled migrations
  synchronize: false,
  logging: true,
  extra: {
    timeZone: 'UTC' // or your local timezone
  }
});

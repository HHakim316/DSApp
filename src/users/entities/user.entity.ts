import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from 'typeorm';
import { UserRole } from '../enums/roles.enum.js';
import { Order } from '../../orders/entities/order.entity.js';
import { Log } from '../../logs/entities/log.entity.js'; // Import Log entity

@Entity("user")
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255 }) // Name is required
  name: string;

  @Column({ unique: true, type: 'varchar', length: 255 }) // Unique emails
  email: string;

  @Column({ type: 'varchar', length: 255 }) // Secure password storage
  password: string;

  @Column({ type: 'enum', enum: UserRole, default: UserRole.CUSTOMER }) // User role
  role: UserRole;

  @Column({ type: 'varchar', length: 20, nullable: true }) // ✅ Optional for non-customers
  phoneNumber?: string;

  @OneToMany(() => Order, (order) => order.customer) // Relation with orders
  orders: Promise<Order[]>; // 🔹 Change to Promise<Order[]>

  @OneToMany(() => Log, (log) => log.user)
  logs: Log[];
}

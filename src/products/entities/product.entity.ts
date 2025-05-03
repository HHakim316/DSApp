import { Entity, PrimaryGeneratedColumn, Column, OneToMany, ManyToOne, JoinColumn, DeleteDateColumn  } from 'typeorm';
import { OrderItem } from '../../orders/entities/order-item.entity.js';
import { Category } from '../../categories/entities/category.entity.js';

@Entity('products')
export class Product {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column('decimal', { precision: 10, scale: 2 })
  price: number;

  @Column({ type: 'varchar', length: 500 })
  imageUrl: string;

  @Column({ type: 'int', nullable: false }) // 👈 Changed to false
  categoryId: number;

  @Column({ type: 'int' })
  stock: number;

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @DeleteDateColumn({ name: 'deleted_at', type: 'datetime', precision: 6, nullable: true })
  deletedAt: Date | null;

  @ManyToOne(() => Category, category => category.products, {
    onDelete: 'SET NULL' // Prevent delete if products exist
  })
  
  @JoinColumn({ name: 'categoryId' })
  category: Category;

  // Optional: Access order items that include this product
  @OneToMany(() => OrderItem, (orderItem) => orderItem.product)
  orderItems: OrderItem[];
}

import { Entity, PrimaryGeneratedColumn, ManyToOne, Column } from 'typeorm';
import { createRequire } from 'module';
import { Product } from '../../products/entities/product.entity.js';

const require = createRequire(import.meta.url);

@Entity('order_items')
export class OrderItem {
  @PrimaryGeneratedColumn()
  id: number;

  // Using a string-based reference for the Order entity to break the circular dependency.
  @ManyToOne("Order", "items", { onDelete: 'CASCADE', nullable: false })
  order: any; // Type this as 'Order' if desired once resolved

  @ManyToOne(() => Product, { eager: true, nullable: false })
  product: Product;

  // Explicitly define the type as 'int'
  @Column({ type: 'int' })
  quantity: number;

  @Column('decimal', { precision: 10, scale: 2 })
  price: number;

  @Column('decimal', { precision: 10, scale: 2 })
  subtotal: number;
}

import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, OneToMany, Tree, TreeChildren, TreeParent, DeleteDateColumn } from 'typeorm';
import { Product } from '../../products/entities/product.entity.js';

@Entity('categories')
@Tree('materialized-path')
export class Category {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 255, unique: true })
  name: string;

  @Column({ type: 'varchar', length: 10, nullable: true })
  icon: string; // For emoji icons

  @TreeChildren()
  children: Category[];

  @TreeParent({ onDelete: 'SET NULL' }) // Prevent circular delete
  parent: Category | null;

  @Column('simple-array', { nullable: true })
  path: string[]; // For breadcrumbs

  @Column({ nullable: true, type: 'int' }) // 👈 Add explicit type
  parentId: number;

  @DeleteDateColumn({ name: 'deleted_at', type: 'datetime', precision: 6, nullable: true }) // Proper soft delete
  deletedAt: Date | null;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;

  // Relation to products (avoid circular import by using lazy relations)
  @OneToMany(() => Product, product => product.category, { lazy: true })
  products: Promise<Product[]>;
}
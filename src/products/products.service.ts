import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull, In, Not } from 'typeorm';
import { Product } from './entities/product.entity.js';
import { Category } from '../categories/entities/category.entity.js';

@Injectable()
export class ProductsService {
  constructor(
    @InjectRepository(Product)
    private productsRepository: Repository<Product>,

    @InjectRepository(Category)
    private readonly categoriesRepository: Repository<Category>
  ) {}

  async softRemove(id: number): Promise<void> {
    await this.productsRepository.softDelete(id);
  }

  // products.service.ts
   getConnection() {
    return this.productsRepository.manager.connection;
  }

  // ID validation helper
  private validateId(id: any): number {
    const numId = Number(id);
    if (isNaN(numId)) throw new BadRequestException('Invalid ID format');
    return numId;
  }

  async create(productData: Partial<Product>): Promise<Product> {
    // Validate category exists
    if (productData.categoryId) {
      const category = await this.categoriesRepository.findOneBy({ 
        id: productData.categoryId 
      });
      if (!category) {
        throw new Error(`Category with ID ${productData.categoryId} not found`);
      }
    }

    return this.productsRepository.save(productData);
  }

  async findAll(): Promise<Product[]> {
    return this.productsRepository.find({ 
      relations: ['category'], // 👈 Crucial for JOIN
      where: { deletedAt: IsNull() } // Soft delete filter
    });
  }

  async findOne(id: number): Promise<Product | null> {
    return this.productsRepository.findOne({ 
      where: { id, deletedAt: IsNull() },
      relations: ['category'] // 👈 Include category
    });
  }

  async update(id: number, productData: Partial<Product>): Promise<Product | null> {
    // Validate category if being updated
    if (productData.categoryId) {
      const category = await this.categoriesRepository.findOneBy({ 
        id: productData.categoryId 
      });
      if (!category) {
        throw new Error(`Category with ID ${productData.categoryId} not found`);
      }
    }

    await this.productsRepository.update(id, productData);
    return this.findOne(id); // Reuse findOne to include relations
  }

     // ✅ New Version (Proper Soft Delete)
  // Enhanced remove with validation
  async remove(id: any): Promise<void> {
    const validId = this.validateId(id);
    const product = await this.productsRepository.findOne({
      where: { id: validId },
      relations: ['orderItems']
    });

    if (!product) throw new NotFoundException('Product not found');
    if (product.orderItems?.length > 0) {
      throw new BadRequestException('Product has associated orders');
    }

    await this.productsRepository.softRemove(product);
  }

  async findByCategory(categoryId: number): Promise<Product[]> {
    const category = await this.categoriesRepository.findOne({
      where: { id: categoryId },
      relations: ['children']
    });

    if (!category) throw new Error('Category not found');

    const categoryIds = [category.id];
    if (category.children) {
      categoryIds.push(...category.children.map(c => c.id));
    }

    return this.productsRepository.find({
      where: { 
        categoryId: In(categoryIds),
        deletedAt: IsNull()
      },
      relations: ['category']
    });
  }


  async findDeleted(): Promise<Product[]> {
    // 1. Get raw database connection
    const manager = this.productsRepository.manager;
    const connection = manager.connection;
    
    // 2. Execute raw query with connection pool
    const [results] = await connection.query(`
      SELECT * FROM products 
      WHERE deleted_at IS NOT NULL
    `);
    
    console.log('🔍 RAW DATABASE RESULTS:', results);
    return results;
  }
  
  // NEW: Restore single product (with proper typing)
  async restore(id: number): Promise<void> {
    const validId = this.validateId(id);
    await this.productsRepository.recover({ id: validId });
  }

  // NEW: Restore multiple products (with proper typing)
  async restoreMany(ids: number[]): Promise<void> {
    const validIds = ids.map(id => ({ id: this.validateId(id) }));
    await this.productsRepository.recover(validIds);
  }

  

  // Permanent delete with checks
  async hardDelete(id: any): Promise<void> {
    const validId = this.validateId(id);
    const product = await this.productsRepository.findOne({
      where: { id: validId },
      relations: ['orderItems'],
      withDeleted: true
    });

    if (!product) throw new NotFoundException('Product not found');
    if (product.orderItems?.length > 0) {
      throw new BadRequestException('Cannot delete - product has orders');
    }

    await this.productsRepository.delete(validId);
  }


  // NEW: Bulk permanent delete
  async hardDeleteMany(ids: number[]): Promise<void> {
    const products = await this.productsRepository.find({
      where: { id: In(ids) },
      relations: ['orderItems'],
      withDeleted: true
    });

    const hasOrders = products.some(p => p.orderItems?.length > 0);
    if (hasOrders) throw new Error('Some products have existing orders');

    await this.productsRepository.delete(ids);
  }
}
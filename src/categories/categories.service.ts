import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { TreeRepository, IsNull, Repository, Not } from 'typeorm';
import { Category } from './entities/category.entity.js';
import { CreateCategoryDto } from './dto/create-category.dto.js';
import { Product } from '../products/entities/product.entity.js';

interface FlatCategory {
  id: number;
  name: string;
  icon?: string;
  parentId?: number;
  path?: string[];
}
@Injectable()
export class CategoriesService {
  constructor(
    @InjectRepository(Category)
    private readonly categoryRepo: TreeRepository<Category>,
    @InjectRepository(Product) // 👈 Add this
    private readonly productRepo: Repository<Product>
  ) {}

  // Get full tree (with deleted for admin)
  async getTree(): Promise<Category[]> {
    return this.categoryRepo.findTrees();
  }

  // Get flat list for dropdowns
  async getFlatCategories(): Promise<FlatCategory[]> {
    const trees = await this.getTree();
    return this.flattenCategories(trees);
  }

  private flattenCategories(categories: Category[]): FlatCategory[] {
    const result: FlatCategory[] = [];
    
    categories.forEach(cat => {
      result.push({
        id: cat.id,
        name: cat.name,
        icon: cat.icon || undefined,
        parentId: cat.parent?.id || undefined,
        path: cat.path || undefined
      });
      
      if (cat.children?.length) {
        result.push(...this.flattenCategories(cat.children));
      }
    });
    
    return result;
  }

  // Get only parent categories
  async findParents(): Promise<Category[]> {
    return this.categoryRepo.find({ 
      where: { parent: IsNull() },
      order: { name: 'ASC' }
    });
  }

  // Get children of specific parent
  async findChildren(parentId: number): Promise<Category[]> {
    return this.categoryRepo.find({
      where: { parent: { id: parentId } },
      relations: ['parent'],
      order: { name: 'ASC' }
    });
  }

  // Create with icon support
  async create(dto: CreateCategoryDto): Promise<Category> {
    const category = this.categoryRepo.create({
      name: dto.name,
      icon: dto.icon,
    });

    if (dto.parentId) {
      const parent = await this.categoryRepo.findOne({ 
        where: { id: dto.parentId }
      });
      if (!parent) throw new NotFoundException(`Parent category ${dto.parentId} not found`);
      category.parent = parent;
    }

    return this.categoryRepo.save(category);
  }
  async getProductCount(categoryId: number): Promise<number> {
    try {
      return await this.productRepo.count({ 
        where: { categoryId },
        withDeleted: false
      });
    } catch (error) {
      console.error('Product count error:', error);
      return 0; // Fail safely
    }
  }

  async getStatus(id: number) {
    const [productCount, subcategoryCount] = await Promise.all([
      this.productRepo.count({ where: { categoryId: id } }),
      this.categoryRepo.count({ where: { parent: { id } } })
    ]);
    return {
      isEmpty: productCount === 0 && subcategoryCount === 0,
      requiresMoveTo: productCount > 0 || subcategoryCount > 0,
      productCount,
      subcategoryCount
    };
  }

  async delete(id: number, moveToId?: number) {
    const status = await this.getStatus(id);

    if (status.requiresMoveTo && !moveToId) {
      throw new BadRequestException({
        code: 'MOVE_REQUIRED',
        message: `Category has ${status.productCount} products and ${status.subcategoryCount} subcategories`,
        status
      });
    }

    // Move products if needed
    if (moveToId && status.productCount > 0) {
      await this.productRepo.update(
        { categoryId: id },
        { categoryId: moveToId }
      );
    }

    // Move subcategories if needed
    if (moveToId && status.subcategoryCount > 0) {
      await this.categoryRepo.update(
        { parent: { id } },
        { parent: { id: moveToId } }
      );
    }

    // Soft-delete
    await this.categoryRepo.softDelete(id);
  }

  async findDeleted() {
    return this.categoryRepo.find({
      where: { deletedAt: Not(IsNull()) },
      withDeleted: true
    });
  }

  async getRecursiveProductCount(categoryId: number): Promise<number> {
    const category = await this.categoryRepo.findOne({
      where: { id: categoryId },
      relations: ['children']
    });
  
    if (!category) return 0;
  
    // Get direct products count
    const directCount = await this.productRepo.count({
      where: { categoryId: category.id }
    });
  
    // Get children counts recursively
    let childrenCount = 0;
    if (category.children?.length) {
      for (const child of category.children) {
        childrenCount += await this.getRecursiveProductCount(child.id);
      }
    }
  
    return directCount + childrenCount;
  }
  
}
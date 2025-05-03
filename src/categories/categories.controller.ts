import { 
  Controller, Get, Post, Delete, 
  Body, Param, Query, ParseIntPipe, BadRequestException, NotFoundException, Patch,
  HttpCode
} from '@nestjs/common';
import { CategoriesService } from './categories.service.js';
import { Category } from './entities/category.entity.js';
import { CreateCategoryDto } from './dto/create-category.dto.js';
import { FlatCategory } from './types.js';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Not, IsNull, FindOptionsWhere } from 'typeorm';
import { Product } from '../products/entities/product.entity.js';
import { DataSource } from 'typeorm';
import { UpdateCategoryDto } from './dto/update-category.dto.js';
import { UserRole } from '../users/enums/roles.enum.js';
import { Roles } from '../auth/roles.decorator.js';


@Controller('categories')
export class CategoriesController {
  constructor(
    @InjectRepository(Category)
    private readonly categoryRepo: Repository<Category>,
    @InjectRepository(Product)
    private readonly productRepo: Repository<Product>,
    private readonly dataSource: DataSource,
    private readonly service: CategoriesService
  ) {}

  private async isCircularReference(childId: number, parent: Category): Promise<boolean> {
    if (parent.id === childId) return true;
    if (!parent.parentId) return false;
    
    const nextParent = await this.categoryRepo.findOne({
      where: { id: parent.parentId },
      relations: ['parent']
    });
    
    return nextParent ? this.isCircularReference(childId, nextParent) : false;
  }

  @Get('tree')
  getTree(): Promise<Category[]> {
    return this.service.getTree();
  }

  @Get('flat')
async getFlat(): Promise<FlatCategory[]> {
  const categories = await this.categoryRepo.find({
    relations: ['parent'],
    withDeleted: false // Exclude soft-deleted if needed
  });

  return categories.map(cat => ({
    id: cat.id,
    name: cat.name,
    icon: cat.icon || undefined, // Match optional type
    parentId: cat.parent?.id ?? null, // Explicit null for parents
    path: cat.path || undefined
  }));
}

  @Get('parents')
  getParents(): Promise<Category[]> {
    return this.service.findParents();
  }

  @Get('children/:parentId')
  getChildren(
    @Param('parentId', ParseIntPipe) parentId: number
  ): Promise<Category[]> {
    return this.service.findChildren(parentId);
  }

  @Post()
  create(@Body() dto: CreateCategoryDto): Promise<Category> {
    return this.service.create(dto);
  }

  @Get('deleted')
  async findDeleted(): Promise<Category[]> {
    return this.service.findDeleted();
}
  
  @Get(':id/product-count')
async getProductCount(
  @Param('id', ParseIntPipe) id: number
): Promise<{ count: number }> {
  return {
    count: await this.service.getProductCount(id)
  };
}



@Get(':id/status')
async getStatus(@Param('id') id: string) {
  const category = await this.categoryRepo.findOne({
    where: [{ id: Number(id) || -1 }, { name: id }],
    relations: ['children']
  });

  if (!category) throw new NotFoundException('Category not found');

  // 1. Check ONLY direct products
  const directProductCount = await this.productRepo.count({
    where: { categoryId: category.id }
  });

  // 2. Check subcategory products (if parent)
  let childProductCount = 0;
  if (!category.parentId && category.children) {
    for (const child of category.children) {
      childProductCount += await this.productRepo.count({
        where: { categoryId: child.id }
      });
    }
  }

  return {
    isEmpty: directProductCount === 0 && category.children?.length === 0,
    requiresMoveTo: directProductCount > 0, // Only care about direct products
    productCount: directProductCount,
    subcategoryCount: category.children?.length || 0,
    _debug: { childProductCount } // Optional for debugging
  };
}

  @Delete(':identifier')
async delete(
  @Param('identifier') identifier: string,
  @Query() query: { moveTo?: string; newParent?: string }
) {
  // ===== 1. RESOLVE CATEGORY =====
  const category = await this.categoryRepo.findOne({
    where: [
      { id: Number(identifier) || -1 },
      { name: identifier }
    ],
    relations: ['children']
  });
  if (!category) throw new NotFoundException(`Category "${identifier}" not found`);

  if (!category.parentId && query.newParent) {
    const newParent = await this.categoryRepo.findOne({
      where: { id: Number(query.newParent) || -1 }
    });
    
    if (newParent?.parentId !== null) {
      throw new BadRequestException(
        'New parent must be a top-level category'
      );
    }
    if (query.moveTo) {
      const target = await this.categoryRepo.findOne({
        where: { id: Number(query.moveTo) },
        relations: ['parent']
      });
    
      // For subcategory moves: ensure same parent
      if (category.parentId && target?.parentId !== category.parentId) {
        throw new BadRequestException(
          'Products must be moved to sibling subcategories'
        );
      }
    }
  }

  // ===== 2. RESOLVE TARGETS =====
  const [moveToCategory, newParentCategory] = await Promise.all([
    query.moveTo ? this.resolveCategory(query.moveTo) : Promise.resolve(null),
    query.newParent ? this.resolveCategory(query.newParent) : Promise.resolve(null)
  ]);

  // ===== 3. VALIDATE CONTENTS =====
  const [productCount, subcategoryCount] = await Promise.all([
    this.productRepo.count({ where: { categoryId: category.id } }),
    this.categoryRepo.count({ where: { parent: { id: category.id } }})
  ]);

  // Enhanced validation
  if (productCount > 0 && !moveToCategory) {
    throw new BadRequestException({
      code: 'MOVE_REQUIRED',
      message: `Category contains ${productCount} products. Provide 'moveTo' parameter.`,
      productCount
    });
  }

  // Special parent category rules
  if (!category.parentId) { // If deleting a parent category
    if (subcategoryCount > 0 && !newParentCategory) {
      throw new BadRequestException({
        code: 'NEW_PARENT_REQUIRED',
        message: `Parent category contains ${subcategoryCount} subcategories`,
        subcategoryCount
      });
    }
    if (newParentCategory?.parentId) {
      throw new BadRequestException('Target parent must be a top-level category');
    }
  }

  // ===== 4. PROCESS DELETION =====
  await this.dataSource.transaction(async (manager) => {
    // Move products if needed
    if (moveToCategory && productCount > 0) {
      await manager.update(
        Product,
        { categoryId: category.id },
        { categoryId: moveToCategory.id }
      );
    }

    // Reparent subcategories if needed
    if (newParentCategory && subcategoryCount > 0) {
      await manager.update(
        Category,
        { parent: { id: category.id } },
        { parent: { id: newParentCategory.id } }
      );
    }

    // Soft delete
    await manager.softDelete(Category, category.id);
  });

  return { 
    success: true,
    deletedCategory: {
      id: category.id,
      name: category.name,
      wasParent: !category.parentId
    },
    movedTo: moveToCategory ? { id: moveToCategory.id, name: moveToCategory.name } : null,
    newParent: newParentCategory ? { id: newParentCategory.id, name: newParentCategory.name } : null
  };
}

// Keep your existing resolveCategory helper
private async resolveCategory(identifier: string): Promise<Category> {
  const category = await this.categoryRepo.findOne({
    where: [
      { id: Number(identifier) || -1 },
      { name: identifier }
    ]
  });
  if (!category) throw new BadRequestException(`Category "${identifier}" not found`);
  return category;
}

@Patch(':id')
async update(
  @Param('id') id: string,
  @Body() dto: UpdateCategoryDto
) {
  const category = await this.categoryRepo.findOne({
    where: { id: Number(id) || -1 }
  });
  if (!category) throw new NotFoundException('Category not found');

  // Proper type handling for parent
  let parent: Category | null = null;
  if (dto.parentId !== undefined) {
    parent = dto.parentId 
      ? await this.categoryRepo.findOne({ where: { id: dto.parentId } }) 
      : null;
  }

  // Prevent circular references
  if (dto.parentId !== undefined) {
    // Handle null case first
    
    if (dto.parentId === null) {
      // Parent is being set to null (becoming root category)
      parent = null;
    } else {
      // Find parent only if parentId is a number
    const potentialParent = await this.categoryRepo.findOne({
      where: { id: dto.parentId } as FindOptionsWhere<Category>
    });
    if (!potentialParent) {
      throw new NotFoundException('Parent category not found');
    }
    
    if (await this.isCircularReference(category.id, potentialParent)) {
      throw new BadRequestException('Cannot set parent as it would create a circular reference');
    }
    parent = potentialParent;
  }
}

if (!category.parentId && dto.newParent) {
  const newParent = await this.categoryRepo.findOne({
    where: { id: dto.newParent }
  });
  
  if (newParent?.parentId !== null) {
    throw new BadRequestException(
      'New parent must be a top-level category'
    );
  }
}
  

  // Use merge and save for proper entity handling
  const updated = this.categoryRepo.merge(category, {
    name: dto.name ?? category.name,
    icon: dto.icon ?? category.icon,
    parent: parent
  });

  return this.categoryRepo.save(updated);
};

@Get(':id/product-count-recursive')
async getRecursiveProductCount(
  @Param('id', ParseIntPipe) id: number
): Promise<{ count: number }> {
  return {
    count: await this.service.getRecursiveProductCount(id)
  };
}

// PERMANENT DELETE (SINGLE)
@Delete('permanent/:id')
@Roles(UserRole.ADMIN) // Admin-only
async hardDeleteCategory(
  @Param('id', ParseIntPipe) id: number
): Promise<{ message: string }> {
  await this.categoryRepo.delete(id); // Hard delete
  return { message: 'Category permanently deleted' };
}

// PERMANENT DELETE (BULK)
@Delete('permanent')
@Roles(UserRole.ADMIN) // Admin-only
async hardDeleteCategories(
  @Body() { ids }: { ids: number[] }
): Promise<{ message: string }> {
  await this.categoryRepo.delete(ids);
  return { message: 'Categories permanently deleted' };
}

// RESTORE (SINGLE)
@Patch(':id/restore')
@HttpCode(204)
@Roles(UserRole.ADMIN, UserRole.STORE_MANAGER)
async restoreCategory(
  @Param('id', ParseIntPipe) id: number
): Promise<void> {
  await this.categoryRepo.restore(id);
}

// RESTORE (BULK)
@Patch('restore')
@HttpCode(204)
@Roles(UserRole.ADMIN, UserRole.STORE_MANAGER)
async restoreCategories(
  @Body() { ids }: { ids: number[] }
): Promise<void> {
  await this.categoryRepo.restore(ids);
}

}
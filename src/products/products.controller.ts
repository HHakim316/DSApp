import { 
  Controller, Get, Post, Body, Param, Put, Delete, NotFoundException, UseGuards, Patch, HttpCode,BadRequestException, Query, UsePipes,
  InternalServerErrorException,
  Res,
  Header, 
} from '@nestjs/common';
import { ParseIntPipe } from '@nestjs/common';
import { ProductsService } from './products.service.js';
import { Product } from './entities/product.entity.js';
import { ApiTags, ApiBody, ApiOperation } from '@nestjs/swagger'; 
import { RolesGuard } from '../auth/roles.guard.js';
import { Roles } from '../auth/roles.decorator.js';
import { UserRole } from '../users/enums/roles.enum.js';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js'; 
import { CreateProductDto } from './dto/create-product.dto.js';
import { UpdateProductDto } from './dto/update-product.dto.js';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Response } from 'express'; // Add this import



@ApiTags('products')
@Controller('products')
@UseGuards(JwtAuthGuard, RolesGuard) // ✅ Apply JwtAuthGuard & RolesGuard globally
export class ProductsController {
  constructor(
    private readonly productsService: ProductsService,
    @InjectRepository(Product)
    private readonly productsRepository: Repository<Product> // 👈 Add this
  ) {}

    // NEW ENDPOINT: Get deleted products
    @Get('deleted')
async findDeleted(@Res() res: Response) {
  try {
    // 1. Get raw database connection
    const queryRunner = this.productsRepository.manager.connection.createQueryRunner();
    
    // 2. Get ALL tables
    const tables = await queryRunner.query('SHOW TABLES');
    console.log('📦 ALL Tables:', tables);

    // 3. Get ALL deleted products
    const deletedProducts = await queryRunner.query(`
      SELECT id, name, deleted_at as "deletedAt" 
      FROM products 
      WHERE deleted_at IS NOT NULL
      ORDER BY deleted_at DESC
    `);
    
    console.log('🗑️ ALL Deleted Products:', deletedProducts);
    return res.json(deletedProducts);
    
  } catch (error) {
    console.error('💥 Error:', error);
    return res.status(500).json({ 
      error: 'Database operation failed',
      details: error.message 
    });
  }
}
  

  @Post()
  @Roles(UserRole.ADMIN, UserRole.STORE_MANAGER) // ✅ Restrict to admin & store_manager
  @ApiOperation({ summary: 'Create a new product (Admin & Store Manager only)' })
  @ApiBody({ type: CreateProductDto }) 
  async create(@Body() createProductDto: CreateProductDto): Promise<Product> {
    return this.productsService.create(createProductDto);
  }


@Get()
@ApiOperation({ summary: 'Get all products (Anyone can view)' }) // ✅ No role restriction
async findAll(): Promise<Product[]> {
  return this.productsService.findAll();
}

@Get(':id')
@ApiOperation({ summary: 'Get a single product by ID (Anyone can view)' }) // ✅ No role restriction
async findOne(@Param('id', ParseIntPipe) id: number): Promise<Product> {
  const product = await this.productsService.findOne(id);
  if (!product) {
    throw new NotFoundException(`Product with ID ${id} not found`);
  }
  return product;
}


  @Put(':id')
  @Roles(UserRole.ADMIN, UserRole.STORE_MANAGER) // ✅ Restrict to admin & store_manager
  @ApiOperation({ summary: 'Update a product (Admin & Store Manager only)' })
  @ApiBody({ type: UpdateProductDto }) 
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateProductDto: UpdateProductDto
  ): Promise<Product> {
    const updatedProduct = await this.productsService.update(id, updateProductDto);
    if (!updatedProduct) {
      throw new NotFoundException(`Product with ID ${id} not found`);
    }
    return updatedProduct;
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN, UserRole.STORE_MANAGER) // ✅ Allow store managers to delete products
  @ApiOperation({ summary: 'Delete a product (Admin & Store Manager)' })
  async softDelete(@Param('id', ParseIntPipe) id: number): Promise<{ message: string }> {
    await this.productsService.softRemove(id);
    return { message: `Product with ID ${id} deleted successfully` };
  }

  

  // NEW ENDPOINT: Restore product
  @Patch(':id/restore')
  @HttpCode(204)
  @Roles(UserRole.ADMIN, UserRole.STORE_MANAGER)
  @ApiOperation({ summary: 'Restore a deleted product' })
  async restore(@Param('id', ParseIntPipe) id: number): Promise<void> {
    await this.productsService.restore(id);
  }

  // NEW ENDPOINT: Bulk restore
  @Patch('restore')
  @HttpCode(204)
  @Roles(UserRole.ADMIN, UserRole.STORE_MANAGER)
  @ApiOperation({ summary: 'Restore multiple products' })
  async restoreMany(
    @Body() body: { ids: number[] },
    @Query() query: any // Now properly imported
  ): Promise<void> {
  // Double-check IDs are numbers
  if (!body.ids || !Array.isArray(body.ids)) {
    throw new BadRequestException('Invalid ID array format');
  }
  
  const validIds = body.ids
      .map(id => Number(id))
      .filter(id => !isNaN(id));

    if (validIds.length === 0) {
      throw new BadRequestException('No valid IDs provided');
    }
  await this.productsService.restoreMany(validIds);
}
  // NEW ENDPOINT: Permanent delete
  @Delete('permanent/:id')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Permanently delete a product (Admin only)' })
  async hardDelete(@Param('id', ParseIntPipe) id: number): Promise<{ message: string }> {
    await this.productsService.hardDelete(id);
    return { message: 'Product permanently deleted' };
  }

  // NEW ENDPOINT: Bulk permanent delete
  @Delete('permanent')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Permanently delete multiple products (Admin only)' })
  async hardDeleteMany(@Body() { ids }: { ids: number[] }): Promise<{ message: string }> {
    await this.productsService.hardDeleteMany(ids);
    return { message: 'Products permanently deleted' };
  }
}

import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNumber, IsBoolean, IsOptional, MinLength, IsNotEmpty } from 'class-validator';

export class CreateProductDto {
  @ApiProperty({ example: 'Summer Dress' })
  @IsString()
  name: string;

  @ApiProperty({ example: 'A beautiful summer dress' })
  @IsString()
  description: string;

  @ApiProperty({ example: 49.99 })
  @IsNumber()
  price: number;

  @ApiProperty({ example: 'clothing' })
  @IsNumber()
  @IsNotEmpty()
  categoryId: number;

  @ApiProperty({ example: 'https://example.com/summer-dress.jpg' })
  @IsString()
  @IsOptional()
  imageUrl?: string;

  @ApiProperty({ example: 100 })
  @IsNumber()
  stock: number;

  @ApiProperty({ example: true })
  @IsBoolean()
  isActive: boolean;
}

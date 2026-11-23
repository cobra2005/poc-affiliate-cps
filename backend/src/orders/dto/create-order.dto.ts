import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateOrderDto {
  @Type(() => Number)
  @IsInt()
  productId!: number;

  @Type(() => Number)
  @IsInt()
  buyerUserId!: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  refPublisherId?: number;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  voucherCode?: string;
}

import { Transform, Type } from 'class-transformer';
import { IsInt, IsString, Matches, Max, Min } from 'class-validator';

export class CreateVoucherDto {
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toUpperCase() : value))
  @IsString()
  @Matches(/^[A-Z0-9_-]{2,40}$/, { message: 'Mã voucher chỉ gồm chữ, số, gạch ngang hoặc gạch dưới' })
  code!: string;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(1_000_000_000)
  discountAmount!: number;
}

import { IsBoolean } from 'class-validator';

export class UpdateVoucherDto {
  @IsBoolean()
  isActive!: boolean;
}

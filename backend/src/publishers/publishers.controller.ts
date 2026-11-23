import { Body, Controller, Get, Param, ParseIntPipe, Patch, Post } from '@nestjs/common';
import { CreatePublisherDto } from './dto/create-publisher.dto';
import { CreateVoucherDto } from './dto/create-voucher.dto';
import { UpdateVoucherDto } from './dto/update-voucher.dto';
import { PublishersService } from './publishers.service';

@Controller('publishers')
export class PublishersController {
  constructor(private readonly publishers: PublishersService) {}

  @Get()
  list() {
    return this.publishers.list();
  }

  @Post()
  create(@Body() dto: CreatePublisherDto) {
    return this.publishers.create(dto);
  }

  @Post(':id/vouchers')
  createVoucher(@Param('id', ParseIntPipe) id: number, @Body() dto: CreateVoucherDto) {
    return this.publishers.createVoucher(id, dto);
  }
}

@Controller('vouchers')
export class VouchersController {
  constructor(private readonly publishers: PublishersService) {}

  @Patch(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateVoucherDto) {
    return this.publishers.updateVoucher(id, dto);
  }
}

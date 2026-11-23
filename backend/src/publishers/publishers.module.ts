import { Module } from '@nestjs/common';
import { PublishersController, VouchersController } from './publishers.controller';
import { PublishersService } from './publishers.service';

@Module({
  controllers: [PublishersController, VouchersController],
  providers: [PublishersService],
})
export class PublishersModule {}

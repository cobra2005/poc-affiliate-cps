import { Controller, Get, Module } from '@nestjs/common';
import { PrismaModule } from './prisma/prisma.module';
import { UsersModule } from './users/users.module';
import { PublishersModule } from './publishers/publishers.module';
import { ProductsModule } from './products/products.module';
import { OrdersModule } from './orders/orders.module';

@Controller('health')
class HealthController {
  @Get()
  get() {
    return { ok: true };
  }
}

@Module({
  imports: [PrismaModule, UsersModule, PublishersModule, ProductsModule, OrdersModule],
  controllers: [HealthController],
})
export class AppModule {}

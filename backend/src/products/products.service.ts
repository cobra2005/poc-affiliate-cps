import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ProductsService {
  constructor(private readonly prisma: PrismaService) {}

  list() {
    return this.prisma.product.findMany({
      orderBy: { id: 'asc' },
      select: { id: true, name: true, price: true },
    });
  }
}

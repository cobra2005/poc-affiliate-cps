import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { calcAmounts, calcCommission, isSelfReferral, resolveAttribution } from './commission';
import { CreateOrderDto } from './dto/create-order.dto';
import { orderInclude, toOrderView } from './orders.mapper';

export type ChannelStatus = 'none' | 'applied' | 'missing' | 'inactive';

@Injectable()
export class OrdersService {
  constructor(private readonly prisma: PrismaService) {}

  async list() {
    const orders = await this.prisma.order.findMany({
      include: orderInclude,
      orderBy: { id: 'desc' },
    });
    return orders.map((order) => toOrderView(order));
  }

  async get(id: number) {
    const order = await this.prisma.order.findUnique({ where: { id }, include: orderInclude });
    if (!order) {
      throw new NotFoundException('Không tìm thấy đơn hàng');
    }
    return toOrderView(order);
  }

  async create(dto: CreateOrderDto) {
    const product = await this.prisma.product.findUnique({ where: { id: dto.productId } });
    if (!product) {
      throw new NotFoundException('Không tìm thấy sản phẩm');
    }

    const buyer = await this.prisma.user.findUnique({ where: { id: dto.buyerUserId } });
    if (!buyer) {
      throw new NotFoundException('Không tìm thấy tài khoản người mua');
    }

    let refPublisherId: number | null = null;
    let refStatus: ChannelStatus = 'none';
    if (dto.refPublisherId != null) {
      const refPublisher = await this.prisma.publisher.findUnique({ where: { id: dto.refPublisherId } });
      if (refPublisher) {
        refPublisherId = refPublisher.id;
        refStatus = 'applied';
      } else {
        refStatus = 'missing';
      }
    }

    let voucher: { id: number; publisherId: number; discountAmount: number } | null = null;
    let voucherStatus: ChannelStatus = 'none';
    const code = dto.voucherCode?.trim();
    if (code) {
      const found = await this.prisma.voucher.findUnique({ where: { code: code.toUpperCase() } });
      if (!found) {
        throw new BadRequestException('Voucher không hợp lệ');
      } else if (!found.isActive) {
        voucherStatus = 'inactive';
      } else {
        voucher = found;
        voucherStatus = 'applied';
      }
    }

    const amounts = calcAmounts(product.price, voucher ? voucher.discountAmount : null);
    const attributedPublisherId = resolveAttribution({
      refPublisherId,
      voucherPublisherId: voucher?.publisherId ?? null,
    });

    const order = await this.prisma.order.create({
      data: {
        productId: product.id,
        buyerUserId: buyer.id,
        refPublisherId,
        voucherId: voucher?.id ?? null,
        attributedPublisherId,
        unitPrice: product.price,
        discountAmount: amounts.discountAmount,
        amountPaid: amounts.amountPaid,
        commissionAmount: 0,
        status: 'pending',
      },
      include: orderInclude,
    });

    return {
      order: toOrderView(order),
      refStatus,
      voucherStatus,
    };
  }

  async pay(id: number) {
    const result = await this.prisma.$transaction(async (tx) => {
      const order = await tx.order.findUnique({ where: { id }, include: orderInclude });
      if (!order) {
        throw new NotFoundException('Không tìm thấy đơn hàng');
      }
      if (order.status === 'paid') {
        return { order, alreadyPaid: true };
      }

      const commissionAmount = calcCommission(
        order.amountPaid,
        order.attributedPublisherId != null,
        isSelfReferral(order.buyer.publisher?.id ?? null, order.attributedPublisherId),
      );
      const updated = await tx.order.updateMany({
        where: { id, status: 'pending' },
        data: {
          status: 'paid',
          commissionAmount,
          paidAt: new Date(),
        },
      });
      const fresh = await tx.order.findUniqueOrThrow({ where: { id }, include: orderInclude });
      return { order: fresh, alreadyPaid: updated.count === 0 };
    });

    return {
      order: toOrderView(result.order),
      alreadyPaid: result.alreadyPaid,
    };
  }
}

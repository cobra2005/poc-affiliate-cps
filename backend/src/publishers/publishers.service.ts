import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePublisherDto } from './dto/create-publisher.dto';
import { CreateVoucherDto } from './dto/create-voucher.dto';
import { UpdateVoucherDto } from './dto/update-voucher.dto';

const publisherInclude = {
  user: { select: { id: true, name: true, email: true } },
  vouchers: { orderBy: { id: 'asc' as const } },
} satisfies Prisma.PublisherInclude;

type PublisherRecord = Prisma.PublisherGetPayload<{ include: typeof publisherInclude }>;

@Injectable()
export class PublishersService {
  constructor(private readonly prisma: PrismaService) {}

  async list() {
    const publishers = await this.prisma.publisher.findMany({
      include: publisherInclude,
      orderBy: { id: 'asc' },
    });
    return publishers.map((publisher) => this.toView(publisher));
  }

  async create(dto: CreatePublisherDto) {
    const user = await this.prisma.user.findUnique({ where: { id: dto.userId } });
    if (!user) {
      throw new NotFoundException('Không tìm thấy tài khoản');
    }

    try {
      const publisher = await this.prisma.publisher.create({
        data: { userId: user.id },
        include: publisherInclude,
      });
      return this.toView(publisher);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException('Tài khoản này đã là Publisher');
      }
      throw error;
    }
  }

  async createVoucher(publisherId: number, dto: CreateVoucherDto) {
    const publisher = await this.prisma.publisher.findUnique({ where: { id: publisherId } });
    if (!publisher) {
      throw new NotFoundException('Không tìm thấy Publisher');
    }

    try {
      const voucher = await this.prisma.voucher.create({
        data: {
          publisherId,
          code: dto.code,
          discountAmount: dto.discountAmount,
        },
      });
      return this.toVoucher(voucher);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException('Mã voucher đã tồn tại');
      }
      throw error;
    }
  }

  async updateVoucher(voucherId: number, dto: UpdateVoucherDto) {
    try {
      const voucher = await this.prisma.voucher.update({
        where: { id: voucherId },
        data: { isActive: dto.isActive },
      });
      return this.toVoucher(voucher);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
        throw new NotFoundException('Không tìm thấy voucher');
      }
      throw error;
    }
  }

  private toView(publisher: PublisherRecord) {
    return {
      id: publisher.id,
      user: publisher.user,
      vouchers: publisher.vouchers.map((voucher) => this.toVoucher(voucher)),
    };
  }

  private toVoucher(voucher: { id: number; code: string; discountAmount: number; isActive: boolean }) {
    return {
      id: voucher.id,
      code: voucher.code,
      discountAmount: voucher.discountAmount,
      isActive: voucher.isActive,
    };
  }
}

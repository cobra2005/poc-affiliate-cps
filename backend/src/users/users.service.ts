import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';

const userInclude = { publisher: { select: { id: true } } } as const;

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async list() {
    const users = await this.prisma.user.findMany({
      include: userInclude,
      orderBy: { id: 'asc' },
    });
    return users.map((user) => this.toView(user));
  }

  async create(dto: CreateUserDto) {
    try {
      const user = await this.prisma.user.create({
        data: { name: dto.name, email: dto.email },
        include: userInclude,
      });
      return this.toView(user);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException('Email đã được dùng');
      }
      throw error;
    }
  }

  private toView(user: { id: number; name: string; email: string; publisher: { id: number } | null }) {
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      publisherId: user.publisher?.id ?? null,
    };
  }
}

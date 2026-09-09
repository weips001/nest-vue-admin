import { ApiException } from '@/common/exceptions/api.exception';
import { generateUUid } from '@/utils/util';
import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from 'nestjs-prisma';
import {
  CreateSysTodoDto,
  GetSysTodoListDto,
  UpdateSysTodoDto,
} from './dto/req-sys-todo.dto';

@Injectable()
export class SysTodoService {
  constructor(private readonly prisma: PrismaService) {}

  /* 用户端：获取待办列表 */
  async findAll(userId: string, query: GetSysTodoListDto) {
    const { skip, take } = query;
    const where: Prisma.SysTodoWhereInput = { userId };

    if (query.title) {
      where.title = { contains: query.title };
    }
    if (query.bizType) {
      where.bizType = query.bizType;
    }
    if (query.status) {
      where.status = query.status;
    }

    const [list, total] = await Promise.all([
      this.prisma.sysTodo.findMany({
        where,
        skip,
        take,
        orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
      }),
      this.prisma.sysTodo.count({ where }),
    ]);

    return { list, total };
  }

  /* 管理端：获取所有待办列表 */
  async findAllAdmin(query: GetSysTodoListDto) {
    const { skip, take } = query;
    const where: Prisma.SysTodoWhereInput = {};

    if (query.title) {
      where.title = { contains: query.title };
    }
    if (query.bizType) {
      where.bizType = query.bizType;
    }
    if (query.status) {
      where.status = query.status;
    }

    const [list, total] = await Promise.all([
      this.prisma.sysTodo.findMany({
        where,
        skip,
        take,
        include: {
          user: {
            select: { id: true, nickName: true, userName: true },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.sysTodo.count({ where }),
    ]);

    return { list, total };
  }

  /* 获取待办详情 */
  async findOne(id: string) {
    const todo = await this.prisma.sysTodo.findUnique({
      where: { id },
      include: {
        user: {
          select: { id: true, nickName: true, userName: true },
        },
      },
    });
    if (!todo) {
      throw new ApiException('待办事项不存在');
    }
    return todo;
  }

  /* 新增待办（业务系统调用） */
  async create(dto: CreateSysTodoDto, userId: string) {
    return this.prisma.sysTodo.create({
      data: {
        ...dto,
        id: generateUUid(),
        createBy: userId,
        createById: userId,
      },
    });
  }

  /* 更新待办 */
  async update(id: string, dto: UpdateSysTodoDto) {
    const todo = await this.prisma.sysTodo.findUnique({
      where: { id },
    });
    if (!todo) {
      throw new ApiException('待办事项不存在');
    }

    return this.prisma.sysTodo.update({
      where: { id },
      data: dto,
    });
  }

  /* 完成待办 */
  async complete(id: string, userId: string) {
    const todo = await this.prisma.sysTodo.findUnique({
      where: { id },
    });
    if (!todo) {
      throw new ApiException('待办事项不存在');
    }
    if (todo.status !== 'pending') {
      throw new ApiException('该待办已处理');
    }

    return this.prisma.sysTodo.update({
      where: { id },
      data: {
        status: 'completed',
        completeBy: userId,
        completedAt: new Date(),
      },
    });
  }

  /* 取消待办 */
  async cancel(id: string) {
    const todo = await this.prisma.sysTodo.findUnique({
      where: { id },
    });
    if (!todo) {
      throw new ApiException('待办事项不存在');
    }

    return this.prisma.sysTodo.update({
      where: { id },
      data: { status: 'cancelled' },
    });
  }

  /* 删除待办 */
  async remove(id: string) {
    const todo = await this.prisma.sysTodo.findUnique({
      where: { id },
    });
    if (!todo) {
      throw new ApiException('待办事项不存在');
    }

    return this.prisma.sysTodo.delete({
      where: { id },
    });
  }

  /* 获取待处理待办数量 */
  async getPendingCount(userId: string) {
    const count = await this.prisma.sysTodo.count({
      where: { userId, status: 'pending' },
    });
    return { count };
  }
}

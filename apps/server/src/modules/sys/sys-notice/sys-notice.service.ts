import { ApiException } from '@/common/exceptions/api.exception';
import { generateUUid } from '@/utils/util';
import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from 'nestjs-prisma';
import {
  CreateSysNoticeDto,
  GetSysNoticeListDto,
  UpdateSysNoticeDto,
} from './dto/req-sys-notice.dto';

@Injectable()
export class SysNoticeService {
  constructor(private readonly prisma: PrismaService) {}

  /* 查询通知列表（管理员用） */
  async findAll(query: GetSysNoticeListDto) {
    const { skip, take } = query;
    const where: Prisma.SysNoticeWhereInput = {};

    if (query.title) {
      where.title = { contains: query.title };
    }
    if (query.type) {
      where.type = query.type;
    }
    if (query.status) {
      where.status = query.status;
    }

    const [list, total] = await Promise.all([
      this.prisma.sysNotice.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.sysNotice.count({ where }),
    ]);

    return { list, total };
  }

  /* 查询通知详情 */
  async findOne(id: string) {
    const notice = await this.prisma.sysNotice.findUnique({
      where: { id },
    });
    if (!notice) {
      throw new ApiException('通知不存在');
    }
    return notice;
  }

  /* 新增通知 */
  async create(createSysNoticeDto: CreateSysNoticeDto, userId: string) {
    return this.prisma.sysNotice.create({
      data: {
        ...createSysNoticeDto,
        id: generateUUid(),
        createBy: userId,
        createById: userId,
      },
    });
  }

  /* 更新通知 */
  async update(
    id: string,
    updateSysNoticeDto: UpdateSysNoticeDto,
    userId: string,
  ) {
    const notice = await this.prisma.sysNotice.findUnique({
      where: { id },
    });
    if (!notice) {
      throw new ApiException('通知不存在');
    }

    return this.prisma.sysNotice.update({
      where: { id },
      data: {
        ...updateSysNoticeDto,
        updateBy: userId,
      },
    });
  }

  /* 删除通知 */
  async remove(id: string) {
    const notice = await this.prisma.sysNotice.findUnique({
      where: { id },
    });
    if (!notice) {
      throw new ApiException('通知不存在');
    }

    return this.prisma.sysNotice.delete({
      where: { id },
    });
  }

  /* 获取未读通知数量 */
  async getUnreadCount(userId: string) {
    // 获取所有正常状态的通知
    const notices = await this.prisma.sysNotice.findMany({
      where: { status: '0' },
      select: { id: true },
    });

    if (notices.length === 0) {
      return { count: 0 };
    }

    const noticeIds = notices.map((n) => n.id);

    // 获取用户已读的通知
    const readNotices = await this.prisma.sysNoticeRead.findMany({
      where: {
        userId,
        noticeId: { in: noticeIds },
      },
      select: { noticeId: true },
    });

    const readNoticeIds = new Set(readNotices.map((r) => r.noticeId));
    const unreadCount = noticeIds.filter((id) => !readNoticeIds.has(id)).length;

    return { count: unreadCount };
  }

  /* 获取当前用户的通知列表 */
  async getUserNotices(
    userId: string,
    query: { skip?: number; take?: number; isRead?: boolean },
  ) {
    const { skip = 0, take = 20, isRead } = query;

    // 获取所有正常状态的通知
    const allNotices = await this.prisma.sysNotice.findMany({
      where: { status: '0' },
      orderBy: { createdAt: 'desc' },
    });

    if (allNotices.length === 0) {
      return { list: [], total: 0 };
    }

    const noticeIds = allNotices.map((n) => n.id);

    // 获取用户已读记录
    const readRecords = await this.prisma.sysNoticeRead.findMany({
      where: {
        userId,
        noticeId: { in: noticeIds },
      },
    });

    const readMap = new Map(readRecords.map((r) => [r.noticeId, r.readAt]));

    // 组装数据并筛选
    let notices = allNotices.map((notice) => ({
      ...notice,
      isRead: readMap.has(notice.id),
      readAt: readMap.get(notice.id) || null,
    }));

    // 按已读状态筛选
    if (isRead !== undefined) {
      notices = notices.filter((n) => n.isRead === isRead);
    }

    const total = notices.length;

    // 分页
    const list = notices.slice(skip, skip + take);

    return { list, total };
  }

  /* 标记通知为已读 */
  async markAsRead(noticeId: string, userId: string) {
    const notice = await this.prisma.sysNotice.findUnique({
      where: { id: noticeId },
    });
    if (!notice) {
      throw new ApiException('通知不存在');
    }

    // 检查是否已读
    const existRead = await this.prisma.sysNoticeRead.findUnique({
      where: {
        noticeId_userId: {
          noticeId,
          userId,
        },
      },
    });

    if (!existRead) {
      await this.prisma.sysNoticeRead.create({
        data: {
          id: generateUUid(),
          noticeId,
          userId,
        },
      });
    }

    return null;
  }

  /* 标记所有通知为已读 */
  async markAllAsRead(userId: string) {
    // 获取所有未读通知
    const notices = await this.prisma.sysNotice.findMany({
      where: { status: '0' },
      select: { id: true },
    });

    if (notices.length === 0) {
      return null;
    }

    const noticeIds = notices.map((n) => n.id);

    // 获取已读的通知
    const readRecords = await this.prisma.sysNoticeRead.findMany({
      where: {
        userId,
        noticeId: { in: noticeIds },
      },
      select: { noticeId: true },
    });

    const readNoticeIds = new Set(readRecords.map((r) => r.noticeId));
    const unreadNoticeIds = noticeIds.filter((id) => !readNoticeIds.has(id));

    // 批量创建阅读记录
    if (unreadNoticeIds.length > 0) {
      await this.prisma.sysNoticeRead.createMany({
        data: unreadNoticeIds.map((noticeId) => ({
          id: generateUUid(),
          noticeId,
          userId,
        })),
      });
    }

    return null;
  }
}

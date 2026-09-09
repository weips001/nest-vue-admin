jest.mock('@prisma/client', () => ({ Prisma: {} }));
jest.mock('nestjs-prisma', () => ({ PrismaService: class PrismaService {} }));

import { ApiException } from '@/common/exceptions/api.exception';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from 'nestjs-prisma';
import { SysNoticeService } from './sys-notice.service';

/* Mock 类型定义 */
type MockMethod = jest.Mock;

interface MockSysNotice {
  create: MockMethod;
  findUnique: MockMethod;
  findMany: MockMethod;
  update: MockMethod;
  delete: MockMethod;
  count: MockMethod;
}

interface MockSysNoticeRead {
  create: MockMethod;
  createMany: MockMethod;
  findUnique: MockMethod;
  findMany: MockMethod;
}

interface MockPrisma {
  sysNotice: MockSysNotice;
  sysNoticeRead: MockSysNoticeRead;
}

describe('SysNoticeService', () => {
  let service: SysNoticeService;
  let prisma: MockPrisma;

  const mockPrismaService: MockPrisma = {
    sysNotice: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
    sysNoticeRead: {
      create: jest.fn(),
      createMany: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SysNoticeService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<SysNoticeService>(SysNoticeService);
    prisma = module.get(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('findAll', () => {
    it('应该返回分页的通知列表', async () => {
      const mockNotices = [
        { id: 'notice-1', title: '通知1', content: '内容1' },
        { id: 'notice-2', title: '通知2', content: '内容2' },
      ];

      mockPrismaService.sysNotice.findMany.mockResolvedValue(mockNotices);
      mockPrismaService.sysNotice.count.mockResolvedValue(2);

      const result = await service.findAll({ skip: 0, take: 10 } as any);

      expect(result.list).toHaveLength(2);
      expect(result.total).toBe(2);
    });

    it('应该支持按标题模糊查询', async () => {
      mockPrismaService.sysNotice.findMany.mockResolvedValue([]);
      mockPrismaService.sysNotice.count.mockResolvedValue(0);

      await service.findAll({ skip: 0, take: 10, title: '测试' } as any);

      expect(mockPrismaService.sysNotice.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            title: { contains: '测试' },
          }),
        }),
      );
    });
  });

  describe('findOne', () => {
    it('应该返回通知详情', async () => {
      const mockNotice = { id: 'notice-1', title: '通知1', content: '内容1' };
      mockPrismaService.sysNotice.findUnique.mockResolvedValue(
        mockNotice as any,
      );

      const result = await service.findOne('notice-1');

      expect(result).toEqual(mockNotice);
    });

    it('通知不存在时应该抛出异常', async () => {
      mockPrismaService.sysNotice.findUnique.mockResolvedValue(null);

      await expect(service.findOne('non-existent')).rejects.toThrow(
        ApiException,
      );
      await expect(service.findOne('non-existent')).rejects.toThrow(
        '通知不存在',
      );
    });
  });

  describe('create', () => {
    it('应该成功创建通知', async () => {
      const createDto = {
        title: '新通知',
        content: '通知内容',
        type: 'notice',
        status: '0',
      };

      mockPrismaService.sysNotice.create.mockResolvedValue({
        id: 'notice-new',
        ...createDto,
      } as any);

      const result = await service.create(createDto as any, 'user-1');

      expect(result.title).toBe('新通知');
      expect(mockPrismaService.sysNotice.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            title: '新通知',
            createBy: 'user-1',
            createById: 'user-1',
          }),
        }),
      );
    });
  });

  describe('update', () => {
    it('应该成功更新通知', async () => {
      const updateDto = { title: '更新后的标题' };

      mockPrismaService.sysNotice.findUnique.mockResolvedValue({
        id: 'notice-1',
        title: '原标题',
      } as any);

      mockPrismaService.sysNotice.update.mockResolvedValue({
        id: 'notice-1',
        title: '更新后的标题',
      } as any);

      const result = await service.update(
        'notice-1',
        updateDto as any,
        'user-1',
      );

      expect(result.title).toBe('更新后的标题');
    });

    it('更新不存在的通知时应该抛出异常', async () => {
      mockPrismaService.sysNotice.findUnique.mockResolvedValue(null);

      await expect(
        service.update('non-existent', { title: '新标题' } as any, 'user-1'),
      ).rejects.toThrow('通知不存在');
    });
  });

  describe('remove', () => {
    it('应该成功删除通知', async () => {
      mockPrismaService.sysNotice.findUnique.mockResolvedValue({
        id: 'notice-1',
        title: '通知1',
      } as any);

      mockPrismaService.sysNotice.delete.mockResolvedValue({
        id: 'notice-1',
      } as any);

      const result = await service.remove('notice-1');

      expect(result.id).toBe('notice-1');
    });

    it('删除不存在的通知时应该抛出异常', async () => {
      mockPrismaService.sysNotice.findUnique.mockResolvedValue(null);

      await expect(service.remove('non-existent')).rejects.toThrow(
        '通知不存在',
      );
    });
  });

  describe('getUnreadCount', () => {
    it('应该返回未读通知数量', async () => {
      mockPrismaService.sysNotice.findMany.mockResolvedValue([
        { id: 'notice-1' },
        { id: 'notice-2' },
        { id: 'notice-3' },
      ]);

      mockPrismaService.sysNoticeRead.findMany.mockResolvedValue([
        { noticeId: 'notice-1' },
      ]);

      const result = await service.getUnreadCount('user-1');

      expect(result.count).toBe(2);
    });

    it('无通知时应该返回0', async () => {
      mockPrismaService.sysNotice.findMany.mockResolvedValue([]);

      const result = await service.getUnreadCount('user-1');

      expect(result.count).toBe(0);
      expect(mockPrismaService.sysNoticeRead.findMany).not.toHaveBeenCalled();
    });
  });

  describe('getUserNotices', () => {
    it('应该返回带已读状态的用户通知列表', async () => {
      mockPrismaService.sysNotice.findMany.mockResolvedValue([
        { id: 'notice-1', title: '通知1', content: '内容1', status: '0' },
        { id: 'notice-2', title: '通知2', content: '内容2', status: '0' },
      ] as any);

      mockPrismaService.sysNoticeRead.findMany.mockResolvedValue([
        { noticeId: 'notice-1', readAt: new Date() },
      ] as any);

      const result = await service.getUserNotices('user-1', {
        skip: 0,
        take: 10,
      });

      expect(result.list).toHaveLength(2);
      expect(result.list[0].isRead).toBe(true);
      expect(result.list[1].isRead).toBe(false);
    });

    it('应该支持按已读状态筛选', async () => {
      mockPrismaService.sysNotice.findMany.mockResolvedValue([
        { id: 'notice-1', title: '通知1', content: '内容1', status: '0' },
        { id: 'notice-2', title: '通知2', content: '内容2', status: '0' },
      ] as any);

      mockPrismaService.sysNoticeRead.findMany.mockResolvedValue([
        { noticeId: 'notice-1', readAt: new Date() },
      ] as any);

      const result = await service.getUserNotices('user-1', {
        skip: 0,
        take: 10,
        isRead: false,
      });

      expect(result.list).toHaveLength(1);
      expect(result.list[0].id).toBe('notice-2');
    });

    it('无通知时应该返回空列表', async () => {
      mockPrismaService.sysNotice.findMany.mockResolvedValue([]);

      const result = await service.getUserNotices('user-1', {
        skip: 0,
        take: 10,
      });

      expect(result.list).toEqual([]);
      expect(result.total).toBe(0);
    });
  });

  describe('markAsRead', () => {
    it('应该成功标记通知为已读', async () => {
      mockPrismaService.sysNotice.findUnique.mockResolvedValue({
        id: 'notice-1',
        title: '通知1',
      } as any);

      mockPrismaService.sysNoticeRead.findUnique.mockResolvedValue(null);
      mockPrismaService.sysNoticeRead.create.mockResolvedValue({} as any);

      await service.markAsRead('notice-1', 'user-1');

      expect(mockPrismaService.sysNoticeRead.create).toHaveBeenCalled();
    });

    it('通知不存在时应该抛出异常', async () => {
      mockPrismaService.sysNotice.findUnique.mockResolvedValue(null);

      await expect(
        service.markAsRead('non-existent', 'user-1'),
      ).rejects.toThrow('通知不存在');
    });

    it('已读时不应该重复创建记录', async () => {
      mockPrismaService.sysNotice.findUnique.mockResolvedValue({
        id: 'notice-1',
        title: '通知1',
      } as any);

      mockPrismaService.sysNoticeRead.findUnique.mockResolvedValue({
        noticeId: 'notice-1',
        userId: 'user-1',
      } as any);

      await service.markAsRead('notice-1', 'user-1');

      expect(mockPrismaService.sysNoticeRead.create).not.toHaveBeenCalled();
    });
  });

  describe('markAllAsRead', () => {
    it('应该批量标记所有未读通知为已读', async () => {
      mockPrismaService.sysNotice.findMany.mockResolvedValue([
        { id: 'notice-1' },
        { id: 'notice-2' },
        { id: 'notice-3' },
      ]);

      mockPrismaService.sysNoticeRead.findMany.mockResolvedValue([
        { noticeId: 'notice-1' },
      ] as any);

      mockPrismaService.sysNoticeRead.createMany.mockResolvedValue({
        count: 2,
      });

      await service.markAllAsRead('user-1');

      expect(mockPrismaService.sysNoticeRead.createMany).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.arrayContaining([
            expect.objectContaining({ noticeId: 'notice-2' }),
            expect.objectContaining({ noticeId: 'notice-3' }),
          ]),
        }),
      );
    });

    it('无通知时应该直接返回', async () => {
      mockPrismaService.sysNotice.findMany.mockResolvedValue([]);

      await service.markAllAsRead('user-1');

      expect(mockPrismaService.sysNoticeRead.findMany).not.toHaveBeenCalled();
      expect(mockPrismaService.sysNoticeRead.createMany).not.toHaveBeenCalled();
    });

    it('全部已读时不应该创建记录', async () => {
      mockPrismaService.sysNotice.findMany.mockResolvedValue([
        { id: 'notice-1' },
        { id: 'notice-2' },
      ]);

      mockPrismaService.sysNoticeRead.findMany.mockResolvedValue([
        { noticeId: 'notice-1' },
        { noticeId: 'notice-2' },
      ] as any);

      await service.markAllAsRead('user-1');

      expect(mockPrismaService.sysNoticeRead.createMany).not.toHaveBeenCalled();
    });
  });
});

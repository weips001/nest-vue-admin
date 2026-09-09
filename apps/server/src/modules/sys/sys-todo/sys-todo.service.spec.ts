jest.mock('@prisma/client', () => ({ Prisma: {} }));
jest.mock('nestjs-prisma', () => ({ PrismaService: class PrismaService {} }));

import { ApiException } from '@/common/exceptions/api.exception';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from 'nestjs-prisma';
import { SysTodoService } from './sys-todo.service';

/* Mock 类型定义 */
type MockMethod = jest.Mock;

interface MockSysTodo {
  create: MockMethod;
  findUnique: MockMethod;
  findMany: MockMethod;
  update: MockMethod;
  delete: MockMethod;
  count: MockMethod;
}

interface MockPrisma {
  sysTodo: MockSysTodo;
}

describe('SysTodoService', () => {
  let service: SysTodoService;
  let prisma: MockPrisma;

  const mockPrismaService: MockPrisma = {
    sysTodo: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SysTodoService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<SysTodoService>(SysTodoService);
    prisma = module.get(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('findAll', () => {
    it('应该返回当前用户的待办列表', async () => {
      const mockTodos = [
        { id: 'todo-1', title: '待办1', userId: 'user-1' },
        { id: 'todo-2', title: '待办2', userId: 'user-1' },
      ];

      mockPrismaService.sysTodo.findMany.mockResolvedValue(mockTodos as any);
      mockPrismaService.sysTodo.count.mockResolvedValue(2);

      const result = await service.findAll('user-1', {
        skip: 0,
        take: 10,
      } as any);

      expect(result.list).toHaveLength(2);
      expect(result.total).toBe(2);
      expect(mockPrismaService.sysTodo.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            userId: 'user-1',
          }),
        }),
      );
    });

    it('应该支持按标题模糊查询', async () => {
      mockPrismaService.sysTodo.findMany.mockResolvedValue([]);
      mockPrismaService.sysTodo.count.mockResolvedValue(0);

      await service.findAll('user-1', {
        skip: 0,
        take: 10,
        title: '审批',
      } as any);

      expect(mockPrismaService.sysTodo.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            title: { contains: '审批' },
          }),
        }),
      );
    });

    it('应该支持按状态筛选', async () => {
      mockPrismaService.sysTodo.findMany.mockResolvedValue([]);
      mockPrismaService.sysTodo.count.mockResolvedValue(0);

      await service.findAll('user-1', {
        skip: 0,
        take: 10,
        status: 'pending',
      } as any);

      expect(mockPrismaService.sysTodo.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: 'pending',
          }),
        }),
      );
    });
  });

  describe('findAllAdmin', () => {
    it('管理端应该返回所有待办列表（包含用户信息）', async () => {
      const mockTodos = [
        {
          id: 'todo-1',
          title: '待办1',
          user: { id: 'user-1', nickName: '用户1', userName: 'user1' },
        },
      ];

      mockPrismaService.sysTodo.findMany.mockResolvedValue(mockTodos as any);
      mockPrismaService.sysTodo.count.mockResolvedValue(1);

      const result = await service.findAllAdmin({ skip: 0, take: 10 } as any);

      expect(result.list).toHaveLength(1);
      expect(mockPrismaService.sysTodo.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          include: {
            user: {
              select: { id: true, nickName: true, userName: true },
            },
          },
        }),
      );
    });
  });

  describe('findOne', () => {
    it('应该返回待办详情', async () => {
      const mockTodo = {
        id: 'todo-1',
        title: '待办1',
        user: { id: 'user-1', nickName: '用户1' },
      };

      mockPrismaService.sysTodo.findUnique.mockResolvedValue(mockTodo as any);

      const result = await service.findOne('todo-1');

      expect(result).toEqual(mockTodo);
    });

    it('待办不存在时应该抛出异常', async () => {
      mockPrismaService.sysTodo.findUnique.mockResolvedValue(null);

      await expect(service.findOne('non-existent')).rejects.toThrow(
        ApiException,
      );
      await expect(service.findOne('non-existent')).rejects.toThrow(
        '待办事项不存在',
      );
    });
  });

  describe('create', () => {
    it('应该成功创建待办', async () => {
      const createDto = {
        title: '新待办',
        content: '待办内容',
        bizType: 'approval',
        priority: 'high',
        userId: 'user-2',
      };

      mockPrismaService.sysTodo.create.mockResolvedValue({
        id: 'todo-new',
        ...createDto,
      } as any);

      const result = await service.create(createDto as any, 'user-1');

      expect(result.title).toBe('新待办');
      expect(mockPrismaService.sysTodo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            title: '新待办',
            createBy: 'user-1',
            createById: 'user-1',
          }),
        }),
      );
    });
  });

  describe('update', () => {
    it('应该成功更新待办', async () => {
      const updateDto = { title: '更新后的标题' };

      mockPrismaService.sysTodo.findUnique.mockResolvedValue({
        id: 'todo-1',
        title: '原标题',
        status: 'pending',
      } as any);

      mockPrismaService.sysTodo.update.mockResolvedValue({
        id: 'todo-1',
        title: '更新后的标题',
      } as any);

      const result = await service.update('todo-1', updateDto as any);

      expect(result.title).toBe('更新后的标题');
    });

    it('更新不存在的待办时应该抛出异常', async () => {
      mockPrismaService.sysTodo.findUnique.mockResolvedValue(null);

      await expect(
        service.update('non-existent', { title: '新标题' } as any),
      ).rejects.toThrow('待办事项不存在');
    });
  });

  describe('complete', () => {
    it('应该成功完成待办', async () => {
      mockPrismaService.sysTodo.findUnique.mockResolvedValue({
        id: 'todo-1',
        status: 'pending',
      } as any);

      mockPrismaService.sysTodo.update.mockResolvedValue({
        id: 'todo-1',
        status: 'completed',
      } as any);

      const result = await service.complete('todo-1', 'user-1');

      expect(result.status).toBe('completed');
      expect(mockPrismaService.sysTodo.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: 'completed',
            completeBy: 'user-1',
          }),
        }),
      );
    });

    it('待办不存在时应该抛出异常', async () => {
      mockPrismaService.sysTodo.findUnique.mockResolvedValue(null);

      await expect(service.complete('non-existent', 'user-1')).rejects.toThrow(
        '待办事项不存在',
      );
    });

    it('待办已处理时应该抛出异常', async () => {
      mockPrismaService.sysTodo.findUnique.mockResolvedValue({
        id: 'todo-1',
        status: 'completed',
      } as any);

      await expect(service.complete('todo-1', 'user-1')).rejects.toThrow(
        '该待办已处理',
      );
    });
  });

  describe('cancel', () => {
    it('应该成功取消待办', async () => {
      mockPrismaService.sysTodo.findUnique.mockResolvedValue({
        id: 'todo-1',
        status: 'pending',
      } as any);

      mockPrismaService.sysTodo.update.mockResolvedValue({
        id: 'todo-1',
        status: 'cancelled',
      } as any);

      const result = await service.cancel('todo-1');

      expect(result.status).toBe('cancelled');
    });

    it('待办不存在时应该抛出异常', async () => {
      mockPrismaService.sysTodo.findUnique.mockResolvedValue(null);

      await expect(service.cancel('non-existent')).rejects.toThrow(
        '待办事项不存在',
      );
    });
  });

  describe('remove', () => {
    it('应该成功删除待办', async () => {
      mockPrismaService.sysTodo.findUnique.mockResolvedValue({
        id: 'todo-1',
        title: '待办1',
      } as any);

      mockPrismaService.sysTodo.delete.mockResolvedValue({
        id: 'todo-1',
      } as any);

      const result = await service.remove('todo-1');

      expect(result.id).toBe('todo-1');
    });

    it('删除不存在的待办时应该抛出异常', async () => {
      mockPrismaService.sysTodo.findUnique.mockResolvedValue(null);

      await expect(service.remove('non-existent')).rejects.toThrow(
        '待办事项不存在',
      );
    });
  });

  describe('getPendingCount', () => {
    it('应该返回待处理的待办数量', async () => {
      mockPrismaService.sysTodo.count.mockResolvedValue(5);

      const result = await service.getPendingCount('user-1');

      expect(result.count).toBe(5);
      expect(mockPrismaService.sysTodo.count).toHaveBeenCalledWith({
        where: { userId: 'user-1', status: 'pending' },
      });
    });

    it('无待处理待办时应该返回0', async () => {
      mockPrismaService.sysTodo.count.mockResolvedValue(0);

      const result = await service.getPendingCount('user-1');

      expect(result.count).toBe(0);
    });
  });
});

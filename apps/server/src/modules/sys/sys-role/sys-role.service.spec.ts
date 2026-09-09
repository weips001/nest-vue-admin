import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from 'nestjs-prisma';
import { SysRoleService } from './sys-role.service';

jest.mock('@/utils/util', () => ({
  generateRedisKey: jest.fn((...args: string[]) => args.join(':')),
  generateUUid: jest.fn(() => 'mock-uuid'),
}));

describe('SysRoleService - 角色分配用户', () => {
  let service: SysRoleService;
  let prismaMock: any;
  let cacheManagerMock: any;

  beforeEach(async () => {
    prismaMock = {
      sysRole: {
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      sysUser: {
        findMany: jest.fn(),
      },
    };

    cacheManagerMock = {
      get: jest.fn(),
      set: jest.fn(),
      del: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SysRoleService,
        { provide: PrismaService, useValue: prismaMock },
        { provide: CACHE_MANAGER, useValue: cacheManagerMock },
      ],
    }).compile();

    service = module.get<SysRoleService>(SysRoleService);
  });

  afterEach(() => jest.clearAllMocks());

  describe('getRoleUsers', () => {
    it('应返回角色关联的用户 ID 列表', async () => {
      prismaMock.sysRole.findUnique.mockResolvedValue({
        users: [{ id: 'user-1' }, { id: 'user-2' }],
      });

      const result = await service.getRoleUsers('role-1');

      expect(prismaMock.sysRole.findUnique).toHaveBeenCalledWith({
        where: { id: 'role-1' },
        select: { users: { select: { id: true } } },
      });
      expect(result).toEqual({ userIds: ['user-1', 'user-2'] });
    });

    it('角色不存在时应返回空列表', async () => {
      prismaMock.sysRole.findUnique.mockResolvedValue(null);

      const result = await service.getRoleUsers('nonexistent');

      expect(result).toEqual({ userIds: [] });
    });
  });

  describe('updateRoleUsers', () => {
    it('应清除旧用户和新用户的缓存（去重）', async () => {
      prismaMock.sysRole.findUnique.mockResolvedValue({
        id: 'role-1',
        isSuper: false,
      });
      prismaMock.sysUser.findMany
        // 第一次：更新前查询旧用户
        .mockResolvedValueOnce([{ id: 'user-1' }, { id: 'user-2' }])
        // 第二次：更新后查询新用户
        .mockResolvedValueOnce([{ id: 'user-2' }, { id: 'user-3' }]);
      prismaMock.sysRole.update.mockResolvedValue({ id: 'role-1' });

      await service.updateRoleUsers(
        'role-1',
        { userIds: ['user-2', 'user-3'] },
        { isSuper: false } as any,
      );

      // user-1(旧)、user-2(旧+新)、user-3(新) 去重后 3 个
      expect(cacheManagerMock.del).toHaveBeenCalledTimes(3);
      expect(cacheManagerMock.del).toHaveBeenCalledWith('user:info:user-1');
      expect(cacheManagerMock.del).toHaveBeenCalledWith('user:info:user-2');
      expect(cacheManagerMock.del).toHaveBeenCalledWith('user:info:user-3');
    });

    it('非超管不能给超管角色分配用户', async () => {
      prismaMock.sysRole.findUnique.mockResolvedValue({
        id: 'super-role',
        isSuper: true,
      });

      await expect(
        service.updateRoleUsers('super-role', { userIds: ['user-1'] }, {
          isSuper: false,
        } as any),
      ).rejects.toThrow('只有超级管理员才能修改超管角色');

      expect(prismaMock.sysRole.update).not.toHaveBeenCalled();
      expect(cacheManagerMock.del).not.toHaveBeenCalled();
    });

    it('超管可以给超管角色分配用户', async () => {
      prismaMock.sysRole.findUnique.mockResolvedValue({
        id: 'super-role',
        isSuper: true,
      });
      prismaMock.sysUser.findMany
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([{ id: 'user-1' }]);
      prismaMock.sysRole.update.mockResolvedValue({ id: 'super-role' });

      await service.updateRoleUsers('super-role', { userIds: ['user-1'] }, {
        isSuper: true,
      } as any);

      expect(prismaMock.sysRole.update).toHaveBeenCalled();
      expect(cacheManagerMock.del).toHaveBeenCalledWith('user:info:user-1');
    });

    it('角色不存在时应抛出异常', async () => {
      prismaMock.sysRole.findUnique.mockResolvedValue(null);

      await expect(
        service.updateRoleUsers('nonexistent', { userIds: [] }, {
          isSuper: false,
        } as any),
      ).rejects.toThrow('角色不存在');
    });
  });
});

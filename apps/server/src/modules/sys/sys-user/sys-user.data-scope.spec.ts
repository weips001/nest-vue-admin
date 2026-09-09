jest.mock('@prisma/client', () => ({ Prisma: {} }));
jest.mock('nestjs-prisma', () => ({ PrismaService: class PrismaService {} }));

import { DataScopeEnum } from '@/common/enums/dataScope.enum';
import { DataScopeService } from '@/common/services/data-scope.service';
import { SysUserService } from './sys-user.service';

describe('SysUserService data scope integration', () => {
  let service: SysUserService;
  let prismaMock: any;

  const currentUser = {
    id: 'user-1',
    userName: 'user1',
    isSuper: false,
    dataScope: {
      scope: DataScopeEnum.SELF,
      deptIds: [],
    },
  } as any;

  beforeEach(() => {
    prismaMock = {
      sysUser: {
        findMany: jest.fn().mockResolvedValue([]),
        count: jest.fn().mockResolvedValue(0),
        findFirst: jest.fn().mockResolvedValue(null),
        findUnique: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue({ id: 'new-user' }),
        update: jest.fn(),
        delete: jest.fn(),
      },
      sysDept: { findMany: jest.fn().mockResolvedValue([]) },
      sysRole: {
        count: jest.fn().mockResolvedValue(0),
        findFirst: jest.fn().mockResolvedValue(null),
      },
      sysPasswordHistory: { create: jest.fn() },
      $transaction: jest.fn((callback) => callback(prismaMock)),
    };

    service = new (SysUserService as any)(
      prismaMock,
      { del: jest.fn() },
      { export: jest.fn() },
      { get: jest.fn() },
      new DataScopeService(),
    );
  });

  it('列表查询应将业务条件和数据权限条件取交集', async () => {
    await service.findAll(
      { status: '0', skip: 0, take: 10 } as any,
      currentUser,
    );

    const expectedWhere = {
      AND: [{ status: '0' }, { createById: 'user-1' }],
    };
    expect(prismaMock.sysUser.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expectedWhere }),
    );
    expect(prismaMock.sysUser.count).toHaveBeenCalledWith({
      where: expectedWhere,
    });
  });

  it('创建用户时应写入创建人 ID', async () => {
    await service.create(
      { userName: 'newuser', nickName: 'New User', roleIds: [] } as any,
      currentUser,
    );

    expect(prismaMock.sysUser.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ createById: 'user-1' }),
      }),
    );
  });

  it('详情查询应将用户 ID 与数据权限条件取交集', async () => {
    prismaMock.sysUser.findFirst.mockResolvedValue({
      id: 'target-user',
      roles: [],
      post: null,
    });

    await service.findOne('target-user', currentUser);

    expect(prismaMock.sysUser.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          AND: [{ id: 'target-user' }, { createById: 'user-1' }],
        },
      }),
    );
  });

  it('更新越权用户时应拒绝并且不执行更新', async () => {
    await expect(
      service.update('target-user', { userName: 'target' } as any, currentUser),
    ).rejects.toThrow('用户不存在');

    expect(prismaMock.sysUser.findFirst).toHaveBeenCalledWith({
      where: {
        AND: [{ id: 'target-user' }, { createById: 'user-1' }],
      },
    });
    expect(prismaMock.sysUser.update).not.toHaveBeenCalled();
  });

  it('删除越权用户时应拒绝并且不执行删除', async () => {
    await expect(service.remove('target-user', currentUser)).rejects.toThrow(
      '用户不存在',
    );

    expect(prismaMock.sysUser.findFirst).toHaveBeenCalledWith({
      where: {
        AND: [{ id: 'target-user' }, { createById: 'user-1' }],
      },
    });
    expect(prismaMock.sysUser.delete).not.toHaveBeenCalled();
  });

  it('用户选项列表应应用数据权限', async () => {
    await service.getOptions(currentUser);

    expect(prismaMock.sysUser.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          AND: [{ status: '0' }, { createById: 'user-1' }],
        },
      }),
    );
  });

  it('含部门的全量用户列表应应用数据权限', async () => {
    await service.listAllWithDept(currentUser);

    expect(prismaMock.sysUser.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          AND: [{ status: '0' }, { createById: 'user-1' }],
        },
      }),
    );
  });
});

jest.mock('@prisma/client', () => ({ Prisma: {} }));
jest.mock('nestjs-prisma', () => ({ PrismaService: class PrismaService {} }));

import { DataScopeEnum } from '@/common/enums/dataScope.enum';
import { DataScopeService } from '@/common/services/data-scope.service';
import { SysPostService } from './sys-post.service';

describe('SysPostService data scope integration', () => {
  let service: SysPostService;
  let prismaMock: any;

  const currentUser = {
    id: 'user-1',
    dataScope: {
      scope: DataScopeEnum.DEPT,
      deptIds: ['dept-1'],
    },
  } as any;

  beforeEach(() => {
    prismaMock = {
      sysPost: {
        findMany: jest.fn().mockResolvedValue([]),
        count: jest.fn().mockResolvedValue(0),
        findFirst: jest.fn().mockResolvedValue(null),
        findUnique: jest.fn().mockResolvedValue(null),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      sysDept: { findMany: jest.fn().mockResolvedValue([]) },
      sysUser: { groupBy: jest.fn().mockResolvedValue([]), count: jest.fn() },
    };

    service = new (SysPostService as any)(
      prismaMock,
      { del: jest.fn() },
      { export: jest.fn() },
      new DataScopeService(),
    );
  });

  it('列表查询应将业务条件和部门数据权限条件取交集', async () => {
    await service.findAll(
      { name: '研发', skip: 0, take: 10 } as any,
      currentUser,
    );

    const expectedWhere = {
      AND: [{ name: { contains: '研发' } }, { deptId: { in: ['dept-1'] } }],
    };
    expect(prismaMock.sysPost.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expectedWhere }),
    );
    expect(prismaMock.sysPost.count).toHaveBeenCalledWith({
      where: expectedWhere,
    });
  });

  it('详情查询应限制在数据权限范围内', async () => {
    await service.findOne('post-1', currentUser);

    expect(prismaMock.sysPost.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          AND: [{ id: 'post-1' }, { deptId: { in: ['dept-1'] } }],
        },
      }),
    );
  });

  it('更新越权岗位时应拒绝并且不执行更新', async () => {
    await expect(
      service.update('post-1', { name: '新岗位' } as any, currentUser),
    ).rejects.toThrow('岗位不存在');

    expect(prismaMock.sysPost.findFirst).toHaveBeenCalledWith({
      where: {
        AND: [{ id: 'post-1' }, { deptId: { in: ['dept-1'] } }],
      },
    });
    expect(prismaMock.sysPost.update).not.toHaveBeenCalled();
  });

  it('删除越权岗位时应拒绝并且不执行删除', async () => {
    await expect(service.remove('post-1', currentUser)).rejects.toThrow(
      '岗位不存在',
    );

    expect(prismaMock.sysPost.findFirst).toHaveBeenCalledWith({
      where: {
        AND: [{ id: 'post-1' }, { deptId: { in: ['dept-1'] } }],
      },
    });
    expect(prismaMock.sysPost.delete).not.toHaveBeenCalled();
  });

  it('岗位选项应限制在数据权限范围内', async () => {
    await service.getOptions('dept-1', currentUser);

    expect(prismaMock.sysPost.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          AND: [
            { status: '0', OR: [{ deptId: null }, { deptId: 'dept-1' }] },
            { deptId: { in: ['dept-1'] } },
          ],
        },
      }),
    );
  });
});

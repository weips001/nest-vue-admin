import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from 'nestjs-prisma';
import { SysDictService } from './sys-dict.service';

import { ApiException } from '@/common/exceptions/api.exception';

jest.mock('@/utils/util', () => ({
  generateRedisKey: jest.fn((...args: string[]) => args.join(':')),
}));

/* Mock 类型定义 */
type MockMethod = jest.Mock;

interface MockSysDict {
  findFirst: MockMethod;
  findMany: MockMethod;
  create: MockMethod;
  update: MockMethod;
  delete: MockMethod;
  count: MockMethod;
}

interface MockSysDictDetail {
  findFirst: MockMethod;
}

interface MockPrisma {
  sysDict: MockSysDict;
  sysDictDetail: MockSysDictDetail;
}

describe('SysDictService', () => {
  let service: SysDictService;
  let prisma: MockPrisma;
  let cacheManager: { get: MockMethod; set: MockMethod; del: MockMethod };

  const mockPrismaService: MockPrisma = {
    sysDict: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
    sysDictDetail: {
      findFirst: jest.fn(),
    },
  };

  const mockCacheManager = {
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SysDictService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: CACHE_MANAGER, useValue: mockCacheManager },
      ],
    }).compile();

    service = module.get<SysDictService>(SysDictService);
    prisma = module.get(PrismaService);
    cacheManager = module.get(CACHE_MANAGER);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  /* ======================== create ======================== */
  describe('create', () => {
    it('code 不存在时应该正常创建字典', async () => {
      const createDto = { code: 'gender', name: '性别', status: '0' };
      const created = { id: 1, ...createDto };

      prisma.sysDict.findFirst.mockResolvedValue(null);
      prisma.sysDict.create.mockResolvedValue(created);

      const result = await service.create(createDto as any);

      expect(prisma.sysDict.findFirst).toHaveBeenCalledWith({
        where: { code: 'gender' },
      });
      expect(prisma.sysDict.create).toHaveBeenCalledWith({
        data: { ...createDto },
      });
      expect(result).toEqual(created);
    });

    it('code 已存在时应该抛出 ApiException("字典值已存在")', async () => {
      const createDto = { code: 'gender', name: '性别', status: '0' };

      prisma.sysDict.findFirst.mockResolvedValue({ id: 1, code: 'gender' });

      await expect(service.create(createDto as any)).rejects.toThrow(
        ApiException,
      );
      await expect(service.create(createDto as any)).rejects.toThrow(
        '字典值已存在',
      );
      expect(prisma.sysDict.create).not.toHaveBeenCalled();
    });
  });

  /* ======================== findAll ======================== */
  describe('findAll', () => {
    it('应该根据筛选条件返回 { list, total }', async () => {
      const query = {
        name: '性别',
        code: 'gen',
        status: '0',
        skip: 0,
        take: 10,
      };

      const mockList = [{ id: 1, code: 'gender', name: '性别', status: '0' }];
      const mockTotal = 1;

      prisma.sysDict.findMany.mockResolvedValue(mockList);
      prisma.sysDict.count.mockResolvedValue(mockTotal);

      const result = await service.findAll(query as any);

      const expectedWhere = {
        name: { contains: '性别' },
        code: { contains: 'gen' },
        status: '0',
      };
      expect(prisma.sysDict.findMany).toHaveBeenCalledWith({
        where: expectedWhere,
        skip: 0,
        take: 10,
      });
      expect(prisma.sysDict.count).toHaveBeenCalledWith({
        where: expectedWhere,
      });
      expect(result).toEqual({ list: mockList, total: mockTotal });
    });

    it('无筛选条件时 where 应为空对象', async () => {
      const query = { skip: 0, take: 10 };

      prisma.sysDict.findMany.mockResolvedValue([]);
      prisma.sysDict.count.mockResolvedValue(0);

      const result = await service.findAll(query as any);

      expect(prisma.sysDict.findMany).toHaveBeenCalledWith({
        where: {},
        skip: 0,
        take: 10,
      });
      expect(result).toEqual({ list: [], total: 0 });
    });
  });

  /* ======================== findOne ======================== */
  describe('findOne', () => {
    it('缓存命中时应该直接返回缓存数据，不查数据库', async () => {
      const cached = { id: 1, code: 'gender', name: '性别', details: [] };

      cacheManager.get.mockResolvedValue(cached);

      const result = await service.findOne('gender');

      expect(cacheManager.get).toHaveBeenCalledWith('dict:key:gender');
      expect(result).toEqual(cached);
      expect(prisma.sysDict.findFirst).not.toHaveBeenCalled();
      expect(cacheManager.set).not.toHaveBeenCalled();
    });

    it('缓存未命中时应该查数据库并写入缓存', async () => {
      const dbResult = {
        id: 1,
        code: 'gender',
        name: '性别',
        status: '0',
        details: [{ id: 1, label: '男', value: '1' }],
      };

      cacheManager.get.mockResolvedValue(null);
      prisma.sysDict.findFirst.mockResolvedValue(dbResult);

      const result = await service.findOne('gender');

      expect(cacheManager.get).toHaveBeenCalledWith('dict:key:gender');
      expect(prisma.sysDict.findFirst).toHaveBeenCalledWith({
        where: { code: 'gender', status: '0' },
        include: { details: true },
      });
      expect(cacheManager.set).toHaveBeenCalledWith(
        'dict:key:gender',
        dbResult,
      );
      expect(result).toEqual(dbResult);
    });

    it('缓存未命中且数据库也无数据时不应写入缓存', async () => {
      cacheManager.get.mockResolvedValue(null);
      prisma.sysDict.findFirst.mockResolvedValue(null);

      const result = await service.findOne('nonexistent');

      expect(cacheManager.set).not.toHaveBeenCalled();
      expect(result).toBeNull();
    });
  });

  /* ======================== update ======================== */
  describe('update', () => {
    it('code 未重复时应该更新字典并刷新缓存', async () => {
      const updateDto = { code: 'gender', name: '性别V2', status: '0' };
      const updated = { id: 1, ...updateDto };

      prisma.sysDict.findFirst.mockResolvedValue(null);
      prisma.sysDict.update.mockResolvedValue(updated);

      const result = await service.update(1, updateDto as any);

      expect(prisma.sysDict.findFirst).toHaveBeenCalledWith({
        where: { code: 'gender', id: { not: 1 } },
      });
      expect(prisma.sysDict.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { ...updateDto },
      });
      // 先删缓存，再写缓存
      expect(cacheManager.del).toHaveBeenCalledWith('dict:key:gender');
      expect(cacheManager.set).toHaveBeenCalledWith('dict:key:gender', updated);
      expect(result).toEqual(updated);
    });

    it('code 与其他记录重复时应该抛出 ApiException("字典值已存在")', async () => {
      const updateDto = { code: 'status', name: '状态', status: '0' };

      prisma.sysDict.findFirst.mockResolvedValue({ id: 2, code: 'status' });

      await expect(service.update(1, updateDto as any)).rejects.toThrow(
        ApiException,
      );
      await expect(service.update(1, updateDto as any)).rejects.toThrow(
        '字典值已存在',
      );
      expect(prisma.sysDict.update).not.toHaveBeenCalled();
      expect(cacheManager.del).not.toHaveBeenCalled();
    });
  });

  /* ======================== remove ======================== */
  describe('remove', () => {
    it('字典下无详情时应该删除字典并清除缓存', async () => {
      prisma.sysDictDetail.findFirst.mockResolvedValue(null);
      prisma.sysDict.delete.mockResolvedValue({ id: 1, code: 'gender' });

      await service.remove('gender');

      expect(prisma.sysDictDetail.findFirst).toHaveBeenCalledWith({
        where: { sysDictCode: 'gender' },
      });
      expect(prisma.sysDict.delete).toHaveBeenCalledWith({
        where: { code: 'gender' },
      });
      expect(cacheManager.del).toHaveBeenCalledWith('dict:key:gender');
    });

    it('字典下有详情时应该抛出 Error', async () => {
      prisma.sysDictDetail.findFirst.mockResolvedValue({
        id: 1,
        sysDictCode: 'gender',
      });

      await expect(service.remove('gender')).rejects.toThrow(
        '该字典下有字典详情，请先删除字典详情信息',
      );
      expect(prisma.sysDict.delete).not.toHaveBeenCalled();
      expect(cacheManager.del).not.toHaveBeenCalled();
    });

    it('code 为空时应该抛出 ApiException("参数异常")', async () => {
      await expect(service.remove('')).rejects.toThrow(ApiException);
      await expect(service.remove('')).rejects.toThrow('参数异常');
      expect(prisma.sysDictDetail.findFirst).not.toHaveBeenCalled();
      expect(prisma.sysDict.delete).not.toHaveBeenCalled();
    });
  });

  /* ======================== removeCache ======================== */
  describe('removeCache', () => {
    it('应该逐个删除所有 code 对应的缓存', async () => {
      await service.removeCache(['gender', 'status', 'type']);

      expect(cacheManager.del).toHaveBeenCalledTimes(3);
      expect(cacheManager.del).toHaveBeenCalledWith('dict:key:gender');
      expect(cacheManager.del).toHaveBeenCalledWith('dict:key:status');
      expect(cacheManager.del).toHaveBeenCalledWith('dict:key:type');
    });

    it('传入空数组时不应调用 del', async () => {
      await service.removeCache([]);

      expect(cacheManager.del).not.toHaveBeenCalled();
    });
  });
});

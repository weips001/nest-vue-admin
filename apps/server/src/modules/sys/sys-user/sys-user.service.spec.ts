jest.mock('@prisma/client', () => ({ Prisma: {} }));
jest.mock('nestjs-prisma', () => ({ PrismaService: class PrismaService {} }));

import { ExcelExportService } from '@/common/class/export.class';
import { DataScopeService } from '@/common/services/data-scope.service';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from 'nestjs-prisma';
import { SysUserService } from './sys-user.service';

jest.mock('bcryptjs', () => ({
  compare: jest.fn(),
  genSalt: jest.fn(),
  hash: jest.fn(),
}));

jest.mock('@/utils/util', () => ({
  generateRedisKey: jest.fn((...args: string[]) => args.join(':')),
  generateUUid: jest.fn(() => 'mock-uuid'),
}));

describe('SysUserService - 创建用户写入初始密码历史 (Task 7)', () => {
  let service: SysUserService;
  let prismaMock: any;
  let mockTx: any;

  beforeEach(async () => {
    mockTx = {
      sysUser: { findFirst: jest.fn(), create: jest.fn() },
      sysRole: { count: jest.fn() },
      sysPasswordHistory: { create: jest.fn() },
    };

    prismaMock = {
      $transaction: jest.fn((cb: any) => cb(mockTx)),
      sysUser: {
        findFirst: jest.fn(),
        findUnique: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        count: jest.fn(),
      },
      sysPasswordHistory: {
        findMany: jest.fn(),
        create: jest.fn(),
        deleteMany: jest.fn(),
      },
      sysRole: { count: jest.fn(), findFirst: jest.fn() },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SysUserService,
        { provide: PrismaService, useValue: prismaMock },
        {
          provide: CACHE_MANAGER,
          useValue: { get: jest.fn(), set: jest.fn(), del: jest.fn() },
        },
        { provide: ExcelExportService, useValue: { export: jest.fn() } },
        {
          provide: ConfigService,
          useValue: { get: jest.fn().mockReturnValue(5) },
        },
        { provide: DataScopeService, useValue: new DataScopeService() },
      ],
    }).compile();

    service = module.get<SysUserService>(SysUserService);
  });

  afterEach(() => jest.clearAllMocks());

  describe('create', () => {
    it('创建用户时应同时写入初始密码历史记录', async () => {
      const createDto = {
        userName: 'newuser',
        nickName: 'New User',
        roleIds: ['role-1'],
      };
      const mockCreated = {
        id: 'mock-uuid',
        userName: 'newuser',
        nickName: 'New User',
      };

      mockTx.sysUser.findFirst.mockResolvedValue(null);
      (bcrypt.genSalt as jest.Mock).mockResolvedValue('mock-salt');
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed-123456');
      mockTx.sysUser.create.mockResolvedValue(mockCreated);
      mockTx.sysPasswordHistory.create.mockResolvedValue({});

      const result = await service.create(
        createDto as any,
        { isSuper: true } as any,
      );

      // 验证事务被使用
      expect(prismaMock.$transaction).toHaveBeenCalled();

      // 验证用户创建数据包含密码
      expect(mockTx.sysUser.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            userName: 'newuser',
            password: 'hashed-123456',
            mustChangePassword: true,
          }),
        }),
      );

      // 验证密码历史写入
      expect(mockTx.sysPasswordHistory.create).toHaveBeenCalledWith({
        data: {
          id: 'mock-uuid',
          userId: 'mock-uuid',
          passwordHash: 'hashed-123456',
        },
      });

      expect(result).toEqual(mockCreated);
    });

    it('用户名已存在时应抛出异常，不写入密码历史', async () => {
      mockTx.sysUser.findFirst.mockResolvedValue({
        id: 'existing-id',
        userName: 'newuser',
      });

      await expect(
        service.create(
          { userName: 'newuser', roleIds: [] } as any,
          { isSuper: true } as any,
        ),
      ).rejects.toThrow('用户名已存在');

      expect(mockTx.sysUser.create).not.toHaveBeenCalled();
      expect(mockTx.sysPasswordHistory.create).not.toHaveBeenCalled();
    });
  });
});

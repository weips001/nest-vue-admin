import { ExcelExportService } from '@/common/class/export.class';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from 'nestjs-prisma';
import { SysLoginLogService } from './sys-login-log.service';

jest.mock('@/utils/util', () => ({
  generateRedisKey: jest.fn((...args: string[]) => args.join(':')),
  getRequestIp: jest.fn(() => '127.0.0.1'),
  getIpLocation: jest.fn(() => '本地'),
}));

jest.mock('ua-parser-js', () => ({
  UAParser: jest.fn().mockImplementation(() => ({
    getResult: () => ({
      browser: { name: 'Chrome', version: '120' },
      os: { name: 'Windows', version: '10' },
    }),
  })),
}));

describe('SysLoginLogService', () => {
  let service: SysLoginLogService;
  let prismaMock: any;
  let configService: { get: jest.Mock };
  let cacheManager: { get: jest.Mock; set: jest.Mock; del: jest.Mock };

  beforeEach(async () => {
    prismaMock = {
      sysLoginLog: {
        create: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
        findUnique: jest.fn(),
        deleteMany: jest.fn(),
        updateMany: jest.fn(),
      },
    };

    configService = { get: jest.fn() };
    cacheManager = { get: jest.fn(), set: jest.fn(), del: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SysLoginLogService,
        { provide: PrismaService, useValue: prismaMock },
        { provide: ConfigService, useValue: configService },
        { provide: CACHE_MANAGER, useValue: cacheManager },
        { provide: ExcelExportService, useValue: { export: jest.fn() } },
      ],
    }).compile();

    service = module.get<SysLoginLogService>(SysLoginLogService);
  });

  afterEach(() => jest.clearAllMocks());

  // ==================== recordSuccess 带 expireTime ====================

  describe('recordSuccess - 记录登录成功并写入 expireTime', () => {
    it('应写入 expireTime（当前时间 + refreshTokenExpiresIn）', async () => {
      const refreshTokenExpiresIn = 604800; // 7天
      configService.get.mockReturnValue({ refreshTokenExpiresIn });
      prismaMock.sysLoginLog.create.mockResolvedValue({ id: 1 });

      const mockRequest = {
        body: { userName: 'testuser' },
        headers: { 'user-agent': 'Chrome/120' },
      } as any;

      await service.recordSuccess(mockRequest, 'user-1');

      expect(prismaMock.sysLoginLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            userId: 'user-1',
            userName: 'testuser',
            status: '0',
            expireTime: expect.any(Date),
          }),
        }),
      );

      // 验证 expireTime 大致等于 now + 7天
      const call = prismaMock.sysLoginLog.create.mock.calls[0][0];
      const expireTime = call.data.expireTime as Date;
      const expectedExpiry = Date.now() + refreshTokenExpiresIn * 1000;
      expect(Math.abs(expireTime.getTime() - expectedExpiry)).toBeLessThan(
        5000,
      );
    });

    it('成功登录的记录 logoutTime 应为 null', async () => {
      configService.get.mockReturnValue({ refreshTokenExpiresIn: 3600 });
      prismaMock.sysLoginLog.create.mockResolvedValue({ id: 1 });

      const mockRequest = {
        body: { userName: 'testuser' },
        headers: { 'user-agent': '' },
      } as any;

      await service.recordSuccess(mockRequest, 'user-1');

      const call = prismaMock.sysLoginLog.create.mock.calls[0][0];
      expect(call.data.logoutTime).toBeUndefined();
    });
  });

  // ==================== findOnlineUsers 在线用户列表 ====================

  describe('findOnlineUsers - 查询在线用户列表', () => {
    it('应查询 status=0、logoutTime=null、expireTime > now 的记录', async () => {
      const mockOnlineUsers = [
        {
          id: 1,
          userId: 'user-1',
          userName: 'admin',
          ip: '127.0.0.1',
          location: '本地',
          browser: 'Chrome 120',
          os: 'Windows 10',
          createdAt: new Date(),
          expireTime: new Date(Date.now() + 86400000),
        },
      ];
      prismaMock.sysLoginLog.findMany.mockResolvedValue(mockOnlineUsers);
      prismaMock.sysLoginLog.count.mockResolvedValue(1);

      const result = await service.findOnlineUsers({
        current: 1,
        pageSize: 20,
        skip: 0,
        take: 20,
      } as any);

      expect(result).toEqual({ list: mockOnlineUsers, total: 1 });

      // 验证查询条件
      const whereArg = prismaMock.sysLoginLog.findMany.mock.calls[0][0].where;
      expect(whereArg.status).toBe('0');
      expect(whereArg.logoutTime).toBe(null);
      expect(whereArg.expireTime.gte).toBeInstanceOf(Date);
    });

    it('应支持按用户名筛选', async () => {
      prismaMock.sysLoginLog.findMany.mockResolvedValue([]);
      prismaMock.sysLoginLog.count.mockResolvedValue(0);

      await service.findOnlineUsers({
        current: 1,
        pageSize: 20,
        skip: 0,
        take: 20,
        userName: 'admin',
      } as any);

      const whereArg = prismaMock.sysLoginLog.findMany.mock.calls[0][0].where;
      expect(whereArg.userName).toEqual({ contains: 'admin' });
    });

    it('应按登录时间倒序排列', async () => {
      prismaMock.sysLoginLog.findMany.mockResolvedValue([]);
      prismaMock.sysLoginLog.count.mockResolvedValue(0);

      await service.findOnlineUsers({
        current: 1,
        pageSize: 20,
        skip: 0,
        take: 20,
      } as any);

      const orderBy = prismaMock.sysLoginLog.findMany.mock.calls[0][0].orderBy;
      expect(orderBy).toEqual({ createdAt: 'desc' });
    });
  });

  // ==================== recordLogout 正常登出 ====================

  describe('recordLogout - 更新登出时间', () => {
    it('应将活跃记录的 logoutTime 设为当前时间', async () => {
      prismaMock.sysLoginLog.updateMany.mockResolvedValue({ count: 1 });

      await service.recordLogout('user-1');

      expect(prismaMock.sysLoginLog.updateMany).toHaveBeenCalledWith({
        where: {
          userId: 'user-1',
          status: '0',
          logoutTime: null,
        },
        data: {
          logoutTime: expect.any(Date),
        },
      });
    });

    it('没有活跃记录时不应报错', async () => {
      prismaMock.sysLoginLog.updateMany.mockResolvedValue({ count: 0 });

      await expect(service.recordLogout('user-1')).resolves.not.toThrow();
    });
  });

  // ==================== forceLogout 强制下线 ====================

  describe('forceLogout - 强制下线', () => {
    it('应同时清除 Redis token 和更新 DB logoutTime', async () => {
      prismaMock.sysLoginLog.updateMany.mockResolvedValue({ count: 1 });

      await service.forceLogout('user-1');

      // 验证 Redis 清理
      expect(cacheManager.del).toHaveBeenCalledTimes(3);
      expect(cacheManager.del).toHaveBeenCalledWith('user:info:user-1');
      expect(cacheManager.del).toHaveBeenCalledWith('user:token:user-1');
      expect(cacheManager.del).toHaveBeenCalledWith('user:refresh:user-1');

      // 验证 DB 更新
      expect(prismaMock.sysLoginLog.updateMany).toHaveBeenCalledWith({
        where: {
          userId: 'user-1',
          status: '0',
          logoutTime: null,
        },
        data: {
          logoutTime: expect.any(Date),
        },
      });
    });
  });
});

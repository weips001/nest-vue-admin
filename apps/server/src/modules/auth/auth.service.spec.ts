import { ApiException } from '@/common/exceptions/api.exception';
import type { CurrentUserType, DataScopeWhere, JwtPayloadType } from '@/common/types/auth.type';
import { JwtConfigType } from '@/common/types/config.type';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from 'nestjs-prisma';
import { AuthService } from './auth.service';
import { SysLoginLogService } from '@/modules/sys/sys-login-log/sys-login-log.service';
import * as svgCaptcha from 'svg-captcha';

jest.mock('bcryptjs', () => ({
  compare: jest.fn(),
  genSalt: jest.fn(),
  hash: jest.fn(),
}));

jest.mock('@/utils/util', () => ({
  generateRedisKey: jest.fn((...args: string[]) => args.join(':')),
  generateUUid: jest.fn(() => 'mock-uuid'),
  buildMenuTree: jest.fn(() => []),
}));

jest.mock('@/utils/menu.util', () => ({
  simplifyMenuTree: jest.fn(() => []),
}));

jest.mock('svg-captcha', () => ({
  createMathExpr: jest.fn(() => ({
    text: '3+5',
    data: '<svg>captcha</svg>',
  })),
}));

type MockMethod = jest.Mock;

interface MockPrisma {
  sysUser: { findFirst: MockMethod; findUnique: MockMethod; update: MockMethod };
  sysRole: { findMany: MockMethod; findFirst: MockMethod };
  sysMenu: { findMany: MockMethod };
  sysMenuBtn: { findMany: MockMethod };
  sysDept: { findMany: MockMethod };
  sysPasswordHistory: { findMany: MockMethod; create: MockMethod; deleteMany: MockMethod };
  $transaction: MockMethod;
}

describe('AuthService', () => {
  let service: AuthService;
  let prismaMock: MockPrisma;
  let configService: { get: MockMethod };
  let cacheManager: { get: MockMethod; set: MockMethod; del: MockMethod };
  let jwtService: { sign: MockMethod; verify: MockMethod };

  const mockDbUser = {
    id: 'user-1',
    userName: 'testuser',
    password: 'hashed-password',
    passwordUpdatedAt: new Date('2026-01-01'),
    status: '0',
    mustChangePassword: false,
  };

  const mockCurrentUser = {
    id: 'user-1',
    userName: 'testuser',
    nickName: 'Test User',
    permissions: ['sys:user:list'],
    isSuper: false,
    dataScope: {} as DataScopeWhere,
  } as CurrentUserType;

  beforeEach(async () => {
    prismaMock = {
      sysUser: { findFirst: jest.fn(), findUnique: jest.fn(), update: jest.fn() },
      sysRole: { findMany: jest.fn(), findFirst: jest.fn() },
      sysMenu: { findMany: jest.fn() },
      sysMenuBtn: { findMany: jest.fn() },
      sysDept: { findMany: jest.fn() },
      sysPasswordHistory: { findMany: jest.fn(), create: jest.fn(), deleteMany: jest.fn() },
      $transaction: jest.fn((fn) => fn(prismaMock)),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: prismaMock },
        {
          provide: CACHE_MANAGER,
          useValue: { get: jest.fn(), set: jest.fn(), del: jest.fn() },
        },
        { provide: ConfigService, useValue: { get: jest.fn() } },
        {
          provide: JwtService,
          useValue: {
            sign: jest.fn().mockImplementation((payload: JwtPayloadType & { type?: string }) => {
              if (payload?.type === 'refresh') return 'mock-refresh-token';
              return 'mock-access-token';
            }),
            verify: jest.fn(),
          },
        },
        {
          provide: SysLoginLogService,
          useValue: { recordLogout: jest.fn() },
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    configService = module.get(ConfigService);
    cacheManager = module.get(CACHE_MANAGER);
    jwtService = module.get(JwtService);
  });

  afterEach(() => jest.clearAllMocks());

  /**
   * 设置 validateUser 前置条件（账号未锁定 + 密码校验通过）
   */
  const setupValidAuth = (overrides: { expireDays?: number; passwordUpdatedAt?: Date | null } = {}) => {
    const expireDays = overrides.expireDays ?? 90;
    const passwordUpdatedAt = overrides.passwordUpdatedAt !== undefined
      ? overrides.passwordUpdatedAt
      : new Date('2026-01-01');

    configService.get.mockImplementation((key: string) => {
      const map: Record<string, number | JwtConfigType> = {
        LOGIN_MAX_FAIL_COUNT: 5,
        LOGIN_LOCK_MINUTES: 30,
        PASSWORD_EXPIRE_DAYS: expireDays,
        jwt: { secret: 'test-secret', accessTokenExpiresIn: 7200, refreshTokenExpiresIn: 604800 },
      };
      return map[key];
    });

    cacheManager.get.mockResolvedValue(0);
    (bcrypt.compare as jest.Mock).mockResolvedValue(true);

    const user = { ...mockDbUser, passwordUpdatedAt: passwordUpdatedAt as Date };
    prismaMock.sysUser.findFirst.mockResolvedValue(user);

    jest.spyOn(service, 'getCurrentUser').mockResolvedValue(mockCurrentUser);
  };

  // ==================== Task 6: 密码过期检查 ====================

  describe('validateUser - 密码过期检查', () => {
    it('密码未过期 → 正常返回，无 mustChangePassword', async () => {
      setupValidAuth({ passwordUpdatedAt: new Date() });

      const result = await service.validateUser('testuser', 'password123');

      expect(result).toEqual(mockCurrentUser);
      expect((result as CurrentUserType & { mustChangePassword?: boolean }).mustChangePassword).toBeUndefined();
    });

    it('密码已过期 → 返回 mustChangePassword: true', async () => {
      const expiredDate = new Date();
      expiredDate.setDate(expiredDate.getDate() - 200);
      setupValidAuth({ passwordUpdatedAt: expiredDate });

      const result = await service.validateUser('testuser', 'password123');

      expect((result as CurrentUserType & { mustChangePassword?: boolean }).mustChangePassword).toBe(true);
    });

    it('PASSWORD_EXPIRE_DAYS=0 → 不检查过期，即使密码很旧也正常返回', async () => {
      const oldDate = new Date('2020-01-01');
      setupValidAuth({ expireDays: 0, passwordUpdatedAt: oldDate });

      const result = await service.validateUser('testuser', 'password123');

      expect(result).toEqual(mockCurrentUser);
      expect((result as CurrentUserType & { mustChangePassword?: boolean }).mustChangePassword).toBeUndefined();
    });

    it('passwordUpdatedAt 为 null → 不检查过期', async () => {
      setupValidAuth({ passwordUpdatedAt: null });

      const result = await service.validateUser('testuser', 'password123');

      expect(result).toEqual(mockCurrentUser);
      expect((result as CurrentUserType & { mustChangePassword?: boolean }).mustChangePassword).toBeUndefined();
    });
  });

  // ==================== M-05: 双 Token 刷新机制 ====================

  describe('login - 双 Token 返回', () => {
    it('mustChangePassword=true → 不发放任何 token', async () => {
      const user = { ...mockCurrentUser, mustChangePassword: true };

      const result = await service.login(user);

      expect(result).toEqual({
        mustChangePassword: true,
        message: '密码已过期，请修改密码',
        userId: 'user-1',
      });
      expect(jwtService.sign).not.toHaveBeenCalled();
      expect(cacheManager.set).not.toHaveBeenCalled();
    });

    it('正常登录 → 返回 accessToken、refreshToken 和 home', async () => {
      configService.get.mockImplementation((key: string) => {
        if (key === 'jwt') {
          return { accessTokenExpiresIn: 7200, refreshTokenExpiresIn: 604800 };
        }
      });
      jest.spyOn(service, 'getRoutes').mockResolvedValue([]);

      const result = await service.login(mockCurrentUser);

      expect(result).toHaveProperty('accessToken', 'mock-access-token');
      expect(result).toHaveProperty('refreshToken', 'mock-refresh-token');
      expect(result).toHaveProperty('home');

      // sign 被调用两次：access + refresh
      expect(jwtService.sign).toHaveBeenCalledTimes(2);
      expect(jwtService.sign).toHaveBeenCalledWith({ id: 'user-1' }, { expiresIn: 7200 });
      expect(jwtService.sign).toHaveBeenCalledWith(
        { id: 'user-1', type: 'refresh' },
        { expiresIn: 604800 },
      );

      // set 被调用两次：存 access token + refresh token（秒 * 1000 = 毫秒）
      expect(cacheManager.set).toHaveBeenCalledTimes(2);
      expect(cacheManager.set).toHaveBeenCalledWith(
        expect.stringContaining('user:token:'),
        'mock-access-token',
        7200 * 1000,
      );
      expect(cacheManager.set).toHaveBeenCalledWith(
        expect.stringContaining('user:refresh:'),
        'mock-refresh-token',
        604800 * 1000,
      );
    });
  });

  describe('generateCaptcha', () => {
    it('应读取 captcha 配置生成验证码', async () => {
      configService.get.mockImplementation((key: string) => {
        if (key === 'captcha') {
          return {
            size: 6,
            width: 180,
            height: 50,
          };
        }
      });

      await service.generateCaptcha();

      expect(svgCaptcha.createMathExpr).toHaveBeenCalledWith(
        expect.objectContaining({
          size: 6,
          width: 180,
          height: 50,
        }),
      );
    });
  });

  describe('refreshToken - 刷新访问令牌', () => {
    beforeEach(() => {
      configService.get.mockImplementation((key: string) => {
        if (key === 'jwt') {
          return { accessTokenExpiresIn: 7200, refreshTokenExpiresIn: 604800 };
        }
      });
    });

    it('有效的 refreshToken → 返回新的 accessToken', async () => {
      jwtService.verify.mockReturnValue({ id: 'user-1', type: 'refresh' });
      cacheManager.get.mockResolvedValue('mock-refresh-token');

      const result = await service.refreshToken('mock-refresh-token');

      expect(result).toHaveProperty('accessToken', 'mock-access-token');
      expect(jwtService.sign).toHaveBeenCalledWith({ id: 'user-1' }, { expiresIn: 7200 });
      expect(cacheManager.set).toHaveBeenCalledWith(
        expect.stringContaining('user:token:'),
        'mock-access-token',
        7200 * 1000,
      );
    });

    it('refreshToken JWT 验证失败 → 抛出异常', async () => {
      jwtService.verify.mockImplementation(() => {
        throw new Error('jwt expired');
      });

      await expect(service.refreshToken('bad-token')).rejects.toThrow(
        '刷新令牌已过期，请重新登录',
      );
    });

    it('token 类型不是 refresh → 抛出异常', async () => {
      jwtService.verify.mockReturnValue({ id: 'user-1' }); // 没有 type

      await expect(service.refreshToken('mock-access-token')).rejects.toThrow(
        '无效的刷新令牌',
      );
    });

    it('Redis 中没有对应记录 → 抛出异常', async () => {
      jwtService.verify.mockReturnValue({ id: 'user-1', type: 'refresh' });
      cacheManager.get.mockResolvedValue(null);

      await expect(service.refreshToken('mock-refresh-token')).rejects.toThrow(
        '刷新令牌已失效，请重新登录',
      );
    });

    it('Redis 中的 token 与传入不匹配 → 抛出异常', async () => {
      jwtService.verify.mockReturnValue({ id: 'user-1', type: 'refresh' });
      cacheManager.get.mockResolvedValue('different-token');

      await expect(service.refreshToken('mock-refresh-token')).rejects.toThrow(
        '刷新令牌已失效，请重新登录',
      );
    });
  });

  describe('logout - 清除双 Token', () => {
    it('应同时清除用户信息、access token 和 refresh token', async () => {
      await service.logout('user-1');

      expect(cacheManager.del).toHaveBeenCalledTimes(3);
      expect(cacheManager.del).toHaveBeenCalledWith(
        expect.stringContaining('user:info:'),
      );
      expect(cacheManager.del).toHaveBeenCalledWith(
        expect.stringContaining('user:token:'),
      );
      expect(cacheManager.del).toHaveBeenCalledWith(
        expect.stringContaining('user:refresh:'),
      );
    });
  });

  // ==================== mustChangePassword 布尔字段检查 ====================

  describe('validateUser - mustChangePassword 布尔检查', () => {
    it('mustChangePassword=true → 返回 mustChangePassword: true（优先于天数检查）', async () => {
      // 密码没有过期（刚更新），但布尔字段为 true
      setupValidAuth({ passwordUpdatedAt: new Date() });
      const user = { ...mockDbUser, mustChangePassword: true, passwordUpdatedAt: new Date() };
      prismaMock.sysUser.findFirst.mockResolvedValue(user);

      const result = await service.validateUser('testuser', 'password123');

      expect((result as CurrentUserType & { mustChangePassword?: boolean }).mustChangePassword).toBe(true);
    });
  });

  // ==================== changeExpiredPassword ====================

  describe('changeExpiredPassword', () => {
    const setupChangePassword = () => {
      configService.get.mockImplementation((key: string) => {
        const map: Record<string, number | JwtConfigType> = {
          PASSWORD_HISTORY_COUNT: 3,
          LOGIN_MAX_FAIL_COUNT: 5,
          LOGIN_LOCK_MINUTES: 30,
          jwt: { secret: 'test-secret', accessTokenExpiresIn: 7200, refreshTokenExpiresIn: 604800 },
        };
        return map[key];
      });
      cacheManager.get.mockResolvedValue(0); // 未锁定
    };

    it('已锁定 → 抛出 ApiException', async () => {
      setupChangePassword();
      cacheManager.get.mockResolvedValue(5); // 已达最大失败次数

      await expect(
        service.changeExpiredPassword({ userId: 'user-1', oldPassword: '123456', newPassword: 'newPass1' }),
      ).rejects.toThrow('密码错误次数过多');
    });

    it('用户不存在 → 抛出 ApiException', async () => {
      setupChangePassword();
      prismaMock.sysUser.findUnique.mockResolvedValue(null);

      await expect(
        service.changeExpiredPassword({ userId: 'nonexistent', oldPassword: '123456', newPassword: 'newPass1' }),
      ).rejects.toThrow('用户不存在');
    });

    it('旧密码错误 → 抛出 ApiException 且记录失败', async () => {
      setupChangePassword();
      prismaMock.sysUser.findUnique.mockResolvedValue({ ...mockDbUser });
      (bcrypt.compare as jest.Mock).mockResolvedValueOnce(false);

      await expect(
        service.changeExpiredPassword({ userId: 'user-1', oldPassword: 'wrong', newPassword: 'newPass1' }),
      ).rejects.toThrow('旧密码错误，还剩 4 次尝试机会');
      expect(cacheManager.set).toHaveBeenCalled();
    });

    it('密码历史重复 → 抛出 ApiException', async () => {
      setupChangePassword();
      prismaMock.sysUser.findUnique.mockResolvedValue({ ...mockDbUser });
      (bcrypt.compare as jest.Mock).mockResolvedValueOnce(true); // 旧密码正确
      prismaMock.sysPasswordHistory.findMany.mockResolvedValue([
        { passwordHash: 'hash1' },
      ]);
      (bcrypt.compare as jest.Mock).mockResolvedValueOnce(true); // 新密码与历史重复

      await expect(
        service.changeExpiredPassword({ userId: 'user-1', oldPassword: '123456', newPassword: 'reused1' }),
      ).rejects.toThrow('新密码不能与最近 3 次使用过的密码相同');
    });

    it('成功 → 返回 token，数据库 mustChangePassword 被清除', async () => {
      setupChangePassword();
      const dbUser = { ...mockDbUser, mustChangePassword: true };
      prismaMock.sysUser.findUnique.mockResolvedValue(dbUser);
      (bcrypt.compare as jest.Mock).mockResolvedValueOnce(true); // 旧密码正确
      prismaMock.sysPasswordHistory.findMany.mockResolvedValue([]);
      (bcrypt.compare as jest.Mock).mockResolvedValueOnce(false); // 新密码不与历史重复
      prismaMock.sysUser.update.mockResolvedValue({ ...dbUser, mustChangePassword: false });
      jest.spyOn(service, 'getCurrentUser').mockResolvedValue(mockCurrentUser);
      jest.spyOn(service, 'getRoutes').mockResolvedValue([]);

      const result = await service.changeExpiredPassword({
        userId: 'user-1',
        oldPassword: '123456',
        newPassword: 'brandNew1',
      });

      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
      // 验证事务中 update 被调用且 mustChangePassword: false
      expect(prismaMock.sysUser.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ mustChangePassword: false }),
        }),
      );
    });
  });
});

import { Cache, CACHE_MANAGER } from '@nestjs/cache-manager';
import { Inject, Injectable } from '@nestjs/common';
import * as svgCaptcha from 'svg-captcha';

import { REDIS_KEYS } from '@/common/constants/redisKey.constant';
import { ApiException } from '@/common/exceptions/api.exception';
import { CurrentUserType, DataScopeWhere, JwtPayloadType } from '@/common/types/auth.type';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from 'nestjs-prisma';

import { SUPER_ADMIN } from '@/common/constants/base.constant';
import { EnableStatusEnum } from '@/common/enums/common.enum';
import { DataScopeEnum } from '@/common/enums/dataScope.enum';
import { NoAuthException } from '@/common/exceptions/noAuth.exception';
import { JwtConfigType } from '@/common/types/config.type';
import { SysLoginLogService } from '@/modules/sys/sys-login-log/sys-login-log.service';
import { simplifyMenuTree } from '@/utils/menu.util';
import {
  buildMenuTree,
  generateRedisKey,
  generateUUid,
  MenuTreeNode,
} from '@/utils/util';
import { Prisma } from '@prisma/client';

@Injectable()
export class AuthService {
  constructor(
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly loginLogService: SysLoginLogService,
  ) {}
  async login(user: CurrentUserType & { mustChangePassword?: boolean }) {
    // 密码过期，不发放 token
    if (user.mustChangePassword) {
      return {
        mustChangePassword: true,
        message: '密码已过期，请修改密码',
        userId: user.id,
      };
    }
    //   走到这里说明登录成功
    const payload: JwtPayloadType = { id: user.id };
    const jwtConfig = this.configService.get<JwtConfigType>('jwt')!;

    const accessToken = this.jwtService.sign(payload, { expiresIn: jwtConfig.accessTokenExpiresIn });
    const refreshToken = this.jwtService.sign(
      { ...payload, type: 'refresh' },
      { expiresIn: jwtConfig.refreshTokenExpiresIn },
    );

    await this.cacheManager.set(
      generateRedisKey(REDIS_KEYS.USER_TOKEN, user.id),
      accessToken,
      jwtConfig.accessTokenExpiresIn * 1000,
    );
    await this.cacheManager.set(
      generateRedisKey(REDIS_KEYS.USER_REFRESH, user.id),
      refreshToken,
      jwtConfig.refreshTokenExpiresIn * 1000,
    );
    const home = await this.getUserHomePage(user);
    return {
      accessToken,
      refreshToken,
      home,
    };
  }

  async generateCaptcha(captchaId?: string) {
    if (captchaId) {
      await this.cacheManager.del(
        generateRedisKey(REDIS_KEYS.CAPTCHA, captchaId),
      );
    }
    const captchaConfig = this.configService.get<{
      size: number;
      width: number;
      height: number;
    }>('captcha')!;
    const captcha = svgCaptcha.createMathExpr({
      size: captchaConfig.size, // 验证码长度
      width: captchaConfig.width, // 宽度
      height: captchaConfig.height, // 高度
      noise: 3, // 验证码干扰线数量
      color: true, // 验证码颜色
      ignoreChars: '0o1i', // 验证码中排除的 字符集合
      background: '#eee', // 验证码背景颜色
    });
    const id = generateUUid();
    const key = generateRedisKey(REDIS_KEYS.CAPTCHA, id);
    await this.cacheManager.set(key, captcha.text);
    return { id, img: captcha.data.toString() };
  }

  async checkCaptcha(captchaId: string, text?: string) {
    const key = generateRedisKey(REDIS_KEYS.CAPTCHA, captchaId);
    const captcha = await this.cacheManager.get<string>(key);
    if (!captcha || text?.toLowerCase() !== captcha.toLowerCase()) {
      throw new ApiException('验证码错误');
    }
    await this.cacheManager.del(key);
  }

  async validateUser(userName: string, password: string) {
    const maxFailCount = this.configService.get<number>('LOGIN_MAX_FAIL_COUNT')!;
    const lockMinutes = this.configService.get<number>('LOGIN_LOCK_MINUTES')!;
    const lockTtl = lockMinutes * 60 * 1000;

    // 1. 检查账号是否被锁定
    const failKey = generateRedisKey(REDIS_KEYS.LOGIN_FAIL, userName);
    const failCount = await this.cacheManager.get<number>(failKey);
    if (failCount && failCount >= maxFailCount) {
      throw new ApiException(`密码错误次数过多，账号已锁定 ${lockMinutes} 分钟`);
    }

    // 2. 校验用户是否存在
    const user = await this.prisma.sysUser.findFirst({
      where: {
        userName,
        status: EnableStatusEnum.ENABLE,
      },
    });
    if (!user) {
      // 用户不存在也计一次失败，防止通过错误信息枚举用户名
      await this.recordLoginFail(userName, maxFailCount, lockTtl);
      throw new ApiException('用户名或密码错误');
    }

    // 3. 校验密码
    const isok = await bcrypt.compare(password, user.password);
    if (!isok) {
      const remaining = await this.recordLoginFail(userName, maxFailCount, lockTtl);
      if (remaining <= 0) {
        throw new ApiException(`密码错误次数过多，账号已锁定 ${lockMinutes} 分钟`);
      }
      throw new ApiException(`用户名或密码错误，还剩 ${remaining} 次尝试机会`);
    }

    // 4. 登录成功，清除失败计数
    await this.cacheManager.del(failKey);

    // 5. 检查布尔字段 mustChangePassword（优先于天数检查）
    if (user.mustChangePassword) {
      const currentUser = await this.getCurrentUser(user.id);
      return { ...currentUser, mustChangePassword: true };
    }

    // 6. 检查密码是否过期
    const expireDays = this.configService.get<number>('PASSWORD_EXPIRE_DAYS')!;
    if (expireDays > 0 && user.passwordUpdatedAt) {
      const expiresAt = new Date(user.passwordUpdatedAt.getTime() + expireDays * 24 * 60 * 60 * 1000);
      if (new Date() > expiresAt) {
        const currentUser = await this.getCurrentUser(user.id);
        return { ...currentUser, mustChangePassword: true };
      }
    }

    return await this.getCurrentUser(user.id);
  }

  /** 记录一次登录失败，返回剩余尝试次数 */
  private async recordLoginFail(userName: string, maxFailCount: number, lockTtl: number): Promise<number> {
    const failKey = generateRedisKey(REDIS_KEYS.LOGIN_FAIL, userName);
    const current = (await this.cacheManager.get<number>(failKey)) || 0;
    const newCount = current + 1;
    await this.cacheManager.set(failKey, newCount, lockTtl);
    return Math.max(0, maxFailCount - newCount);
  }

  async validateToken(id: string, token: string) {
    const cacheToken = await this.cacheManager.get<string>(
      generateRedisKey(REDIS_KEYS.USER_TOKEN, id),
    );
    if (cacheToken !== token) throw new NoAuthException('登录状态已过期');
    //   从缓存中获取用户信息
    return await this.getCurrentUser(id);
  }

  async getRoleIds(userId: string) {
    const roles = await this.prisma.sysRole.findMany({
      where: {
        status: EnableStatusEnum.ENABLE,
        users: {
          some: {
            id: userId,
          },
        },
      },
      select: {
        id: true,
        isSuper: true,
      },
    });
    return {
      roleIds: roles.map((item) => item.id),
      isSuper: roles.some((item) => item.isSuper),
    };
  }

  async getPermissions(roleIds: string[]) {
    const menus = await this.prisma.sysMenu.findMany({
      select: {
        auth: true,
      },
      where: {
        status: EnableStatusEnum.ENABLE,
        roles: {
          some: {
            status: EnableStatusEnum.ENABLE,
            id: {
              in: roleIds,
            },
          },
        },
      },
    });
    const btns = await this.prisma.sysMenuBtn.findMany({
      select: {
        auth: true,
      },
      where: {
        roles: {
          some: {
            status: EnableStatusEnum.ENABLE,
            id: {
              in: roleIds,
            },
          },
        },
      },
    });
    return [...menus, ...btns].map((item) => item.auth);
  }
  async getRoutes(user: CurrentUserType) {
    const where: Prisma.SysMenuWhereInput = {
      status: EnableStatusEnum.ENABLE,
    };
    if (!user.isSuper) {
      where.auth = {
        in: user.permissions,
      };
    }
    const menus = await this.prisma.sysMenu.findMany({
      where,
      include: {
        meta: true,
      },
    });
    return buildMenuTree(menus, undefined);
  }

  getFirstPage(routes: MenuTreeNode[]): MenuTreeNode | null {
    if (!routes.length) {
      return null;
    }
    const route = routes[0];
    if (route.children.length) {
      return this.getFirstPage(route.children);
    }
    return route;
  }

  async getUserHomePage(user: CurrentUserType) {
    const routes = await this.getRoutes(user);
    return this.getFirstPage(routes)?.path;
  }

  async getAllPermissions() {
    const where: Prisma.SysMenuWhereInput = {
      status: EnableStatusEnum.ENABLE,
    };
    const menusP = this.prisma.sysMenu.findMany({
      where,
      include: {
        meta: true,
      },
    });
    const apisP = this.prisma.sysMenu.findMany({
      where: {
        menuBtns: {
          some: {},
        },
      },
      select: {
        id: true,
        meta: {
          select: {
            title: true,
          },
        },
        menuBtns: true,
      },
      orderBy: {
        sort: 'asc',
      },
    });
    const [menus, apis] = await Promise.all([menusP, apisP]);
    const apiTree = apis.map((item) => {
      return {
        label: item.meta?.title || '',
        value: `menu-${item.id}`,
        children: item.menuBtns.map((btn) => ({
          label: btn.name,
          value: btn.id,
        })),
      };
    });
    const menuTreeList = buildMenuTree(menus, undefined);
    const menuTree = simplifyMenuTree(menuTreeList);
    return {
      menuTree,
      apiTree,
    };
  }

  async findOne(id: string): Promise<CurrentUserType> {
    const user = await this.prisma.sysUser.findFirst({
      where: {
        id: id,
      },
      include: {
        dept: {
          select: { id: true, deptName: true, deptCode: true },
        },
        post: true,
      },
    });
    if (!user) throw new ApiException('用户不存在');
    // 获取角色信息（含 isSuper 标记）
    const { roleIds, isSuper } = await this.getRoleIds(id);
    let permissions: string[] = [];
    if (isSuper) {
      permissions = [SUPER_ADMIN];
    } else {
      permissions = await this.getPermissions(roleIds);
    }
    // 解析数据权限
    const dataScope = await this.resolveDataScope(
      id,
      user.userName,
      user.deptId,
      roleIds,
      isSuper,
    );
    const { dept, post, ...userData } = user;
    const currentUser: CurrentUserType = {
      ...userData,
      dept,
      post,
      isSuper,
      permissions,
      dataScope,
    };
    await this.cacheManager.set(
      generateRedisKey(REDIS_KEYS.USER_INFO, id),
      currentUser,
    );
    return currentUser;
  }

  /**
   * 解析数据权限为 Prisma where 条件
   * 权限优先级: ALL > CUSTOM > DEPT_AND_CHILD > DEPT > SELF
   */
  private async resolveDataScope(
    userId: string,
    userName: string,
    userDeptId: string | null,
    roleIds: string[],
    isSuper: boolean,
  ): Promise<DataScopeWhere> {
    if (isSuper) return {};

    if (!roleIds.length) return { createBy: userName };

    const roles = await this.prisma.sysRole.findMany({
      where: { id: { in: roleIds } },
      select: { dataScope: true, depts: { select: { id: true } } },
    });

    // 取最大权限
    const scopePriority: Record<string, number> = {
      [DataScopeEnum.ALL]: 5,
      [DataScopeEnum.CUSTOM]: 4,
      [DataScopeEnum.DEPT_AND_CHILD]: 3,
      [DataScopeEnum.DEPT]: 2,
      [DataScopeEnum.SELF]: 1,
    };

    let maxScope = DataScopeEnum.SELF;
    let maxPriority = 0;
    for (const role of roles) {
      const priority = scopePriority[role.dataScope] || 0;
      if (priority > maxPriority) {
        maxPriority = priority;
        maxScope = role.dataScope as DataScopeEnum;
      }
    }

    switch (maxScope) {
      case DataScopeEnum.ALL:
        return {};

      case DataScopeEnum.CUSTOM: {
        const allCustomRoleDeptIds = roles
          .filter((r) => r.dataScope === DataScopeEnum.CUSTOM)
          .flatMap((r) => r.depts.map((d) => d.id));
        const uniqueDeptIds = [...new Set(allCustomRoleDeptIds)];
        if (!uniqueDeptIds.length) return { createBy: userName };
        return { deptId: { in: uniqueDeptIds } };
      }

      case DataScopeEnum.DEPT_AND_CHILD: {
        if (!userDeptId) return { createBy: userName };
        // 利用 ancestors 字段一次性查出所有子部门
        const childDepts = await this.prisma.sysDept.findMany({
          where: {
            OR: [
              { id: userDeptId },
              { ancestors: { contains: `,${userDeptId},` } },
              { ancestors: { startsWith: `${userDeptId},` } },
              { ancestors: { endsWith: `,${userDeptId}` } },
              { ancestors: userDeptId },
            ],
          },
          select: { id: true },
        });
        const deptIds = childDepts.map((d) => d.id);
        if (!deptIds.length) return { createBy: userName };
        return { deptId: { in: deptIds } };
      }

      case DataScopeEnum.DEPT: {
        if (!userDeptId) return { createBy: userName };
        return { deptId: { in: [userDeptId] } };
      }

      case DataScopeEnum.SELF:
      default:
        return { createBy: userName };
    }
  }

  async getCurrentUser(userId: string, fromDb: boolean = false) {
    if (fromDb) {
      return await this.findOne(userId);
    }
    let user = await this.cacheManager.get<CurrentUserType>(
      generateRedisKey(REDIS_KEYS.USER_INFO, userId),
    );
    if (!user) {
      user = await this.findOne(userId);
    }
    return user;
  }

  /** 使用 refreshToken 换取新的 accessToken */
  async refreshToken(token: string) {
    let payload: { id: string; type: string };
    try {
      payload = this.jwtService.verify<{ id: string; type: string }>(token);
    } catch {
      throw new ApiException('刷新令牌已过期，请重新登录');
    }

    if (payload.type !== 'refresh') {
      throw new ApiException('无效的刷新令牌');
    }

    const cachedToken = await this.cacheManager.get<string>(
      generateRedisKey(REDIS_KEYS.USER_REFRESH, payload.id),
    );
    if (cachedToken !== token) {
      throw new ApiException('刷新令牌已失效，请重新登录');
    }

    const jwtConfig = this.configService.get<JwtConfigType>('jwt')!;
    const newAccessToken = this.jwtService.sign(
      { id: payload.id },
      { expiresIn: jwtConfig.accessTokenExpiresIn },
    );
    await this.cacheManager.set(
      generateRedisKey(REDIS_KEYS.USER_TOKEN, payload.id),
      newAccessToken,
      jwtConfig.accessTokenExpiresIn * 1000,
    );

    return { accessToken: newAccessToken };
  }

  async logout(userId: string) {
    // 清除用户信息缓存
    await this.cacheManager.del(generateRedisKey(REDIS_KEYS.USER_INFO, userId));
    // 清除用户 token 缓存
    await this.cacheManager.del(
      generateRedisKey(REDIS_KEYS.USER_TOKEN, userId),
    );
    // 清除用户 refreshToken 缓存
    await this.cacheManager.del(
      generateRedisKey(REDIS_KEYS.USER_REFRESH, userId),
    );
    // 更新登录日志的登出时间
    await this.loginLogService.recordLogout(userId);
  }

  /** 过期/强制改密用户修改密码（无需 JWT） */
  async changeExpiredPassword(dto: { userId: string; oldPassword: string; newPassword: string }) {
    const maxFailCount = this.configService.get<number>('LOGIN_MAX_FAIL_COUNT')!;
    const lockMinutes = this.configService.get<number>('LOGIN_LOCK_MINUTES')!;
    const lockTtl = lockMinutes * 60 * 1000;

    // 1. 检查是否已被锁定
    const failKey = generateRedisKey(REDIS_KEYS.LOGIN_FAIL, `cpw:${dto.userId}`);
    const failCount = await this.cacheManager.get<number>(failKey);
    if (failCount && failCount >= maxFailCount) {
      throw new ApiException(`密码错误次数过多，请 ${lockMinutes} 分钟后再试`);
    }

    const user = await this.prisma.sysUser.findUnique({ where: { id: dto.userId } });
    if (!user) throw new ApiException('用户不存在');

    // 2. 校验旧密码
    const isMatch = await bcrypt.compare(dto.oldPassword, user.password);
    if (!isMatch) {
      const current = (await this.cacheManager.get<number>(failKey)) || 0;
      const newCount = current + 1;
      await this.cacheManager.set(failKey, newCount, lockTtl);
      const remaining = Math.max(0, maxFailCount - newCount);
      if (remaining <= 0) {
        throw new ApiException(`密码错误次数过多，请 ${lockMinutes} 分钟后再试`);
      }
      throw new ApiException(`旧密码错误，还剩 ${remaining} 次尝试机会`);
    }

    // 3. 密码正确，清除失败计数
    await this.cacheManager.del(failKey);

    // 密码历史检查
    const historyCount = this.configService.get<number>('PASSWORD_HISTORY_COUNT')!;
    if (historyCount > 0) {
      const histories = await this.prisma.sysPasswordHistory.findMany({
        where: { userId: dto.userId },
        orderBy: { createdAt: 'desc' },
        take: historyCount,
        select: { passwordHash: true },
      });
      for (const h of histories) {
        const reused = await bcrypt.compare(dto.newPassword, h.passwordHash);
        if (reused) {
          throw new ApiException(`新密码不能与最近 ${historyCount} 次使用过的密码相同`);
        }
      }
    }

    const salt = await bcrypt.genSalt();
    const newPasswordHash = await bcrypt.hash(dto.newPassword, salt);

    await this.prisma.$transaction(async (tx) => {
      await tx.sysUser.update({
        where: { id: dto.userId },
        data: {
          password: newPasswordHash,
          passwordUpdatedAt: new Date(),
          mustChangePassword: false,
        },
      });
      await tx.sysPasswordHistory.create({
        data: {
          id: generateUUid(),
          userId: dto.userId,
          passwordHash: newPasswordHash,
        },
      });
      // 清理旧记录，只保留 historyCount 条
      if (historyCount > 0) {
        const allRecords = await tx.sysPasswordHistory.findMany({
          where: { userId: dto.userId },
          orderBy: { createdAt: 'desc' },
          select: { id: true },
        });
        if (allRecords.length > historyCount) {
          const idsToDelete = allRecords.slice(historyCount).map((r) => r.id);
          await tx.sysPasswordHistory.deleteMany({
            where: { id: { in: idsToDelete } },
          });
        }
      }
    });

    // 生成 JWT（复用 login 逻辑）
    const currentUser = await this.getCurrentUser(dto.userId, true);
    const payload: JwtPayloadType = { id: currentUser.id };
    const jwtConfig = this.configService.get<JwtConfigType>('jwt')!;

    const accessToken = this.jwtService.sign(payload, { expiresIn: jwtConfig.accessTokenExpiresIn });
    const refreshToken = this.jwtService.sign(
      { ...payload, type: 'refresh' },
      { expiresIn: jwtConfig.refreshTokenExpiresIn },
    );

    await this.cacheManager.set(
      generateRedisKey(REDIS_KEYS.USER_TOKEN, currentUser.id),
      accessToken,
      jwtConfig.accessTokenExpiresIn * 1000,
    );
    await this.cacheManager.set(
      generateRedisKey(REDIS_KEYS.USER_REFRESH, currentUser.id),
      refreshToken,
      jwtConfig.refreshTokenExpiresIn * 1000,
    );

    const home = await this.getUserHomePage(currentUser);
    return { accessToken, refreshToken, home };
  }

  /** 验证当前用户密码（锁屏解锁用） */
  async verifyPassword(userId: string, password: string) {
    const user = await this.prisma.sysUser.findUnique({
      where: { id: userId },
      select: { password: true },
    });
    if (!user) throw new ApiException('用户不存在');
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) throw new ApiException('密码错误');
    return true;
  }
}

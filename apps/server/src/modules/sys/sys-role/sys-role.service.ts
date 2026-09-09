import { REDIS_KEYS } from '@/common/constants/redisKey.constant';
import { EnableStatusEnum } from '@/common/enums/common.enum';
import { ApiException } from '@/common/exceptions/api.exception';
import type { CurrentUserType } from '@/common/types/auth.type';
import { generateRedisKey, generateUUid } from '@/utils/util';
import { Cache, CACHE_MANAGER } from '@nestjs/cache-manager';
import { Inject, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from 'nestjs-prisma';
import {
  CreateSysRoleDto,
  GetSysRoleListDto,
  UpdateRoleUsersDto,
  UpdateSysRoleDto,
} from './dto/req-sys-role.dto';

@Injectable()
export class SysRoleService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}

  async create(
    createSysRoleDto: CreateSysRoleDto,
    currentUser: CurrentUserType,
  ) {
    // 非超管不能创建超管角色
    if (createSysRoleDto.isSuper && !currentUser.isSuper) {
      throw new ApiException('只有超级管理员才能创建超管角色');
    }

    const exist = await this.prisma.sysRole.findFirst({
      where: {
        key: createSysRoleDto.key,
      },
    });
    if (exist) {
      throw new ApiException('角色值已存在');
    }
    const { menus, menuBtns, deptIds, ...others } = createSysRoleDto;
    // 超管角色自动设置数据权限为 ALL
    const dataScope = others.isSuper ? 'ALL' : others.dataScope;
    return this.prisma.sysRole.create({
      data: {
        ...others,
        dataScope,
        id: generateUUid(),
        menus: {
          connect: createSysRoleDto.menus.map((id) => ({ id })),
        },
        menuBtns: {
          connect: createSysRoleDto.menuBtns.map((id) => ({ id })),
        },
        ...(deptIds?.length && {
          depts: {
            connect: deptIds.map((id) => ({ id })),
          },
        }),
      },
    });
  }

  async findAll(query: GetSysRoleListDto) {
    const { skip, take } = query;
    const where: Prisma.SysRoleWhereInput = {};
    if (query.name) {
      where.name = {
        contains: query.name,
      };
    }
    if (query.status) {
      where.status = query.status;
    }
    const listPromise = this.prisma.sysRole.findMany({
      where,
      skip,
      take,
    });
    const totalPromise = this.prisma.sysRole.count({
      where,
    });
    const [list, total] = await Promise.all([listPromise, totalPromise]);
    return {
      list,
      total,
    };
  }

  async findAllOptions() {
    const roles = await this.prisma.sysRole.findMany({
      where: {
        status: EnableStatusEnum.ENABLE,
      },
      select: {
        id: true,
        name: true,
        isSuper: true,
      },
    });
    return roles.map((item) => {
      return {
        label: item.name,
        value: item.id,
        isSuper: item.isSuper,
      };
    });
  }

  async findOne(id: string) {
    const role = await this.prisma.sysRole.findUnique({
      where: {
        id,
      },
      include: {
        menus: {
          select: {
            id: true,
          },
        },
        menuBtns: {
          select: {
            id: true,
          },
        },
        depts: {
          select: {
            id: true,
          },
        },
      },
    });
    if (!role) {
      return null;
    }
    const menus = role.menus.map((menu) => menu.id);
    const menuBtns = role.menuBtns.map((menuBtn) => menuBtn.id);
    const deptIds = role.depts.map((dept) => dept.id);
    const { depts, ...roleData } = role;
    return {
      ...roleData,
      menus,
      menuBtns,
      deptIds,
    };
  }

  async removeCache(roleId: string) {
    const userIds = await this.prisma.sysUser.findMany({
      where: {
        roles: {
          some: {
            id: roleId,
          },
        },
      },
      select: {
        id: true,
      },
    });
    for (let i = 0; i < userIds.length; i++) {
      await this.cacheManager.del(
        generateRedisKey(REDIS_KEYS.USER_INFO, userIds[i].id),
      );
    }
  }

  async update(
    id: string,
    updateSysRoleDto: UpdateSysRoleDto,
    currentUser: CurrentUserType,
  ) {
    const exist = await this.prisma.sysRole.findFirst({
      where: {
        key: updateSysRoleDto.key,
        id: {
          not: id,
        },
      },
    });
    if (exist) {
      throw new ApiException('角色值已存在');
    }

    // 检查超管角色保护
    const targetRole = await this.prisma.sysRole.findUnique({ where: { id } });
    if (targetRole?.isSuper && !currentUser.isSuper) {
      throw new ApiException('只有超级管理员才能修改超管角色');
    }
    // 非超管不能把普通角色提升为超管
    if (updateSysRoleDto.isSuper && !currentUser.isSuper) {
      throw new ApiException('只有超级管理员才能设置超管角色');
    }

    const { menus, menuBtns, deptIds, ...others } = updateSysRoleDto;
    // 超管角色自动设置数据权限为 ALL
    const dataScope = others.isSuper ? 'ALL' : others.dataScope;
    await this.removeCache(id);
    return this.prisma.sysRole.update({
      where: {
        id,
      },
      data: {
        ...others,
        ...(dataScope !== undefined && { dataScope }),
        menus: {
          set: menus?.map((id) => ({ id })),
        },
        menuBtns: {
          set: menuBtns?.map((id) => ({ id })),
        },
        ...(deptIds !== undefined && {
          depts: {
            set: deptIds.map((id) => ({ id })),
          },
        }),
      },
    });
  }

  async remove(id: string) {
    // 先查询这个角色下是否有用户;
    if (!id) {
      throw new ApiException('参数异常');
    }
    const role = await this.prisma.sysRole.findUnique({ where: { id } });
    if (!role) {
      throw new ApiException('角色不存在');
    }
    // 不能删除超管角色
    if (role.isSuper) {
      throw new ApiException('不能删除超管角色');
    }
    const user = await this.prisma.sysUser.findFirst({
      where: {
        roles: {
          some: {
            id,
          },
        },
      },
    });
    if (user) {
      throw new ApiException('该角色下有用户，请先解除用户角色分配');
    }
    await this.removeCache(id);
    await this.prisma.sysRole.delete({
      where: {
        id,
      },
    });
  }

  async getRoleUsers(roleId: string) {
    const role = await this.prisma.sysRole.findUnique({
      where: { id: roleId },
      select: { users: { select: { id: true } } },
    });
    if (!role) {
      return { userIds: [] };
    }
    return { userIds: role.users.map((u) => u.id) };
  }

  async updateRoleUsers(
    roleId: string,
    dto: UpdateRoleUsersDto,
    currentUser: CurrentUserType,
  ) {
    const targetRole = await this.prisma.sysRole.findUnique({
      where: { id: roleId },
    });
    if (!targetRole) {
      throw new ApiException('角色不存在');
    }
    // 超管角色保护
    if (targetRole.isSuper && !currentUser.isSuper) {
      throw new ApiException('只有超级管理员才能修改超管角色');
    }

    // 先获取旧用户列表（更新后这些用户可能已不属于该角色）
    const oldUsers = await this.prisma.sysUser.findMany({
      where: { roles: { some: { id: roleId } } },
      select: { id: true },
    });

    await this.prisma.sysRole.update({
      where: { id: roleId },
      data: {
        users: {
          set: dto.userIds.map((id) => ({ id })),
        },
      },
    });

    // 清除旧用户和新用户的缓存
    const newUsers = await this.prisma.sysUser.findMany({
      where: { roles: { some: { id: roleId } } },
      select: { id: true },
    });
    const allUserIds = new Set([
      ...oldUsers.map((u) => u.id),
      ...newUsers.map((u) => u.id),
    ]);
    for (const uid of allUserIds) {
      await this.cacheManager.del(generateRedisKey(REDIS_KEYS.USER_INFO, uid));
    }
  }
}

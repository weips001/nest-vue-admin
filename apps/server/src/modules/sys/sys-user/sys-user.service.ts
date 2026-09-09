import type { ExportColumn } from '@/common/class/export.class';
import { ExcelExportService } from '@/common/class/export.class';
import { REDIS_KEYS } from '@/common/constants/redisKey.constant';
import { ApiException } from '@/common/exceptions/api.exception';
import { DataScopeService } from '@/common/services/data-scope.service';
import type { CurrentUserType } from '@/common/types/auth.type';
import { generateRedisKey, generateUUid } from '@/utils/util';
import { Cache, CACHE_MANAGER } from '@nestjs/cache-manager';
import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import type { Response } from 'express';
import { PrismaService } from 'nestjs-prisma';
import {
  CreateSysUserDto,
  GetSysUserListDto,
  UpdatePasswordDto,
  UpdateProfileDto,
  UpdateSysUserDto,
} from './dto/req-sys-user.dto';

@Injectable()
export class SysUserService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
    private readonly excelExportService: ExcelExportService,
    private readonly configService: ConfigService,
    private readonly dataScopeService: DataScopeService,
  ) {}
  async create(
    createSysUserDto: CreateSysUserDto,
    currentUser: CurrentUserType,
  ) {
    return this.prisma.$transaction(async (tx) => {
      const user = await tx.sysUser.findFirst({
        where: {
          userName: createSysUserDto.userName,
        },
      });
      if (user) {
        throw new ApiException('用户名已存在');
      }
      // 非超管不能给用户分配超管角色
      if (createSysUserDto.roleIds?.length && !currentUser.isSuper) {
        const superRoleCount = await tx.sysRole.count({
          where: { id: { in: createSysUserDto.roleIds }, isSuper: true },
        });
        if (superRoleCount > 0) {
          throw new ApiException('只有超级管理员才能分配超管角色');
        }
      }
      const salt = await bcrypt.genSalt();
      const password = await bcrypt.hash('123456', salt);
      const { roleIds, ...other } = createSysUserDto;
      const userId = generateUUid();
      const created = await tx.sysUser.create({
        data: {
          ...other,
          id: userId,
          createById: currentUser.id,
          password,
          mustChangePassword: true,
          roles: {
            connect: roleIds.map((id) => ({ id })),
          },
        },
        omit: {
          password: true,
        },
      });
      // 写入初始密码历史
      await tx.sysPasswordHistory.create({
        data: {
          id: generateUUid(),
          userId,
          passwordHash: password,
        },
      });
      return created;
    });
  }

  async findAll(query: GetSysUserListDto, currentUser: CurrentUserType) {
    const { skip, take } = query;
    const queryWhere: Prisma.SysUserWhereInput = {};
    if (query.userName) {
      queryWhere.userName = {
        contains: query.userName,
      };
    }
    if (query.phone) {
      queryWhere.phone = {
        contains: query.phone,
      };
    }
    if (query.status) {
      queryWhere.status = query.status;
    }
    if (query.deptId) {
      // 如果 includeChildren 为 true，查询该部门及其所有子部门的用户
      if (query.includeChildren) {
        // 获取所有子部门 ID
        const childDeptIds = await this.getAllChildDeptIds(query.deptId);
        queryWhere.deptId = { in: [query.deptId, ...childDeptIds] };
      } else {
        queryWhere.deptId = query.deptId;
      }
    }
    if (query.postId) {
      queryWhere.postId = query.postId;
    }

    const where = {
      AND: [queryWhere, this.dataScopeService.buildWhere(currentUser)],
    };

    const listPromise = this.prisma.sysUser.findMany({
      where,
      skip,
      take,
      omit: {
        password: true,
      },
      include: {
        dept: {
          select: { id: true, deptName: true, sort: true, parentId: true },
        },
        post: {
          select: { id: true, name: true, isLeader: true },
        },
      },
      orderBy: [
        // 父部门（parentId=null）排前面
        { dept: { parentId: { sort: 'asc', nulls: 'first' } } },
        // 同级按部门 sort 排序
        { dept: { sort: 'asc' } },
        // 部门内负责人优先
        { post: { isLeader: 'desc' } },
      ],
    });
    const totalPromise = this.prisma.sysUser.count({
      where,
    });
    const [list, total] = await Promise.all([listPromise, totalPromise]);
    return {
      list,
      total,
    };
  }

  async exportExcel(
    fields: ExportColumn[],
    query: GetSysUserListDto,
    currentUser: CurrentUserType,
    res: Response,
  ) {
    const { skip, take, ...whereQuery } = query;
    const { list } = await this.findAll(
      { ...whereQuery } as GetSysUserListDto,
      currentUser,
    );

    const buffer = await this.excelExportService.export({
      columns: fields,
      data: list as unknown as Record<string, unknown>[],
      filename: '用户列表',
    });

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${encodeURIComponent('用户列表')}.xlsx"`,
    );
    res.send(buffer);
  }

  /* 递归获取所有子部门 ID */
  private async getAllChildDeptIds(parentId: string): Promise<string[]> {
    const children = await this.prisma.sysDept.findMany({
      where: { parentId },
      select: { id: true },
    });
    const ids = children.map((c) => c.id);
    for (const id of ids) {
      const childIds = await this.getAllChildDeptIds(id);
      ids.push(...childIds);
    }
    return ids;
  }

  async findOne(id: string, currentUser: CurrentUserType) {
    const user = await this.prisma.sysUser.findFirst({
      where: {
        AND: [{ id }, this.dataScopeService.buildWhere(currentUser)],
      },
      include: {
        roles: true,
        post: {
          select: { id: true, name: true },
        },
      },
      omit: {
        password: true,
      },
    });
    if (!user) {
      return null;
    }
    const { roles, post, ...other } = user;
    const roleIds = roles.map((role) => role.id);
    return {
      ...other,
      roleIds,
      postId: post?.id || null,
      postName: post?.name || null,
    };
  }

  async update(
    id: string,
    updateSysUserDto: UpdateSysUserDto,
    currentUser: CurrentUserType,
  ) {
    const { roleIds, ...other } = updateSysUserDto;
    const result = await this.prisma.$transaction(async (tx) => {
      const user = await tx.sysUser.findFirst({
        where: {
          AND: [{ id }, this.dataScopeService.buildWhere(currentUser)],
        },
      });
      if (!user) {
        throw new ApiException('用户不存在');
      }

      const exist = await tx.sysUser.findFirst({
        where: {
          userName: updateSysUserDto.userName,
          id: {
            not: id,
          },
        },
      });
      if (exist) {
        throw new ApiException('用户名已存在');
      }
      // 非超管不能给用户分配超管角色
      if (roleIds?.length && !currentUser.isSuper) {
        const superRoleCount = await tx.sysRole.count({
          where: { id: { in: roleIds }, isSuper: true },
        });
        if (superRoleCount > 0) {
          throw new ApiException('只有超级管理员才能分配超管角色');
        }
      }
      return tx.sysUser.update({
        where: {
          id,
        },
        data: {
          ...other,
          roles: {
            set: roleIds?.map((id) => ({ id })),
          },
        },
        omit: {
          password: true,
        },
      });
    });
    await this.cacheManager.del(generateRedisKey(REDIS_KEYS.USER_INFO, id));
    return result;
  }

  /* 获取用户选项列表（用于下拉选择） */
  async getOptions(currentUser: CurrentUserType) {
    const users = await this.prisma.sysUser.findMany({
      where: {
        AND: [
          { status: '0' }, // 只返回启用状态的用户
          this.dataScopeService.buildWhere(currentUser),
        ],
      },
      select: {
        id: true,
        nickName: true,
        userName: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
    return users.map((user) => ({
      value: user.id,
      label: user.nickName || user.userName,
    }));
  }

  /* 获取全量用户列表（含部门信息，用于角色分配等场景） */
  async listAllWithDept(currentUser: CurrentUserType) {
    return this.prisma.sysUser.findMany({
      where: {
        AND: [{ status: '0' }, this.dataScopeService.buildWhere(currentUser)],
      },
      select: {
        id: true,
        nickName: true,
        userName: true,
        deptId: true,
        dept: {
          select: { id: true, deptName: true },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async remove(id: string, currentUser: CurrentUserType) {
    const result = await this.prisma.$transaction(async (tx) => {
      // 不能删除自己
      if (id === currentUser.id) {
        throw new ApiException('不能删除自己');
      }

      const user = await tx.sysUser.findFirst({
        where: {
          AND: [{ id }, this.dataScopeService.buildWhere(currentUser)],
        },
      });

      if (!user) {
        throw new ApiException('用户不存在');
      }

      // 不能删除拥有超管角色的用户
      const superRole = await tx.sysRole.findFirst({
        where: {
          isSuper: true,
          users: { some: { id } },
        },
      });
      if (superRole) {
        throw new ApiException('不能删除超级管理员');
      }

      // 检查角色关联
      const role = await tx.sysRole.findFirst({
        where: {
          users: {
            some: {
              id,
            },
          },
        },
      });
      if (role) {
        throw new ApiException('该用户已分配角色，请先解除角色分配');
      }

      return tx.sysUser.delete({
        where: {
          id,
        },
      });
    });
    await this.cacheManager.del(generateRedisKey(REDIS_KEYS.USER_INFO, id));
    return result;
  }

  /* 获取当前用户个人信息 */
  async getProfile(userId: string) {
    const user = await this.prisma.sysUser.findUnique({
      where: { id: userId },
      omit: { password: true },
      include: {
        dept: {
          select: { id: true, deptName: true },
        },
        post: {
          select: { id: true, name: true },
        },
        roles: {
          select: { id: true, name: true },
        },
      },
    });
    if (!user) {
      throw new ApiException('用户不存在');
    }
    return user;
  }

  /* 更新个人信息 */
  async updateProfile(userId: string, updateProfileDto: UpdateProfileDto) {
    const user = await this.prisma.sysUser.update({
      where: { id: userId },
      data: updateProfileDto,
      omit: { password: true },
    });
    await this.cacheManager.del(generateRedisKey(REDIS_KEYS.USER_INFO, userId));
    return user;
  }

  /* 修改密码 */
  async updatePassword(userId: string, updatePasswordDto: UpdatePasswordDto) {
    const user = await this.prisma.sysUser.findUnique({
      where: { id: userId },
    });
    if (!user) {
      throw new ApiException('用户不存在');
    }

    const isMatch = await bcrypt.compare(
      updatePasswordDto.oldPassword,
      user.password,
    );
    if (!isMatch) {
      throw new ApiException('旧密码错误');
    }

    const salt = await bcrypt.genSalt();
    const newPasswordHash = await bcrypt.hash(
      updatePasswordDto.newPassword,
      salt,
    );

    // 检查密码历史
    const historyCount = this.configService.get<number>(
      'PASSWORD_HISTORY_COUNT',
    )!;
    if (historyCount > 0) {
      const histories = await this.prisma.sysPasswordHistory.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: historyCount,
        select: { passwordHash: true },
      });
      for (const h of histories) {
        const reused = await bcrypt.compare(
          updatePasswordDto.newPassword,
          h.passwordHash,
        );
        if (reused) {
          throw new ApiException(
            `新密码不能与最近 ${historyCount} 次使用过的密码相同`,
          );
        }
      }
    }

    await this.prisma.$transaction(async (tx) => {
      // 更新密码
      await tx.sysUser.update({
        where: { id: userId },
        data: {
          password: newPasswordHash,
          passwordUpdatedAt: new Date(),
          mustChangePassword: false,
        },
      });
      // 写入历史记录
      await tx.sysPasswordHistory.create({
        data: {
          id: generateUUid(),
          userId,
          passwordHash: newPasswordHash,
        },
      });
      // 清理旧记录，只保留 historyCount 条
      if (historyCount > 0) {
        const keepCount = historyCount;
        const allRecords = await tx.sysPasswordHistory.findMany({
          where: { userId },
          orderBy: { createdAt: 'desc' },
          select: { id: true },
        });
        if (allRecords.length > keepCount) {
          const idsToDelete = allRecords.slice(keepCount).map((r) => r.id);
          await tx.sysPasswordHistory.deleteMany({
            where: { id: { in: idsToDelete } },
          });
        }
      }
    });

    await this.cacheManager.del(generateRedisKey(REDIS_KEYS.USER_INFO, userId));
    return null;
  }
}

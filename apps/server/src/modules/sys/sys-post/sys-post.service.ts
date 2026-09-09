import type { ExportColumn } from '@/common/class/export.class';
import { ExcelExportService } from '@/common/class/export.class';
import { REDIS_KEYS } from '@/common/constants/redisKey.constant';
import { ApiException } from '@/common/exceptions/api.exception';
import { DataScopeService } from '@/common/services/data-scope.service';
import type { CurrentUserType } from '@/common/types/auth.type';
import { generateRedisKey, generateUUid } from '@/utils/util';
import { Cache, CACHE_MANAGER } from '@nestjs/cache-manager';
import { Inject, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { Response } from 'express';
import { PrismaService } from 'nestjs-prisma';
import {
  CreateSysPostDto,
  GetSysPostListDto,
  UpdateSysPostDto,
} from './dto/req-sys-post.dto';

type PostPagination = {
  skip?: number;
  take?: number;
};

@Injectable()
export class SysPostService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
    private readonly excelExportService: ExcelExportService,
    private readonly dataScopeService: DataScopeService,
  ) {}

  /* 新增 */
  async create(
    createSysPostDto: CreateSysPostDto,
    currentUser: CurrentUserType,
  ) {
    const { deptId, roleIds, ...other } = createSysPostDto;

    // 校验岗位编码是否已存在
    const existCode = await this.prisma.sysPost.findUnique({
      where: { code: createSysPostDto.code },
    });
    if (existCode) {
      throw new ApiException('岗位编码已存在');
    }

    // 校验部门是否存在
    if (deptId) {
      const dept = await this.prisma.sysDept.findUnique({
        where: { id: deptId },
      });
      if (!dept) {
        throw new ApiException('所属部门不存在');
      }
    }

    return this.prisma.sysPost.create({
      data: {
        ...other,
        id: generateUUid(),
        deptId: deptId || null,
        createById: currentUser.id,
        ...(roleIds?.length && {
          roles: { connect: roleIds.map((id) => ({ id })) },
        }),
      },
    });
  }

  /* 列表查询 */
  private async queryPosts(
    query: GetSysPostListDto,
    currentUser: CurrentUserType,
    pagination: PostPagination = {},
  ) {
    const where: Prisma.SysPostWhereInput = {};

    if (query.name) {
      where.name = { contains: query.name };
    }
    if (query.code) {
      where.code = { contains: query.code };
    }
    if (query.deptId !== undefined) {
      if (query.deptId === '') {
        // 空字符串表示只查询通用岗位
        where.deptId = null;
      } else if (query.includeChildren) {
        // 包含子部门：查询该部门及其所有子部门的岗位 + 通用岗位
        const childDeptIds = await this.getAllChildDeptIds(query.deptId);
        const deptIds = [query.deptId, ...childDeptIds];
        where.OR = [{ deptId: { in: deptIds } }, { deptId: null }];
      } else {
        // 不包含子部门：只查询该部门岗位 + 通用岗位
        where.OR = [{ deptId: query.deptId }, { deptId: null }];
      }
    }
    if (query.status) {
      where.status = query.status;
    }

    const scopedWhere = {
      AND: [where, this.dataScopeService.buildWhere(currentUser)],
    };

    const listPromise = this.prisma.sysPost.findMany({
      where: scopedWhere,
      ...pagination,
      orderBy: [
        { dept: { sort: 'asc' } },
        { isLeader: 'desc' },
        { sort: 'asc' },
      ],
      include: {
        dept: {
          select: { id: true, deptName: true, sort: true },
        },
        roles: {
          select: { id: true, name: true },
        },
      },
    });

    const totalPromise = this.prisma.sysPost.count({ where: scopedWhere });

    const [list] = await Promise.all([listPromise, totalPromise]);

    // 查询每个岗位的用户数量
    const postIds = list.map((item) => item.id);

    // 如果没有岗位，直接返回空列表
    if (postIds.length === 0) {
      return { list: [], total: 0 };
    }

    // 构建用户查询条件
    // 当指定部门时：部门岗位只统计该部门用户，通用岗位也只统计该部门用户
    // 当不指定部门时：统计所有用户
    type UserCountResult = { postId: string | null; _count: { id: number } };
    const groupUsersByPost = async (
      userWhere: Prisma.SysUserWhereInput,
    ): Promise<UserCountResult[]> => {
      const result = await this.prisma.sysUser.groupBy({
        by: ['postId'],
        where: userWhere,
        _count: { id: true },
      });
      return result as unknown as UserCountResult[];
    };

    let userCounts: UserCountResult[];

    if (query.deptId !== undefined && query.deptId !== '') {
      // 指定了具体部门，需要分别处理部门岗位和通用岗位的用户统计
      const deptPostIds = list.filter((p) => p.deptId).map((p) => p.id);
      const commonPostIds = list.filter((p) => !p.deptId).map((p) => p.id);

      const [deptCounts, commonCounts] = await Promise.all([
        // 部门岗位：只统计该部门的用户
        groupUsersByPost({
          postId: { in: deptPostIds },
          deptId: query.deptId,
        }),
        // 通用岗位：统计该部门的用户
        groupUsersByPost({
          postId: { in: commonPostIds },
          deptId: query.deptId,
        }),
      ]);

      userCounts = [...deptCounts, ...commonCounts];
    } else if (query.deptId === '') {
      // 查询公司通用岗位（deptId=null），统计所有使用该岗位的用户
      userCounts = await groupUsersByPost({ postId: { in: postIds } });
    } else {
      // 不指定部门，统计所有用户
      userCounts = await groupUsersByPost({ postId: { in: postIds } });
    }

    const userCountMap = new Map(
      userCounts
        .filter((item) => item.postId)
        .map((item) => [item.postId!, item._count.id]),
    );

    // 添加 userCount 字段
    let listWithCount = list.map((item) => ({
      ...item,
      userCount: userCountMap.get(item.id) || 0,
    }));

    // 指定部门时，过滤掉没有用户的通用岗位
    if (query.deptId !== undefined && query.deptId !== '') {
      listWithCount = listWithCount.filter(
        (item) => item.deptId || item.userCount > 0,
      );
    }

    return { list: listWithCount, total: listWithCount.length };
  }

  /* 列表查询 */
  async findAll(query: GetSysPostListDto, currentUser: CurrentUserType) {
    return this.queryPosts(query, currentUser, {
      skip: query.skip,
      take: query.take,
    });
  }

  /* 通过id查询 */
  async findOne(id: string, currentUser: CurrentUserType) {
    return this.prisma.sysPost.findFirst({
      where: {
        AND: [{ id }, this.dataScopeService.buildWhere(currentUser)],
      },
      include: {
        dept: {
          select: { id: true, deptName: true },
        },
        roles: {
          select: { id: true, name: true },
        },
      },
    });
  }

  /* 更新 */
  async update(
    id: string,
    updateSysPostDto: UpdateSysPostDto,
    currentUser: CurrentUserType,
  ) {
    const { deptId, code, roleIds, ...other } = updateSysPostDto;

    const target = await this.prisma.sysPost.findFirst({
      where: {
        AND: [{ id }, this.dataScopeService.buildWhere(currentUser)],
      },
    });
    if (!target) {
      throw new ApiException('岗位不存在');
    }

    // 校验岗位编码是否已存在（排除自己）
    if (code) {
      const existCode = await this.prisma.sysPost.findFirst({
        where: {
          code,
          id: { not: id },
        },
      });
      if (existCode) {
        throw new ApiException('岗位编码已存在');
      }
    }

    // 校验部门是否存在
    if (deptId) {
      const dept = await this.prisma.sysDept.findUnique({
        where: { id: deptId },
      });
      if (!dept) {
        throw new ApiException('所属部门不存在');
      }
    }

    const post = await this.prisma.sysPost.update({
      where: { id },
      data: {
        ...other,
        code,
        deptId: deptId || null,
        ...(roleIds !== undefined && {
          roles: { set: roleIds.map((rid) => ({ id: rid })) },
        }),
      },
    });

    // 清除该岗位下所有用户的缓存
    const users = await this.prisma.sysUser.findMany({
      where: { postId: id },
      select: { id: true },
    });
    for (const user of users) {
      await this.cacheManager.del(
        generateRedisKey(REDIS_KEYS.USER_INFO, user.id),
      );
    }

    return post;
  }

  /* 删除 */
  async remove(id: string, currentUser: CurrentUserType) {
    const target = await this.prisma.sysPost.findFirst({
      where: {
        AND: [{ id }, this.dataScopeService.buildWhere(currentUser)],
      },
    });
    if (!target) {
      throw new ApiException('岗位不存在');
    }

    // 检查是否有用户关联
    const userCount = await this.prisma.sysUser.count({
      where: { postId: id },
    });

    if (userCount > 0) {
      throw new ApiException('该岗位下存在用户，无法删除');
    }

    return this.prisma.sysPost.delete({
      where: { id },
    });
  }

  /* 批量删除 */
  async removes(ids: string[], currentUser: CurrentUserType) {
    const where = {
      AND: [{ id: { in: ids } }, this.dataScopeService.buildWhere(currentUser)],
    };

    // 检查是否有用户关联
    const userCount = await this.prisma.sysUser.count({
      where: { postId: { in: ids } },
    });

    if (userCount > 0) {
      throw new ApiException('所选岗位下存在用户，无法删除');
    }

    return this.prisma.sysPost.deleteMany({
      where,
    });
  }

  /* 导出岗位列表 */
  async exportExcel(
    fields: ExportColumn[],
    query: GetSysPostListDto,
    currentUser: CurrentUserType,
    res: Response,
  ) {
    const { list } = await this.queryPosts(query, currentUser);

    const buffer = await this.excelExportService.export({
      columns: fields,
      data: list,
      filename: '岗位列表',
    });

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${encodeURIComponent('岗位列表')}.xlsx"`,
    );
    res.send(buffer);
  }

  /* 获取岗位选项列表（用于下拉选择） */
  async getOptions(deptId: string | undefined, currentUser: CurrentUserType) {
    const where: Prisma.SysPostWhereInput = {
      status: '0', // 只返回启用状态的岗位
    };

    // 如果指定了部门ID，返回公司通用岗位 + 该部门的岗位
    if (deptId) {
      where.OR = [{ deptId: null }, { deptId }];
    } else {
      // 没有指定部门，只返回公司通用岗位
      where.deptId = null;
    }

    const posts = await this.prisma.sysPost.findMany({
      where: {
        AND: [where, this.dataScopeService.buildWhere(currentUser)],
      },
      select: {
        id: true,
        name: true,
        code: true,
        isLeader: true,
        deptId: true,
        roles: {
          select: { id: true },
        },
      },
      orderBy: { sort: 'asc' },
    });

    return posts.map((post) => ({
      value: post.id,
      label: post.name,
      isLeader: post.isLeader,
      roleIds: post.roles.map((r) => r.id),
    }));
  }

  /* 获取岗位关联的角色ID列表 */
  async getPostRoleIds(postId: string, currentUser: CurrentUserType) {
    const post = await this.prisma.sysPost.findFirst({
      where: {
        AND: [{ id: postId }, this.dataScopeService.buildWhere(currentUser)],
      },
      select: {
        roles: { select: { id: true } },
      },
    });
    if (!post) {
      throw new ApiException('岗位不存在');
    }
    return post.roles.map((r) => r.id);
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
}

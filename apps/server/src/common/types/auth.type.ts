import { DataScopeEnum } from '@/common/enums/dataScope.enum';
import { SysDept, SysPost, SysUser } from '@prisma/client';

/**
 * 数据权限解析后的 Prisma where 条件。
 * 仅允许使用稳定的用户 ID 或部门 ID，不使用用户名等可变展示字段。
 */
export type DataScopeWhere =
  | Record<string, never>
  | { createById: string }
  | { deptId: { in: string[] } };

export type DataScopeContext = {
  scope: DataScopeEnum;
  deptIds: string[];
};

export type CustoemUserType = {
  permissions: string[];
  isSuper: boolean;
  dept?: Pick<SysDept, 'id' | 'deptName' | 'deptCode'> | null;
  post?: SysPost | null;
  dataScope: DataScopeContext;
};

export type CurrentUserType = Omit<SysUser, 'dept' | 'post'> & CustoemUserType;

export type JwtPayloadType = {
  id: string;
};

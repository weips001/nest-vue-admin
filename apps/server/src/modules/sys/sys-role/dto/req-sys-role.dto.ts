import { PaginationDto } from '@/common/dtos/pagination.dto';
import { PartialType } from '@nestjs/mapped-types';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class GetSysRoleListDto extends PaginationDto {
  @ApiProperty({ description: '角色名称', required: false })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiProperty({ description: '角色状态', required: false })
  @IsString()
  @IsOptional()
  status?: string;
}

export class CreateSysRoleDto {
  @ApiProperty({ description: '角色名称', required: true })
  @IsString()
  @MaxLength(30)
  name: string;

  @ApiProperty({ description: '角色权限值', required: true })
  @IsString()
  @MaxLength(30)
  key: string;

  @ApiProperty({ description: '排序', required: false })
  @IsNumber()
  @Type()
  sort: number;

  @ApiProperty({ description: '角色状态', required: true })
  @IsString()
  @MaxLength(1)
  status: string;

  @ApiProperty({
    description: '数据权限范围 (ALL/CUSTOM/DEPT/DEPT_AND_CHILD/SELF)',
    required: true,
  })
  @IsString()
  @MaxLength(20)
  dataScope: string;

  @ApiPropertyOptional({ description: '是否超管角色', default: false })
  @IsBoolean()
  @IsOptional()
  isSuper?: boolean;

  @ApiProperty({ description: '角色描述', required: false })
  @IsString()
  @IsOptional()
  @MaxLength(255)
  remark?: string;

  @ApiProperty({ description: '菜单权限', required: true })
  @IsArray()
  menus: number[];

  @ApiProperty({ description: '接口权限', required: true })
  @IsArray()
  menuBtns: number[];

  @ApiProperty({ description: '自定义数据权限的部门ID列表', required: false })
  @IsArray()
  @IsOptional()
  deptIds?: string[];
}

export class UpdateSysRoleDto extends PartialType(CreateSysRoleDto) {}

export class UpdateRoleUsersDto {
  @ApiProperty({ description: '用户ID列表', required: true })
  @IsArray()
  @IsString({ each: true })
  userIds: string[];
}

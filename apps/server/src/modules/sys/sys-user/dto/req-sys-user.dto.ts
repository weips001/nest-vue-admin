import { PaginationDto } from '@/common/dtos/pagination.dto';
import { PartialType } from '@nestjs/mapped-types';
import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

export class GetSysUserListDto extends PaginationDto {
  @ApiProperty({ description: '用户名', required: false })
  @IsOptional()
  @IsString()
  userName?: string;

  @ApiProperty({ description: '手机号', required: false })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiProperty({ description: '状态', required: false })
  @IsString()
  @IsOptional()
  status?: string;

  @ApiProperty({ description: '部门ID', required: false })
  @IsString()
  @IsOptional()
  deptId?: string;

  @ApiProperty({
    description: '是否包含子部门',
    required: false,
    default: false,
  })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  includeChildren?: boolean;

  @ApiProperty({ description: '岗位ID', required: false })
  @IsString()
  @IsOptional()
  postId?: string;
}

export class CreateSysUserDto {
  @ApiProperty({ description: '用户名', example: 'admin' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(30)
  userName: string;

  @ApiProperty({ description: '头像地址', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  avatar?: string;

  @ApiProperty({
    description: '邮箱',
    example: 'admin@example.com',
    required: false,
  })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  email?: string;

  @ApiProperty({ description: '昵称', example: '系统管理员' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(30)
  nickName: string;

  @ApiProperty({
    description: '手机号',
    example: '13800138000',
    required: false,
  })
  @IsOptional()
  @IsString()
  @MaxLength(11)
  phone?: string;

  @ApiProperty({
    description: '性别(0男 1女 2未知)',
    example: '0',
    required: false,
  })
  @IsOptional()
  @IsString()
  sex?: string;

  @ApiProperty({
    description: '状态(0正常 1停用)',
    example: '0',
    required: false,
  })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiProperty({
    description: '用户类型(00系统用户)',
    example: '00',
    required: false,
  })
  @IsOptional()
  @IsString()
  userType?: string;

  @ApiProperty({
    description: '部门ID',
    required: false,
  })
  @IsOptional()
  @IsString()
  deptId?: string;

  @ApiProperty({
    description: '岗位ID',
    required: false,
  })
  @IsOptional()
  @IsString()
  postId?: string;

  @ApiProperty({ description: '备注', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  remark?: string;

  @ApiProperty({ description: '角色ID', required: false })
  @IsArray()
  @IsString({ each: true })
  roleIds: string[];
}

export class UpdateSysUserDto extends PartialType(CreateSysUserDto) {}

export class UpdateProfileDto {
  @ApiProperty({ description: '头像地址', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  avatar?: string;

  @ApiProperty({ description: '昵称', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(30)
  nickName?: string;

  @ApiProperty({ description: '邮箱', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  email?: string;

  @ApiProperty({ description: '手机号', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(11)
  phone?: string;

  @ApiProperty({ description: '性别(0男 1女 2未知)', required: false })
  @IsOptional()
  @IsString()
  sex?: string;
}

export class UpdatePasswordDto {
  @ApiProperty({ description: '旧密码' })
  @IsString()
  @MaxLength(100)
  oldPassword: string;

  @ApiProperty({ description: '新密码（8-20位，需包含字母、数字和特殊字符）' })
  @IsString()
  @MinLength(8, { message: '密码长度不能少于8位' })
  @MaxLength(20, { message: '密码长度不能超过20位' })
  @Matches(
    /^(?=.*[A-Za-z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?`~]).+$/,
    {
      message: '密码必须包含字母、数字和特殊字符',
    },
  )
  newPassword: string;
}

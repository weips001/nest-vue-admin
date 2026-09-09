import { PaginationDto } from '@/common/dtos/pagination.dto';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

/* 分页查询任务列表 */
export class GetJobListDto extends PaginationDto {
  @ApiPropertyOptional({ description: '任务名称' })
  @IsString()
  @IsOptional()
  jobName?: string;

  @ApiPropertyOptional({ description: '任务组名' })
  @IsString()
  @IsOptional()
  jobGroup?: string;

  @ApiPropertyOptional({ description: '状态 (0正常 1暂停)' })
  @IsString()
  @IsOptional()
  @IsIn(['0', '1'])
  status?: string;
}

/* 创建任务 */
export class CreateJobDto {
  @ApiProperty({ description: '任务名称' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(64)
  jobName: string;

  @ApiProperty({ description: '任务组名' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(64)
  jobGroup: string;

  @ApiProperty({ description: '调用目标 (格式: service.method(args))' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  invokeTarget: string;

  @ApiProperty({ description: 'cron表达式' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  cronExpression: string;

  @ApiPropertyOptional({
    description: '执行策略 (1立即执行 2执行一次 3放弃执行)',
  })
  @IsString()
  @IsOptional()
  @IsIn(['1', '2', '3'])
  misfirePolicy?: string;

  @ApiPropertyOptional({ description: '是否并发执行 (0允许 1禁止)' })
  @IsString()
  @IsOptional()
  @IsIn(['0', '1'])
  concurrent?: string;

  @ApiPropertyOptional({ description: '状态 (0正常 1暂停)' })
  @IsString()
  @IsOptional()
  @IsIn(['0', '1'])
  status?: string;

  @ApiPropertyOptional({ description: '备注' })
  @IsString()
  @IsOptional()
  @MaxLength(255)
  remark?: string;
}

/* 更新任务 */
export class UpdateJobDto {
  @ApiProperty({ description: '任务名称' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(64)
  jobName: string;

  @ApiProperty({ description: '任务组名' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(64)
  jobGroup: string;

  @ApiProperty({ description: '调用目标 (格式: service.method(args))' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  invokeTarget: string;

  @ApiProperty({ description: 'cron表达式' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  cronExpression: string;

  @ApiPropertyOptional({
    description: '执行策略 (1立即执行 2执行一次 3放弃执行)',
  })
  @IsString()
  @IsOptional()
  @IsIn(['1', '2', '3'])
  misfirePolicy?: string;

  @ApiPropertyOptional({ description: '是否并发执行 (0允许 1禁止)' })
  @IsString()
  @IsOptional()
  @IsIn(['0', '1'])
  concurrent?: string;

  @ApiPropertyOptional({ description: '备注' })
  @IsString()
  @IsOptional()
  @MaxLength(255)
  remark?: string;
}

/* 修改任务状态 */
export class ChangeJobStatusDto {
  @ApiProperty({ description: '任务ID' })
  @IsString()
  @IsNotEmpty()
  id: string;

  @ApiProperty({ description: '状态 (0正常 1暂停)' })
  @IsString()
  @IsNotEmpty()
  @IsIn(['0', '1'])
  status: string;
}

/* 分页查询任务日志列表 */
export class GetJobLogListDto extends PaginationDto {
  @ApiPropertyOptional({ description: '任务名称' })
  @IsString()
  @IsOptional()
  jobName?: string;

  @ApiPropertyOptional({ description: '任务组名' })
  @IsString()
  @IsOptional()
  jobGroup?: string;

  @ApiPropertyOptional({ description: '日志状态 (0成功 1失败)' })
  @IsString()
  @IsOptional()
  @IsIn(['0', '1'])
  status?: string;

  @ApiPropertyOptional({ description: '开始时间' })
  @IsDateString()
  @IsOptional()
  startTime?: string;

  @ApiPropertyOptional({ description: '结束时间' })
  @IsDateString()
  @IsOptional()
  endTime?: string;
}

import { PaginationDto } from '@/common/dtos/pagination.dto';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class GetSysTodoListDto extends PaginationDto {
  @ApiPropertyOptional({ description: '标题' })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional({ description: '业务类型' })
  @IsOptional()
  @IsString()
  bizType?: string;

  @ApiPropertyOptional({ description: '状态' })
  @IsOptional()
  @IsString()
  status?: string;
}

export class CreateSysTodoDto {
  @ApiProperty({ description: '标题' })
  @IsString()
  @MaxLength(200)
  title: string;

  @ApiProperty({ description: '内容' })
  @IsString()
  content: string;

  @ApiProperty({
    description: '业务类型：approval审批, confirm确认, review审核',
  })
  @IsString()
  @MaxLength(20)
  bizType: string;

  @ApiPropertyOptional({ description: '优先级', default: 'normal' })
  @IsOptional()
  @IsString()
  @MaxLength(10)
  priority?: string;

  @ApiPropertyOptional({ description: '关联链接' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  link?: string;

  @ApiPropertyOptional({ description: '关联业务ID' })
  @IsOptional()
  @IsString()
  bizId?: string;

  @ApiProperty({ description: '目标用户ID' })
  @IsString()
  userId: string;
}

export class UpdateSysTodoDto {
  @ApiPropertyOptional({ description: '标题' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  title?: string;

  @ApiPropertyOptional({ description: '内容' })
  @IsOptional()
  @IsString()
  content?: string;

  @ApiPropertyOptional({ description: '业务类型' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  bizType?: string;

  @ApiPropertyOptional({ description: '优先级' })
  @IsOptional()
  @IsString()
  @MaxLength(10)
  priority?: string;

  @ApiPropertyOptional({ description: '状态' })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional({ description: '关联链接' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  link?: string;

  @ApiPropertyOptional({ description: '关联业务ID' })
  @IsOptional()
  @IsString()
  bizId?: string;
}

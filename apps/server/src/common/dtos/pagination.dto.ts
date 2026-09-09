import { SortEnum } from '@/common/enums/sort.enum';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

export class PaginationDto {
  @ApiProperty({
    description: '当前页码',
    default: 1,
    required: false,
  })
  @IsNumber()
  @IsOptional()
  @Type()
  @Min(1)
  public current: number = 1;

  @ApiProperty({
    description: '每页数量（最大100）',
    default: 20,
    required: false,
    maximum: 100,
  })
  @IsNumber()
  @IsOptional()
  @Type()
  @Min(1)
  @Max(100)
  public pageSize: number = 20;

  @ApiProperty({
    description: '排序字段',
    required: false,
  })
  @IsOptional()
  @IsString()
  public sortKeys?: string;

  @ApiProperty({
    description: '排序方式',
    required: false,
    enum: SortEnum,
  })
  @IsOptional()
  @IsEnum(SortEnum)
  public sortTypes?: SortEnum;

  get skip(): number | undefined {
    return (this.current - 1) * this.pageSize || undefined;
  }

  get take(): number | undefined {
    return this.pageSize;
  }
}

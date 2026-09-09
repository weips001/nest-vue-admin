import type { ExportColumn } from '@/common/class/export.class';
import { Permission } from '@/common/decorators/permission.decorator';
import { User } from '@/common/decorators/user.decorator';
import { CreateDtoPipe } from '@/common/pipes/createDto.pipe';
import { UpdateDtoPipe } from '@/common/pipes/updateDto.pipe';
import type { CurrentUserType } from '@/common/types/auth.type';
import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Res,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import {
  CreateSysPostDto,
  GetSysPostListDto,
  UpdateSysPostDto,
} from './dto/req-sys-post.dto';
import { SysPostService } from './sys-post.service';

@ApiTags('岗位管理')
@ApiBearerAuth()
@Controller('sys/post')
export class SysPostController {
  constructor(private readonly sysPostService: SysPostService) {}

  @ApiOperation({
    summary: '新增岗位',
  })
  @Permission('sys:post:create')
  @Post()
  create(
    @Body(CreateDtoPipe) createSysPostDto: CreateSysPostDto,
    @User() user: CurrentUserType,
  ) {
    return this.sysPostService.create(createSysPostDto, user);
  }

  @ApiOperation({
    summary: '查询岗位列表',
  })
  @Permission('sys:post:list')
  @Get()
  findAll(@Query() query: GetSysPostListDto, @User() user: CurrentUserType) {
    return this.sysPostService.findAll(query, user);
  }

  @ApiOperation({
    summary: '导出岗位列表',
  })
  @Permission('sys:post:export')
  @Post('export')
  exportExcel(
    @Body() body: { fields: ExportColumn[] },
    @Query() query: GetSysPostListDto,
    @User() user: CurrentUserType,
    @Res() res: Response,
  ) {
    return this.sysPostService.exportExcel(body.fields, query, user, res);
  }

  @ApiOperation({
    summary: '获取岗位选项',
  })
  @Get('options')
  getOptions(
    @Query('deptId') deptId: string | undefined,
    @User() user: CurrentUserType,
  ) {
    return this.sysPostService.getOptions(deptId, user);
  }

  @ApiOperation({
    summary: '查询岗位详情',
  })
  @Permission('sys:post:detail')
  @Get(':id')
  findOne(@Param('id') id: string, @User() user: CurrentUserType) {
    return this.sysPostService.findOne(id, user);
  }

  @ApiOperation({
    summary: '获取岗位关联的角色ID列表',
  })
  @Permission('sys:post:list')
  @Get(':id/roles')
  getPostRoleIds(@Param('id') id: string, @User() user: CurrentUserType) {
    return this.sysPostService.getPostRoleIds(id, user);
  }

  @ApiOperation({
    summary: '更新岗位',
  })
  @Permission('sys:post:update')
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body(UpdateDtoPipe) updateSysPostDto: UpdateSysPostDto,
    @User() user: CurrentUserType,
  ) {
    return this.sysPostService.update(id, updateSysPostDto, user);
  }

  @ApiOperation({
    summary: '删除岗位',
  })
  @Permission('sys:post:remove')
  @Delete(':id')
  remove(@Param('id') id: string, @User() user: CurrentUserType) {
    return this.sysPostService.remove(id, user);
  }

  @ApiOperation({
    summary: '批量删除岗位',
  })
  @Permission('sys:post:remove')
  @Delete('batch')
  removes(@Body() body: { ids: string[] }, @User() user: CurrentUserType) {
    return this.sysPostService.removes(body.ids, user);
  }
}

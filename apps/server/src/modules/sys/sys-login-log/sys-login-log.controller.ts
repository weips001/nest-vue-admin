import type { ExportColumn } from '@/common/class/export.class';
import { Action } from '@/common/decorators/action.decorator';
import { Permission } from '@/common/decorators/permission.decorator';
import { DelCommonNumbersDto } from '@/common/dtos/common.dto';
import { ActionEnum } from '@/common/enums/action.enum';
import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  Res,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import type { Response } from 'express';
import {
  GetOnlineUserListDto,
  GetSysLoginLogListDto,
} from './dto/req-sys-login-log.dto';
import { SysLoginLogService } from './sys-login-log.service';

@ApiTags('登录日志')
@ApiBearerAuth()
@Controller('sys/login-log')
export class SysLoginLogController {
  constructor(private readonly sysLoginLogService: SysLoginLogService) {}

  /* 在线用户列表 */
  @Get('online')
  @ApiOperation({ summary: '查询在线用户列表' })
  @Permission('sys:login-log:online')
  findOnlineUsers(@Query() query: GetOnlineUserListDto) {
    return this.sysLoginLogService.findOnlineUsers(query);
  }

  /* 强制下线 */
  @Delete('online/:userId')
  @ApiOperation({ summary: '强制下线' })
  @ApiParam({ name: 'userId', description: '用户ID' })
  @Permission('sys:login-log:force-logout')
  @Action({ action: ActionEnum.REMOVE, title: '在线用户' })
  forceLogout(@Param('userId') userId: string) {
    return this.sysLoginLogService.forceLogout(userId);
  }

  /* 列表查询 */
  @Get()
  @ApiOperation({ summary: '查询登录日志列表' })
  @Permission('sys:login-log:list')
  findAll(@Query() query: GetSysLoginLogListDto) {
    return this.sysLoginLogService.findAll(query);
  }

  /* 导出登录日志 */
  @Post('export')
  @ApiOperation({ summary: '导出登录日志' })
  @Permission('sys:login-log:export')
  exportExcel(
    @Body() body: { fields: ExportColumn[] },
    @Query() query: GetSysLoginLogListDto,
    @Res() res: Response,
  ) {
    return this.sysLoginLogService.exportExcel(body.fields, query, res);
  }

  /* 通过id查询 */
  @Get(':id')
  @ApiOperation({ summary: '查询登录日志详情' })
  @ApiParam({ name: 'id', description: '登录日志ID' })
  @Permission('sys:login-log:detail')
  findOne(@Param('id') id: number) {
    return this.sysLoginLogService.findOne(+id);
  }

  /* 批量删除 */
  @Delete()
  @ApiOperation({ summary: '批量删除登录日志' })
  @Permission('sys:login-log:remove')
  removes(@Query() query: DelCommonNumbersDto) {
    return this.sysLoginLogService.removes(query.ids);
  }

  /* 清空日志 */
  @Delete('clear')
  @ApiOperation({ summary: '清空登录日志' })
  @Permission('sys:login-log:clear')
  clear() {
    return this.sysLoginLogService.clear();
  }
}

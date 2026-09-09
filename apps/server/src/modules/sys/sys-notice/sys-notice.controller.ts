import { Action } from '@/common/decorators/action.decorator';
import { Permission } from '@/common/decorators/permission.decorator';
import { User } from '@/common/decorators/user.decorator';
import { ActionEnum } from '@/common/enums/action.enum';
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
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  CreateSysNoticeDto,
  GetSysNoticeListDto,
  GetUserNoticeListDto,
  UpdateSysNoticeDto,
} from './dto/req-sys-notice.dto';
import { SysNoticeService } from './sys-notice.service';

@ApiTags('通知公告')
@ApiBearerAuth()
@Controller('sys/notice')
export class SysNoticeController {
  constructor(private readonly sysNoticeService: SysNoticeService) {}

  // ========== 用户端接口（放在参数路由之前）==========

  @ApiOperation({ summary: '获取未读通知数量' })
  @Get('unread/count')
  getUnreadCount(@User() user: CurrentUserType) {
    return this.sysNoticeService.getUnreadCount(user.id);
  }

  @ApiOperation({ summary: '获取当前用户的通知列表' })
  @Get('user/list')
  getUserNotices(
    @User() user: CurrentUserType,
    @Query() query: GetUserNoticeListDto,
  ) {
    return this.sysNoticeService.getUserNotices(user.id, query);
  }

  @ApiOperation({ summary: '标记所有通知为已读' })
  @Post('read/all')
  markAllAsRead(@User() user: CurrentUserType) {
    return this.sysNoticeService.markAllAsRead(user.id);
  }

  // ========== 管理端接口 ==========

  @ApiOperation({ summary: '查询通知列表' })
  @Permission('sys:notice:list')
  @Get()
  findAll(@Query() query: GetSysNoticeListDto) {
    return this.sysNoticeService.findAll(query);
  }

  @ApiOperation({ summary: '新增通知' })
  @Permission('sys:notice:create')
  @Action({ title: '新增通知', action: ActionEnum.CREATE })
  @Post()
  create(
    @Body(CreateDtoPipe) createSysNoticeDto: CreateSysNoticeDto,
    @User() user: CurrentUserType,
  ) {
    return this.sysNoticeService.create(createSysNoticeDto, user.id);
  }

  @ApiOperation({ summary: '查询通知详情' })
  @Permission('sys:notice:detail')
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.sysNoticeService.findOne(id);
  }

  @ApiOperation({ summary: '标记通知为已读' })
  @Post(':id/read')
  markAsRead(@Param('id') id: string, @User() user: CurrentUserType) {
    return this.sysNoticeService.markAsRead(id, user.id);
  }

  @ApiOperation({ summary: '更新通知' })
  @Permission('sys:notice:update')
  @Action({ title: '更新通知', action: ActionEnum.UPDATE })
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body(UpdateDtoPipe) updateSysNoticeDto: UpdateSysNoticeDto,
    @User() user: CurrentUserType,
  ) {
    return this.sysNoticeService.update(id, updateSysNoticeDto, user.id);
  }

  @ApiOperation({ summary: '删除通知' })
  @Permission('sys:notice:remove')
  @Action({ title: '删除通知', action: ActionEnum.REMOVE })
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.sysNoticeService.remove(id);
  }
}

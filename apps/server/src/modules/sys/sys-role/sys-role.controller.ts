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
  Put,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  CreateSysRoleDto,
  GetSysRoleListDto,
  UpdateRoleUsersDto,
  UpdateSysRoleDto,
} from './dto/req-sys-role.dto';
import { SysRoleService } from './sys-role.service';

@ApiTags('用户角色')
@ApiBearerAuth()
@Controller('sys/role')
export class SysRoleController {
  constructor(private readonly sysRoleService: SysRoleService) {}

  @Permission('sys:role:create')
  @ApiOperation({
    summary: '新增角色',
  })
  @Action({ action: ActionEnum.CREATE, title: '新增角色' })
  @Post()
  create(
    @Body(CreateDtoPipe) createSysRoleDto: CreateSysRoleDto,
    @User() user: CurrentUserType,
  ) {
    return this.sysRoleService.create(createSysRoleDto, user);
  }

  @Permission('sys:role:list')
  @ApiOperation({
    summary: '查询角色列表',
  })
  @Get()
  findAll(@Query() query: GetSysRoleListDto) {
    return this.sysRoleService.findAll(query);
  }

  @Permission('sys:role:list')
  @ApiOperation({
    summary: '查询角色下拉框',
  })
  @Get('options')
  findAllOptions() {
    return this.sysRoleService.findAllOptions();
  }

  @Permission('sys:role:list')
  @ApiOperation({
    summary: '查询角色详情',
  })
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.sysRoleService.findOne(id);
  }

  @Permission('sys:role:list')
  @ApiOperation({
    summary: '获取角色关联的用户ID列表',
  })
  @Get(':id/users')
  getRoleUsers(@Param('id') id: string) {
    return this.sysRoleService.getRoleUsers(id);
  }

  @Permission('sys:role:update')
  @ApiOperation({
    summary: '批量设置角色用户',
  })
  @Action({ action: ActionEnum.UPDATE, title: '分配角色用户' })
  @Put(':id/users')
  updateRoleUsers(
    @Param('id') id: string,
    @Body() dto: UpdateRoleUsersDto,
    @User() user: CurrentUserType,
  ) {
    return this.sysRoleService.updateRoleUsers(id, dto, user);
  }

  @Permission('sys:role:update')
  @ApiOperation({
    summary: '更新角色',
  })
  @Action({ action: ActionEnum.UPDATE, title: '更新角色' })
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body(UpdateDtoPipe) updateSysRoleDto: UpdateSysRoleDto,
    @User() user: CurrentUserType,
  ) {
    return this.sysRoleService.update(id, updateSysRoleDto, user);
  }

  @Permission('sys:role:remove')
  @ApiOperation({
    summary: '批量删除角色',
  })
  @Action({ action: ActionEnum.REMOVES, title: '批量删除角色' })
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.sysRoleService.remove(id);
  }
}

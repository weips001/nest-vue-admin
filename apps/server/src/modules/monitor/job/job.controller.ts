import { Permission } from '@/common/decorators/permission.decorator';
import { User } from '@/common/decorators/user.decorator';
import {
  DelCommonNumbersDto,
  DelCommonStringsDto,
} from '@/common/dtos/common.dto';
import { CreateDtoPipe } from '@/common/pipes/createDto.pipe';
import { UpdateDtoPipe } from '@/common/pipes/updateDto.pipe';
import type { CurrentUserType } from '@/common/types/auth.type';
import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
  UsePipes,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import {
  ChangeJobStatusDto,
  CreateJobDto,
  GetJobListDto,
  GetJobLogListDto,
  UpdateJobDto,
} from './dto/req-job.dto';
import { JobLogService } from './job-log.service';
import { JobService } from './job.service';

@ApiTags('任务管理')
@ApiBearerAuth()
@Controller('monitor/job')
export class JobController {
  constructor(
    private readonly jobService: JobService,
    private readonly jobLogService: JobLogService,
  ) {}

  /* ========== 任务日志（放在前面避免 :id 匹配） ========== */

  /* 任务日志列表 */
  @Get('log/list')
  @ApiOperation({ summary: '查询任务日志列表' })
  @Permission('monitor:job-log:list')
  findLogAll(@Query() query: GetJobLogListDto) {
    return this.jobLogService.findAll(query);
  }

  /* 任务日志详情 */
  @Get('log/:id')
  @ApiOperation({ summary: '查询任务日志详情' })
  @ApiParam({ name: 'id', description: '日志ID' })
  @Permission('monitor:job-log:detail')
  findLogOne(@Param('id') id: number) {
    return this.jobLogService.findOne(+id);
  }

  /* 清空任务日志 */
  @Delete('log/clean')
  @ApiOperation({ summary: '清空任务日志' })
  @Permission('monitor:job-log:clear')
  cleanLogs() {
    return this.jobLogService.clean();
  }

  /* 批量删除任务日志 */
  @Delete('log')
  @ApiOperation({ summary: '批量删除任务日志' })
  @Permission('monitor:job-log:remove')
  removeLogs(@Query() query: DelCommonNumbersDto) {
    return this.jobLogService.removes(query.ids);
  }

  /* ========== 任务管理 ========== */

  /* 任务列表 */
  @Get()
  @ApiOperation({ summary: '查询任务列表' })
  @Permission('monitor:job:list')
  findAll(@Query() query: GetJobListDto) {
    return this.jobService.findAll(query);
  }

  /* 新增任务 */
  @Post()
  @ApiOperation({ summary: '新增任务' })
  @Permission('monitor:job:create')
  @UsePipes(CreateDtoPipe)
  create(@Body() dto: CreateJobDto, @User() user: CurrentUserType) {
    return this.jobService.create(dto, user);
  }

  /* 修改任务状态 */
  @Put('status')
  @ApiOperation({ summary: '修改任务状态' })
  @Permission('monitor:job:status')
  changeStatus(@Body() dto: ChangeJobStatusDto) {
    return this.jobService.changeStatus(dto);
  }

  /* 执行一次 */
  @Put('run/:id')
  @ApiOperation({ summary: '执行一次任务' })
  @ApiParam({ name: 'id', description: '任务ID' })
  @Permission('monitor:job:run')
  runOnce(@Param('id') id: string) {
    return this.jobService.runOnce(id);
  }

  /* 编辑任务 */
  @Put(':id')
  @ApiOperation({ summary: '编辑任务' })
  @ApiParam({ name: 'id', description: '任务ID' })
  @Permission('monitor:job:update')
  @UsePipes(UpdateDtoPipe)
  update(@Param('id') id: string, @Body() dto: UpdateJobDto) {
    return this.jobService.update(id, dto);
  }

  /* 任务详情 */
  @Get(':id')
  @ApiOperation({ summary: '查询任务详情' })
  @ApiParam({ name: 'id', description: '任务ID' })
  @Permission('monitor:job:detail')
  findOne(@Param('id') id: string) {
    return this.jobService.findOne(id);
  }

  /* 批量删除任务 */
  @Delete()
  @ApiOperation({ summary: '批量删除任务' })
  @Permission('monitor:job:remove')
  removes(@Query() query: DelCommonStringsDto) {
    return this.jobService.removes(query.ids);
  }
}

import { ApiException } from '@/common/exceptions/api.exception';
import type { CurrentUserType } from '@/common/types/auth.type';
import { generateUUid } from '@/utils/util';
import { Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { SchedulerRegistry } from '@nestjs/schedule';
import { Prisma } from '@prisma/client';
import { CronJob } from 'cron';
import { PrismaService } from 'nestjs-prisma';
import { CreateJobDto, GetJobListDto, UpdateJobDto } from './dto/req-job.dto';
import { JobLogService } from './job-log.service';

@Injectable()
export class JobService implements OnModuleInit {
  private readonly logger = new Logger(JobService.name);
  /** 正在执行的任务ID集合（用于并发控制） */
  private readonly runningJobs = new Set<string>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly jobLogService: JobLogService,
    private readonly schedulerRegistry: SchedulerRegistry,
    @Inject(ModuleRef) private readonly moduleRef: ModuleRef,
  ) {}

  /* 启动时加载所有启用的任务 */
  async onModuleInit() {
    const jobs = await this.prisma.sysJob.findMany({
      where: { status: '0' },
    });
    for (const job of jobs) {
      try {
        this.addCronJob(job.id, job.cronExpression, job);
      } catch (e) {
        this.logger.error(
          `启动加载任务失败 [${job.jobName}]: ${(e as Error).message}`,
        );
      }
    }
    this.logger.log(`已加载 ${jobs.length} 个定时任务`);
  }

  /* 分页查询任务列表 */
  async findAll(query: GetJobListDto) {
    const { skip, take } = query;
    const where: Prisma.SysJobWhereInput = {};

    if (query.jobName) {
      where.jobName = { contains: query.jobName };
    }
    if (query.jobGroup) {
      where.jobGroup = { contains: query.jobGroup };
    }
    if (query.status !== undefined) {
      where.status = query.status;
    }

    const [list, total] = await Promise.all([
      this.prisma.sysJob.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.sysJob.count({ where }),
    ]);

    return { list, total };
  }

  /* 查询任务详情 */
  async findOne(id: string) {
    return this.prisma.sysJob.findUnique({ where: { id } });
  }

  /* 创建任务 */
  async create(dto: CreateJobDto, currentUser: CurrentUserType) {
    const id = generateUUid();
    const job = await this.prisma.sysJob.create({
      data: { id, ...dto, createById: currentUser.id },
    });

    // 启用状态的任务注册 cron
    if (dto.status === '0') {
      this.addCronJob(job.id, job.cronExpression, job);
    }

    return job;
  }

  /* 更新任务 */
  async update(id: string, dto: UpdateJobDto) {
    const existing = await this.prisma.sysJob.findUnique({ where: { id } });
    if (!existing) {
      throw new ApiException('任务不存在');
    }

    // 移除旧 cron
    this.deleteCronJob(id);

    const job = await this.prisma.sysJob.update({
      where: { id },
      data: dto,
    });

    // 如果更新后仍启用，重新注册 cron
    if (job.status === '0') {
      this.addCronJob(job.id, job.cronExpression, job);
    }

    return job;
  }

  /* 批量删除任务 */
  async removes(ids: string[]) {
    for (const id of ids) {
      this.deleteCronJob(id);
    }
    return this.prisma.sysJob.deleteMany({
      where: { id: { in: ids } },
    });
  }

  /* 修改任务状态 */
  async changeStatus(dto: { id: string; status: string }) {
    const { id, status } = dto;
    const job = await this.prisma.sysJob.findUnique({ where: { id } });
    if (!job) {
      throw new ApiException('任务不存在');
    }

    if (status === '0') {
      // 启用 → 注册 cron
      this.addCronJob(id, job.cronExpression, job);
    } else {
      // 暂停 → 删除 cron
      this.deleteCronJob(id);
    }

    return this.prisma.sysJob.update({
      where: { id },
      data: { status },
    });
  }

  /* 手动执行一次 */
  async runOnce(id: string) {
    const job = await this.prisma.sysJob.findUnique({ where: { id } });
    if (!job) {
      throw new ApiException('任务不存在');
    }

    await this.executeJob(job);
  }

  /* 执行任务（核心方法） */
  private async executeJob(job: {
    id: string;
    jobName: string;
    jobGroup: string;
    invokeTarget: string;
    concurrent: string;
  }) {
    const startTime = new Date();

    // 并发检查
    if (job.concurrent === '1' && this.runningJobs.has(job.id)) {
      this.logger.warn(`任务 [${job.jobName}] 正在执行，跳过本次触发`);
      return;
    }

    this.runningJobs.add(job.id);

    try {
      const { serviceName, methodName, args } = this.parseInvokeTarget(
        job.invokeTarget,
      );
      const serviceInstance = this.moduleRef.get(serviceName, {
        strict: false,
      });
      const method = serviceInstance[methodName];

      if (!method || typeof method !== 'function') {
        throw new Error(`方法不存在: ${serviceName}.${methodName}`);
      }

      let result: any;
      if (args) {
        const parsedArgs = JSON.parse(`[${args}]`);
        result = await method.apply(serviceInstance, parsedArgs);
      } else {
        result = await method.call(serviceInstance);
      }

      const endTime = new Date();
      await this.jobLogService.createLog({
        jobName: job.jobName,
        jobGroup: job.jobGroup,
        invokeTarget: job.invokeTarget,
        status: '0',
        jobMessage: typeof result === 'string' ? result : '执行成功',
        startTime,
        endTime,
      });
    } catch (e) {
      const endTime = new Date();
      const errMsg = (e as Error).message;
      await this.jobLogService.createLog({
        jobName: job.jobName,
        jobGroup: job.jobGroup,
        invokeTarget: job.invokeTarget,
        status: '1',
        jobMessage: '执行失败',
        exceptionInfo: errMsg?.substring(0, 2000),
        startTime,
        endTime,
      });
      this.logger.error(`任务 [${job.jobName}] 执行失败: ${errMsg}`);
    } finally {
      this.runningJobs.delete(job.id);
    }
  }

  /* 解析调用目标 */
  parseInvokeTarget(target: string): {
    serviceName: string;
    methodName: string;
    args: string;
  } {
    const match = target.match(/^(\w+)\.(\w+)\((.*)?\)$/);
    if (!match) {
      throw new ApiException(
        '任务目标格式错误，正确格式: service.method(args)',
      );
    }
    return {
      serviceName: match[1],
      methodName: match[2],
      args: match[3] || '',
    };
  }

  /* 注册 cron 任务 */
  private addCronJob(
    jobId: string,
    cronExpression: string,
    job: {
      id: string;
      jobName: string;
      jobGroup: string;
      invokeTarget: string;
      concurrent: string;
    },
  ) {
    // 先移除旧的（如果存在）
    this.deleteCronJob(jobId);

    const cronJob = new CronJob(cronExpression, () => {
      this.executeJob(job).catch((e) => {
        this.logger.error(`Cron 执行异常 [${job.jobName}]: ${e.message}`);
      });
    });

    this.schedulerRegistry.addCronJob(`job_${jobId}`, cronJob);
    cronJob.start();
  }

  /* 移除 cron 任务 */
  private deleteCronJob(jobId: string) {
    try {
      const cronJob = this.schedulerRegistry.getCronJob(`job_${jobId}`);
      if (cronJob) {
        cronJob.stop();
        this.schedulerRegistry.deleteCronJob(`job_${jobId}`);
      }
    } catch {
      // 不存在时忽略
    }
  }
}

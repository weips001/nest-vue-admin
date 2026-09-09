jest.mock('@prisma/client', () => ({ Prisma: {} }));
jest.mock('nestjs-prisma', () => ({ PrismaService: class PrismaService {} }));

import { generateUUid } from '@/utils/util';
import { ModuleRef } from '@nestjs/core';
import { SchedulerRegistry } from '@nestjs/schedule';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from 'nestjs-prisma';
import { JobLogService } from './job-log.service';
import { JobService } from './job.service';

jest.mock('@/utils/util', () => ({
  generateUUid: jest.fn(() => 'mock-uuid-12345678901234567890'),
}));

describe('JobService', () => {
  let service: JobService;
  let prismaMock: any;
  let jobLogServiceMock: any;
  let schedulerRegistryMock: any;
  let moduleRefMock: any;

  beforeEach(async () => {
    prismaMock = {
      sysJob: {
        create: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
        deleteMany: jest.fn(),
      },
    };

    jobLogServiceMock = {
      createLog: jest.fn(),
    };

    schedulerRegistryMock = {
      addCronJob: jest.fn(),
      deleteCronJob: jest.fn(),
      getCronJob: jest.fn(() => {
        throw new Error('not found');
      }),
    };

    moduleRefMock = {
      get: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JobService,
        { provide: PrismaService, useValue: prismaMock },
        { provide: JobLogService, useValue: jobLogServiceMock },
        { provide: SchedulerRegistry, useValue: schedulerRegistryMock },
        { provide: ModuleRef, useValue: moduleRefMock },
      ],
    }).compile();

    service = module.get<JobService>(JobService);
  });

  afterEach(() => jest.clearAllMocks());

  describe('findAll - 分页查询任务列表', () => {
    it('应返回分页列表', async () => {
      const mockList = [{ id: '1', jobName: '清理日志', status: '0' }];
      prismaMock.sysJob.findMany.mockResolvedValue(mockList);
      prismaMock.sysJob.count.mockResolvedValue(1);

      const result = await service.findAll({
        current: 1,
        pageSize: 20,
        skip: 0,
        take: 20,
      } as any);

      expect(result).toEqual({ list: mockList, total: 1 });
    });

    it('应支持按名称和状态筛选', async () => {
      prismaMock.sysJob.findMany.mockResolvedValue([]);
      prismaMock.sysJob.count.mockResolvedValue(0);

      await service.findAll({
        current: 1,
        pageSize: 20,
        skip: 0,
        take: 20,
        jobName: '清理',
        status: '0',
      } as any);

      const whereArg = prismaMock.sysJob.findMany.mock.calls[0][0].where;
      expect(whereArg.jobName).toEqual({ contains: '清理' });
      expect(whereArg.status).toBe('0');
    });
  });

  describe('findOne - 查询任务详情', () => {
    it('应返回指定ID的任务', async () => {
      const mockJob = { id: '1', jobName: '清理日志' };
      prismaMock.sysJob.findUnique.mockResolvedValue(mockJob);

      const result = await service.findOne('1');
      expect(result).toEqual(mockJob);
    });
  });

  describe('create - 创建任务', () => {
    it('应创建任务并注册cron', async () => {
      const dto = {
        jobName: '清理日志',
        jobGroup: 'DEFAULT',
        invokeTarget: 'sysLoginLogService.clean()',
        cronExpression: '0 0 2 * * *',
        misfirePolicy: '1',
        concurrent: '1',
        status: '0',
      };
      const mockJob = { id: 'mock-uuid-12345678901234567890', ...dto };
      prismaMock.sysJob.create.mockResolvedValue(mockJob);

      const result = await service.create(dto as any, { id: 'user-1' } as any);
      expect(result).toEqual(mockJob);
      expect(generateUUid).toHaveBeenCalled();
      expect(prismaMock.sysJob.create).toHaveBeenCalled();
      expect(prismaMock.sysJob.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ createById: 'user-1' }),
        }),
      );
      // 启用的任务应该注册 cron
      expect(schedulerRegistryMock.addCronJob).toHaveBeenCalled();
    });

    it('暂停状态的任务不注册cron', async () => {
      const dto = {
        jobName: '暂停任务',
        jobGroup: 'DEFAULT',
        invokeTarget: 'testService.run()',
        cronExpression: '0 0 2 * * *',
        status: '1',
      };
      prismaMock.sysJob.create.mockResolvedValue({ id: '1', ...dto });

      await service.create(dto as any, { id: 'user-1' } as any);
      expect(schedulerRegistryMock.addCronJob).not.toHaveBeenCalled();
    });
  });

  describe('update - 更新任务', () => {
    it('应更新任务并重新注册cron', async () => {
      const mockCronJob = { stop: jest.fn() };
      schedulerRegistryMock.getCronJob
        .mockReturnValueOnce(mockCronJob) // 删除旧 cron 时找到
        .mockImplementation(() => {
          throw new Error('not found');
        }); // 再次检查时不存在

      prismaMock.sysJob.findUnique.mockResolvedValue({
        id: '1',
        jobName: '旧任务',
        status: '0',
        cronExpression: '0 0 1 * * *',
        invokeTarget: 'oldService.run()',
        concurrent: '1',
      });
      prismaMock.sysJob.update.mockResolvedValue({
        id: '1',
        jobName: '新任务',
        status: '0',
        cronExpression: '0 0 2 * * *',
        invokeTarget: 'newService.run()',
        concurrent: '1',
      });

      const result = await service.update('1', {
        jobName: '新任务',
        jobGroup: 'DEFAULT',
        invokeTarget: 'newService.run()',
        cronExpression: '0 0 2 * * *',
      } as any);

      expect(result.jobName).toBe('新任务');
      // 应先删除旧 cron 再注册新 cron
      expect(schedulerRegistryMock.deleteCronJob).toHaveBeenCalledWith('job_1');
      expect(schedulerRegistryMock.addCronJob).toHaveBeenCalled();
    });
  });

  describe('removes - 批量删除任务', () => {
    it('应删除任务并移除cron', async () => {
      prismaMock.sysJob.findMany.mockResolvedValue([
        { id: '1', jobName: '任务1' },
        { id: '2', jobName: '任务2' },
      ]);
      prismaMock.sysJob.deleteMany.mockResolvedValue({ count: 2 });

      await service.removes(['1', '2']);
      expect(prismaMock.sysJob.deleteMany).toHaveBeenCalledWith({
        where: { id: { in: ['1', '2'] } },
      });
    });
  });

  describe('changeStatus - 修改任务状态', () => {
    it('启用任务应注册cron', async () => {
      prismaMock.sysJob.findUnique.mockResolvedValue({
        id: '1',
        status: '1',
        cronExpression: '0 0 2 * * *',
        invokeTarget: 'testService.run()',
        concurrent: '1',
      });
      prismaMock.sysJob.update.mockResolvedValue({ id: '1', status: '0' });

      await service.changeStatus({ id: '1', status: '0' } as any);
      expect(schedulerRegistryMock.addCronJob).toHaveBeenCalled();
      expect(prismaMock.sysJob.update).toHaveBeenCalledWith({
        where: { id: '1' },
        data: { status: '0' },
      });
    });

    it('暂停任务应删除cron', async () => {
      const mockCronJob = { stop: jest.fn() };
      schedulerRegistryMock.getCronJob.mockReturnValue(mockCronJob);

      prismaMock.sysJob.findUnique.mockResolvedValue({
        id: '1',
        status: '0',
        cronExpression: '0 0 2 * * *',
        invokeTarget: 'testService.run()',
        concurrent: '1',
      });
      prismaMock.sysJob.update.mockResolvedValue({ id: '1', status: '1' });

      await service.changeStatus({ id: '1', status: '1' } as any);
      expect(schedulerRegistryMock.deleteCronJob).toHaveBeenCalledWith('job_1');
      expect(mockCronJob.stop).toHaveBeenCalled();
      expect(prismaMock.sysJob.update).toHaveBeenCalledWith({
        where: { id: '1' },
        data: { status: '1' },
      });
    });
  });

  describe('runOnce - 手动执行一次', () => {
    it('应查找任务并执行', async () => {
      const mockJob = {
        id: '1',
        jobName: '测试任务',
        jobGroup: 'DEFAULT',
        invokeTarget: 'testService.run()',
        concurrent: '1',
      };
      prismaMock.sysJob.findUnique.mockResolvedValue(mockJob);
      jobLogServiceMock.createLog.mockResolvedValue({ id: 1 });
      moduleRefMock.get.mockReturnValue({
        run: jest.fn().mockResolvedValue(undefined),
      });

      await service.runOnce('1');
      expect(prismaMock.sysJob.findUnique).toHaveBeenCalledWith({
        where: { id: '1' },
      });
      expect(jobLogServiceMock.createLog).toHaveBeenCalled();
    });

    it('任务不存在应抛出异常', async () => {
      prismaMock.sysJob.findUnique.mockResolvedValue(null);

      await expect(service.runOnce('non-existent')).rejects.toThrow(
        '任务不存在',
      );
    });
  });

  describe('parseInvokeTarget - 解析调用目标', () => {
    it('应正确解析 service.method(args) 格式', () => {
      const result = service.parseInvokeTarget('sysLoginLogService.clean()');
      expect(result).toEqual({
        serviceName: 'sysLoginLogService',
        methodName: 'clean',
        args: '',
      });
    });

    it('应正确解析带参数的调用', () => {
      const result = service.parseInvokeTarget(
        'someService.doSomething("arg1", 123)',
      );
      expect(result).toEqual({
        serviceName: 'someService',
        methodName: 'doSomething',
        args: '"arg1", 123',
      });
    });

    it('格式错误应抛出异常', () => {
      expect(() => service.parseInvokeTarget('invalid-format')).toThrow(
        '任务目标格式错误',
      );
    });
  });
});

import { Module } from '@nestjs/common';
import { JobLogService } from './job-log.service';
import { JobController } from './job.controller';
import { JobService } from './job.service';

@Module({
  controllers: [JobController],
  providers: [JobService, JobLogService],
  exports: [JobService, JobLogService],
})
export class JobModule {}

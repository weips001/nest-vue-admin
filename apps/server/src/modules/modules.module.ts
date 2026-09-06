import { AuthModule } from '@/modules/auth/auth.module';
import { HealthModule } from '@/modules/monitor/health/health.module';
import { JobModule } from '@/modules/monitor/job/job.module';
import { SysModule } from '@/modules/sys/sys.module';
import { Module } from '@nestjs/common';
import { UploadModule } from './upload/upload.module';

@Module({
  imports: [SysModule, AuthModule, UploadModule, HealthModule, JobModule],
})
export class ModulesModule {}

import { Global, Logger, Module, OnModuleInit, ValidationPipe } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';

import { CacheModeEnum } from '@/common/enums/config.enum';
import { createCacheModuleOptions } from '@/common/cache/cache-options.factory';
import { ExcelExportService } from '@/common/class/export.class';
import { HttpExceptionFilter } from '@/common/filters/exception.filter';
import { DemoEnvironmentGuard } from '@/common/guards/demo.guard';
import { DevOnlyGuard } from '@/common/guards/devOnly.guard';
import { JwtAuthGuard } from '@/common/guards/jwtAuth.guard';
import { ActionInterceptor } from '@/common/interceptors/action.interceptor';
import {
  CacheConfigType,
  RedisConfigType,
  ThrottlerConfigType,
} from '@/common/types/config.type';
import { getConfig } from '@/config/config';
import { envValidationSchema } from '@/config/config.validation';
import { CacheModule } from '@nestjs/cache-manager';
import {
  APP_FILTER,
  APP_GUARD,
  APP_INTERCEPTOR,
  APP_PIPE,
} from '@nestjs/core';
import { ScheduleModule } from '@nestjs/schedule';
import {
  ThrottlerGuard,
  ThrottlerModule,
} from '@nestjs/throttler';
import { PrismaModule, PrismaService } from 'nestjs-prisma';
import { PermissionGuard } from './guards/permission.guard';
import { ResponseInterceptor } from './interceptors/response.interceptor';
import { PrismaConfigService } from './prismaService/prismaConfigService';

const logger = new Logger('CacheModule');

@Global()
@Module({
  imports: [
    // 定时任务模块
    ScheduleModule.forRoot(),
    // 配置模块
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      load: [getConfig],
      validationSchema: envValidationSchema,
      validationOptions: {
        // 允许有未定义的字段
        allowUnknown: true,
        // 遇到错误不立即停止，而是收集所有错误一次性抛出
        abortEarly: false,
      },
    }),
    // prisma 模块
    PrismaModule.forRootAsync({
      isGlobal: true,
      useClass: PrismaConfigService,
    }),
    // 限流模块
    ThrottlerModule.forRootAsync({
      useFactory: (configService: ConfigService) => {
        const throttlerConfig =
          configService.get<ThrottlerConfigType>('throttler')!;
        return [
          {
            ttl: throttlerConfig.ttl * 1000,
            limit: throttlerConfig.limit,
          },
        ];
      },
      inject: [ConfigService],
    }),
    CacheModule.registerAsync({
      useFactory: async (configService: ConfigService) => {
        const cacheConfig = configService.get<CacheConfigType>('cache')!;

        if (cacheConfig.mode === CacheModeEnum.REDIS) {
          const redisConfig = configService.get<RedisConfigType>('redis')!;
          const options = await createCacheModuleOptions({
            cache: cacheConfig,
            redis: redisConfig,
          });
          logger.log('Redis connected successfully');
          return options;
        } else {
          logger.log('Cache is using Memory Cache');
          return await createCacheModuleOptions({
            cache: cacheConfig,
          });
        }
      },
      isGlobal: true,
      inject: [ConfigService],
    }),
  ],
  providers: [
    ExcelExportService,
    {
      provide: APP_PIPE,
      useValue: new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    },
    {
      provide: APP_FILTER,
      useClass: HttpExceptionFilter,
    },
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: PermissionGuard,
    },
    {
      provide: APP_GUARD,
      useClass: DemoEnvironmentGuard,
    },
    {
      provide: APP_GUARD,
      useClass: DevOnlyGuard,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: ActionInterceptor,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: ResponseInterceptor,
    },
  ],
  exports: [ExcelExportService],
})
export class CommonModule implements OnModuleInit {
  constructor(private readonly prisma: PrismaService) {}

  onModuleInit() {
    const logger = new Logger('Prisma');
    const isDev = process.env.NODE_ENV === 'development';

    // SQL 日志（仅开发环境）
    if (isDev) {
      this.prisma.$on('query', (e: any) => {
        const sql = formatSql(e.query, e.params);
        logger.verbose(`${sql} [${e.duration}ms]`);
      });
    }

    // info/warn/error 统一走 Winston
    this.prisma.$on('info', (e: any) => {
      logger.log(e.message);
    });
    this.prisma.$on('warn', (e: any) => {
      logger.warn(e.message);
    });
    this.prisma.$on('error', (e: any) => {
      logger.error(e.message);
    });
  }
}

/** 将 Prisma 参数化 SQL 替换为带实际值的 SQL（兼容 MySQL ? 和 PostgreSQL $1 占位符） */
function formatSql(query: string, params: string): string {
  try {
    const values: any[] = JSON.parse(params);
    let idx = 0;
    return query.replace(/\?/g, () => {
      const val = values[idx++];
      if (val === null || val === undefined) return 'NULL';
      if (typeof val === 'number' || typeof val === 'boolean') return String(val);
      return `'${String(val).replace(/'/g, "\\'")}'`;
    });
  } catch {
    return query;
  }
}

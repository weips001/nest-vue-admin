import { CacheModeEnum, UploadModeEnum } from '@/common/enums/config.enum';
import { ConfigType } from '@/common/types/config.type';

// 1. 简化辅助函数：只负责读取，不再负责“兜底”
// 因为 Joi 保证了值一定存在（或者是空字符串）
const env = (key: string): string => {
  return process.env[key] || '';
};

// 2. 数字转换函数：只负责转类型
const envNumber = (key: string): number => {
  return Number(process.env[key]);
};
// 3. 转换bool值
const envBoolean = (key: string): boolean => {
  const value = process.env[key];
  return value === 'true';
};

export const getConfig = (): ConfigType => ({
  // 1. 端口
  port: envNumber('APP_PORT'),

  isDemo: envBoolean('IS_DEMO'),

  // 2. JWT
  jwt: {
    secret: env('JWT_SECRET'),
    accessTokenExpiresIn: envNumber('JWT_ACCESS_EXPIRES_IN'),
    refreshTokenExpiresIn: envNumber('JWT_REFRESH_EXPIRES_IN'),
  },

  // 3. 缓存
  cache: {
    mode: env('CACHE_MODE') as CacheModeEnum,
    ttl: envNumber('CACHE_TTL'),
  },

  // 4. Redis (Joi 保证了：如果是 Redis 模式，这些必填；否则允许为空)
  redis: {
    host: env('REDIS_HOST'),
    port: envNumber('REDIS_PORT'),
    username: env('REDIS_USERNAME'),
    password: env('REDIS_PASSWORD'),
    database: envNumber('REDIS_DB'),
  },

  // 5. 验证码
  captcha: {
    size: envNumber('CAPTCHA_SIZE'),
    width: envNumber('CAPTCHA_WIDTH'),
    height: envNumber('CAPTCHA_HEIGHT'),
  },

  // 6. 上传配置
  upload: {
    maxFileSize: envNumber('UPLOAD_MAX_FILE_SIZE'),
    mode: env('UPLOAD_MODE') as UploadModeEnum,

    // 结构化组装
    [UploadModeEnum.LOCAL]: {
      folder: env('UPLOAD_LOCAL_FOLDER'),
      prefix: env('UPLOAD_LOCAL_PREFIX'),
      baseUrl: env('UPLOAD_LOCAL_BASE_URL'),
    },

    [UploadModeEnum.ALIYUN]: {
      region: env('ALIYUN_REGION'),
      accessKeyId: env('ALIYUN_ACCESS_KEY_ID'),
      accessKeySecret: env('ALIYUN_ACCESS_KEY_SECRET'),
      bucket: env('ALIYUN_BUCKET'),
      folder: env('ALIYUN_FOLDER'),
      baseUrl: env('ALIYUN_BASE_URL'),
    },
  },

  // 8. 限流配置
  throttler: {
    ttl: envNumber('THROTTLE_TTL'),
    limit: envNumber('THROTTLE_LIMIT'),
  },
});

import { CacheModeEnum, UploadModeEnum } from '@/common/enums/config.enum';
import * as Joi from 'joi';

export const envValidationSchema = Joi.object({
  NODE_ENV: Joi.string()
    .valid('development', 'production', 'test')
    .default('development'),

  APP_PORT: Joi.number().port().required(),

  IS_DEMO: Joi.boolean().required(),

  GLOBAL_PREFIX: Joi.string().optional().allow(''),

  // --- JWT 认证 ---
  JWT_SECRET: Joi.string().min(16).required(),
  JWT_ACCESS_EXPIRES_IN: Joi.number().min(60).default(7200),
  JWT_REFRESH_EXPIRES_IN: Joi.number().min(60).default(604800),

  DATABASE_URL: Joi.string().required(),

  CACHE_MODE: Joi.string()
    .valid(...Object.values(CacheModeEnum))
    .default(CacheModeEnum.MEMORY),

  CACHE_TTL: Joi.number().default(60000),

  // --- Redis 配置 (仅当 CACHE_MODE 为 redis 时生效) ---

  REDIS_HOST: Joi.string().when('CACHE_MODE', {
    is: CacheModeEnum.REDIS,
    then: Joi.string().required(), // Redis 模式下给默认值
    otherwise: Joi.string().optional().allow(''), // Memory 模式下允许为空
  }),

  REDIS_PORT: Joi.number().when('CACHE_MODE', {
    is: CacheModeEnum.REDIS,
    then: Joi.number().port().default(6379),
    otherwise: Joi.number().optional().allow(''),
  }),

  REDIS_DB: Joi.number().when('CACHE_MODE', {
    is: CacheModeEnum.REDIS,
    then: Joi.number().default(0),
    otherwise: Joi.number().optional().allow(''),
  }),

  REDIS_PASSWORD: Joi.string().when('CACHE_MODE', {
    is: CacheModeEnum.REDIS,
    then: Joi.string().optional().allow(''),
    otherwise: Joi.string().optional().allow(''),
  }),

  REDIS_USERNAME: Joi.string().when('CACHE_MODE', {
    is: CacheModeEnum.REDIS,
    then: Joi.string().optional().allow(''),
    otherwise: Joi.string().optional().allow(''),
  }),

  CAPTCHA_SIZE: Joi.number().required(),
  CAPTCHA_WIDTH: Joi.number().required(),
  CAPTCHA_HEIGHT: Joi.number().required(),

  // 上传模式：默认为 LOCAL
  UPLOAD_MODE: Joi.string()
    .valid(...Object.values(UploadModeEnum))
    .default(UploadModeEnum.LOCAL),

  UPLOAD_MAX_FILE_SIZE: Joi.number().required(),

  // --- 场景 A：本地上传配置 (当 UPLOAD_MODE === LOCAL) ---
  UPLOAD_LOCAL_FOLDER: Joi.string().when('UPLOAD_MODE', {
    is: UploadModeEnum.LOCAL,
    then: Joi.string().required(),
    otherwise: Joi.string().optional().allow(''),
  }),

  UPLOAD_LOCAL_PREFIX: Joi.string().when('UPLOAD_MODE', {
    is: UploadModeEnum.LOCAL,
    then: Joi.string().required(),
    otherwise: Joi.string().optional().allow(''),
  }),

  UPLOAD_LOCAL_BASE_URL: Joi.string().when('UPLOAD_MODE', {
    is: UploadModeEnum.LOCAL,
    then: Joi.string().required(), // 本地模式必须配置静态资源域名/IP
    otherwise: Joi.string().optional().allow(''),
  }),

  // --- 场景 B：阿里云 OSS 配置 (当 UPLOAD_MODE === ALIYUN) ---
  ALIYUN_REGION: Joi.string().when('UPLOAD_MODE', {
    is: UploadModeEnum.ALIYUN,
    then: Joi.string().required(),
    otherwise: Joi.string().optional().allow(''),
  }),

  ALIYUN_ACCESS_KEY_ID: Joi.string().when('UPLOAD_MODE', {
    is: UploadModeEnum.ALIYUN,
    then: Joi.string().required(),
    otherwise: Joi.string().optional().allow(''),
  }),

  ALIYUN_ACCESS_KEY_SECRET: Joi.string().when('UPLOAD_MODE', {
    is: UploadModeEnum.ALIYUN,
    then: Joi.string().required(),
    otherwise: Joi.string().optional().allow(''),
  }),

  ALIYUN_BUCKET: Joi.string().when('UPLOAD_MODE', {
    is: UploadModeEnum.ALIYUN,
    then: Joi.string().required(),
    otherwise: Joi.string().optional().allow(''),
  }),

  ALIYUN_BASE_URL: Joi.string().when('UPLOAD_MODE', {
    is: UploadModeEnum.ALIYUN,
    then: Joi.string().required(),
    otherwise: Joi.string().optional().allow(''),
  }),

  ALIYUN_FOLDER: Joi.string().optional().allow(''),

  // --- 限流配置 ---
  THROTTLE_TTL: Joi.number().default(60),
  THROTTLE_LIMIT: Joi.number().default(60),

  // --- 账号安全配置 ---
  LOGIN_MAX_FAIL_COUNT: Joi.number().min(1).default(5),
  LOGIN_LOCK_MINUTES: Joi.number().min(1).default(30),

  // --- 密码策略配置 ---
  PASSWORD_HISTORY_COUNT: Joi.number().min(0).default(5),
  PASSWORD_EXPIRE_DAYS: Joi.number().min(0).default(90),
});

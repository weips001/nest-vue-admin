import { CacheModeEnum, UploadModeEnum } from '@/common/enums/config.enum';
import { ConfigObject } from 'svg-captcha';

export type RedisConfigType = {
  host: string;
  port: number;
  username?: string;
  password?: string;
  database: number;
};

export type CacheConfigType = {
  mode: CacheModeEnum;
  ttl: number;
};

export type JwtConfigType = {
  secret: string;
  accessTokenExpiresIn: number;
  refreshTokenExpiresIn: number;
};
export type ThrottlerConfigType = {
  ttl: number;
  limit: number;
};

export type ConfigType = {
  port: number;
  isDemo: boolean;
  jwt: JwtConfigType;
  cache: CacheConfigType;
  redis: RedisConfigType;
  captcha: ConfigObject;
  upload: FileUploadType;
  throttler: ThrottlerConfigType;
};

export interface LocalFileConfig {
  folder: string;
  baseUrl: string;
  prefix: string;
}

export interface AliyunConfig {
  region: string;
  accessKeyId: string;
  accessKeySecret: string;
  bucket: string;
  folder: string;
  baseUrl: string;
}

export type FileUploadType = {
  maxFileSize: number;
  mode: UploadModeEnum;
  [UploadModeEnum.LOCAL]: LocalFileConfig;
  [UploadModeEnum.ALIYUN]: AliyunConfig;
};

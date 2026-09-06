import { CacheModeEnum } from '@/common/enums/config.enum';
import type { CacheConfigType, RedisConfigType } from '@/common/types/config.type';

jest.mock('@keyv/redis', () => {
  return {
    __esModule: true,
    default: jest.fn().mockImplementation(() => ({
      client: {
        connect: jest.fn(),
      },
    })),
  };
});

describe('createCacheModuleOptions', () => {
  it('redis 连接失败时应直接抛错而不是静默继续', async () => {
    const KeyvRedis = require('@keyv/redis').default as jest.Mock;
    KeyvRedis.mockImplementationOnce(() => ({
      client: {
        connect: jest.fn().mockRejectedValueOnce(new Error('redis down')),
      },
    }));

    const { createCacheModuleOptions } = require('./cache-options.factory');

    await expect(
      createCacheModuleOptions({
        cache: {
          mode: CacheModeEnum.REDIS,
          ttl: 60000,
        } as CacheConfigType,
        redis: {
          host: '127.0.0.1',
          port: 6379,
          database: 0,
          username: '',
          password: '',
        } as RedisConfigType,
      }),
    ).rejects.toThrow('redis down');
  });

  it('memory 模式应返回内存缓存配置', async () => {
    const { createCacheModuleOptions } = require('./cache-options.factory');

    const options = await createCacheModuleOptions({
      cache: {
        mode: CacheModeEnum.MEMORY,
        ttl: 60000,
      } as CacheConfigType,
    });

    expect(options.ttl).toBe(60000);
    expect(options.stores).toHaveLength(1);
  });
});

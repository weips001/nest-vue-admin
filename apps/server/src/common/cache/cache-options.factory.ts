import { CacheModeEnum } from '@/common/enums/config.enum';
import type {
  CacheConfigType,
  RedisConfigType,
} from '@/common/types/config.type';
import KeyvRedis from '@keyv/redis';
import { CacheableMemory } from 'cacheable';
import Keyv, { type KeyvStoreAdapter } from 'keyv';

type CacheFactoryParams = {
  cache: CacheConfigType;
  redis?: RedisConfigType;
};

export async function createCacheModuleOptions({
  cache,
  redis,
}: CacheFactoryParams) {
  const stores: (KeyvStoreAdapter | Keyv)[] = [];

  if (cache.mode === CacheModeEnum.REDIS) {
    const redisConfig = redis!;
    const { host, port, password, username, database } = redisConfig;

    const redisStore = new KeyvRedis(
      {
        socket: {
          host,
          port,
          reconnectStrategy: (retries: number) => {
            if (retries > 5) {
              throw new Error('Redis connection failed');
            }
            return 1000;
          },
        },
        username,
        password,
        database,
      },
      {
        throwOnConnectError: true,
        throwOnErrors: true,
        connectionTimeout: 3000,
      },
    );

    await redisStore.client.connect();
    stores.push(redisStore);
  } else {
    stores.push(
      new Keyv({
        store: new CacheableMemory({ ttl: 60000, lruSize: 5000 }),
      }),
    );
  }

  return {
    stores,
    ttl: cache.ttl,
  };
}

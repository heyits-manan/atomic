import IORedis from 'ioredis';

import { env } from './env';

export const redisConection = new IORedis(
    env.REDIS_URL, {
    maxRetriesPerRequest: null,
}
)
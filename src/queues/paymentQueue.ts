import { Queue } from 'bullmq';
import { redisConnection } from '../config/redis';

export const paymentQueue = new Queue('payments', {
    connection: redisConnection,
});

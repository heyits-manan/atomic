import { Queue } from 'bullmq';
import { redisConection } from '../config/redis';

export const paymentQueue = new Queue('payments', {
    connection: redisConection,
});

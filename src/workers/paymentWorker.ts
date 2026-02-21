import { Worker, Job } from 'bullmq';
import { redisConnection } from '../config/redis';
import { PaymentService } from '../services/PaymentService';
import { logger } from '../lib/logger';

export const paymentWorker = new Worker(
    'payments',
    async (job: Job<{ paymentId: string }>) => {
        logger.info('Worker picked up job', { jobId: job.id, paymentId: job.data.paymentId });

        const result = await PaymentService.fulfill(job.data.paymentId);

        return { paymentId: result.id, status: result.status };
    },
    {
        connection: redisConnection,
        concurrency: 5,
    }
);

paymentWorker.on('completed', (job) => {
    logger.info('Job completed', { jobId: job.id, result: job.returnvalue });
});

paymentWorker.on('failed', (job, err) => {
    logger.error('Job failed', { jobId: job?.id, error: err.message });
});

paymentWorker.on('error', (err) => {
    logger.error('Worker error', { error: err.message });
});

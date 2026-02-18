import { z } from 'zod';

/**
 * POST /api/v1/payments — request body schema.
 */
export const createPaymentSchema = z.object({
    amount: z.number().int().positive('Amount must be a positive integer (in cents/paise)'),
    currency: z.enum(['USD', 'INR', 'EUR'], {
        error: 'Currency must be USD, INR, or EUR',
    }),
    source: z.string().startsWith('tok_', 'Source must be a valid card token (e.g. tok_visa)'),
    description: z.string().optional().default('API Payment'),
    merchantId: z.string().uuid('merchantId must be a valid UUID'),
});


export const paymentIdParamSchema = z.object({
    id: z.uuid({ message: 'Invalid payment ID format' }),
});

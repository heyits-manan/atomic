import { z } from 'zod';

/**
 * POST /api/v1/accounts — request body schema.
 */
export const createAccountSchema = z.object({
    name: z.string().min(1, 'Name is required'),
    currency: z.enum(['USD', 'INR', 'EUR'], {
        error: 'Currency must be USD, INR, or EUR',
    }),
});

/**
 * GET /api/v1/accounts/:id — params schema.
 */
export const accountIdParamSchema = z.object({
    id: z.string().uuid('Invalid account ID format'),
});

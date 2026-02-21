import { z } from 'zod';

export const createAccountSchema = z.object({
    name: z.string().min(1, 'Name is required'),
    currency: z.enum(['USD', 'INR', 'EUR'], {
        error: 'Currency must be USD, INR, or EUR',
    }),
});

export const accountIdParamSchema = z.object({
    id: z.uuid({ message: 'Invalid account ID format' }),
});

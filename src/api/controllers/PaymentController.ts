import { Request, Response, NextFunction } from 'express';
import { PaymentService } from '../../services/PaymentService';
import { ApiResponse } from '../../types';

export class PaymentController {
    /**
     * POST /api/v1/payments
     * Processes a card payment: charges the card (simulated) and credits the merchant.
     * Body is already validated by the validateBody middleware.
     */
    static async create(req: Request, res: Response<ApiResponse>, next: NextFunction): Promise<void> {
        try {
            const result = await PaymentService.processPayment({
                merchantId: req.body.merchantId,
                amount: req.body.amount,
                currency: req.body.currency,
                description: req.body.description || 'API Payment',
                token: req.body.source,
            });

            res.status(200).json({
                success: true,
                data: result,
                meta: { timestamp: new Date().toISOString() },
            });
        } catch (err) {
            next(err);
        }
    }
}

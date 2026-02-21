import { Request, Response, NextFunction } from "express";
import { PaymentService } from "../../services/PaymentService";
import { ApiResponse } from "../../types";

export class PaymentController {
  static async create(
    req: Request,
    res: Response<ApiResponse>,
    next: NextFunction,
  ): Promise<void> {
    try {
      const payment = await PaymentService.createAndQueue({
        merchantId: req.body.merchantId,
        amount: req.body.amount,
        currency: req.body.currency,
        source: req.body.source,
        description: req.body.description,
        idempotencyKey: req.get("Idempotency-Key"),
      });

      res.status(202).json({
        success: true,
        data: payment,
        meta: { timestamp: new Date().toISOString() },
      });
    } catch (err) {
      next(err);
    }
  }

  static async get(
    req: Request,
    res: Response<ApiResponse>,
    next: NextFunction,
  ): Promise<void> {
    try {
      const payment = await PaymentService.getById(req.params.id as string);

      res.json({
        success: true,
        data: { payment },
        meta: { timestamp: new Date().toISOString() },
      });
    } catch (err) {
      next(err);
    }
  }
}

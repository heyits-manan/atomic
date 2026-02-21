import { Request, Response, NextFunction } from "express";
import { AccountService } from "../../services/AccountService";
import { ApiResponse } from "../../types";

export class AccountController {
  static async create(
    req: Request,
    res: Response<ApiResponse>,
    next: NextFunction,
  ): Promise<void> {
    try {
      const account = await AccountService.createAccount(req.body);

      res.status(201).json({
        success: true,
        data: {
          id: account.id,
          name: account.name,
          balance: account.balance.toString(),
          currency: account.currency,
          allow_negative: account.allow_negative,
          created_at: account.created_at,
        },
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
      const account = await AccountService.getAccount(req.params.id as string);

      res.json({
        success: true,
        data: {
          id: account.id,
          name: account.name,
          balance: account.balance.toString(),
          currency: account.currency,
          allow_negative: account.allow_negative,
          created_at: account.created_at,
        },
        meta: { timestamp: new Date().toISOString() },
      });
    } catch (err) {
      next(err);
    }
  }
}

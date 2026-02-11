import { Router, Request, Response } from "express";
import { ApiResponse } from "../../types";
import { authenticate } from "../middlewares/auth";
import { validateBody, validateParams } from "../middlewares";
import { AccountController } from "../controllers/AccountController";
import { createAccountSchema, accountIdParamSchema } from "../schemas/account";

const router = Router();

/**
 * GET /health
 * Basic health check endpoint. (Public — no auth required)
 */
router.get("/health", (_req: Request, res: Response<ApiResponse<{ status: string }>>) => {
    res.status(200).json({
        success: true,
        data: { status: "healthy" },
        meta: { timestamp: new Date().toISOString() },
    });
});

// ─── Protected Routes (everything below requires a valid API key) ───
router.use(authenticate);

// --- ACCOUNTS ---
router.post('/accounts', validateBody(createAccountSchema), AccountController.create);
router.get('/accounts/:id', validateParams(accountIdParamSchema), AccountController.get);

// --- PAYMENTS ---
// router.post('/payments', PaymentController.createIntent);

// --- TRANSFERS ---
// router.post('/transfers', TransferController.execute);

export default router;


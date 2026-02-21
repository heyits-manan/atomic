import { Router, Request, Response } from "express";
import { ApiResponse } from "../../types";
import { authenticate } from "../middlewares/auth";
import { merchantAuth } from "../middlewares/merchantAuth";
import { validateBody, validateParams } from "../middlewares";
import { AccountController } from "../controllers/AccountController";
import { PaymentController } from "../controllers/PaymentController";
import { MerchantController } from "../controllers/MerchantController";
import { createAccountSchema, accountIdParamSchema } from "../schemas/account";
import { createPaymentSchema, paymentIdParamSchema } from "../schemas/payment";
import { registerSchema, loginSchema, revokeKeyParamSchema } from "../schemas/merchant";
import { idempotencyMiddleware } from "../middlewares/idempotency";
import { paymentLimiter } from "@api/middlewares/rateLimiter";

const router = Router();

router.get("/health", (_req: Request, res: Response<ApiResponse<{ status: string }>>) => {
    res.status(200).json({
        success: true,
        data: { status: "healthy" },
        meta: { timestamp: new Date().toISOString() },
    });
});

router.post('/merchants/register', validateBody(registerSchema), MerchantController.register);
router.post('/merchants/login', validateBody(loginSchema), MerchantController.login);

router.get('/merchants/dashboard', merchantAuth, MerchantController.getDashboard);
router.post('/merchants/api-keys', merchantAuth, MerchantController.generateApiKey);
router.get('/merchants/api-keys', merchantAuth, MerchantController.listApiKeys);
router.delete('/merchants/api-keys/:id', merchantAuth, validateParams(revokeKeyParamSchema), MerchantController.revokeApiKey);

router.use(authenticate);

router.get('/payments/:id', validateParams(paymentIdParamSchema), PaymentController.get)
router.post('/payments', paymentLimiter, idempotencyMiddleware, validateBody(createPaymentSchema), PaymentController.create);

router.post('/accounts', validateBody(createAccountSchema), AccountController.create);
router.get('/accounts/:id', validateParams(accountIdParamSchema), AccountController.get);

export default router;

import { Router, Request, Response } from "express";
import { ApiResponse } from "../../types";

const router = Router();

/**
 * GET /health
 * Basic health check endpoint.
 */
router.get("/health", (_req: Request, res: Response<ApiResponse<{ status: string }>>) => {
    res.status(200).json({
        success: true,
        data: { status: "healthy" },
        meta: { timestamp: new Date().toISOString() },
    });
});

export default router;

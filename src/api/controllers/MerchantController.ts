import { Request, Response } from "express";
import { MerchantService } from "../../services/MerchantService";
import { logger } from "../../lib/logger";

export class MerchantController {
  static async register(req: Request, res: Response): Promise<void> {
    try {
      const { email, password } = req.body;
      const merchant = await MerchantService.register(email, password);
      res.status(201).json({
        success: true,
        data: merchant,
        meta: { timestamp: new Date().toISOString() },
      });
    } catch (err: any) {
      if (err.statusCode) {
        res.status(err.statusCode).json({
          success: false,
          error: { message: err.message },
          meta: { timestamp: new Date().toISOString() },
        });
        return;
      }
      logger.error("Registration error", { error: err.message });
      res.status(500).json({
        success: false,
        error: { message: "Internal server error" },
        meta: { timestamp: new Date().toISOString() },
      });
    }
  }

  static async login(req: Request, res: Response): Promise<void> {
    try {
      const { email, password } = req.body;
      const result = await MerchantService.login(email, password);
      res.status(200).json({
        success: true,
        data: result,
        meta: { timestamp: new Date().toISOString() },
      });
    } catch (err: any) {
      if (err.statusCode) {
        res.status(err.statusCode).json({
          success: false,
          error: { message: err.message },
          meta: { timestamp: new Date().toISOString() },
        });
        return;
      }
      logger.error("Login error", { error: err.message });
      res.status(500).json({
        success: false,
        error: { message: "Internal server error" },
        meta: { timestamp: new Date().toISOString() },
      });
    }
  }

  static async getDashboard(req: Request, res: Response): Promise<void> {
    try {
      const merchantId = (req as any).merchantId;
      const data = await MerchantService.getDashboard(merchantId);
      res.status(200).json({
        success: true,
        data,
        meta: { timestamp: new Date().toISOString() },
      });
    } catch (err: any) {
      if (err.statusCode) {
        res.status(err.statusCode).json({
          success: false,
          error: { message: err.message },
          meta: { timestamp: new Date().toISOString() },
        });
        return;
      }
      logger.error("Dashboard error", { error: err.message });
      res.status(500).json({
        success: false,
        error: { message: "Internal server error" },
        meta: { timestamp: new Date().toISOString() },
      });
    }
  }

  static async generateApiKey(req: Request, res: Response): Promise<void> {
    try {
      const merchantId = (req as any).merchantId;
      const result = await MerchantService.generateApiKey(merchantId);
      res.status(201).json({
        success: true,
        data: result,
        meta: { timestamp: new Date().toISOString() },
      });
    } catch (err: any) {
      if (err.statusCode) {
        res.status(err.statusCode).json({
          success: false,
          error: { message: err.message },
          meta: { timestamp: new Date().toISOString() },
        });
        return;
      }
      logger.error("API key generation error", { error: err.message });
      res.status(500).json({
        success: false,
        error: { message: "Internal server error" },
        meta: { timestamp: new Date().toISOString() },
      });
    }
  }

  static async listApiKeys(req: Request, res: Response): Promise<void> {
    try {
      const merchantId = (req as any).merchantId;
      const keys = await MerchantService.listApiKeys(merchantId);
      res.status(200).json({
        success: true,
        data: keys,
        meta: { timestamp: new Date().toISOString() },
      });
    } catch (err: any) {
      logger.error("List API keys error", { error: err.message });
      res.status(500).json({
        success: false,
        error: { message: "Internal server error" },
        meta: { timestamp: new Date().toISOString() },
      });
    }
  }

  static async revokeApiKey(req: Request, res: Response): Promise<void> {
    try {
      const merchantId = (req as any).merchantId;
      const keyId = req.params["id"] as string;
      await MerchantService.revokeApiKey(merchantId, keyId);
      res.status(200).json({
        success: true,
        data: { message: "API key revoked" },
        meta: { timestamp: new Date().toISOString() },
      });
    } catch (err: any) {
      if (err.statusCode) {
        res.status(err.statusCode).json({
          success: false,
          error: { message: err.message },
          meta: { timestamp: new Date().toISOString() },
        });
        return;
      }
      logger.error("Revoke API key error", { error: err.message });
      res.status(500).json({
        success: false,
        error: { message: "Internal server error" },
        meta: { timestamp: new Date().toISOString() },
      });
    }
  }
}

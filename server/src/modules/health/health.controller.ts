import type { Request, Response } from "express";
import { ApiResponse } from "../../shared/response/api-response";
import { db } from "../../db";
import { redis } from "../../config/redis";
import { logger } from "../../shared/utils/logger";

export class HealthController {
  static check(_req: Request, res: Response) {
    return res.status(200).json(
      ApiResponse.success({
        uptime: process.uptime(),
        timestamp: new Date().toISOString(),
      }),
    );
  }

  static async ready(_req: Request, res: Response) {
    try {
      const [dbHealth, redisHealth] = await Promise.allSettled([
        db.execute("SELECT 1"),
        redis.ping(),
      ]);

      if (dbHealth.status === "rejected") {
        logger.error({ err: dbHealth.reason }, "[health/ready] Database check failed");
        return res.status(503).json(
          ApiResponse.error("DB_UNAVAILABLE", "Database connection failed"),
        );
      }

      if (redisHealth.status === "rejected") {
        logger.error({ err: redisHealth.reason }, "[health/ready] Redis check failed");
        return res.status(503).json(
          ApiResponse.error("REDIS_UNAVAILABLE", "Redis connection failed"),
        );
      }

      return res.status(200).json(
        ApiResponse.success({
          ready: true,
          timestamp: new Date().toISOString(),
        }),
      );
    } catch (err) {
      logger.error({ err }, "[health/ready] Unexpected error during readiness check");
      return res.status(503).json(
        ApiResponse.error("HEALTH_CHECK_FAILED", "Readiness check failed"),
      );
    }
  }
}

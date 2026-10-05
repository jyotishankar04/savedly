import { Router } from "express";
import healthRoutes from "../modules/health/health.route";
import authRoutes from "../modules/auth";
import userRoutes from "../modules/user";
import settingsRoutes from "../modules/settings";
import memoryRoutes from "../modules/memory";
import collectionRoutes from "../modules/collection";
import tagRoutes from "../modules/tag";
import insightsRoutes from "../modules/insights";
import notificationRoutes from "../modules/notification";
import vaultRoutes from "../modules/vault";
import { shareOwnerRouter, sharePublicRouter } from "../modules/share";
import uploadRoutes from "../modules/upload";
import filesRoutes from "../modules/files";
import aiRoutes from "../modules/ai";
import aiSettingsRoutes from "../modules/ai-settings";
import { adminRouter as featureFlagsAdminRoutes, publicRouter as featureFlagsPublicRoutes } from "../modules/feature-flags";
import aiUsageRoutes from "../modules/ai-usage";
import { adminRouter as announcementsAdminRoutes, publicRouter as announcementsPublicRoutes } from "../modules/announcements";
import { adminRouter as whatsNewAdminRoutes, publicRouter as whatsNewPublicRoutes } from "../modules/whats-new";
import adminRoutes from "../modules/admin";
import instanceSettingsRoutes from "../modules/instance-settings";
import configRoutes from "../modules/config";
import billingRoutes from "../modules/billing";
import { env } from "../config/env";
import plansRoutes from "../modules/plans";
import accountRoutes from "../modules/account";
import importRoutes from "../modules/import";
import integrationsRoutes from "../modules/integrations";
import batchRoutes from "../modules/batch";
import searchRoutes from "../modules/search";
import reportRoutes from "../modules/report";
import { responseCache } from "../shared/cache/response-cache";
import { maintenanceMode } from "../shared/middlewares/maintenance-mode";

const router = Router();

// Blocks non-admin traffic app-wide when maintenance mode is on. Runs before
// every route mount so it can gate all of them; bypasses /health, /admin,
// and /auth internally.
router.use(maintenanceMode);

// Serves a signed-in user's repeat reads from Redis and drops them on that
// user's next write. After maintenanceMode, so a cached read can't slip past it.
router.use(responseCache);

router.use("/health", healthRoutes);
router.use("/config", configRoutes);
router.use("/auth", authRoutes);
router.use("/users", userRoutes);
router.use("/settings", settingsRoutes);
router.use("/memories", memoryRoutes);
router.use("/collections", collectionRoutes);
router.use("/tags", tagRoutes);
router.use("/insights", insightsRoutes);
router.use("/notifications", notificationRoutes);
router.use("/vault", vaultRoutes);
// Owner-side share management, addressed by share uuid.
router.use("/shares", shareOwnerRouter);
// The public reader, addressed by slug — mirrors the client's /s/:slug URL.
router.use("/s", sharePublicRouter);
router.use("/uploads", uploadRoutes);
router.use("/files", filesRoutes);
router.use("/ai", aiRoutes);
router.use("/ai-settings", aiSettingsRoutes);
router.use("/plans", plansRoutes);
// Paid plans exist only on the hosted service.
if (!env.SELF_HOSTED) router.use("/billing", billingRoutes);
router.use("/account", accountRoutes);
router.use("/import", importRoutes);
router.use("/integrations", integrationsRoutes);
router.use("/batch", batchRoutes);
router.use("/search", searchRoutes);
router.use("/reports", reportRoutes);
router.use("/admin/flags", featureFlagsAdminRoutes);
router.use("/admin/instance-settings", instanceSettingsRoutes);
router.use("/admin/ai-usage", aiUsageRoutes);
router.use("/admin/announcements", announcementsAdminRoutes);
router.use("/announcements", announcementsPublicRoutes);
router.use("/admin/whats-new", whatsNewAdminRoutes);
router.use("/whats-new", whatsNewPublicRoutes);
router.use("/maintenance", featureFlagsPublicRoutes);
router.use("/admin", adminRoutes);

export default router;

import { Router } from "express";
import { authenticate } from "../../shared/middlewares/authenticate";
import { NotificationController } from "./notification.controller";
import { validateListNotifications } from "./notification.validator";

const router = Router();

router.use(authenticate);

// Before "/:id" — otherwise Express matches these as an id.
router.get("/unread-count", NotificationController.unreadCount);
router.post("/read-all", NotificationController.markAllRead);

router.get("/", validateListNotifications, NotificationController.list);
router.patch("/:id/read", NotificationController.markRead);
router.delete("/:id", NotificationController.remove);

export default router;

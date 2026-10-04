import { validate } from "../../shared/middlewares/validate";
import { listNotificationsQuerySchema } from "./notification.schema";

export const validateListNotifications = validate(listNotificationsQuerySchema, "query");

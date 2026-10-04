import { validate } from "../../../shared/middlewares/validate";
import {
  createEventBodySchema,
  disconnectParamsSchema,
  externalEventParamsSchema,
  listEventsQuerySchema,
  pushEventBodySchema,
  updateEventBodySchema,
  updateExternalEventBodySchema,
} from "./calendar.schema";

export const validatePushEvent = validate(pushEventBodySchema);
export const validateDisconnectParams = validate(disconnectParamsSchema, "params");
export const validateListEventsQuery = validate(listEventsQuerySchema, "query");
export const validateCreateEvent = validate(createEventBodySchema);
export const validateUpdateEvent = validate(updateEventBodySchema);
export const validateUpdateExternalEvent = validate(updateExternalEventBodySchema);
export const validateExternalEventParams = validate(externalEventParamsSchema, "params");

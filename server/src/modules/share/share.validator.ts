import { validate } from "../../shared/middlewares/validate";
import {
  createShareSchema,
  inviteToShareSchema,
  listSharesQuerySchema,
  requestAccessSchema,
  unlockShareSchema,
  updateShareSchema,
} from "./share.schema";

export const validateCreateShare = validate(createShareSchema);
export const validateUpdateShare = validate(updateShareSchema);
export const validateInviteToShare = validate(inviteToShareSchema);
export const validateUnlockShare = validate(unlockShareSchema);
export const validateRequestAccess = validate(requestAccessSchema);
export const validateListShares = validate(listSharesQuerySchema, "query");

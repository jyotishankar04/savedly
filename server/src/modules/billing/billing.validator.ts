import { validate } from "../../shared/middlewares/validate";
import { checkoutSchema, upgradePreviewSchema } from "./billing.schema";

export const validateCheckout = validate(checkoutSchema);
export const validateUpgradePreview = validate(upgradePreviewSchema);

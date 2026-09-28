import { validate } from "../../shared/middlewares/validate";
import { checkoutSchema } from "./billing.schema";

export const validateCheckout = validate(checkoutSchema);

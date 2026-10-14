import { validate } from "../../shared/middlewares/validate";
import { sendContactSchema } from "./contact.schema";

export const validateSendContact = validate(sendContactSchema);

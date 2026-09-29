import { validate } from "../../shared/middlewares/validate";
import { loginSchema, registerSchema } from "./auth.schema";

export const validateRegister = validate(registerSchema);
export const validateLogin = validate(loginSchema);

import { validate } from "../../shared/middlewares/validate";
import { browserCaptureInputSchema, createMemorySchema, listMemoriesQuerySchema, updateMemorySchema, resolveDuplicateSchema } from "./memory.schema";

export const validateListMemories = validate(listMemoriesQuerySchema, "query");
export const validateCreateMemory = validate(createMemorySchema);
export const validateResolveDuplicate = validate(resolveDuplicateSchema);
export const validateUpdateMemory = validate(updateMemorySchema);
export const validateBrowserCapture = validate(browserCaptureInputSchema);

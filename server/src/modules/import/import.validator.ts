import { validate } from "../../shared/middlewares/validate";
import { importSchema, listImportItemsQuerySchema } from "./import.schema";

export const validateImport = validate(importSchema);
export const validateListImportItems = validate(listImportItemsQuerySchema, "query");

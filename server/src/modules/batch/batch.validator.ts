import { validate } from "../../shared/middlewares/validate";
import {
  batchTagInputSchema,
  batchMoveToCollectionInputSchema,
  batchDeleteInputSchema,
  batchRestoreInputSchema,
  batchUpdateStatusInputSchema,
} from "./batch.schema";

export const validateBatchTag = validate(batchTagInputSchema);
export const validateBatchMove = validate(batchMoveToCollectionInputSchema);
export const validateBatchDelete = validate(batchDeleteInputSchema);
export const validateBatchRestore = validate(batchRestoreInputSchema);
export const validateBatchUpdateStatus = validate(batchUpdateStatusInputSchema);

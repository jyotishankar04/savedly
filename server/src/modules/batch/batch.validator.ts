import { validate } from "../../shared/middlewares/validate";
import {
  batchTagInputSchema,
  batchMoveToCollectionInputSchema,
  batchDeleteInputSchema,
  batchRestoreInputSchema,
  batchUpdateStatusInputSchema,
  batchUncollectInputSchema,
  batchReadInputSchema,
  batchRemindInputSchema,
  batchDeleteCollectionsInputSchema,
  batchMergeCollectionsInputSchema,
  batchVaultCollectionsInputSchema,
} from "./batch.schema";

export const validateBatchTag = validate(batchTagInputSchema);
export const validateBatchMove = validate(batchMoveToCollectionInputSchema);
export const validateBatchDelete = validate(batchDeleteInputSchema);
export const validateBatchRestore = validate(batchRestoreInputSchema);
export const validateBatchUpdateStatus = validate(batchUpdateStatusInputSchema);
export const validateBatchUncollect = validate(batchUncollectInputSchema);
export const validateBatchRead = validate(batchReadInputSchema);
export const validateBatchRemind = validate(batchRemindInputSchema);
export const validateBatchDeleteCollections = validate(batchDeleteCollectionsInputSchema);
export const validateBatchMergeCollections = validate(batchMergeCollectionsInputSchema);
export const validateBatchVaultCollections = validate(batchVaultCollectionsInputSchema);

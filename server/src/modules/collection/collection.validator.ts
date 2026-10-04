import { validate } from "../../shared/middlewares/validate";
import { createCollectionSchema, listCollectionsQuerySchema, updateCollectionSchema } from "./collection.schema";

export const validateCreateCollection = validate(createCollectionSchema);
export const validateUpdateCollection = validate(updateCollectionSchema);
export const validateListCollections = validate(listCollectionsQuerySchema, "query");

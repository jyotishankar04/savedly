import { validate } from "../../shared/middlewares/validate";
import { createBlogPostSchema, updateBlogPostSchema } from "./blog.schema";

export const validateCreateBlogPost = validate(createBlogPostSchema);
export const validateUpdateBlogPost = validate(updateBlogPostSchema);

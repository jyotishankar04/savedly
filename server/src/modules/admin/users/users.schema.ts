import { z } from "zod";
import { UserStatus } from "../../../db/enums";

export const listUsersQuerySchema = z.object({
  q: z.string().trim().max(255).optional(),
  status: z.enum([UserStatus.ACTIVE, UserStatus.INACTIVE, UserStatus.BANNED, UserStatus.SUSPENDED, UserStatus.DELETED]).optional(),
  role: z.string().max(100).optional(),
  plan: z.string().max(50).optional(), // plan key ("free" | "plus" | "pro"), matched against each user's effective plan
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const updateUserRolesSchema = z.object({
  role: z.string().min(1).max(100),
  action: z.enum(["grant", "revoke"]),
});

export const updateUserStatusSchema = z.object({
  status: z.enum([UserStatus.ACTIVE, UserStatus.INACTIVE, UserStatus.BANNED, UserStatus.SUSPENDED]),
});

export const createUserSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(100),
  email: z.string().trim().email("Enter a valid email").max(255),
  password: z.string().min(8, "Use at least 8 characters").max(200),
  role: z.enum(["user", "admin"]).default("user"),
});

export const setUserPasswordSchema = z.object({
  password: z.string().min(8, "Use at least 8 characters").max(200),
});

export type CreateUserInput = z.infer<typeof createUserSchema>;
export type SetUserPasswordInput = z.infer<typeof setUserPasswordSchema>;
export type ListUsersQuery = z.infer<typeof listUsersQuerySchema>;
export type UpdateUserRolesInput = z.infer<typeof updateUserRolesSchema>;
export type UpdateUserStatusInput = z.infer<typeof updateUserStatusSchema>;

import { z } from "zod";

export const deleteUserBodySchema = z.object({
  reason: z.string().min(1).max(500),
});

export const deactivateUserBodySchema = z.object({
  reason: z.string().max(500).optional(),
});

export const adminUserListQuerySchema = z.object({
  q: z.string().trim().max(120).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(20),
});

export type DeleteUserBody = z.infer<typeof deleteUserBodySchema>;
export type DeactivateUserBody = z.infer<typeof deactivateUserBodySchema>;
export type AdminUserListQuery = z.infer<typeof adminUserListQuerySchema>;

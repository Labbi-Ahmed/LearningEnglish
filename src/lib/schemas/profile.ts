import { z } from "zod";

export const updateProfileSchema = z.object({
  first_name:       z.string().min(1).max(50).optional(),
  last_name:        z.string().min(1).max(50).optional(),
  display_name:     z.string().max(80).optional(),
  level:            z.enum(["a1", "a2", "b1", "b2", "c1", "c2"]).optional(),
  preferred_accent: z.enum(["uk", "us"]).optional(),
});

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;

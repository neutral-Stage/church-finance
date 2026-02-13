import { z } from "zod";
import {
  uuidSchema,
  emailSchema,
  phoneSchema,
  optionalTextField,
} from "./shared";

/**
 * Member validation schemas
 */

// Member status enum
export const memberStatusSchema = z.enum(["active", "inactive", "deceased"]);

// Member type enum
export const memberTypeSchema = z.enum([
  "baptized",
  "unbaptized",
  "visitor",
  "child",
]);

// Create member schema
export const createMemberSchema = z.object({
  church_id: uuidSchema,
  full_name: z.string().min(1, "Full name is required").max(200),
  email: emailSchema.optional().or(z.literal("")),
  phone: phoneSchema,
  date_of_birth: z.string().datetime().optional(),
  baptism_date: z.string().datetime().optional(),
  membership_date: z.string().datetime().optional(),
  address: optionalTextField,
  member_type: memberTypeSchema,
  status: memberStatusSchema.default("active"),
  notes: optionalTextField,
});

// Update member schema
export const updateMemberSchema = z.object({
  full_name: z.string().min(1).max(200).optional(),
  email: emailSchema.optional().or(z.literal("")),
  phone: phoneSchema,
  date_of_birth: z.string().datetime().optional(),
  baptism_date: z.string().datetime().optional(),
  membership_date: z.string().datetime().optional(),
  address: optionalTextField,
  member_type: memberTypeSchema.optional(),
  status: memberStatusSchema.optional(),
  notes: optionalTextField,
});

// Member filters schema
export const memberFiltersSchema = z.object({
  church_id: uuidSchema,
  member_type: memberTypeSchema.optional(),
  status: memberStatusSchema.optional(),
  search: z.string().max(200).optional(),
  page: z.number().int().positive().default(1),
  limit: z.number().int().positive().max(100).default(20),
});

// Types
export type CreateMemberInput = z.infer<typeof createMemberSchema>;
export type UpdateMemberInput = z.infer<typeof updateMemberSchema>;
export type MemberFiltersInput = z.infer<typeof memberFiltersSchema>;

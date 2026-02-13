import { z } from "zod";
import {
  uuidSchema,
  amountSchema,
  optionalTextField,
  dateSchema,
} from "./shared";

/**
 * Offering validation schemas
 */

// Offering type enum
export const offeringTypeSchema = z.enum([
  "tithe",
  "general_offering",
  "special_offering",
  "thanksgiving",
  "building_fund",
  "missions",
  "other",
]);

// Create offering schema
export const createOfferingSchema = z.object({
  church_id: uuidSchema,
  fund_id: uuidSchema,
  offering_type: offeringTypeSchema,
  offering_date: z.string().datetime(),
  total_amount: amountSchema,
  notes: optionalTextField,
  reference_number: z.string().max(100).optional(),
});

// Update offering schema
export const updateOfferingSchema = z.object({
  fund_id: uuidSchema.optional(),
  offering_type: offeringTypeSchema.optional(),
  offering_date: z.string().datetime().optional(),
  total_amount: amountSchema.optional(),
  notes: optionalTextField,
  reference_number: z.string().max(100).optional(),
});

// Offering member contribution schema
export const offeringMemberContributionSchema = z.object({
  offering_id: uuidSchema,
  member_id: uuidSchema.optional(),
  member_name: z.string().max(200).optional(),
  amount: amountSchema,
  notes: optionalTextField,
});

// Bulk create offering contributions schema
export const bulkCreateOfferingContributionsSchema = z.object({
  church_id: uuidSchema,
  offering_id: uuidSchema,
  contributions: z
    .array(
      z.object({
        member_id: uuidSchema.optional(),
        member_name: z.string().max(200).optional(),
        amount: amountSchema,
        notes: optionalTextField,
      }),
    )
    .min(1, "At least one contribution is required"),
});

// Offering filters schema
export const offeringFiltersSchema = z.object({
  church_id: uuidSchema,
  fund_id: uuidSchema.optional(),
  offering_type: offeringTypeSchema.optional(),
  start_date: z.string().datetime().optional(),
  end_date: z.string().datetime().optional(),
  search: z.string().max(200).optional(),
  page: z.number().int().positive().default(1),
  limit: z.number().int().positive().max(100).default(20),
});

// Types
export type CreateOfferingInput = z.infer<typeof createOfferingSchema>;
export type UpdateOfferingInput = z.infer<typeof updateOfferingSchema>;
export type OfferingMemberContributionInput = z.infer<
  typeof offeringMemberContributionSchema
>;
export type BulkCreateOfferingContributionsInput = z.infer<
  typeof bulkCreateOfferingContributionsSchema
>;
export type OfferingFiltersInput = z.infer<typeof offeringFiltersSchema>;

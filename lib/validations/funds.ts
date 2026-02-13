import { z } from "zod";
import { uuidSchema, amountSchema, optionalTextField } from "./shared";

/**
 * Fund validation schemas
 */

// Fund type enum
export const fundTypeSchema = z.enum(["general", "restricted", "designated"]);

// Create fund schema
export const createFundSchema = z.object({
  church_id: uuidSchema,
  fund_name: z.string().min(1, "Fund name is required").max(200),
  fund_type: fundTypeSchema,
  description: optionalTextField,
  initial_balance: amountSchema.default(0),
  is_active: z.boolean().default(true),
});

// Update fund schema
export const updateFundSchema = z.object({
  fund_name: z.string().min(1).max(200).optional(),
  fund_type: fundTypeSchema.optional(),
  description: optionalTextField,
  is_active: z.boolean().optional(),
});

// Fund transfer schema
export const fundTransferSchema = z
  .object({
    church_id: uuidSchema,
    from_fund_id: uuidSchema,
    to_fund_id: uuidSchema,
    amount: amountSchema,
    transfer_date: z.string().datetime(),
    description: z.string().min(1, "Description is required").max(500),
    notes: optionalTextField,
    reference_number: z.string().max(100).optional(),
  })
  .refine((data) => data.from_fund_id !== data.to_fund_id, {
    message: "Source and destination funds must be different",
    path: ["to_fund_id"],
  });

// Fund filters schema
export const fundFiltersSchema = z.object({
  church_id: uuidSchema,
  fund_type: fundTypeSchema.optional(),
  is_active: z.boolean().optional(),
  search: z.string().max(200).optional(),
  page: z.number().int().positive().default(1),
  limit: z.number().int().positive().max(100).default(20),
});

// Types
export type CreateFundInput = z.infer<typeof createFundSchema>;
export type UpdateFundInput = z.infer<typeof updateFundSchema>;
export type FundTransferInput = z.infer<typeof fundTransferSchema>;
export type FundFiltersInput = z.infer<typeof fundFiltersSchema>;

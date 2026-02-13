import { z } from "zod";
import { uuidSchema, amountSchema, optionalTextField } from "./shared";

/**
 * Advance payment validation schemas
 */

// Advance status enum
export const advanceStatusSchema = z.enum([
  "pending",
  "approved",
  "rejected",
  "fully_repaid",
  "partially_repaid",
]);

// Create advance schema
export const createAdvanceSchema = z.object({
  church_id: uuidSchema,
  fund_id: uuidSchema,
  ledger_entry_id: uuidSchema,
  recipient_name: z.string().min(1, "Recipient name is required").max(200),
  advance_amount: amountSchema,
  advance_date: z.string().datetime(),
  expected_return_date: z.string().datetime(),
  purpose: z.string().min(1, "Purpose is required").max(500),
  notes: optionalTextField,
  document_url: z.string().url().optional().or(z.literal("")),
});

// Update advance schema
export const updateAdvanceSchema = z.object({
  fund_id: uuidSchema.optional(),
  ledger_entry_id: uuidSchema.optional(),
  recipient_name: z.string().min(1).max(200).optional(),
  advance_amount: amountSchema.optional(),
  advance_date: z.string().datetime().optional(),
  expected_return_date: z.string().datetime().optional(),
  purpose: z.string().min(1).max(500).optional(),
  notes: optionalTextField,
  document_url: z.string().url().optional().or(z.literal("")),
  status: advanceStatusSchema.optional(),
});

// Advance repayment schema
export const advanceRepaymentSchema = z.object({
  advance_id: uuidSchema,
  church_id: uuidSchema,
  repayment_amount: amountSchema,
  repayment_date: z.string().datetime(),
  payment_method: z.enum([
    "cash",
    "bank_transfer",
    "check",
    "mobile_banking",
    "other",
  ]),
  reference_number: z.string().max(100).optional(),
  notes: optionalTextField,
});

// Approve advance schema
export const approveAdvanceSchema = z.object({
  advance_id: uuidSchema,
  church_id: uuidSchema,
  notes: optionalTextField,
});

// Reject advance schema
export const rejectAdvanceSchema = z.object({
  advance_id: uuidSchema,
  church_id: uuidSchema,
  reason: z.string().min(1, "Rejection reason is required").max(500),
});

// Advance filters schema
export const advanceFiltersSchema = z.object({
  church_id: uuidSchema,
  fund_id: uuidSchema.optional(),
  ledger_entry_id: uuidSchema.optional(),
  status: advanceStatusSchema.optional(),
  recipient_name: z.string().max(200).optional(),
  start_date: z.string().datetime().optional(),
  end_date: z.string().datetime().optional(),
  expected_return_start: z.string().datetime().optional(),
  expected_return_end: z.string().datetime().optional(),
  search: z.string().max(200).optional(),
  page: z.number().int().positive().default(1),
  limit: z.number().int().positive().max(100).default(20),
});

// Types
export type CreateAdvanceInput = z.infer<typeof createAdvanceSchema>;
export type UpdateAdvanceInput = z.infer<typeof updateAdvanceSchema>;
export type AdvanceRepaymentInput = z.infer<typeof advanceRepaymentSchema>;
export type ApproveAdvanceInput = z.infer<typeof approveAdvanceSchema>;
export type RejectAdvanceInput = z.infer<typeof rejectAdvanceSchema>;
export type AdvanceFiltersInput = z.infer<typeof advanceFiltersSchema>;

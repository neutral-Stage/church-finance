import { z } from "zod";
import {
  uuidSchema,
  amountSchema,
  optionalTextField,
  paginationSchema,
} from "./shared";

/**
 * Transaction validation schemas
 */

// Transaction type enum
export const transactionTypeSchema = z.enum(["income", "expense"]);

// Transaction status enum
export const transactionStatusSchema = z.enum([
  "pending",
  "approved",
  "rejected",
]);

// Create transaction schema
export const createTransactionSchema = z.object({
  church_id: uuidSchema,
  fund_id: uuidSchema,
  ledger_entry_id: uuidSchema,
  amount: amountSchema,
  transaction_type: transactionTypeSchema,
  description: z.string().min(1, "Description is required").max(500),
  transaction_date: z.string().datetime(),
  reference_number: z.string().max(100).optional(),
  document_url: z.string().url().optional().or(z.literal("")),
  notes: optionalTextField,
});

// Update transaction schema
export const updateTransactionSchema = z.object({
  fund_id: uuidSchema.optional(),
  ledger_entry_id: uuidSchema.optional(),
  amount: amountSchema.optional(),
  transaction_type: transactionTypeSchema.optional(),
  description: z.string().min(1).max(500).optional(),
  transaction_date: z.string().datetime().optional(),
  reference_number: z.string().max(100).optional(),
  document_url: z.string().url().optional().or(z.literal("")),
  notes: optionalTextField,
  status: transactionStatusSchema.optional(),
});

// Transaction filters schema
export const transactionFiltersSchema = paginationSchema.extend({
  church_id: uuidSchema,
  fund_id: uuidSchema.optional(),
  ledger_entry_id: uuidSchema.optional(),
  transaction_type: transactionTypeSchema.optional(),
  status: transactionStatusSchema.optional(),
  start_date: z.string().datetime().optional(),
  end_date: z.string().datetime().optional(),
  search: z.string().max(200).optional(),
});

// Approve transaction schema
export const approveTransactionSchema = z.object({
  transaction_id: uuidSchema,
  church_id: uuidSchema,
  notes: optionalTextField,
});

// Reject transaction schema
export const rejectTransactionSchema = z.object({
  transaction_id: uuidSchema,
  church_id: uuidSchema,
  reason: z.string().min(1, "Rejection reason is required").max(500),
});

// Types
export type CreateTransactionInput = z.infer<typeof createTransactionSchema>;
export type UpdateTransactionInput = z.infer<typeof updateTransactionSchema>;
export type TransactionFiltersInput = z.infer<typeof transactionFiltersSchema>;
export type ApproveTransactionInput = z.infer<typeof approveTransactionSchema>;
export type RejectTransactionInput = z.infer<typeof rejectTransactionSchema>;

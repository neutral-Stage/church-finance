import { z } from "zod";
import {
  uuidSchema,
  amountSchema,
  optionalTextField,
  dateSchema,
} from "./shared";

/**
 * Bill validation schemas
 */

// Bill status enum
export const billStatusSchema = z.enum([
  "pending",
  "approved",
  "rejected",
  "paid",
  "partially_paid",
]);

// Payment method enum
export const paymentMethodSchema = z.enum([
  "cash",
  "bank_transfer",
  "check",
  "mobile_banking",
  "other",
]);

// Create bill schema
export const createBillSchema = z.object({
  church_id: uuidSchema,
  fund_id: uuidSchema,
  ledger_entry_id: uuidSchema,
  vendor_name: z.string().min(1, "Vendor name is required").max(200),
  bill_number: z.string().max(100).optional(),
  bill_date: z.string().datetime(),
  due_date: z.string().datetime(),
  total_amount: amountSchema,
  description: z.string().min(1, "Description is required").max(500),
  notes: optionalTextField,
  document_url: z.string().url().optional().or(z.literal("")),
});

// Update bill schema
export const updateBillSchema = z.object({
  fund_id: uuidSchema.optional(),
  ledger_entry_id: uuidSchema.optional(),
  vendor_name: z.string().min(1).max(200).optional(),
  bill_number: z.string().max(100).optional(),
  bill_date: z.string().datetime().optional(),
  due_date: z.string().datetime().optional(),
  total_amount: amountSchema.optional(),
  description: z.string().min(1).max(500).optional(),
  notes: optionalTextField,
  document_url: z.string().url().optional().or(z.literal("")),
  status: billStatusSchema.optional(),
});

// Bill payment schema
export const billPaymentSchema = z.object({
  bill_id: uuidSchema,
  church_id: uuidSchema,
  payment_amount: amountSchema,
  payment_date: z.string().datetime(),
  payment_method: paymentMethodSchema,
  reference_number: z.string().max(100).optional(),
  notes: optionalTextField,
});

// Approve bill schema
export const approveBillSchema = z.object({
  bill_id: uuidSchema,
  church_id: uuidSchema,
  notes: optionalTextField,
});

// Reject bill schema
export const rejectBillSchema = z.object({
  bill_id: uuidSchema,
  church_id: uuidSchema,
  reason: z.string().min(1, "Rejection reason is required").max(500),
});

// Bill filters schema
export const billFiltersSchema = z.object({
  church_id: uuidSchema,
  fund_id: uuidSchema.optional(),
  ledger_entry_id: uuidSchema.optional(),
  status: billStatusSchema.optional(),
  vendor_name: z.string().max(200).optional(),
  start_date: z.string().datetime().optional(),
  end_date: z.string().datetime().optional(),
  due_start: z.string().datetime().optional(),
  due_end: z.string().datetime().optional(),
  search: z.string().max(200).optional(),
  page: z.number().int().positive().default(1),
  limit: z.number().int().positive().max(100).default(20),
});

// Types
export type CreateBillInput = z.infer<typeof createBillSchema>;
export type UpdateBillInput = z.infer<typeof updateBillSchema>;
export type BillPaymentInput = z.infer<typeof billPaymentSchema>;
export type ApproveBillInput = z.infer<typeof approveBillSchema>;
export type RejectBillInput = z.infer<typeof rejectBillSchema>;
export type BillFiltersInput = z.infer<typeof billFiltersSchema>;

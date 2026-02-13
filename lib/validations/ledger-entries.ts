import { z } from "zod";
import { uuidSchema, optionalTextField } from "./shared";

/**
 * Ledger entry validation schemas
 */

// Ledger group enum
export const ledgerGroupSchema = z.enum([
  "income",
  "expense",
  "asset",
  "liability",
  "equity",
]);

// Create ledger entry schema
export const createLedgerEntrySchema = z.object({
  church_id: uuidSchema,
  ledger_group: ledgerGroupSchema,
  ledger_subgroup_id: uuidSchema.optional(),
  account_name: z.string().min(1, "Account name is required").max(200),
  account_code: z.string().max(50).optional(),
  description: optionalTextField,
  is_active: z.boolean().default(true),
});

// Update ledger entry schema
export const updateLedgerEntrySchema = z.object({
  ledger_group: ledgerGroupSchema.optional(),
  ledger_subgroup_id: uuidSchema.optional(),
  account_name: z.string().min(1).max(200).optional(),
  account_code: z.string().max(50).optional(),
  description: optionalTextField,
  is_active: z.boolean().optional(),
});

// Create ledger subgroup schema
export const createLedgerSubgroupSchema = z.object({
  church_id: uuidSchema,
  ledger_group: ledgerGroupSchema,
  subgroup_name: z.string().min(1, "Subgroup name is required").max(200),
  subgroup_code: z.string().max(50).optional(),
  description: optionalTextField,
});

// Update ledger subgroup schema
export const updateLedgerSubgroupSchema = z.object({
  ledger_group: ledgerGroupSchema.optional(),
  subgroup_name: z.string().min(1).max(200).optional(),
  subgroup_code: z.string().max(50).optional(),
  description: optionalTextField,
});

// Ledger entry filters schema
export const ledgerEntryFiltersSchema = z.object({
  church_id: uuidSchema,
  ledger_group: ledgerGroupSchema.optional(),
  ledger_subgroup_id: uuidSchema.optional(),
  is_active: z.boolean().optional(),
  search: z.string().max(200).optional(),
  page: z.number().int().positive().default(1),
  limit: z.number().int().positive().max(100).default(20),
});

// Types
export type CreateLedgerEntryInput = z.infer<typeof createLedgerEntrySchema>;
export type UpdateLedgerEntryInput = z.infer<typeof updateLedgerEntrySchema>;
export type CreateLedgerSubgroupInput = z.infer<
  typeof createLedgerSubgroupSchema
>;
export type UpdateLedgerSubgroupInput = z.infer<
  typeof updateLedgerSubgroupSchema
>;
export type LedgerEntryFiltersInput = z.infer<typeof ledgerEntryFiltersSchema>;

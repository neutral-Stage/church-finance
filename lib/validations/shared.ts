import { z } from "zod";

/**
 * Common validation schemas used across the application
 */

// UUID validation
export const uuidSchema = z.string().uuid("Invalid UUID format");

// Date validation
export const dateSchema = z
  .string()
  .datetime({ message: "Invalid date format" });

// Amount validation (for BDT currency)
export const amountSchema = z
  .number()
  .nonnegative("Amount must be non-negative")
  .finite("Amount must be a finite number");

// Pagination schema
export const paginationSchema = z.object({
  page: z.number().int().positive().default(1),
  limit: z.number().int().positive().max(100).default(20),
});

// Church ID validation (required in multi-church context)
export const churchIdSchema = z.object({
  church_id: uuidSchema,
});

// Optional text field
export const optionalTextField = z.string().max(500).optional();

// Required text field
export const requiredTextField = z
  .string()
  .min(1, "This field is required")
  .max(500);

// Email validation
export const emailSchema = z.string().email("Invalid email address");

// Phone validation (optional)
export const phoneSchema = z
  .string()
  .regex(/^(\+?88)?01[3-9]\d{8}$/, "Invalid Bangladesh phone number")
  .optional();

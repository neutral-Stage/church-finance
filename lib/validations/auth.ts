import { z } from "zod";
import { emailSchema } from "./shared";

/**
 * Authentication validation schemas
 */

// Password validation
const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
  .regex(/[a-z]/, "Password must contain at least one lowercase letter")
  .regex(/[0-9]/, "Password must contain at least one number");

// Login schema
export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Password is required"),
});

// Signup schema
export const signupSchema = z
  .object({
    email: emailSchema,
    password: passwordSchema,
    full_name: z
      .string()
      .min(2, "Full name must be at least 2 characters")
      .max(100),
    confirm_password: z.string(),
  })
  .refine((data) => data.password === data.confirm_password, {
    message: "Passwords do not match",
    path: ["confirm_password"],
  });

// Password reset request schema
export const passwordResetRequestSchema = z.object({
  email: emailSchema,
});

// Password reset schema
export const passwordResetSchema = z
  .object({
    token: z.string().min(1, "Reset token is required"),
    password: passwordSchema,
    confirm_password: z.string(),
  })
  .refine((data) => data.password === data.confirm_password, {
    message: "Passwords do not match",
    path: ["confirm_password"],
  });

// Update password schema
export const updatePasswordSchema = z
  .object({
    current_password: z.string().min(1, "Current password is required"),
    new_password: passwordSchema,
    confirm_password: z.string(),
  })
  .refine((data) => data.new_password === data.confirm_password, {
    message: "Passwords do not match",
    path: ["confirm_password"],
  });

// Types
export type LoginInput = z.infer<typeof loginSchema>;
export type SignupInput = z.infer<typeof signupSchema>;
export type PasswordResetRequestInput = z.infer<
  typeof passwordResetRequestSchema
>;
export type PasswordResetInput = z.infer<typeof passwordResetSchema>;
export type UpdatePasswordInput = z.infer<typeof updatePasswordSchema>;

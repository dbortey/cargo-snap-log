import { z } from "zod";

// Login validation schema
export const loginSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Name must be at least 2 characters")
    .max(50, "Name must be less than 50 characters")
    .regex(/^[a-zA-Z\s]+$/, "Name can only contain letters"),
  code: z
    .string()
    .trim()
    .length(5, "Code must be exactly 5 characters")
    .regex(/^[A-Z0-9]+$/, "Code must be alphanumeric"),
});

// Signup validation schema
export const signupSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Name must be at least 2 characters")
    .max(50, "Name must be less than 50 characters")
    .regex(/^[a-zA-Z\s]+$/, "Name can only contain letters"),
  staffId: z
    .string()
    .trim()
    .min(3, "Staff ID must be at least 3 characters")
    .max(20, "Staff ID must be less than 20 characters")
    .regex(/^[a-zA-Z0-9]+$/, "Staff ID can only contain letters and numbers"),
  phone: z
    .string()
    .trim()
    .regex(
      /^(\+233|0)[0-9]{9}$/,
      "Phone must be in Ghana format (+233XXXXXXXXX or 0XXXXXXXXX)"
    ),
});

// Recovery validation schema
export const recoverySchema = z.object({
  staffId: z
    .string()
    .trim()
    .min(3, "Staff ID must be at least 3 characters")
    .max(20, "Staff ID must be less than 20 characters")
    .regex(/^[a-zA-Z0-9]+$/, "Staff ID can only contain letters and numbers"),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type SignupInput = z.infer<typeof signupSchema>;
export type RecoveryInput = z.infer<typeof recoverySchema>;

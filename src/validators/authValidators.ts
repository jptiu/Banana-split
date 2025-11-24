import { z } from "zod";

//Signup validation schema
export const signupSchema = z.object({
  first_name: z
    .string()
    .min(1, "First name is required")
    .max(100, "First name must be less than 100 characters")
    .trim(),
  last_name: z
    .string()
    .min(1, "Last name is required")
    .max(100, "Last name must be less than 100 characters")
    .trim(),
  email: z
    .email({ message: "Invalid email address" })
    .max(100, "Email must be less than 100 characters"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(100, "Password must be less than 100 characters")
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
      "Password must contain at least one uppercase letter, one lowercase letter, and one number"
    ),
  user_type: z.enum(["creator", "member"], {
    message: "User type must be either 'creator' or 'member'",
  }),
});

//Login validation schema
export const loginSchema = z.object({
  email: z.string().email({ message: "Invalid email address" }).toLowerCase(),
  password: z.string().min(1, "Password is required"),
});

// Forgot password validation schema
export const forgotPasswordSchema = z.object({
  email: z.string().email({ message: "Invalid email address" }).toLowerCase(),
});

//Reset password validation schema
export const resetPasswordSchema = z.object({
  resetToken: z.string().min(1, "Reset token is required"),
  newPassword: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(100, "Password must be less than 100 characters")
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
      "Password must contain at least one uppercase letter, one lowercase letter, and one number"
    ),
});

/**
 * Verify reset code validation schema
 */
export const verifyResetCodeSchema = z.object({
  requestId: z.string().uuid("Invalid request ID format"),
  code: z
    .string()
    .length(6, "Code must be exactly 6 digits")
    .regex(/^\d{6}$/, "Code must contain only digits"),
});

/**
 * Email verification validation schema
 */
export const verifyEmailSchema = z.object({
  email: z.string().email({ message: "Invalid email address" }).toLowerCase(),
  token: z.string().min(1, "Token is required"),
});

/**
 * Refresh token validation schema
 */
export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1, "Refresh token is required"),
});

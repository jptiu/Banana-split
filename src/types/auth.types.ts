/**
 * Authentication Types
 *
 * Defines all TypeScript types and interfaces for the authentication module.
 * Ensures type safety across the authentication flow.
 */

export type UserRole = "user" | "admin";

export interface User {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  password: string;
  is_email_verified: boolean;
  email_verification_token: string | null;
  email_verification_expires: Date | null;
  password_reset_token: string | null;
  password_reset_expires: Date | null;
  last_login_at: Date | null;
  created_at: Date;
  updated_at: Date;
}

export interface UserResponse {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  is_email_verified: boolean;
  role: UserRole;
  last_login_at: Date | null;
  created_at: Date;
}

export interface JWTPayload {
  userId: string;
  email: string;
  role: UserRole;
  iat?: number;
  exp?: number;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface SignupRequest {
  first_name: string;
  last_name: string;
  email: string;
  password: string;
}

export interface ForgotPasswordRequest {
  email: string;
}

export interface ResetPasswordRequest {
  token: string;
  newPassword: string;
}

export interface VerifyEmailRequest {
  token: string;
}

export interface RefreshTokenRequest {
  refreshToken: string;
}

/**
 * Rate limiting tracking interface
 */
export interface RateLimitEntry {
  attempts: number;
  firstAttempt: number;
  blockedUntil?: number;
}

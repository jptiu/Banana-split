/**
 * Authentication Types
 *
 * Defines all TypeScript types and interfaces for the authentication module.
 * Ensures type safety across the authentication flow.
 */

export type UserRole = "user" | "admin";
export type UserType = "creator" | "member";

export interface User {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  password: string;
  is_email_verified: boolean;
  role: UserRole;
  user_type: UserType | null;
  email_verification_token: string | null;
  email_verification_expires: Date | null;
  password_reset_token: string | null;
  password_reset_expires: Date | null;
  password_reset_code: string | null;
  password_reset_request_id: string | null;
  password_reset_attempts: number | null;
  password_reset_locked_until: Date | null;
  failed_login_attempts: number | null;
  login_locked_until: Date | null;
  last_failed_login_at: Date | null;
  last_login_at: Date | null;
  refresh_token: string | null;
  refresh_token_expires: Date | null;
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
  user_type: UserType | null;
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
  user_type: "creator" | "member";
}

export interface ForgotPasswordRequest {
  email: string;
}

export interface ForgotPasswordResponse {
  message: string;
  requestId: string;
}

export interface VerifyResetCodeRequest {
  requestId: string;
  code: string;
}

export interface VerifyResetCodeResponse {
  message: string;
  resetToken: string;
}

export interface ResetPasswordRequest {
  resetToken: string;
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

/**
 * JWT Utility Module
 *
 * Handles JWT token generation, verification, and refresh token logic.
 *
 * Security considerations:
 * - Uses separate secrets for access and refresh tokens
 * - Short-lived access tokens (15 minutes) minimize exposure window
 * - Longer-lived refresh tokens (7 days) reduce frequent re-authentication
 * - All secrets must be stored in environment variables, never in code
 * - Tokens are signed using HS256 algorithm
 */

import jwt from "jsonwebtoken";
import crypto from "crypto";
import type { JWTPayload, AuthTokens } from "../types/auth.types.js";

const JWT_ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || "";
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || "";

// Token expiration times
const ACCESS_TOKEN_EXPIRY = "15m"; // 15 minutes - short-lived for security
const REFRESH_TOKEN_EXPIRY = "7d"; // 7 days - allows persistent sessions

/**
 * Validates that required JWT secrets are configured
 * Should be called at application startup
 */
export function validateJWTConfig(): void {
  if (!JWT_ACCESS_SECRET || JWT_ACCESS_SECRET.length < 32) {
    throw new Error(
      "JWT_ACCESS_SECRET must be set in environment variables and be at least 32 characters long"
    );
  }
  if (!JWT_REFRESH_SECRET || JWT_REFRESH_SECRET.length < 32) {
    throw new Error(
      "JWT_REFRESH_SECRET must be set in environment variables and be at least 32 characters long"
    );
  }
}

/**
 * Generates an access token for authenticated users
 *
 * Access tokens are short-lived (15 minutes) and contain user identification data.
 * They are used to authenticate API requests.
 *
 * @param payload - User data to encode in the token (userId, email, role)
 * @returns Signed JWT access token
 */
export function generateAccessToken(payload: JWTPayload): string {
  return jwt.sign(payload, JWT_ACCESS_SECRET, {
    expiresIn: ACCESS_TOKEN_EXPIRY,
    issuer: "banana-split-api",
    audience: "banana-split-client",
  });
}

/**
 * Generates a refresh token for token renewal
 *
 * Refresh tokens are longer-lived (7 days) and used solely to obtain new access tokens.
 * They should be stored securely on the client (httpOnly cookies preferred).
 *
 * @param payload - User data to encode in the token (userId, email, role)
 * @returns Signed JWT refresh token
 */
export function generateRefreshToken(payload: JWTPayload): string {
  return jwt.sign(payload, JWT_REFRESH_SECRET, {
    expiresIn: REFRESH_TOKEN_EXPIRY,
    issuer: "banana-split-api",
    audience: "banana-split-client",
  });
}

/**
 * Generates both access and refresh tokens for a user
 *
 * @param userId - User's unique identifier
 * @param email - User's email address
 * @param role - User's role (user or admin)
 * @returns Object containing both access and refresh tokens
 */
export function generateAuthTokens(
  userId: string,
  email: string,
  role: "user" | "admin"
): AuthTokens {
  const payload: JWTPayload = { userId, email, role };

  return {
    accessToken: generateAccessToken(payload),
    refreshToken: generateRefreshToken(payload),
  };
}

/**
 * Verifies an access token and extracts the payload
 *
 * @param token - JWT access token to verify
 * @returns Decoded JWT payload if valid
 * @throws Error if token is invalid, expired, or malformed
 */
export function verifyAccessToken(token: string): JWTPayload {
  try {
    const decoded = jwt.verify(token, JWT_ACCESS_SECRET, {
      issuer: "banana-split-api",
      audience: "banana-split-client",
    }) as JWTPayload;

    return decoded;
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      throw new Error("Access token has expired");
    }
    if (error instanceof jwt.JsonWebTokenError) {
      throw new Error("Invalid access token");
    }
    throw new Error("Token verification failed");
  }
}

/**
 * Verifies a refresh token and extracts the payload
 *
 * @param token - JWT refresh token to verify
 * @returns Decoded JWT payload if valid
 * @throws Error if token is invalid, expired, or malformed
 */
export function verifyRefreshToken(token: string): JWTPayload {
  try {
    const decoded = jwt.verify(token, JWT_REFRESH_SECRET, {
      issuer: "banana-split-api",
      audience: "banana-split-client",
    }) as JWTPayload;

    return decoded;
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      throw new Error("Refresh token has expired");
    }
    if (error instanceof jwt.JsonWebTokenError) {
      throw new Error("Invalid refresh token");
    }
    throw new Error("Token verification failed");
  }
}

/**
 * Generates a cryptographically secure random token
 * Used for email verification and password reset tokens
 *
 * @param length - Length of the token in bytes (default: 32)
 * @returns Hex string representation of the random token
 */
export function generateSecureToken(length: number = 32): string {
  return crypto.randomBytes(length).toString("hex");
}

/**
 * Extracts Bearer token from Authorization header
 *
 * @param authHeader - Authorization header value
 * @returns Token string without 'Bearer ' prefix
 * @throws Error if header format is invalid
 */
export function extractBearerToken(authHeader: string | undefined): string {
  if (!authHeader) {
    throw new Error("Authorization header is missing");
  }

  const parts = authHeader.split(" ");
  if (parts.length !== 2 || parts[0] !== "Bearer") {
    throw new Error(
      "Invalid authorization header format. Expected: Bearer <token>"
    );
  }

  return parts[1];
}

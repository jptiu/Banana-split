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
 */
export function generateAuthTokens(
  userId: string,
  email: string,
  name: string,
  role: "user" | "admin"
): AuthTokens {
  const payload: JWTPayload = { userId, email, name, role };

  return {
    accessToken: generateAccessToken(payload),
    refreshToken: generateRefreshToken(payload),
  };
}

/**
 * Verifies an access token and extracts the payload
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
 * Extracts refresh token expiration date from a JWT
 * Used to store expiration in database
 */
export function getRefreshTokenExpiration(token: string): Date {
  try {
    const decoded = jwt.decode(token) as jwt.JwtPayload;
    if (!decoded || !decoded.exp) {
      throw new Error("Invalid token: no expiration found");
    }
    return new Date(decoded.exp * 1000);
  } catch (error) {
    throw new Error("Failed to extract token expiration");
  }
}

/**
 * Generates a cryptographically secure random token
 * Used for password reset tokens
 */
export function generateSecureToken(length: number = 32): string {
  return crypto.randomBytes(length).toString("hex");
}

/**
 * Generates a 6-digit verification code
 * Used for email verification and password reset
 */
export function generateVerificationCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * Generates a UUID v4
 * Used for request IDs and reset tokens
 */
export function generateUUID(): string {
  return crypto.randomUUID();
}

/**
 * Extracts Bearer token from Authorization header
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

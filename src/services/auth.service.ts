/**
 * Authentication Service
 *
 * Handles all authentication business logic including:
 * - User registration with password hashing
 * - Login with credential verification
 * - Email verification flow
 * - Password reset flow
 * - Token generation and validation
 *
 * Security implementations:
 * - bcrypt for password hashing (10 rounds)
 * - Secure random token generation for email/password reset
 * - Token expiration handling
 * - SQL injection prevention via parameterized queries
 * - Password never returned in responses
 */

import bcrypt from "bcrypt";
import { pool } from "../config/db.js";
import {
  generateAuthTokens,
  generateSecureToken,
  generateVerificationCode,
  verifyRefreshToken,
} from "../utils/jwt.js";
import {
  sendVerificationEmail,
  sendPasswordResetEmail,
  sendPasswordChangedEmail,
} from "../utils/email.js";
import type {
  User,
  UserResponse,
  UserRole,
  AuthTokens,
  SignupRequest,
  LoginRequest,
} from "../types/auth.types.js";

// bcrypt salt rounds - 10 is a good balance between security and performance
const SALT_ROUNDS = 10;

// Token expiration times
const EMAIL_VERIFICATION_EXPIRY = 24 * 60 * 60 * 1000; // 24 hours
const PASSWORD_RESET_EXPIRY = 1 * 60 * 60 * 1000; // 1 hour

/**
 * Sanitizes user data by removing sensitive fields
 * Never expose password or internal tokens to the client
 *
 * @param user - User object from database
 */
function sanitizeUser(user: User): UserResponse {
  return {
    id: user.id,
    first_name: user.first_name,
    last_name: user.last_name,
    email: user.email,
    is_email_verified: user.is_email_verified,
    role: user.role,
    user_type: user.user_type,
    last_login_at: user.last_login_at,
    created_at: user.created_at,
  };
}

/**
 * Registers a new user with hashed password
 *
 * @param data - User registration data
 * @returns Sanitized user object and auth tokens
 * @throws Error if email already exists or database error
 */
export async function signup(
  data: SignupRequest
): Promise<{ user: UserResponse; tokens: AuthTokens }> {
  const { first_name, last_name, email, password, user_type } = data;

  // Start a database transaction to ensure atomicity
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const existingUserResult = await client.query(
      "SELECT id FROM users WHERE email = $1",
      [email]
    );

    if (existingUserResult.rows.length > 0) {
      throw new Error("User with this email already exists");
    }

    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

    const verificationCode = generateVerificationCode();
    const verificationExpiry = new Date(Date.now() + EMAIL_VERIFICATION_EXPIRY);

    const result = await client.query<User>(
      `INSERT INTO users (
        first_name, 
        last_name, 
        email, 
        password, 
        is_email_verified,
        role,
        user_type,
        email_verification_token,
        email_verification_expires
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *`,
      [
        first_name,
        last_name,
        email,
        passwordHash,
        false,
        "user",
        user_type,
        verificationCode,
        verificationExpiry,
      ]
    );

    const user = result.rows[0];

    // Generate auth tokens with the default 'user' role
    const tokens = generateAuthTokens(user.id, user.email, user.role);

    await client.query("COMMIT");

    sendVerificationEmail(user.email, user.first_name, verificationCode).catch(
      (error) => {
        console.error("Failed to send verification email:", error);
      }
    );

    return {
      user: sanitizeUser(user),
      tokens,
    };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    // Release the client back to the pool
    client.release();
  }
}

/**
 * Authenticates a user with email and password
 *
 * @param data - Login credentials
 * @returns Sanitized user object and auth tokens
 * @throws Error if credentials are invalid
 */
export async function login(
  data: LoginRequest
): Promise<{ user: UserResponse; tokens: AuthTokens }> {
  const { email, password } = data;

  const result = await pool.query<User>(
    "SELECT * FROM users WHERE email = $1",
    [email]
  );

  if (result.rows.length === 0) {
    throw new Error("Invalid email or password");
  }

  const user = result.rows[0];

  const isPasswordValid = await bcrypt.compare(password, user.password);

  if (!isPasswordValid) {
    throw new Error("Invalid email or password");
  }

  if (!user.is_email_verified) {
    throw new Error("Please verify your email address before logging in");
  }

  // Update last login timestamp
  await pool.query(
    "UPDATE users SET last_login_at = CURRENT_TIMESTAMP WHERE id = $1",
    [user.id]
  );

  user.last_login_at = new Date();

  const tokens = generateAuthTokens(user.id, user.email, user.role);

  return {
    user: sanitizeUser(user),
    tokens,
  };
}

/**
 * Verifies user's email using the verification code
 *
 * @param code - 6-digit email verification code
 * @returns Success message
 * @throws Error if code is invalid or expired
 */
export async function verifyEmail(code: string): Promise<{ message: string }> {
  const result = await pool.query<User>(
    `SELECT * FROM users 
     WHERE email_verification_token = $1 
     AND email_verification_expires > NOW()`,
    [code]
  );

  if (result.rows.length === 0) {
    throw new Error("Invalid or expired verification code");
  }

  const user = result.rows[0];

  // Mark email as verified and clear token
  await pool.query(
    `UPDATE users 
     SET is_email_verified = true,
         email_verification_token = NULL,
         email_verification_expires = NULL,
         updated_at = CURRENT_TIMESTAMP
     WHERE id = $1`,
    [user.id]
  );

  return { message: "Email verified successfully" };
}

/**
 * Resends email verification token
 *
 * @param email - User's email address
 * @returns Success message
 * @throws Error if user not found or already verified
 */
export async function resendVerificationEmail(
  email: string
): Promise<{ message: string }> {
  const result = await pool.query<User>(
    "SELECT * FROM users WHERE email = $1",
    [email]
  );

  if (result.rows.length === 0) {
    throw new Error("User not found");
  }

  const user = result.rows[0];

  if (user.is_email_verified) {
    throw new Error("Email is already verified");
  }

  const verificationCode = generateVerificationCode();
  const verificationExpiry = new Date(Date.now() + EMAIL_VERIFICATION_EXPIRY);

  await pool.query(
    `UPDATE users 
     SET email_verification_token = $1,
         email_verification_expires = $2,
         updated_at = CURRENT_TIMESTAMP
     WHERE id = $3`,
    [verificationCode, verificationExpiry, user.id]
  );

  await sendVerificationEmail(user.email, user.first_name, verificationCode);

  return { message: "Verification email sent" };
}

/**
 * Initiates password reset process by generating a reset token
 *
 * @param email - User's email address
 * @returns Success message
 */
export async function forgotPassword(
  email: string
): Promise<{ message: string }> {
  const result = await pool.query<User>(
    "SELECT * FROM users WHERE email = $1",
    [email]
  );

  if (result.rows.length === 0) {
    return {
      message:
        "If an account exists with this email, a password reset link will be sent",
    };
  }

  const user = result.rows[0];

  const resetToken = generateSecureToken();
  const resetExpiry = new Date(Date.now() + PASSWORD_RESET_EXPIRY);

  await pool.query(
    `UPDATE users 
     SET password_reset_token = $1,
         password_reset_expires = $2,
         updated_at = CURRENT_TIMESTAMP
     WHERE id = $3`,
    [resetToken, resetExpiry, user.id]
  );

  await sendPasswordResetEmail(user.email, user.first_name, resetToken);

  return {
    message:
      "If an account exists with this email, a password reset link will be sent",
  };
}

/**
 * Resets user's password using the reset token
 *
 * @param token - Password reset token
 * @param newPassword - New password (will be hashed)
 * @returns Success message
 * @throws Error if token is invalid or expired
 */
export async function resetPassword(
  token: string,
  newPassword: string
): Promise<{ message: string }> {
  const result = await pool.query<User>(
    `SELECT * FROM users 
     WHERE password_reset_token = $1 
     AND password_reset_expires > NOW()`,
    [token]
  );

  if (result.rows.length === 0) {
    throw new Error("Invalid or expired reset token");
  }

  const user = result.rows[0];

  const passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);

  await pool.query(
    `UPDATE users 
     SET password = $1,
         password_reset_token = NULL,
         password_reset_expires = NULL,
         updated_at = CURRENT_TIMESTAMP
     WHERE id = $2`,
    [passwordHash, user.id]
  );

  await sendPasswordChangedEmail(user.email, user.first_name);

  return { message: "Password reset successfully" };
}

/**
 * Refreshes access token using a valid refresh token
 *
 * @param refreshToken - Valid refresh token
 * @returns New auth tokens
 * @throws Error if refresh token is invalid or user doesn't exist
 */
export async function refreshAccessToken(
  refreshToken: string
): Promise<AuthTokens> {
  const payload = verifyRefreshToken(refreshToken);

  const result = await pool.query<User>(
    "SELECT id, email, role FROM users WHERE id = $1",
    [payload.userId]
  );

  if (result.rows.length === 0) {
    throw new Error("User not found");
  }

  const user = result.rows[0];

  return generateAuthTokens(user.id, user.email, user.role);
}

/**
 * Gets user by ID
 *
 * @param userId - User's unique identifier
 * @returns Sanitized user object
 * @throws Error if user not found
 */
export async function getUserById(userId: string): Promise<UserResponse> {
  const result = await pool.query<User>(
    `SELECT id, email, first_name, last_name, is_email_verified, 
            role, user_type, created_at, updated_at, last_login_at 
     FROM users 
     WHERE id = $1`,
    [userId]
  );

  if (result.rows.length === 0) {
    throw new Error("User not found");
  }

  return sanitizeUser(result.rows[0]);
}

/**
 * Updates user's role in users table (admin operation)
 *
 * @param userId - User's unique identifier
 * @param role - Role to assign (e.g., 'user', 'admin')
 * @returns Success message
 * @throws Error if user not found
 */
export async function updateUserRole(
  userId: string,
  role: string
): Promise<{ message: string }> {
  const userResult = await pool.query<User>(
    "SELECT id FROM users WHERE id = $1",
    [userId]
  );

  if (userResult.rows.length === 0) {
    throw new Error("User not found");
  }

  await pool.query(
    `UPDATE users SET role = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2`,
    [role, userId]
  );

  return { message: "User role updated successfully" };
}

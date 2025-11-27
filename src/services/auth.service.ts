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
  generateVerificationCode,
  generateUUID,
  verifyRefreshToken,
  getRefreshTokenExpiration,
} from "../utils/jwt.js";
import {
  sendVerificationEmail,
  sendPasswordResetEmail,
  sendPasswordChangedEmail,
} from "../utils/email.js";
import type {
  User,
  UserResponse,
  AuthTokens,
  SignupRequest,
  LoginRequest,
  ForgotPasswordResponse,
  VerifyResetCodeResponse,
} from "../types/auth.types.js";

// bcrypt salt rounds - 10 is a good balance between security and performance
const SALT_ROUNDS = 10;

// Token expiration times
const EMAIL_VERIFICATION_EXPIRY = 24 * 60 * 60 * 1000; // 24 hours
const PASSWORD_RESET_CODE_EXPIRY = 10 * 60 * 1000; // 10 minutes for the code
const PASSWORD_RESET_TOKEN_EXPIRY = 15 * 60 * 1000; // 15 minutes for the reset token
const PASSWORD_RESET_MAX_ATTEMPTS = 5; // Maximum verification attempts
const PASSWORD_RESET_LOCKOUT_DURATION = 30 * 60 * 1000; // 30 minutes lockout

// Login attempt tracking
const MAX_LOGIN_ATTEMPTS = 5; // Maximum login attempts before account lock
const LOGIN_LOCKOUT_DURATION = 30 * 60 * 1000; // 30 minutes account lockout

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
    is_admin: user.is_admin,
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
): Promise<{ user: UserResponse }> {
  const { first_name, last_name, email, password, role } = data;

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
        email_verification_token,
        email_verification_expires
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *`,
      [
        first_name,
        last_name,
        email,
        passwordHash,
        false,
        role,
        verificationCode,
        verificationExpiry,
      ]
    );

    const user = result.rows[0];

    await client.query("COMMIT");

    sendVerificationEmail(user.email, user.first_name, verificationCode).catch(
      (error) => {
        console.error("Failed to send verification email:", error);
      }
    );

    return {
      user: sanitizeUser(user),
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
 * Tracks failed login attempts in the database and implements account locking
 *
 * @param data - Login credentials
 * @returns Sanitized user object and auth tokens
 * @throws Error if credentials are invalid or account is locked
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

  // Check if account is locked
  if (
    user.login_locked_until &&
    new Date(user.login_locked_until) > new Date()
  ) {
    const remainingTime = Math.ceil(
      (new Date(user.login_locked_until).getTime() - Date.now()) / 1000 / 60
    );
    throw new Error(
      `Account temporarily locked due to multiple failed login attempts. Please try again in ${remainingTime} minute${remainingTime !== 1 ? "s" : ""
      }.`
    );
  }

  // Reset lock if it has expired
  if (
    user.login_locked_until &&
    new Date(user.login_locked_until) <= new Date()
  ) {
    await pool.query(
      `UPDATE users 
       SET failed_login_attempts = 0,
           login_locked_until = NULL
       WHERE id = $1`,
      [user.id]
    );
  }

  const isPasswordValid = await bcrypt.compare(password, user.password);

  if (!isPasswordValid) {
    // Increment failed attempts
    const failedAttempts = (user.failed_login_attempts || 0) + 1;

    // Check if we should lock the account
    if (failedAttempts >= MAX_LOGIN_ATTEMPTS) {
      const lockedUntil = new Date(Date.now() + LOGIN_LOCKOUT_DURATION);
      await pool.query(
        `UPDATE users 
         SET failed_login_attempts = $1,
             login_locked_until = $2,
             last_failed_login_at = CURRENT_TIMESTAMP
         WHERE id = $3`,
        [failedAttempts, lockedUntil, user.id]
      );
      throw new Error(
        "Too many failed login attempts. Your account has been temporarily locked for 30 minutes."
      );
    }

    // Just increment attempts
    await pool.query(
      `UPDATE users 
       SET failed_login_attempts = $1,
           last_failed_login_at = CURRENT_TIMESTAMP
       WHERE id = $2`,
      [failedAttempts, user.id]
    );

    const remainingAttempts = MAX_LOGIN_ATTEMPTS - failedAttempts;
    throw new Error(
      `Invalid email or password. ${remainingAttempts} attempt${remainingAttempts !== 1 ? "s" : ""
      } remaining.`
    );
  }

  if (!user.is_email_verified) {
    throw new Error("Please verify your email address before logging in");
  }

  // Generate tokens
  const name = `${user.first_name} ${user.last_name}`;
  const tokens = generateAuthTokens(user.id, user.email, name, user.role, user.is_admin);
  const refreshTokenExpiry = getRefreshTokenExpiration(tokens.refreshToken);

  // Successful login - reset failed attempts, update last login, and store refresh token
  await pool.query(
    `UPDATE users 
     SET last_login_at = CURRENT_TIMESTAMP,
         failed_login_attempts = 0,
         login_locked_until = NULL,
         last_failed_login_at = NULL,
         refresh_token = $2,
         refresh_token_expires = $3
     WHERE id = $1`,
    [user.id, tokens.refreshToken, refreshTokenExpiry]
  );

  user.last_login_at = new Date();

  return {
    user: sanitizeUser(user),
    tokens,
  };
}

/**
 * Verifies user's email using the verification code
 */
export async function verifyEmail(
  email: string,
  code: string
): Promise<{ message: string; user: UserResponse; tokens: AuthTokens }> {
  const result = await pool.query<User>(
    `SELECT * FROM users 
     WHERE email = $1
     AND email_verification_token = $2 
     AND email_verification_expires > NOW()`,
    [email, code]
  );

  if (result.rows.length === 0) {
    throw new Error("Invalid or expired verification code");
  }

  const user = result.rows[0];

  // Generate tokens for the user
  const name = `${user.first_name} ${user.last_name}`;
  const tokens = generateAuthTokens(user.id, user.email, name, user.role, user.is_admin);
  const refreshTokenExpiry = getRefreshTokenExpiration(tokens.refreshToken);

  // Mark email as verified, clear token, and store refresh token
  await pool.query(
    `UPDATE users 
     SET is_email_verified = true,
         email_verification_token = NULL,
         email_verification_expires = NULL,
         refresh_token = $2,
         refresh_token_expires = $3,
         updated_at = CURRENT_TIMESTAMP
     WHERE id = $1`,
    [user.id, tokens.refreshToken, refreshTokenExpiry]
  );

  return {
    message: "Email verified successfully",
    user: sanitizeUser(user),
    tokens,
  };
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
 * Initiates password reset process by generating a 6-digit code and requestId
 *
 * @param email - User's email address
 * @returns Success message and requestId
 */
export async function forgotPassword(
  email: string
): Promise<ForgotPasswordResponse> {
  const result = await pool.query<User>(
    "SELECT * FROM users WHERE email = $1",
    [email]
  );

  // Always return success to prevent user enumeration
  if (result.rows.length === 0) {
    // Return a fake requestId to prevent user enumeration
    return {
      message: "Verification code sent.",
      requestId: generateUUID(),
    };
  }

  const user = result.rows[0];

  // Generate 6-digit code and requestId
  const resetCode = generateVerificationCode();
  const requestId = generateUUID();
  const codeExpiry = new Date(Date.now() + PASSWORD_RESET_CODE_EXPIRY);

  await pool.query(
    `UPDATE users 
     SET password_reset_code = $1,
         password_reset_request_id = $2,
         password_reset_expires = $3,
         password_reset_attempts = 0,
         password_reset_locked_until = NULL,
         password_reset_token = NULL,
         updated_at = CURRENT_TIMESTAMP
     WHERE id = $4`,
    [resetCode, requestId, codeExpiry, user.id]
  );

  await sendPasswordResetEmail(user.email, user.first_name, resetCode);

  return {
    message: "Verification code sent.",
    requestId: requestId,
  };
}

/**
 * Verifies the 6-digit reset code and generates a short-lived reset token
 *
 * @param requestId - UUID from forgot password request
 * @param code - 6-digit verification code
 * @returns Success message and resetToken
 * @throws Error if code is invalid, expired, or too many attempts
 */
export async function verifyResetCode(
  requestId: string,
  code: string
): Promise<VerifyResetCodeResponse> {
  const result = await pool.query<User>(
    `SELECT * FROM users 
     WHERE password_reset_request_id = $1`,
    [requestId]
  );

  if (result.rows.length === 0) {
    throw new Error("Invalid or expired reset request");
  }

  const user = result.rows[0];

  // Check if account is locked due to too many attempts
  if (
    user.password_reset_locked_until &&
    new Date(user.password_reset_locked_until) > new Date()
  ) {
    const remainingTime = Math.ceil(
      (new Date(user.password_reset_locked_until).getTime() - Date.now()) /
      1000 /
      60
    );
    throw new Error(
      `Too many failed attempts. Please try again in ${remainingTime} minutes.`
    );
  }

  // Check if code has expired
  if (
    !user.password_reset_expires ||
    new Date(user.password_reset_expires) < new Date()
  ) {
    throw new Error("Verification code has expired. Please request a new one.");
  }

  // Check if code matches
  if (user.password_reset_code !== code) {
    // Increment attempt count
    const attempts = (user.password_reset_attempts || 0) + 1;

    // Lock account if max attempts reached
    if (attempts >= PASSWORD_RESET_MAX_ATTEMPTS) {
      const lockedUntil = new Date(
        Date.now() + PASSWORD_RESET_LOCKOUT_DURATION
      );
      await pool.query(
        `UPDATE users 
         SET password_reset_attempts = $1,
             password_reset_locked_until = $2,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $3`,
        [attempts, lockedUntil, user.id]
      );
      throw new Error(
        "Too many failed attempts. Your account has been temporarily locked for 30 minutes."
      );
    }

    // Just increment attempts
    await pool.query(
      `UPDATE users 
       SET password_reset_attempts = $1,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $2`,
      [attempts, user.id]
    );

    const remainingAttempts = PASSWORD_RESET_MAX_ATTEMPTS - attempts;
    throw new Error(
      `Invalid verification code. ${remainingAttempts} attempt${remainingAttempts !== 1 ? "s" : ""
      } remaining.`
    );
  }

  // Code is valid - generate short-lived reset token
  const resetToken = generateUUID();
  const tokenExpiry = new Date(Date.now() + PASSWORD_RESET_TOKEN_EXPIRY);

  await pool.query(
    `UPDATE users 
     SET password_reset_token = $1,
         password_reset_expires = $2,
         password_reset_attempts = 0,
         password_reset_locked_until = NULL,
         updated_at = CURRENT_TIMESTAMP
     WHERE id = $3`,
    [resetToken, tokenExpiry, user.id]
  );

  return {
    message: "Code verified.",
    resetToken: resetToken,
  };
}

/**
 * Resets user's password using the reset token
 *
 * @param resetToken - Short-lived reset token from code verification
 * @param newPassword - New password (will be hashed)
 * @returns Success message
 * @throws Error if token is invalid or expired
 */
export async function resetPassword(
  resetToken: string,
  newPassword: string
): Promise<{ message: string }> {
  const result = await pool.query<User>(
    `SELECT * FROM users 
     WHERE password_reset_token = $1 
     AND password_reset_expires > NOW()`,
    [resetToken]
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
         password_reset_code = NULL,
         password_reset_request_id = NULL,
         password_reset_attempts = 0,
         password_reset_locked_until = NULL,
         updated_at = CURRENT_TIMESTAMP
     WHERE id = $2`,
    [passwordHash, user.id]
  );

  await sendPasswordChangedEmail(user.email, user.first_name);

  return { message: "Password updated successfully." };
}

/**
 * Refreshes access token using a valid refresh token
 * Validates token against database and rotates refresh token for security
 *
 * @param refreshToken - Valid refresh token
 * @returns New auth tokens
 * @throws Error if refresh token is invalid or user doesn't exist
 */
export async function refreshAccessToken(
  refreshToken: string
): Promise<AuthTokens> {
  // Verify the token signature and expiration
  const payload = verifyRefreshToken(refreshToken);

  // Validate token against database
  const result = await pool.query<User>(
    `SELECT id, email, first_name, last_name, role, refresh_token, refresh_token_expires 
     FROM users 
     WHERE id = $1`,
    [payload.userId]
  );

  if (result.rows.length === 0) {
    throw new Error("User not found");
  }

  const user = result.rows[0];

  // Validate that the token matches what's stored in the database
  if (user.refresh_token !== refreshToken) {
    throw new Error("Invalid refresh token");
  }

  // Check if the stored token has expired
  if (
    !user.refresh_token_expires ||
    new Date(user.refresh_token_expires) < new Date()
  ) {
    throw new Error("Refresh token has expired");
  }

  // Generate new tokens (token rotation)
  const name = `${user.first_name} ${user.last_name}`;
  const newTokens = generateAuthTokens(user.id, user.email, name, user.role, user.is_admin);
  const newRefreshTokenExpiry = getRefreshTokenExpiration(
    newTokens.refreshToken
  );

  // Update the refresh token in the database
  await pool.query(
    `UPDATE users 
     SET refresh_token = $1,
         refresh_token_expires = $2,
         updated_at = CURRENT_TIMESTAMP
     WHERE id = $3`,
    [newTokens.refreshToken, newRefreshTokenExpiry, user.id]
  );

  return newTokens;
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
     role, is_admin, created_at, updated_at, last_login_at 
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

/**
 * Logs out a user by clearing their refresh token from the database
 */
export async function logout(userId: string): Promise<{ message: string }> {
  await pool.query(
    `UPDATE users 
     SET refresh_token = NULL,
         refresh_token_expires = NULL,
         updated_at = CURRENT_TIMESTAMP
     WHERE id = $1`,
    [userId]
  );

  return { message: "Logged out successfully" };
}

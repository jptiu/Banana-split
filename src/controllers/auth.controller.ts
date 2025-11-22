/**
 * Authentication Controller
 *
 * Handles HTTP requests for authentication endpoints.
 * Delegates all business logic to the AuthService.
 * Implements rate limiting on sensitive endpoints.
 *
 * Responsibilities:
 * - Request validation using Zod schemas
 * - Rate limiting enforcement
 * - Error handling and response formatting
 * - Delegation to service layer
 */

import type { Context } from "hono";
import * as AuthService from "../services/auth.service.js";
import {
  signupSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  verifyEmailSchema,
  verifyResetCodeSchema,
  refreshTokenSchema,
} from "../validators/authValidators.js";
import {
  checkRateLimit,
  recordFailedAttempt,
  recordSuccessfulAttempt,
  getClientIP,
} from "../utils/rateLimiter.js";
import { getErrorMessage } from "../utils/getErrorMessage.js";

export class AuthController {
  /**
   * Registers a new user account
   *
   * @param c - Hono context
   * @returns User object and auth tokens
   */
  static async signup(c: Context) {
    try {
      const body = await c.req.json();
      const validatedData = signupSchema.parse(body);

      const result = await AuthService.signup(validatedData);

      return c.json(
        {
          success: true,
          message: "Account created successfully. Please verify your email.",
          data: {
            user: result.user,
            tokens: result.tokens,
          },
        },
        201
      );
    } catch (error) {
      if (error instanceof Error && error.name === "ZodError") {
        return c.json(
          {
            success: false,
            message: "Validation error",
            errors: error,
          },
          400
        );
      }

      const errorMessage = getErrorMessage(error);
      if (errorMessage.includes("already exists")) {
        return c.json(
          {
            success: false,
            message: errorMessage,
          },
          409
        );
      }

      // Generic error
      return c.json(
        {
          success: false,
          message: "Failed to create account",
          error: errorMessage,
        },
        500
      );
    }
  }

  /**
   * POST /api/auth/login
   * Authenticates a user with email and password
   * Implements both IP-based rate limiting and database-tracked account locking
   *
   * @param c - Hono context
   * @returns User object and auth tokens
   */
  static async login(c: Context) {
    try {
      const clientIP = getClientIP(c.req.raw.headers);

      const rateLimitCheck = checkRateLimit(clientIP);
      if (rateLimitCheck.isBlocked) {
        return c.json(
          {
            success: false,
            message: `Too many login attempts. Please try again in ${rateLimitCheck.remainingTime} seconds.`,
          },
          429
        );
      }

      const body = await c.req.json();
      const validatedData = loginSchema.parse(body);

      const result = await AuthService.login(validatedData);

      // Clear IP rate limiting on successful login
      recordSuccessfulAttempt(clientIP);

      return c.json({
        success: true,
        message: "Login successful",
        data: {
          user: result.user,
          tokens: result.tokens,
        },
      });
    } catch (error) {
      const clientIP = getClientIP(c.req.raw.headers);
      const rateLimitResult = recordFailedAttempt(clientIP);

      if (error instanceof Error && error.name === "ZodError") {
        return c.json(
          {
            success: false,
            message: "Validation error",
            errors: error,
          },
          400
        );
      }

      const errorMessage = getErrorMessage(error);

      if (rateLimitResult.isBlocked) {
        return c.json(
          {
            success: false,
            message: `Too many failed login attempts. Please try again in ${rateLimitResult.remainingTime} seconds.`,
          },
          429
        );
      }

      if (errorMessage.includes("Account temporarily locked")) {
        return c.json(
          {
            success: false,
            message: errorMessage,
          },
          423
        );
      }

      return c.json(
        {
          success: false,
          message: errorMessage,
        },
        401
      );
    }
  }

  /**
   * POST /api/auth/verify-email
   * Verifies user's email using the token sent to their email
   *
   * @param c - Hono context
   * @returns Success message
   */
  static async verifyEmail(c: Context) {
    try {
      const body = await c.req.json();
      const { token } = verifyEmailSchema.parse(body);

      const result = await AuthService.verifyEmail(token);

      return c.json({
        success: true,
        message: result.message,
      });
    } catch (error) {
      if (error instanceof Error && error.name === "ZodError") {
        return c.json(
          {
            success: false,
            message: "Validation error",
            errors: error,
          },
          400
        );
      }

      return c.json(
        {
          success: false,
          message: getErrorMessage(error),
        },
        400
      );
    }
  }

  /**
   * POST /api/auth/resend-verification
   * Resends email verification token
   *
   * @param c - Hono context
   * @returns Success message
   */
  static async resendVerification(c: Context) {
    try {
      const body = await c.req.json();
      const { email } = forgotPasswordSchema.parse(body);

      const result = await AuthService.resendVerificationEmail(email);

      return c.json({
        success: true,
        message: result.message,
      });
    } catch (error) {
      if (error instanceof Error && error.name === "ZodError") {
        return c.json(
          {
            success: false,
            message: "Validation error",
            errors: error,
          },
          400
        );
      }

      return c.json(
        {
          success: false,
          message: getErrorMessage(error),
        },
        400
      );
    }
  }

  /**
   * POST /api/auth/forgot-password
   * Initiates password reset process
   *
   * @param c - Hono context
   * @returns Success message and requestId
   */
  static async forgotPassword(c: Context) {
    try {
      const body = await c.req.json();
      const { email } = forgotPasswordSchema.parse(body);

      const result = await AuthService.forgotPassword(email);

      return c.json({
        success: true,
        message: result.message,
        data: {
          requestId: result.requestId,
        },
      });
    } catch (error) {
      if (error instanceof Error && error.name === "ZodError") {
        return c.json(
          {
            success: false,
            message: "Validation error",
            errors: error,
          },
          400
        );
      }

      return c.json({
        success: true,
        message: "Verification code sent.",
        data: {
          requestId: "00000000-0000-0000-0000-000000000000",
        },
      });
    }
  }

  /**
   * POST /api/auth/verify-reset-code
   * Verifies the 6-digit reset code and generates reset token
   *
   * @param c - Hono context
   * @returns Success message and resetToken
   */
  static async verifyResetCode(c: Context) {
    try {
      const body = await c.req.json();
      const { requestId, code } = verifyResetCodeSchema.parse(body);

      const result = await AuthService.verifyResetCode(requestId, code);

      return c.json({
        success: true,
        message: result.message,
        data: {
          resetToken: result.resetToken,
        },
      });
    } catch (error) {
      if (error instanceof Error && error.name === "ZodError") {
        return c.json(
          {
            success: false,
            message: "Validation error",
            errors: error,
          },
          400
        );
      }

      return c.json(
        {
          success: false,
          message: getErrorMessage(error),
        },
        400
      );
    }
  }

  /**
   * POST /api/auth/reset-password
   * Resets user's password using reset token
   *
   * @param c - Hono context
   * @returns Success message
   */
  static async resetPassword(c: Context) {
    try {
      const body = await c.req.json();
      const { resetToken, newPassword } = resetPasswordSchema.parse(body);

      const result = await AuthService.resetPassword(resetToken, newPassword);

      return c.json({
        success: true,
        message: result.message,
      });
    } catch (error) {
      if (error instanceof Error && error.name === "ZodError") {
        return c.json(
          {
            success: false,
            message: "Validation error",
            errors: error,
          },
          400
        );
      }

      return c.json(
        {
          success: false,
          message: getErrorMessage(error),
        },
        400
      );
    }
  }

  /**
   * POST /api/auth/refresh
   * Refreshes access token using refresh token
   *
   * @param c - Hono context
   * @returns New auth tokens
   */
  static async refreshToken(c: Context) {
    try {
      const body = await c.req.json();
      const { refreshToken } = refreshTokenSchema.parse(body);

      const tokens = await AuthService.refreshAccessToken(refreshToken);

      return c.json({
        success: true,
        message: "Token refreshed successfully",
        data: { tokens },
      });
    } catch (error) {
      if (error instanceof Error && error.name === "ZodError") {
        return c.json(
          {
            success: false,
            message: "Validation error",
            errors: error,
          },
          400
        );
      }

      return c.json(
        {
          success: false,
          message: getErrorMessage(error),
        },
        401
      );
    }
  }

  /**
   * GET /api/auth/me
   * Gets current authenticated user's profile
   * Requires authentication middleware
   *
   * @param c - Hono context (with user set by auth middleware)
   * @returns User object
   */
  static async getCurrentUser(c: Context) {
    try {
      const userId = c.get("userId");

      if (!userId) {
        return c.json(
          {
            success: false,
            message: "Unauthorized",
          },
          401
        );
      }

      const user = await AuthService.getUserById(userId);

      return c.json({
        success: true,
        data: { user },
      });
    } catch (error) {
      return c.json(
        {
          success: false,
          message: getErrorMessage(error),
        },
        500
      );
    }
  }

  /**
   * POST /api/auth/logout
   * Logs out the current user
   *
   * Note: Since we're using stateless JWT, actual logout is handled client-side
   * by removing the tokens. This endpoint is here for completeness and could
   * be used to implement token blacklisting if needed.
   *
   * @param c - Hono context
   * @returns Success message
   */
  static async logout(c: Context) {
    return c.json({
      success: true,
      message: "Logged out successfully",
    });
  }
}

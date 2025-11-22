/**
 * Authentication Routes
 *
 * Defines all authentication-related endpoints:
 * - POST /signup - Register new user
 * - POST /login - Authenticate user
 * - POST /verify-email - Verify email address
 * - POST /resend-verification - Resend verification email
 * - POST /forgot-password - Initiate password reset
 * - POST /reset-password - Complete password reset
 * - POST /refresh - Refresh access token
 * - GET /me - Get current user profile (protected)
 * - POST /logout - Logout user
 *
 * Security measures:
 * - Rate limiting on login endpoint
 * - Input validation via Zod
 * - JWT authentication on protected routes
 */

import { Hono } from "hono";
import { AuthController } from "../controllers/auth.controller.js";
import { authenticate } from "../middleware/auth.middleware.js";

const auth = new Hono();

// Public routes
auth.post("/signup", AuthController.signup);
auth.post("/login", AuthController.login);
auth.post("/verify-email", AuthController.verifyEmail);
auth.post("/resend-verification", AuthController.resendVerification);
auth.post("/forgot-password", AuthController.forgotPassword);
auth.post("/verify-reset-code", AuthController.verifyResetCode);
auth.post("/reset-password", AuthController.resetPassword);
auth.post("/refresh", AuthController.refreshToken);

// Protected routes
auth.get("/me", authenticate, AuthController.getCurrentUser);

export default auth;

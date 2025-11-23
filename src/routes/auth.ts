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

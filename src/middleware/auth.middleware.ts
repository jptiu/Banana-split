/**
 * Authentication Middleware
 *
 * Provides middleware functions for:
 * - JWT token verification
 * - Role-based access control (RBAC)
 * - Request authorization
 *
 * Security features:
 * - Validates JWT tokens on protected routes
 * - Enforces role-based permissions
 * - Attaches user context to requests
 * - Prevents unauthorized access
 */

import type { Context, Next } from "hono";
import { verifyAccessToken, extractBearerToken } from "../utils/jwt.js";
import type { UserRole } from "../types/auth.types.js";

/**
 * Authentication middleware
 * Verifies JWT token and attaches user info to context
 */
export async function authenticate(c: Context, next: Next) {
  try {
    // Extract token from Authorization header
    const authHeader = c.req.header("Authorization");
    const token = extractBearerToken(authHeader);

    // Verify token and extract payload
    const payload = verifyAccessToken(token);

    // Attach user info to context for use in route handlers
    c.set("userName", payload.name);
    c.set("userId", payload.userId);
    c.set("userEmail", payload.email);
    c.set("userRole", payload.role);
    c.set("isAuthenticated", true);

    await next();
  } catch (error) {
    return c.json(
      {
        success: false,
        message:
          error instanceof Error ? error.message : "Authentication failed",
      },
      401
    );
  }
}

/**
 * Optional authentication middleware
 * Verifies JWT token if present, but doesn't require it
 * Useful for routes that have different behavior for authenticated vs unauthenticated users
 *
 * Usage:
 * app.get('/public-or-private', optionalAuthenticate, (c) => {
 *   const isAuth = c.get('isAuthenticated');
 *   // Return different data based on authentication status
 * })
 *
 * @param c - Hono context
 * @param next - Next middleware function
 */
export async function optionalAuthenticate(c: Context, next: Next) {
  try {
    const authHeader = c.req.header("Authorization");

    // If no auth header, just continue without authentication
    if (!authHeader) {
      c.set("isAuthenticated", false);
      await next();
      return;
    }

    const token = extractBearerToken(authHeader);
    const payload = verifyAccessToken(token);

    // Attach user info to context
    c.set("userName", payload.name);
    c.set("userId", payload.userId);
    c.set("userEmail", payload.email);
    c.set("userRole", payload.role);
    c.set("isAdmin", payload.is_admin);
    c.set("isAuthenticated", true);

    await next();
  } catch (error) {
    // If token is invalid, continue without authentication
    c.set("isAuthenticated", false);
    await next();
  }
}

/**
 * Role-based access control middleware factory
 * Creates middleware that restricts access to specific roles
 *
 * Usage:
 * app.get('/admin-only', authenticate, requireRole('admin'), (c) => { ... })
 * app.get('/admin-or-moderator', authenticate, requireRole(['admin', 'moderator']), (c) => { ... })
 *
 * @param allowedRoles - Single role or array of roles that are allowed
 * @returns Middleware function
 */
export function requireRole(allowedRoles: UserRole | UserRole[]) {
  const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];

  return async (c: Context, next: Next) => {
    try {
      // Get user role from context (set by authenticate middleware)
      const userRole = c.get("userRole") as UserRole;

      // Check if user's role is in allowed roles
      if (!roles.includes(userRole)) {
        return c.json(
          {
            success: false,
            message: "Insufficient permissions",
          },
          403
        );
      }

      await next();
    } catch (error) {
      return c.json(
        {
          success: false,
          message: "Authorization failed",
        },
        403
      );
    }
  };
}

/**
 * Email verification middleware
 * Ensures user has verified their email
 * Must be used after authenticate middleware
 *
 * Usage:
 * app.post('/sensitive-action', authenticate, requireEmailVerification, (c) => { ... })
 *
 * Note: This requires fetching user from database. For performance-critical routes,
 * consider including email verification status in JWT payload instead.
 *
 * @param c - Hono context
 * @param next - Next middleware function
 */
export async function requireEmailVerification(c: Context, next: Next) {
  try {
    const userId = c.get("userId");

    if (!userId) {
      return c.json(
        {
          success: false,
          message: "Authentication required",
        },
        401
      );
    }

    // Import here to avoid circular dependency
    const { getUserById } = await import("../services/auth.service.js");
    const user = await getUserById(userId);

    if (!user.is_email_verified) {
      return c.json(
        {
          success: false,
          message: "Email verification required",
        },
        403
      );
    }

    await next();
  } catch (error) {
    return c.json(
      {
        success: false,
        message: "Email verification check failed",
      },
      500
    );
  }
}

/**
 * Self-or-admin middleware
 * Allows access if user is accessing their own resource or is an admin
 * Useful for profile endpoints where users can manage their own data
 *
 * Usage:
 * app.get('/users/:id', authenticate, requireSelfOrAdmin('id'), (c) => { ... })
 *
 * @param paramName - Name of the route parameter containing the user ID
 * @returns Middleware function
 */
export function requireSelfOrAdmin(paramName: string = "id") {
  return async (c: Context, next: Next) => {
    try {
      const userId = c.get("userId");
      const admin = c.get("isAdmin");
      const targetUserId = c.req.param(paramName);

      if (!userId) {
        return c.json(
          {
            success: false,
            message: "Authentication required",
          },
          401
        );
      }

      // Allow if user is admin or accessing their own resource
      if (admin || userId === targetUserId) {
        await next();
        return;
      }

      return c.json(
        {
          success: false,
          message: "Insufficient permissions",
        },
        403
      );
    } catch (error) {
      return c.json(
        {
          success: false,
          message: "Authorization failed",
        },
        403
      );
    }
  };
}

/**
 * HTTPS enforcement middleware
 * Ensures requests are made over HTTPS in production
 *
 * Usage:
 * app.use('*', enforceHTTPS)
 *
 * @param c - Hono context
 * @param next - Next middleware function
 */
export async function enforceHTTPS(c: Context, next: Next) {
  // Skip in development
  if (process.env.APP_ENV !== "production") {
    await next();
    return;
  }

  const proto =
    c.req.header("x-forwarded-proto") ||
    c.req.header("x-scheme") ||
    (c.req.url.startsWith("https") ? "https" : "http");

  if (proto !== "https") {
    return c.json(
      {
        success: false,
        message: "HTTPS required",
      },
      400
    );
  }

  await next();
}

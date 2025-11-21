/**
 * Rate Limiter Utility
 *
 * Implements in-memory rate limiting to protect against brute-force attacks.
 * Tracks login attempts per IP address and blocks excessive attempts.
 *
 * Security considerations:
 * - Prevents brute-force password attacks by limiting login attempts
 * - Uses sliding window approach to track attempts
 * - Implements exponential backoff after multiple failures
 * - Cleans up old entries to prevent memory leaks
 *
 * Production considerations:
 * - For production with multiple servers, use Redis for distributed rate limiting
 * - This in-memory implementation works for single-server deployments
 */

import type { RateLimitEntry } from "../types/auth.types.js";

/**
 * Rate limiting configuration
 */
const RATE_LIMIT_WINDOW = 15 * 60 * 1000; // 15 minutes in milliseconds
const MAX_ATTEMPTS = 5; // Maximum login attempts per window
const BLOCK_DURATION = 30 * 60 * 1000; // 30 minutes block after exceeding limit
const CLEANUP_INTERVAL = 60 * 60 * 1000; // Clean up old entries every hour

/**
 * In-memory storage for rate limiting
 * Key: IP address or identifier
 * Value: Rate limit entry with attempt count and timestamps
 */
const rateLimitStore = new Map<string, RateLimitEntry>();

/**
 * Periodically cleanup expired entries to prevent memory leaks
 */
let cleanupTimer: NodeJS.Timeout | null = null;

function startCleanupTimer(): void {
  if (cleanupTimer) return;

  cleanupTimer = setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of rateLimitStore.entries()) {
      // Remove entries older than rate limit window and not currently blocked
      if (!entry.blockedUntil && now - entry.firstAttempt > RATE_LIMIT_WINDOW) {
        rateLimitStore.delete(key);
      }
      // Remove entries where block has expired
      else if (entry.blockedUntil && now > entry.blockedUntil) {
        rateLimitStore.delete(key);
      }
    }
  }, CLEANUP_INTERVAL);

  // Prevent the timer from keeping the process alive
  cleanupTimer.unref();
}

// Start cleanup on module load
startCleanupTimer();

/**
 * Checks if an identifier (e.g., IP address) is currently rate limited
 *
 * @param identifier - Unique identifier to check (typically IP address)
 * @returns Object with isBlocked status and remaining time if blocked
 */
export function checkRateLimit(identifier: string): {
  isBlocked: boolean;
  remainingTime?: number;
  attemptsRemaining?: number;
} {
  const now = Date.now();
  const entry = rateLimitStore.get(identifier);

  // No entry exists, user is not blocked
  if (!entry) {
    return { isBlocked: false, attemptsRemaining: MAX_ATTEMPTS };
  }

  // Check if user is currently blocked
  if (entry.blockedUntil) {
    if (now < entry.blockedUntil) {
      const remainingTime = Math.ceil((entry.blockedUntil - now) / 1000);
      return { isBlocked: true, remainingTime };
    } else {
      // Block period expired, remove entry
      rateLimitStore.delete(identifier);
      return { isBlocked: false, attemptsRemaining: MAX_ATTEMPTS };
    }
  }

  // Check if rate limit window has expired
  if (now - entry.firstAttempt > RATE_LIMIT_WINDOW) {
    // Window expired, reset the entry
    rateLimitStore.delete(identifier);
    return { isBlocked: false, attemptsRemaining: MAX_ATTEMPTS };
  }

  // Within window, check attempt count
  const attemptsRemaining = Math.max(0, MAX_ATTEMPTS - entry.attempts);
  return { isBlocked: false, attemptsRemaining };
}

/**
 * Records a failed login attempt for rate limiting
 *
 * @param identifier - Unique identifier (typically IP address)
 * @returns Object indicating if the identifier is now blocked
 */
export function recordFailedAttempt(identifier: string): {
  isBlocked: boolean;
  remainingTime?: number;
  attemptsRemaining: number;
} {
  const now = Date.now();
  const entry = rateLimitStore.get(identifier);

  if (!entry) {
    // First failed attempt
    rateLimitStore.set(identifier, {
      attempts: 1,
      firstAttempt: now,
    });
    return { isBlocked: false, attemptsRemaining: MAX_ATTEMPTS - 1 };
  }

  // Check if we should reset the window
  if (now - entry.firstAttempt > RATE_LIMIT_WINDOW) {
    rateLimitStore.set(identifier, {
      attempts: 1,
      firstAttempt: now,
    });
    return { isBlocked: false, attemptsRemaining: MAX_ATTEMPTS - 1 };
  }

  // Increment attempts
  entry.attempts += 1;

  // Check if limit exceeded
  if (entry.attempts >= MAX_ATTEMPTS) {
    entry.blockedUntil = now + BLOCK_DURATION;
    const remainingTime = Math.ceil(BLOCK_DURATION / 1000);
    return { isBlocked: true, remainingTime, attemptsRemaining: 0 };
  }

  const attemptsRemaining = MAX_ATTEMPTS - entry.attempts;
  return { isBlocked: false, attemptsRemaining };
}

/**
 * Records a successful login, resetting the rate limit for the identifier
 *
 * @param identifier - Unique identifier (typically IP address)
 */
export function recordSuccessfulAttempt(identifier: string): void {
  rateLimitStore.delete(identifier);
}

/**
 * Manually blocks an identifier (e.g., for suspicious activity)
 *
 * @param identifier - Unique identifier to block
 * @param duration - Block duration in milliseconds (default: BLOCK_DURATION)
 */
export function blockIdentifier(
  identifier: string,
  duration: number = BLOCK_DURATION
): void {
  const now = Date.now();
  rateLimitStore.set(identifier, {
    attempts: MAX_ATTEMPTS,
    firstAttempt: now,
    blockedUntil: now + duration,
  });
}

/**
 * Removes rate limiting for an identifier (e.g., for administrative override)
 *
 * @param identifier - Unique identifier to unblock
 */
export function unblockIdentifier(identifier: string): void {
  rateLimitStore.delete(identifier);
}

/**
 * Gets the client IP address from request headers
 * Handles proxies and load balancers
 *
 * @param headers - Request headers object
 * @returns IP address string
 */
export function getClientIP(
  headers: Headers | Record<string, string | undefined>
): string {
  // Check various headers that might contain the real IP
  const forwardedFor =
    headers instanceof Headers
      ? headers.get("x-forwarded-for")
      : headers["x-forwarded-for"];

  if (forwardedFor) {
    // X-Forwarded-For can contain multiple IPs, take the first one
    return forwardedFor.split(",")[0].trim();
  }

  const realIP =
    headers instanceof Headers
      ? headers.get("x-real-ip")
      : headers["x-real-ip"];

  if (realIP) {
    return realIP;
  }

  // Fallback to a default value
  return "unknown";
}

/**
 * Cleanup function to stop the cleanup timer
 * Useful for testing or graceful shutdown
 */
export function stopCleanupTimer(): void {
  if (cleanupTimer) {
    clearInterval(cleanupTimer);
    cleanupTimer = null;
  }
}

/**
 * Clears all rate limiting data
 * Useful for testing
 */
export function clearAllRateLimits(): void {
  rateLimitStore.clear();
}

/**
 * Gets current rate limiting statistics
 * Useful for monitoring and debugging
 */
export function getRateLimitStats(): {
  totalEntries: number;
  blockedCount: number;
} {
  const now = Date.now();
  let blockedCount = 0;

  for (const entry of rateLimitStore.values()) {
    if (entry.blockedUntil && now < entry.blockedUntil) {
      blockedCount++;
    }
  }

  return {
    totalEntries: rateLimitStore.size,
    blockedCount,
  };
}

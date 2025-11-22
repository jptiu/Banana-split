# Authentication Module Documentation

## Overview

This is a production-ready authentication system for the Banana Split API, built with TypeScript, Hono, and PostgreSQL. It implements industry-standard security practices including JWT-based authentication, password hashing, rate limiting, and role-based access control.

## Architecture

### Components

1. **Controllers** (`src/controllers/auth.controller.ts`)

   - Handle HTTP requests and responses
   - Validate input using Zod schemas
   - Delegate business logic to services
   - Implement rate limiting on sensitive endpoints

2. **Services** (`src/services/auth.service.ts`)

   - Contains all authentication business logic
   - Password hashing with bcrypt (10 rounds)
   - JWT token generation and refresh
   - Email verification and password reset flows
   - Database operations with parameterized queries

3. **Middleware** (`src/middleware/auth.middleware.ts`)

   - JWT token verification
   - Role-based access control (RBAC)
   - Optional authentication
   - HTTPS enforcement

4. **Utilities**

   - `src/utils/jwt.ts` - JWT generation, verification, and token management
   - `src/utils/rateLimiter.ts` - In-memory rate limiting for brute-force protection

5. **Validators** (`src/validators/authValidators.ts`)

   - Zod schemas for input validation
   - Password strength requirements
   - Email format validation

6. **Types** (`src/types/auth.types.ts`)
   - TypeScript interfaces and types
   - Type safety across the authentication module

## Security Features

### 1. Password Security

- **bcrypt hashing** with 10 salt rounds
- Password never stored or returned in plain text
- Minimum 8 characters with complexity requirements:
  - At least one uppercase letter
  - At least one lowercase letter
  - At least one number

### 2. JWT Token Management

- **Short-lived access tokens** (15 minutes) - minimize exposure window
- **Longer-lived refresh tokens** (7 days) - reduce re-authentication
- Separate secrets for access and refresh tokens
- Tokens include user ID, email, and role
- Issuer and audience validation

### 3. Rate Limiting

- Login endpoint protected against brute-force attacks
- 5 failed attempts per IP within 15 minutes triggers 30-minute block
- Automatic cleanup of old entries
- Client receives feedback on remaining attempts

### 4. Email Verification

- Secure random token generation (64 characters)
- 24-hour expiration for verification tokens
- Token invalidated after use

### 5. Password Reset

- Three-step verification process for enhanced security
- 6-digit verification code with 10-minute expiration
- UUID-based request tracking
- Brute-force protection (max 5 attempts)
- 30-minute account lockout after failed attempts
- Short-lived reset token (15 minutes) after code verification
- Generic success messages to prevent user enumeration
- All reset tokens invalidated after password change

### 6. Role-Based Access Control

- User and admin roles
- Middleware for role verification
- Self-or-admin access patterns
- Email verification requirements

### 7. Input Validation

- Zod schemas validate all inputs
- SQL injection prevention via parameterized queries
- XSS prevention through input sanitization

### 8. HTTPS Enforcement

- Middleware to enforce HTTPS in production
- Checks X-Forwarded-Proto header for proxy support

## API Endpoints

### Public Endpoints

#### POST `/api/auth/signup`

Register a new user account.

**Request:**

```json
{
  "first_name": "John",
  "last_name": "Doe",
  "email": "john@example.com",
  "password": "SecurePass123"
}
```

**Response (201):**

```json
{
  "success": true,
  "message": "Account created successfully. Please verify your email.",
  "data": {
    "user": {
      "id": "uuid",
      "first_name": "John",
      "last_name": "Doe",
      "email": "john@example.com",
      "is_email_verified": false,
      "role": "user",
      "last_login_at": null,
      "created_at": "2025-11-21T..."
    },
    "tokens": {
      "accessToken": "eyJhbGc...",
      "refreshToken": "eyJhbGc..."
    }
  }
}
```

#### POST `/api/auth/login`

Authenticate a user (rate-limited).

**Request:**

```json
{
  "email": "john@example.com",
  "password": "SecurePass123"
}
```

**Response (200):**

```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": { ... },
    "tokens": {
      "accessToken": "eyJhbGc...",
      "refreshToken": "eyJhbGc..."
    }
  }
}
```

**Rate Limit Response (429):**

```json
{
  "success": false,
  "message": "Too many failed login attempts. Account temporarily locked for 1800 seconds."
}
```

#### POST `/api/auth/verify-email`

Verify user's email address.

**Request:**

```json
{
  "token": "verification-token-from-email"
}
```

**Response (200):**

```json
{
  "success": true,
  "message": "Email verified successfully"
}
```

#### POST `/api/auth/resend-verification`

Resend email verification token.

**Request:**

```json
{
  "email": "john@example.com"
}
```

#### POST `/api/auth/forgot-password`

Initiate password reset process by requesting a 6-digit verification code.

**Request:**

```json
{
  "email": "john@example.com"
}
```

**Response (200):**

```json
{
  "success": true,
  "message": "Verification code sent.",
  "data": {
    "requestId": "550e8400-e29b-41d4-a716-446655440000"
  }
}
```

**Notes:**

- A 6-digit code is sent to the email address if the account exists
- The `requestId` is required for the next step (code verification)
- Code expires in 10 minutes
- Generic response prevents user enumeration

#### POST `/api/auth/verify-reset-code`

Verify the 6-digit code and receive a reset token.

**Request:**

```json
{
  "requestId": "550e8400-e29b-41d4-a716-446655440000",
  "code": "123456"
}
```

**Response (200):**

```json
{
  "success": true,
  "message": "Code verified.",
  "data": {
    "resetToken": "7c9e6679-7425-40de-944b-e07fc1f90ae7"
  }
}
```

**Error Response (400) - Invalid Code:**

```json
{
  "success": false,
  "message": "Invalid verification code. 3 attempts remaining."
}
```

**Error Response (400) - Account Locked:**

```json
{
  "success": false,
  "message": "Too many failed attempts. Your account has been temporarily locked for 30 minutes."
}
```

**Notes:**

- Maximum 5 verification attempts allowed
- Account is locked for 30 minutes after 5 failed attempts
- Code must be verified within 10 minutes of request
- Reset token is valid for 15 minutes

#### POST `/api/auth/reset-password`

Reset password using the reset token from code verification.

**Request:**

```json
{
  "resetToken": "7c9e6679-7425-40de-944b-e07fc1f90ae7",
  "newPassword": "NewSecurePass123"
}
```

**Response (200):**

```json
{
  "success": true,
  "message": "Password updated successfully."
}
```

**Notes:**

- Reset token must be used within 15 minutes
- Password must meet security requirements (8+ chars, uppercase, lowercase, number)
- All reset tokens and codes are invalidated after successful password change
- Confirmation email is sent to the user

#### POST `/api/auth/refresh`

Refresh access token.

**Request:**

```json
{
  "refreshToken": "eyJhbGc..."
}
```

**Response (200):**

```json
{
  "success": true,
  "message": "Token refreshed successfully",
  "data": {
    "tokens": {
      "accessToken": "new-access-token",
      "refreshToken": "new-refresh-token"
    }
  }
}
```

### Protected Endpoints

#### GET `/api/auth/me`

Get current authenticated user's profile.

**Headers:**

```
Authorization: Bearer <access-token>
```

**Response (200):**

```json
{
  "success": true,
  "data": {
    "user": {
      "id": "uuid",
      "first_name": "John",
      "last_name": "Doe",
      "email": "john@example.com",
      "is_email_verified": true,
      "role": "user",
      "last_login_at": "2025-11-21T...",
      "created_at": "2025-11-20T..."
    }
  }
}
```

#### POST `/api/auth/logout`

Logout current user (client-side token removal).

**Headers:**

```
Authorization: Bearer <access-token>
```

## Middleware Usage

### Basic Authentication

```typescript
import { authenticate } from "./middleware/auth.middleware.js";

// Protect a route
app.get("/protected", authenticate, async (c) => {
  const userId = c.get("userId");
  const userEmail = c.get("userEmail");
  const userRole = c.get("userRole");

  return c.json({ message: "Access granted", userId });
});
```

### Role-Based Access Control

```typescript
import {
  authenticate,
  requireRole,
  requireAdmin,
} from "./middleware/auth.middleware.js";

// Admin-only route
app.get("/admin/dashboard", authenticate, requireAdmin, async (c) => {
  return c.json({ message: "Admin dashboard" });
});

// Multiple roles
app.get(
  "/moderator",
  authenticate,
  requireRole(["admin", "moderator"]),
  async (c) => {
    return c.json({ message: "Moderator access" });
  }
);
```

### Self-or-Admin Pattern

```typescript
import {
  authenticate,
  requireSelfOrAdmin,
} from "./middleware/auth.middleware.js";

// User can access their own profile, admin can access any
app.get("/users/:id", authenticate, requireSelfOrAdmin("id"), async (c) => {
  const userId = c.req.param("id");
  // Fetch and return user data
});
```

### Optional Authentication

```typescript
import { optionalAuthenticate } from "./middleware/auth.middleware.js";

// Different behavior for authenticated vs unauthenticated users
app.get("/public-data", optionalAuthenticate, async (c) => {
  const isAuth = c.get("isAuthenticated");

  if (isAuth) {
    // Return personalized data
  } else {
    // Return public data
  }
});
```

### Email Verification Required

```typescript
import {
  authenticate,
  requireEmailVerification,
} from "./middleware/auth.middleware.js";

app.post(
  "/sensitive-action",
  authenticate,
  requireEmailVerification,
  async (c) => {
    // Only verified users can access
  }
);
```

## Environment Configuration

### Required Environment Variables

```bash
# Generate secure secrets (run in terminal):
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"

# Add to .env file:
JWT_ACCESS_SECRET=<64-character-random-string>
JWT_REFRESH_SECRET=<64-character-random-string>
APP_ENV=production  # Enable HTTPS enforcement
```

### Security Checklist

- [ ] Generate strong JWT secrets (64+ characters)
- [ ] Set `APP_ENV=production` for production
- [ ] Enable HTTPS on your server
- [ ] Keep `.env` file out of version control
- [ ] Rotate JWT secrets periodically
- [ ] Configure email service for verification/reset emails
- [ ] Review rate limiting thresholds for your use case
- [ ] Set up monitoring for failed login attempts
- [ ] Implement token blacklisting if needed
- [ ] Configure CORS appropriately

## Database Schema

The authentication system uses the following database tables:

### users table

```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  email VARCHAR(100) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  is_email_verified BOOLEAN DEFAULT FALSE,
  role user_role NOT NULL DEFAULT 'user',
  user_type user_type,
  email_verification_token VARCHAR(255),
  email_verification_expires TIMESTAMP,
  password_reset_token VARCHAR(255),
  password_reset_expires TIMESTAMP,
  password_reset_code VARCHAR(6),
  password_reset_request_id UUID,
  password_reset_attempts INTEGER DEFAULT 0,
  password_reset_locked_until TIMESTAMP,
  last_login_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TYPE user_role AS ENUM ('user', 'admin');
CREATE TYPE user_type AS ENUM ('creator', 'member');
CREATE INDEX idx_email_verification ON users(email_verification_token);
CREATE INDEX idx_password_reset ON users(password_reset_token);
CREATE INDEX idx_password_reset_request ON users(password_reset_request_id);
CREATE INDEX idx_password_reset_code ON users(password_reset_code);
```

Run migrations with:

```bash
npm run migrate:up
```

## Testing

### Manual Testing with cURL

```bash
# Signup
curl -X POST http://localhost:3000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"first_name":"John","last_name":"Doe","email":"john@example.com","password":"SecurePass123","user_type":"member"}'

# Login
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"john@example.com","password":"SecurePass123"}'

# Forgot Password (Step 1: Request code)
curl -X POST http://localhost:3000/api/auth/forgot-password \
  -H "Content-Type: application/json" \
  -d '{"email":"john@example.com"}'

# Verify Reset Code (Step 2: Verify code)
curl -X POST http://localhost:3000/api/auth/verify-reset-code \
  -H "Content-Type: application/json" \
  -d '{"requestId":"<requestId-from-step1>","code":"123456"}'

# Reset Password (Step 3: Set new password)
curl -X POST http://localhost:3000/api/auth/reset-password \
  -H "Content-Type: application/json" \
  -d '{"resetToken":"<resetToken-from-step2>","newPassword":"NewSecurePass123"}'

# Get current user (use token from login)
curl http://localhost:3000/api/auth/me \
  -H "Authorization: Bearer <your-access-token>"
```

## Production Considerations

### Rate Limiting

The current implementation uses in-memory storage, suitable for single-server deployments. For multi-server production:

1. Implement Redis-based rate limiting
2. Share rate limit state across instances
3. Consider using a reverse proxy (nginx) for rate limiting

### Token Storage

- **Access tokens**: Store in memory (JavaScript variable)
- **Refresh tokens**: Store in httpOnly cookies or secure storage
- Never store tokens in localStorage (XSS vulnerability)

### Email Service

Integrate an email service provider:

- SendGrid
- AWS SES
- Mailgun
- Postmark

Update `auth.service.ts` to uncomment and implement email sending.

### Token Blacklisting

For immediate token revocation (e.g., account compromise):

1. Store invalidated tokens in Redis with TTL
2. Check blacklist in authentication middleware
3. Clear on token expiration

### Monitoring

Set up monitoring for:

- Failed login attempts
- Rate limit triggers
- Password reset requests
- Email verification rates
- Token refresh patterns

## Troubleshooting

### "JWT secrets must be at least 32 characters"

Generate proper secrets using the crypto module or a password generator.

### "Too many login attempts"

User IP has exceeded rate limit. Wait 30 minutes or clear rate limits programmatically.

### "Invalid or expired token"

Token has expired or is malformed. Use refresh token to get a new access token.

### "Email verification required"

Route requires verified email. Complete email verification flow first.

## Future Enhancements

1. **Two-Factor Authentication (2FA)** - TOTP or SMS-based
2. **OAuth Integration** - Google, GitHub, etc.
3. **Session Management** - Active session tracking and revocation
4. **Password History** - Prevent password reuse
5. **Account Lockout** - Temporary account suspension after repeated failures
6. **Audit Logging** - Track all authentication events
7. **Biometric Authentication** - WebAuthn/FIDO2 support

## Support

For issues or questions, please refer to the codebase comments or contact the development team.

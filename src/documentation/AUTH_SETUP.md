# Authentication Module - Quick Start Guide

## Setup Instructions

### 1. Install Dependencies

All required dependencies are already in `package.json`:

- `bcrypt` - Password hashing
- `jsonwebtoken` - JWT token management
- `zod` - Input validation

If needed, run:

```bash
yarn install
```

### 2. Configure Environment Variables

Copy the example environment file and add your JWT secrets:

```bash
cp .env.example .env
```

Generate secure JWT secrets:

```bash
# Run this twice to generate two different secrets
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

Update your `.env` file with the generated secrets:

```env
JWT_ACCESS_SECRET=<paste-first-generated-secret-here>
JWT_REFRESH_SECRET=<paste-second-generated-secret-here>
```

### 3. Run Database Migrations

The authentication fields have already been added to the users table via migration:

```bash
npm run migrate:up
```

This migration creates:

- `role` enum type ('user' | 'admin')
- `email_verification_token` and expiration
- `password_reset_token` and expiration
- `last_login_at` timestamp
- Indexes for performance

### 4. Start the Server

```bash
npm run dev
```

The server will validate JWT configuration on startup. You should see:

```
✓ JWT configuration validated
Server running at http://localhost:3000
```

### 5. Test the Authentication System

#### Register a new user:

```bash
curl -X POST http://localhost:3000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "first_name": "John",
    "last_name": "Doe",
    "email": "john@example.com",
    "password": "SecurePass123"
  }'
```

You'll receive an access token and refresh token in the response.

#### Login:

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john@example.com",
    "password": "SecurePass123"
  }'
```

#### Get current user (protected route):

```bash
# Replace <YOUR_ACCESS_TOKEN> with the token from login/signup
curl http://localhost:3000/api/auth/me \
  -H "Authorization: Bearer <YOUR_ACCESS_TOKEN>"
```

## Available Endpoints

### Public Routes

- `POST /api/auth/signup` - Register new user
- `POST /api/auth/login` - Authenticate user (rate-limited)
- `POST /api/auth/verify-email` - Verify email with token
- `POST /api/auth/resend-verification` - Resend verification email
- `POST /api/auth/forgot-password` - Request password reset
- `POST /api/auth/reset-password` - Reset password with token
- `POST /api/auth/refresh` - Refresh access token

### Protected Routes (require JWT)

- `GET /api/auth/me` - Get current user profile
- `POST /api/auth/logout` - Logout (token cleanup client-side)

## Using Authentication Middleware

### Protect a route:

```typescript
import { authenticate } from "./middleware/auth.middleware.js";

app.get("/protected", authenticate, async (c) => {
  const userId = c.get("userId");
  return c.json({ message: "Protected data", userId });
});
```

### Admin-only route:

```typescript
import { authenticate, requireAdmin } from "./middleware/auth.middleware.js";

app.get("/admin", authenticate, requireAdmin, async (c) => {
  return c.json({ message: "Admin dashboard" });
});
```

### User or admin can access:

```typescript
import {
  authenticate,
  requireSelfOrAdmin,
} from "./middleware/auth.middleware.js";

app.get("/users/:id", authenticate, requireSelfOrAdmin("id"), async (c) => {
  const userId = c.req.param("id");
  // User can access their own data, admin can access any
});
```

## Security Features Implemented

✅ **Password Security**

- bcrypt hashing with 10 salt rounds
- Minimum 8 characters with uppercase, lowercase, and number

✅ **JWT Authentication**

- Short-lived access tokens (15 minutes)
- Longer-lived refresh tokens (7 days)
- Separate secrets for each token type

✅ **Rate Limiting**

- 5 failed login attempts per IP within 15 minutes
- 30-minute block after limit exceeded
- Client receives feedback on remaining attempts

✅ **Input Validation**

- Zod schemas validate all inputs
- Parameterized queries prevent SQL injection

✅ **Email Verification**

- Secure random tokens (64 characters)
- 24-hour expiration

✅ **Password Reset**

- Secure random tokens
- 1-hour expiration
- Generic messages prevent user enumeration

✅ **Role-Based Access Control**

- User and admin roles
- Flexible middleware for different access patterns

## Next Steps

1. **Configure Email Service** (Optional but recommended)

   - Set up SMTP credentials in `.env`
   - Implement email sending in `auth.service.ts`
   - Uncomment the email sending calls

2. **Update User Routes**

   - Apply authentication middleware to user endpoints
   - Implement role-based access as needed

3. **Frontend Integration**

   - Store access tokens in memory (not localStorage)
   - Store refresh tokens in httpOnly cookies
   - Implement token refresh logic
   - Handle 401 responses by refreshing token

4. **Production Deployment**
   - Set `APP_ENV=production`
   - Enable HTTPS
   - Use strong JWT secrets (64+ characters)
   - Consider Redis for rate limiting across servers

## Troubleshooting

**Server won't start:**

- Ensure JWT secrets are set in `.env`
- Secrets must be at least 32 characters

**Login returns 429:**

- Too many failed attempts, wait 30 minutes
- Or restart server to clear in-memory rate limits

**Token invalid:**

- Access token expired, use refresh token
- Check Authorization header format: `Bearer <token>`

## Documentation

See `AUTH_DOCUMENTATION.md` for complete API documentation and advanced usage.

## File Structure

```
src/
├── controllers/
│   └── auth.controller.ts      # HTTP request handlers
├── services/
│   └── auth.service.ts         # Business logic
├── middleware/
│   └── auth.middleware.ts      # JWT verification & RBAC
├── routes/
│   └── auth.ts                 # Route definitions
├── validators/
│   └── authValidators.ts       # Zod schemas
├── utils/
│   ├── jwt.ts                  # JWT utilities
│   └── rateLimiter.ts          # Rate limiting
└── types/
    └── auth.types.ts           # TypeScript types
```

# Email Service Setup Guide

This guide explains how email verification and password reset functionality works in the application.

## Overview

The authentication system includes:

- Email verification after signup
- Email verification requirement for login
- Password reset via email
- Password change confirmation emails

## Configuration

### Environment Variables

Add these to your `.env` file (see `.env.example` for reference):

```env
# Application URL (used in email links)
APP_URL=http://localhost:5173

# SMTP Configuration (Optional - if not set, emails will be logged to console)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASSWORD=your_email_password
EMAIL_FROM=noreply@banana-split.com
```

### Gmail Setup (for development)

If using Gmail for SMTP:

1. Enable 2-Factor Authentication on your Google account
2. Generate an App Password:
   - Go to Google Account Settings → Security
   - Under "2-Step Verification", click "App passwords"
   - Select "Mail" and your device
   - Use the generated 16-character password as `SMTP_PASSWORD`

## Email Workflows

### 1. User Signup

**Flow:**

```
POST /api/auth/signup
  ↓
User created in database (is_email_verified = false)
  ↓
Verification email sent with token
  ↓
User receives email with link: APP_URL/verify-email?token={token}
```

**API Response:**

```json
{
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "isEmailVerified": false
  },
  "tokens": {
    "accessToken": "...",
    "refreshToken": "..."
  }
}
```

### 2. Email Verification

**Flow:**

```
User clicks link in email → Frontend sends token to backend
  ↓
GET /api/auth/verify-email?token={token}
  ↓
Token validated and email marked as verified
  ↓
Success response
```

**Important:** Users cannot login until email is verified.

### 3. Login with Unverified Email

**Attempt:**

```
POST /api/auth/login
```

**Response (if email not verified):**

```json
{
  "success": false,
  "error": "Please verify your email address before logging in"
}
```

### 4. Resend Verification Email

**Endpoint:**

```
POST /api/auth/resend-verification
Body: { "email": "user@example.com" }
```

Generates new token and sends new verification email.

### 5. Forgot Password

**Flow:**

```
POST /api/auth/forgot-password
Body: { "email": "user@example.com" }
  ↓
Password reset email sent with token
  ↓
User receives email with link: APP_URL/change-pass?token={token}
  ↓
Frontend displays password reset form
```

**Security Note:** Always returns success message even if email doesn't exist (prevents user enumeration).

### 6. Reset Password

**Flow:**

```
User on /change-pass?token={token} page
  ↓
POST /api/auth/reset-password
Body: {
  "token": "...",
  "newPassword": "...",
  "confirmPassword": "..."
}
  ↓
Password updated in database
  ↓
Confirmation email sent to user
```

## Email Templates

All emails include both HTML and plain text versions for compatibility.

### Verification Email

**Subject:** Verify your email address

**Contains:**

- Personalized greeting with user's first name
- Verification link valid for 24 hours
- Instructions if user didn't sign up

### Password Reset Email

**Subject:** Reset your password

**Contains:**

- Personalized greeting
- Password reset link valid for 1 hour
- Security warning if user didn't request reset

### Password Changed Email

**Subject:** Your password has been changed

**Contains:**

- Confirmation that password was changed
- Security contact if user didn't make the change

## Testing Email Service

Run the test utility to verify SMTP configuration:

```typescript
import { testEmailConfiguration } from "./src/utils/email";

await testEmailConfiguration();
```

This will:

- Verify all required environment variables are set
- Test SMTP connection
- Report any configuration issues

## Graceful Degradation

If SMTP credentials are not configured:

- Application will NOT crash
- Email operations log to console instead
- Useful for development without email setup
- Warning logged: "Email service not fully configured"

## Security Considerations

1. **Token Expiry:**

   - Email verification tokens: 24 hours
   - Password reset tokens: 1 hour

2. **Token Invalidation:**

   - Tokens are single-use
   - Cleared from database after use
   - Cannot be reused

3. **User Enumeration Prevention:**

   - Generic error messages
   - Forgot password always returns success

4. **HTTPS Required:**
   - Use HTTPS in production for email links
   - Set `APP_URL=https://yourdomain.com` in production

## Frontend Integration

### Verify Email Page

```typescript
// /verify-email route
const urlParams = new URLSearchParams(window.location.search);
const token = urlParams.get("token");

if (token) {
  await fetch(`/api/auth/verify-email?token=${token}`);
  // Show success message and redirect to login
}
```

### Password Reset Page

```typescript
// /change-pass route
const urlParams = new URLSearchParams(window.location.search);
const token = urlParams.get("token");

const handleSubmit = async (e) => {
  e.preventDefault();
  const formData = new FormData(e.target);

  await fetch("/api/auth/reset-password", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      token,
      newPassword: formData.get("password"),
      confirmPassword: formData.get("confirmPassword"),
    }),
  });

  // Show success message and redirect to login
};
```

## Troubleshooting

### Emails Not Sending

1. Check SMTP credentials in `.env`
2. Verify SMTP port (usually 587 for TLS)
3. Check console for error messages
4. Test with `testEmailConfiguration()`

### Gmail "Less Secure App" Error

- Don't use "less secure apps" setting
- Use App Password (see Gmail Setup above)

### Verification Links Not Working

1. Verify `APP_URL` matches your frontend URL
2. Check token hasn't expired
3. Ensure frontend routes match (`/verify-email` and `/change-pass`)

### User Can't Login After Signup

- User must verify email first
- Check `is_email_verified` field in database
- Resend verification email if needed

## Production Checklist

- [ ] Set production `APP_URL` with HTTPS
- [ ] Configure production SMTP service (SendGrid, AWS SES, etc.)
- [ ] Use strong JWT secrets (not from `.env.example`)
- [ ] Set appropriate token expiry times
- [ ] Enable SMTP TLS/SSL
- [ ] Test all email workflows end-to-end
- [ ] Set up email monitoring/logging
- [ ] Configure SPF/DKIM/DMARC records for email domain

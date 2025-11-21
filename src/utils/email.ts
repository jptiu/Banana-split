import nodemailer from "nodemailer";

/**
 * Email Service Configuration
 *
 * Uses nodemailer to send transactional emails
 * Supports SMTP providers like Gmail, SendGrid, AWS SES, etc.
 */

// Email configuration from environment variables
const SMTP_HOST = process.env.SMTP_HOST || "smtp.gmail.com";
const SMTP_PORT = parseInt(process.env.SMTP_PORT || "587");
const SMTP_USER = process.env.SMTP_USER || "";
const SMTP_PASSWORD = process.env.SMTP_PASSWORD || "";
const EMAIL_FROM = process.env.EMAIL_FROM || "noreply@banana-split.com";
const APP_URL = process.env.APP_URL || "http://localhost:5173";

// Validate email configuration
if (!SMTP_USER || !SMTP_PASSWORD) {
  console.warn(
    "⚠️  Email service not configured. Set SMTP_USER and SMTP_PASSWORD in .env"
  );
}

/**
 * Create nodemailer transporter
 * Reusable SMTP transport instance
 */
const createTransporter = () => {
  return nodemailer.createTransport({
    host: SMTP_HOST,
    port: SMTP_PORT,
    secure: SMTP_PORT === 465, // true for 465, false for other ports
    auth: {
      user: SMTP_USER,
      pass: SMTP_PASSWORD,
    },
  });
};

/**
 * Send Email Verification
 *
 * Sends an email with a verification link to confirm user's email address
 * User must click the link to verify their account before logging in
 *
 * @param email - User's email address
 * @param firstName - User's first name for personalization
 * @param token - Verification token
 */
export const sendVerificationEmail = async (
  email: string,
  firstName: string,
  token: string
): Promise<void> => {
  try {
    if (!SMTP_USER || !SMTP_PASSWORD) {
      console.log("📧 Email verification would be sent to:", email);
      console.log("🔗 Verification token:", token);
      return; // Skip sending in development if not configured
    }

    const transporter = createTransporter();

    const verificationUrl = `${APP_URL}/verify-email?token=${token}`;

    const mailOptions = {
      from: `"Banana Splits" <${EMAIL_FROM}>`,
      to: email,
      subject: "Verify Your Email Address",
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #4CAF50; color: white; padding: 20px; text-align: center; }
            .content { background-color: #f9f9f9; padding: 30px; }
            .button { 
              display: inline-block; 
              padding: 12px 30px; 
              background-color: #4CAF50; 
              color: white; 
              text-decoration: none; 
              border-radius: 5px;
              margin: 20px 0;
            }
            .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
            .token { 
              background-color: #f0f0f0; 
              padding: 10px; 
              margin: 20px 0;
              border-left: 4px solid #4CAF50;
              font-family: monospace;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Welcome to Banana Splits! 🍌</h1>
            </div>
            <div class="content">
              <h2>Hi ${firstName},</h2>
              <p>Thank you for signing up! Please verify your email address to complete your registration and access your account.</p>
              
              <p>Click the button below to verify your email:</p>
              
              <div style="text-align: center;">
                <a href="${verificationUrl}" class="button">Verify Email Address</a>
              </div>
              
              <p><strong>This link will expire in 1 hour.</strong></p>
              
              <p>If you didn't create an account with Banana Splits, you can safely ignore this email.</p>
            </div>
            <div class="footer">
              <p>&copy; ${new Date().getFullYear()} Banana Splits. All rights reserved.</p>
              <p>This is an automated email, please do not reply.</p>
            </div>
          </div>
        </body>
        </html>
      `,
      text: `
        Hi ${firstName},

        Thank you for signing up! Please verify your email address to complete your registration.

        Verification Link: ${verificationUrl}

        This link will expire in 1 hour.

        If you didn't create an account with Banana Splits, you can safely ignore this email.

        © ${new Date().getFullYear()} Banana Splits. All rights reserved.
      `,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log("✅ Verification email sent:", info.messageId);
  } catch (error) {
    console.error("❌ Error sending verification email:", error);
    throw new Error("Failed to send verification email");
  }
};

/**
 * Send Password Reset Email
 *
 * Sends an email with a link to reset the user's password
 * Link contains a secure token that expires in 1 hour
 *
 * @param email - User's email address
 * @param firstName - User's first name for personalization
 * @param token - Password reset token
 */
export const sendPasswordResetEmail = async (
  email: string,
  firstName: string,
  token: string
): Promise<void> => {
  try {
    if (!SMTP_USER || !SMTP_PASSWORD) {
      console.log("📧 Password reset email would be sent to:", email);
      console.log("🔗 Reset token:", token);
      return; // Skip sending in development if not configured
    }

    const transporter = createTransporter();

    const resetUrl = `${APP_URL}/change-pass?token=${token}`;

    const mailOptions = {
      from: `"Banana Splits" <${EMAIL_FROM}>`,
      to: email,
      subject: "Reset Your Password",
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #FF9800; color: white; padding: 20px; text-align: center; }
            .content { background-color: #f9f9f9; padding: 30px; }
            .button { 
              display: inline-block; 
              padding: 12px 30px; 
              background-color: #FF9800; 
              color: white; 
              text-decoration: none; 
              border-radius: 5px;
              margin: 20px 0;
            }
            .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
            .token { 
              background-color: #f0f0f0; 
              padding: 10px; 
              margin: 20px 0;
              border-left: 4px solid #FF9800;
              font-family: monospace;
            }
            .warning { 
              background-color: #fff3cd; 
              border-left: 4px solid #ffc107; 
              padding: 15px; 
              margin: 20px 0; 
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Password Reset Request 🔒</h1>
            </div>
            <div class="content">
              <h2>Hi ${firstName},</h2>
              <p>We received a request to reset your password for your Banana Splits account.</p>
              
              <p>Click the button below to reset your password:</p>
              
              <div style="text-align: center;">
                <a href="${resetUrl}" class="button">Reset Password</a>
              </div>
              
              <div class="warning">
                <strong>⚠️ Security Notice:</strong>
                <ul style="margin: 10px 0;">
                  <li>This link will expire in 1 hour</li>
                  <li>You will need to provide a new password</li>
                  <li>Your new password must contain at least 8 characters, including uppercase, lowercase, and numbers</li>
                </ul>
              </div>
              
              <p><strong>If you didn't request a password reset, please ignore this email.</strong> Your password will remain unchanged.</p>
            </div>
            <div class="footer">
              <p>&copy; ${new Date().getFullYear()} Banana Splits. All rights reserved.</p>
              <p>This is an automated email, please do not reply.</p>
            </div>
          </div>
        </body>
        </html>
      `,
      text: `
        Hi ${firstName},

        We received a request to reset your password for your Banana Splits account.

        Reset Password Link: ${resetUrl}

        This link will expire in 1 hour.

        If you didn't request a password reset, please ignore this email. Your password will remain unchanged.

        © ${new Date().getFullYear()} Banana Splits. All rights reserved.
      `,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log("✅ Password reset email sent:", info.messageId);
  } catch (error) {
    console.error("❌ Error sending password reset email:", error);
    throw new Error("Failed to send password reset email");
  }
};

/**
 * Send Password Changed Confirmation Email
 *
 * Sends a confirmation email after successful password change
 * Helps users detect unauthorized password changes
 *
 * @param email - User's email address
 * @param firstName - User's first name for personalization
 */
export const sendPasswordChangedEmail = async (
  email: string,
  firstName: string
): Promise<void> => {
  try {
    if (!SMTP_USER || !SMTP_PASSWORD) {
      console.log("📧 Password changed confirmation would be sent to:", email);
      return;
    }

    const transporter = createTransporter();

    const mailOptions = {
      from: `"Banana Splits" <${EMAIL_FROM}>`,
      to: email,
      subject: "Your Password Has Been Changed",
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #4CAF50; color: white; padding: 20px; text-align: center; }
            .content { background-color: #f9f9f9; padding: 30px; }
            .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
            .alert { 
              background-color: #fff3cd; 
              border-left: 4px solid #ffc107; 
              padding: 15px; 
              margin: 20px 0; 
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Password Changed Successfully</h1>
            </div>
            <div class="content">
              <h2>Hi ${firstName},</h2>
              <p>This is to confirm that your password has been successfully changed.</p>
              
              <div class="alert">
                <strong>⚠️ Didn't make this change?</strong>
                <p>If you did not change your password, please contact our support team immediately at support@banana-split.com</p>
              </div>
              
              <p>For security reasons, we recommend:</p>
              <ul>
                <li>Use a unique password for your Banana Splits account</li>
                <li>Enable two-factor authentication if available</li>
                <li>Keep your password secure and don't share it with anyone</li>
              </ul>
            </div>
            <div class="footer">
              <p>&copy; ${new Date().getFullYear()} Banana Splits. All rights reserved.</p>
              <p>This is an automated email, please do not reply.</p>
            </div>
          </div>
        </body>
        </html>
      `,
      text: `
        Hi ${firstName},

        This is to confirm that your password has been successfully changed.

        If you did not make this change, please contact our support team immediately at support@banana-split.com

        © ${new Date().getFullYear()} Banana Splits. All rights reserved.
      `,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log("✅ Password changed confirmation sent:", info.messageId);
  } catch (error) {
    console.error("❌ Error sending password changed email:", error);
    // Don't throw error for confirmation emails
  }
};

/**
 * Test Email Configuration
 *
 * Sends a test email to verify SMTP configuration
 * Useful for debugging email setup
 */
export const testEmailConfiguration = async (): Promise<boolean> => {
  try {
    if (!SMTP_USER || !SMTP_PASSWORD) {
      console.error("Email configuration missing");
      return false;
    }

    const transporter = createTransporter();
    await transporter.verify();
    console.log("Email configuration is valid");
    return true;
  } catch (error) {
    console.error("Email configuration error:", error);
    return false;
  }
};

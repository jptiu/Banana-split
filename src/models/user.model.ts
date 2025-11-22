export interface User {
  id: string;
  group_id?: string;
  first_name?: string;
  last_name?: string;
  email: string;
  is_email_verified?: boolean;
  password: string;
  role?: string;
  user_type?: string;
  last_login_at?: Date;
  email_verification_token?: string | null;
  email_verification_expires?: Date | null;
  password_reset_code?: string | null;
  password_reset_request_id?: string | null;
  password_reset_expires?: Date | null;
  password_reset_attempts?: number;
  password_reset_locked_until?: Date | null;
  password_reset_token?: string | null;
  failed_login_attempts?: number;
  login_locked_until?: Date | null;
  last_failed_login_at?: Date | null;
  created_at: Date;
  updated_at?: Date;
}

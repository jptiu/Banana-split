export interface User {
  id: string;
  group_id?: string;
  first_name?: string;
  last_name?: string;
  email: string;
  is_email_verified?: boolean;
  password: string;
  created_at: Date;
}
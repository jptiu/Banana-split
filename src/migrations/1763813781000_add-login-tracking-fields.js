/**
 * Migration: Add login tracking fields
 * 
 * Adds columns to track failed login attempts and account locking:
 * - failed_login_attempts: Counter for consecutive failed attempts
 * - login_locked_until: Timestamp when account lock expires
 * - last_failed_login_at: Timestamp of most recent failed login
 */

export const up = async (pgm) => {
  pgm.addColumns('users', {
    failed_login_attempts: {
      type: 'INTEGER',
      default: 0,
    },
    login_locked_until: {
      type: 'TIMESTAMP',
    },
    last_failed_login_at: {
      type: 'TIMESTAMP',
    },
  });
};

export const down = async (pgm) => {
  pgm.dropColumns('users', [
    'failed_login_attempts',
    'login_locked_until',
    'last_failed_login_at'
  ]);
};

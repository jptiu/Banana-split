
/**
 * @type {import('node-pg-migrate').ColumnDefinitions | undefined}
 */
export const shorthands = undefined;

export const up = (pgm) => {
  // Add new columns for the updated password reset flow
  pgm.addColumns('users', {
    password_reset_code: {
      type: 'varchar(6)',
      notNull: false,
      comment: '6-digit verification code sent via email'
    },
    password_reset_request_id: {
      type: 'uuid',
      notNull: false,
      comment: 'UUID to track the password reset request'
    },
    password_reset_attempts: {
      type: 'integer',
      notNull: false,
      default: 0,
      comment: 'Number of failed verification attempts'
    },
    password_reset_locked_until: {
      type: 'timestamp',
      notNull: false,
      comment: 'Timestamp until which the reset is locked due to too many attempts'
    }
  });

  // Add indexes for the new fields to improve query performance
  pgm.createIndex('users', 'password_reset_request_id');
  pgm.createIndex('users', 'password_reset_code');
};

export const down = (pgm) => {
  // Drop indexes
  pgm.dropIndex('users', 'password_reset_code');
  pgm.dropIndex('users', 'password_reset_request_id');

  // Drop columns
  pgm.dropColumns('users', [
    'password_reset_code',
    'password_reset_request_id',
    'password_reset_attempts',
    'password_reset_locked_until'
  ]);
};

/**
 * @type {import('node-pg-migrate').ColumnDefinitions | undefined}
 */
export const shorthands = undefined;

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
export const up = (pgm) => {

  // Add email verification token fields
  pgm.addColumns('users', {
    email_verification_token: { type: 'varchar(255)', notNull: false },
    email_verification_expires: { type: 'timestamp', notNull: false },
    password_reset_token: { type: 'varchar(255)', notNull: false },
    password_reset_expires: { type: 'timestamp', notNull: false },
    last_login_at: { type: 'timestamp', notNull: false },
    updated_at: { type: 'timestamp', default: pgm.func('CURRENT_TIMESTAMP') }
  });

  // Create indexes for better performance
  pgm.createIndex('users', 'email_verification_token');
  pgm.createIndex('users', 'password_reset_token');
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
export const down = (pgm) => {
  pgm.dropIndex('users', 'password_reset_token');
  pgm.dropIndex('users', 'email_verification_token');
  
  pgm.dropColumns('users', [
    'email_verification_token',
    'email_verification_expires',
    'password_reset_token',
    'password_reset_expires',
    'last_login_at',
    'updated_at'
  ]);

  pgm.dropType('user_role');
};

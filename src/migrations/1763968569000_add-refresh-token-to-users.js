export const shorthands = undefined;

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
export const up = (pgm) => {
  // Add refresh token columns
  pgm.addColumns('users', {
    refresh_token: { type: 'text', notNull: false },
    refresh_token_expires: { type: 'timestamp', notNull: false }
  });

  // Create index for better performance on token lookups
  pgm.createIndex('users', 'refresh_token');
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
export const down = (pgm) => {
  pgm.dropIndex('users', 'refresh_token');

  pgm.dropColumns('users', [
    'refresh_token',
    'refresh_token_expires'
  ]);
};

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
  // Remove group_id column from users table
  pgm.dropColumns('users', ['group_id']);
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
export const down = (pgm) => {
  // Add back group_id column to users table
  pgm.addColumns('users', {
    group_id: {
      type: 'uuid',
      references: 'groups(id)',
      onDelete: 'SET NULL'
    }
  });
};

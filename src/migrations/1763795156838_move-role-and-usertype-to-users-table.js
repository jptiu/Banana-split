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
  // Add role and user_type columns to users table
  pgm.addColumns('users', {
    role: {
      type: 'user_role_enum',
      notNull: true,
      default: 'user'
    },
    user_type: {
      type: 'user_type_enum',
      notNull: false
    },
  });

  // Drop the user_role table
  pgm.dropTable('user_role');
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
export const down = (pgm) => {
  // Recreate user_role table
  pgm.createTable('user_role', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('uuid_generate_v4()') },
    user_id: {
      type: 'uuid',
      notNull: true,
      references: 'users(id)',
      onDelete: 'CASCADE'
    },
    role: { type: 'user_role_enum', notNull: true },
    user_type: { type: 'user_type_enum', notNull: false },
    created_at: { type: 'timestamp', default: pgm.func('CURRENT_TIMESTAMP') },
  });

  pgm.createIndex('user_role', 'user_id');

  // Remove role and user_type columns from users table
  pgm.dropColumns('users', ['role', 'user_type']);
};
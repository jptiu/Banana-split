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
  // Create ENUM types for role and userType
  pgm.createType('user_role_enum', ['admin', 'user'], { ifNotExists: true });
  pgm.createType('user_type_enum', ['creator', 'member'], { ifNotExists: true });

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
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
export const down = (pgm) => {
  pgm.dropTable('user_role');
  pgm.dropType('user_type_enum');
  pgm.dropType('user_role_enum');
};
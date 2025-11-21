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
  pgm.createTable('group_members', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('uuid_generate_v4()') },
    group_id: {
      type: 'uuid',
      notNull: true,
      references: 'groups(id)',
      onDelete: 'CASCADE'
    },
    user_id: {
      type: 'uuid',
      notNull: true,
      references: 'users(id)',
      onDelete: 'CASCADE'
    },
    role: { type: 'text', notNull: true },
    created_at: { type: 'timestamp', default: pgm.func('CURRENT_TIMESTAMP') },
  });

  pgm.createIndex('group_members', 'group_id');
  pgm.createIndex('group_members', 'user_id');

  // Add unique constraint to prevent duplicate memberships
  pgm.addConstraint('group_members', 'unique_group_user', {
    unique: ['group_id', 'user_id']
  });
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
export const down = (pgm) => {
  pgm.dropTable('group_members');
};

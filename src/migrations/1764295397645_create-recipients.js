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
    pgm.createTable('recipients', {
        id: { type: 'uuid', primaryKey: true, notNull: true, default: pgm.func('gen_random_uuid()') },
        split_id: { type: 'uuid', notNull: true, references: '"splits"(id)', onDelete: 'cascade' },
        user_id: { type: 'uuid', notNull: true, references: '"users"(id)', onDelete: 'cascade' },
        created_at: { type: 'timestamp', notNull: true, default: pgm.func('NOW()') },
    });

    pgm.addConstraint('recipients', 'recipients_split_user_unique', { unique: ['split_id', 'user_id'] });

    pgm.createIndex('recipients', 'split_id');
    pgm.createIndex('recipients', 'user_id')
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
export const down = (pgm) => {
    pgm.dropIndex('recipients', 'split_id');
    pgm.dropIndex('recipients', 'user_id');
    pgm.dropConstraint('recipients', 'recipients_split_user_unique');
    pgm.dropTable('recipients');
};

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
    pgm.createTable('splits', {
        id: { type: 'uuid', primaryKey: true, notNull: true, default: pgm.func('gen_random_uuid()') },
        linked_account_id: { type: 'uuid', notNull: true, references: '"linked_accounts"(id)', onDelete: 'cascade' },
        name: { type: 'text', notNull: true },
        start_date: { type: 'timestamp', notNull: false },
        active: { type: 'boolean', notNull: true, default: true },
        created_at: { type: 'timestamp', notNull: true, default: pgm.func('NOW()') },
    });

    pgm.createIndex('splits', 'linked_account_id');
    pgm.createIndex('splits', 'start_date');
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
export const down = (pgm) => {
    pgm.dropTable('splits');
};

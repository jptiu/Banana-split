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
    // Ensure UUID generation function is available
    pgm.createExtension('uuid-ossp', { ifNotExists: true });

    pgm.createTable('linked_accounts', {
        id: { type: 'uuid', primaryKey: true, notNull: true, default: pgm.func('uuid_generate_v4()') },
        user_id: { type: 'uuid', notNull: true, references: '"users"(id)', onDelete: 'cascade' },
        bank_account_id: { type: 'uuid', notNull: true, references: '"bank_accounts"(id)', onDelete: 'cascade' },
        platform_id: { type: 'uuid', notNull: false, references: '"platforms"(id)', onDelete: 'set null' },
        created_at: { type: 'timestamp', notNull: true, default: pgm.func('NOW()') },
    });

    pgm.createIndex('linked_accounts', 'user_id');
    pgm.createIndex('linked_accounts', 'bank_account_id');
    pgm.createIndex('linked_accounts', 'platform_id');
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
export const down = (pgm) => {
    pgm.dropTable('linked_accounts');
};

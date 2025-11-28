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

    pgm.createTable('plaid_accounts', {
        id: { type: 'uuid', primaryKey: true, notNull: true, default: pgm.func('uuid_generate_v4()') },
        user_id: { type: 'uuid', notNull: true, references: 'users(id)', onDelete: 'cascade', unique: true },
        access_token: { type: 'text', notNull: true },
        item_id: { type: 'text', notNull: true },
        created_at: { type: 'timestamp', notNull: true, default: pgm.func('current_timestamp') },
        last_processed_date: { type: 'date', notNull: false, default: null }
    })

    // Add indexes
    pgm.createIndex('plaid_accounts', 'user_id');
    pgm.createIndex('plaid_accounts', 'item_id');
    pgm.createIndex('plaid_accounts', 'access_token');
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
export const down = (pgm) => {
    pgm.dropTable('plaid_accounts')
};

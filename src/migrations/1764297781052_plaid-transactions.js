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
    pgm.createTable('plaid_transactions', {
        id: { type: 'uuid', primaryKey: true, notNull: true, default: pgm.func('gen_random_uuid()') },
        plaid_account_id: { type: 'uuid', notNull: true, references: '"plaid_accounts"(id)', onDelete: 'cascade' },
        transaction_id: { type: 'text', notNull: true },
        account_id: { type: 'text', notNull: true },
        amount: { type: 'numeric', notNull: true },
        currency: { type: 'text', notNull: true },
        date: { type: 'date', notNull: true },
        shared: { type: 'boolean', notNull: true, default: false },
        created_at: { type: 'timestamp', notNull: true, default: pgm.func('NOW()') },
    });

    // Recommended indexes
    pgm.createIndex('plaid_transactions', 'plaid_account_id');
    pgm.createIndex('plaid_transactions', 'transaction_id');
    pgm.createIndex('plaid_transactions', 'account_id');
    pgm.createIndex('plaid_transactions', 'date');
    pgm.createIndex('plaid_transactions', 'shared');
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
export const down = (pgm) => {
    pgm.dropIndex('plaid_transactions', 'plaid_account_id');
    pgm.dropIndex('plaid_transactions', 'transaction_id');
    pgm.dropIndex('plaid_transactions', 'account_id');
    pgm.dropIndex('plaid_transactions', 'date');
    pgm.dropIndex('plaid_transactions', 'shared');
    pgm.dropTable('plaid_transactions');
};

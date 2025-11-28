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
    pgm.createTable('bank_accounts', {
        id: { type: 'uuid', primaryKey: true, notNull: true, default: pgm.func('gen_random_uuid()') },
        plaid_account_id: { type: 'uuid', notNull: false },
        account_id: { type: 'text', notNull: true, unique: true },
        name: { type: 'text', notNull: false },
        mask: { type: 'text', notNull: false },
        official_name: { type: 'text', notNull: false },
        subtype: { type: 'text', notNull: false },
        type: { type: 'text', notNull: false },
        created_at: { type: 'timestamp', notNull: true, default: pgm.func('NOW()') },
    });

    pgm.createIndex('bank_accounts', 'account_id');
    pgm.createIndex('bank_accounts', 'plaid_account_id');
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
export const down = (pgm) => {
    pgm.dropIndex('bank_accounts', 'account_id');
    pgm.dropIndex('bank_accounts', 'plaid_account_id');
    pgm.dropTable('bank_accounts');
};

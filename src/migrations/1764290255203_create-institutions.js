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

    pgm.createTable('institutions', {
        id: { type: 'uuid', primaryKey: true, notNull: true, default: pgm.func('uuid_generate_v4()') },

        bank_account_id: {
            type: 'uuid',
            notNull: true,
            references: '"bank_accounts"(id)',
            onDelete: 'cascade',
        },

        institution_id: {
            type: 'text',
            notNull: true,
        },

        name: {
            type: 'text',
            notNull: true,
        },

        item_id: {
            type: 'text',
            notNull: true,
        },

        created_at: {
            type: 'timestamp',
            notNull: true,
            default: pgm.func('NOW()'),
        },
    });

    // UNIQUE: one institution per bank account
    pgm.addConstraint(
        'institutions',
        'institutions_bank_account_unique',
        {
            unique: ['bank_account_id'],
        }
    );

    // Indexes for faster lookup
    pgm.createIndex('institutions', 'institution_id');
    pgm.createIndex('institutions', 'item_id');
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
export const down = (pgm) => {
    pgm.dropIndex('institutions', 'institution_id');
    pgm.dropIndex('institutions', 'item_id');
    pgm.dropConstraint('institutions', 'institution_bank_account_unique');
    pgm.dropTable('institutions');
};

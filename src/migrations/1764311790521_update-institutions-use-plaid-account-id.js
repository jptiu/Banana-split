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
    // 1️⃣ Drop old FK and unique constraint on bank_account_id
    pgm.dropConstraint('institutions', 'institutions_bank_account_unique', { ifExists: true });
    pgm.dropConstraint('institutions', 'institutions_bank_account_id_fkey', { ifExists: true });

    // 2️⃣ Rename column bank_account_id → plaid_account_id
    pgm.renameColumn('institutions', 'bank_account_id', 'plaid_account_id');

    // 3️⃣ Alter column to NOT NULL
    pgm.alterColumn('institutions', 'plaid_account_id', {
        notNull: true,
    });

    // 4️⃣ Add FK constraint to plaid_accounts
    pgm.addConstraint('institutions', 'institutions_plaid_account_id_fkey', {
        foreignKeys: {
            columns: 'plaid_account_id',
            notNull: true,
            references: 'plaid_accounts(id)',
            onDelete: 'cascade',
        },
    });

    // 5️⃣ Add unique constraint: one institution per plaid account
    pgm.addConstraint('institutions', 'institutions_plaid_account_unique', {
        unique: ['plaid_account_id'],
    });
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
export const down = (pgm) => {
    // Reverse unique constraint
    pgm.dropConstraint('institutions', 'institutions_plaid_account_unique', { ifExists: true });

    // Reverse FK
    pgm.dropConstraint('institutions', 'institutions_plaid_account_id_fkey', { ifExists: true });

    // Rename column back
    pgm.renameColumn('institutions', 'plaid_account_id', 'bank_account_id');

    // Make nullable again
    pgm.alterColumn('institutions', 'bank_account_id', {
        notNull: false,
    });

    // Restore old unique constraint
    pgm.addConstraint('institutions', 'institutions_bank_account_unique', {
        unique: ['bank_account_id'],
    });
};

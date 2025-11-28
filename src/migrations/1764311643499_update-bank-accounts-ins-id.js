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
    // 1️⃣ Rename column plaid_account_id → ins_id
    pgm.renameColumn('bank_accounts', 'plaid_account_id', 'ins_id');

    // 2️⃣ Add FK constraint (nullable or not null? You chose non-null, so we add NOT NULL)
    pgm.alterColumn('bank_accounts', 'ins_id', {
        notNull: true,
    });

    // 3️⃣ Add actual foreign key
    pgm.addConstraint('bank_accounts', 'bank_accounts_ins_id_fkey', {
        foreignKeys: {
            columns: 'ins_id',
            notNull: true,
            references: 'institutions(id)',
            onDelete: 'cascade',
        },
    });
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
export const down = (pgm) => {
    // Reverse FK
    pgm.dropConstraint('bank_accounts', 'bank_accounts_ins_id_fkey');

    // Reverse NOT NULL (previously nullable)
    pgm.alterColumn('bank_accounts', 'ins_id', {
        notNull: false,
    });

    // Rename column back
    pgm.renameColumn('bank_accounts', 'ins_id', 'plaid_account_id');
};

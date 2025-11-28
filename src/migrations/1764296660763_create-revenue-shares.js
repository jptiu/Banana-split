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
    pgm.createTable('revenue_shares', {
        id: {
            type: 'uuid',
            primaryKey: true,
            notNull: true,
            default: pgm.func('gen_random_uuid()'),
        },

        recipients_id: {
            type: 'uuid',
            notNull: true,
            references: '"recipients"(id)',
            onDelete: 'cascade',
        },

        percentage: {
            type: 'int',
            notNull: true,
        },

        active: {
            type: 'boolean',
            notNull: true,
            default: true,
        },

        created_at: {
            type: 'timestamp',
            notNull: true,
            default: pgm.func('NOW()'),
        },
    });

    // Indexes
    pgm.createIndex('revenue_shares', 'recipients_id');
    pgm.createIndex('revenue_shares', 'active');
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
export const down = (pgm) => {
    pgm.dropIndex('revenue_shares', 'recipients_id');
    pgm.dropIndex('revenue_shares', 'active');
    pgm.dropTable('revenue_shares');
};

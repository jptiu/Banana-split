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
    pgm.createTable('invited_recipients', {
        id: { type: 'uuid', primaryKey: true, notNull: true, default: pgm.func('gen_random_uuid()') },
        split_id: { type: 'uuid', notNull: true, references: '"splits"(id)', onDelete: 'cascade' },
        email: { type: 'text', notNull: true },
        status: { type: 'text', notNull: true, default: 'pending', comment: 'pending or success' },
        token: { type: 'text', notNull: true },
        created_at: { type: 'timestamp', notNull: true, default: pgm.func('NOW()') },
    });

    pgm.addConstraint('invited_recipients', 'invited_recipients_email_unique', { unique: ['email'] });
    pgm.createIndex('invited_recipients', 'split_id');
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
export const down = (pgm) => {
    pgm.dropIndex('invited_recipients', 'split_id');
    pgm.dropConstraint('invited_recipients', 'invited_recipients_email_unique');
    pgm.dropTable('invited_recipients');
};

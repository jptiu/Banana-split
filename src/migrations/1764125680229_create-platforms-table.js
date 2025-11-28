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

    pgm.createTable("platforms", {
        id: { type: 'uuid', primaryKey: true, notNull: true, default: pgm.func('uuid_generate_v4()') },
        name: {
            type: "text",
            notNull: true,
            unique: true,
        },
        description: {
            type: "text",
            notNull: false,
        },
        created_at: {
            type: "timestamp",
            notNull: true,
            default: pgm.func("NOW()"),
        },
    });
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
export const down = (pgm) => {
    pgm.dropTable("platforms");
};

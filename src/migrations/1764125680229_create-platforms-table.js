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
    pgm.createTable("platforms", {
        id: {
            type: "uuid",
            primaryKey: true,
            notNull: true,
        },
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

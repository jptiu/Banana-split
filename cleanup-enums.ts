import { pool } from "./src/config/db.js";

async function cleanup() {
  const client = await pool.connect();

  try {
    console.log("Dropping all tables and types...");

    // Drop tables first
    await client.query("DROP TABLE IF EXISTS pgmigrations CASCADE");
    await client.query("DROP TABLE IF EXISTS group_members CASCADE");
    await client.query("DROP TABLE IF EXISTS groups CASCADE");
    await client.query("DROP TABLE IF EXISTS users CASCADE");

    // Drop enum types
    await client.query("DROP TYPE IF EXISTS user_type_enum CASCADE");
    await client.query("DROP TYPE IF EXISTS user_role_enum CASCADE");

    console.log("✓ All tables and enum types dropped successfully");
  } catch (error) {
    console.error("Error:", error);
  } finally {
    client.release();
    await pool.end();
  }
}

cleanup();

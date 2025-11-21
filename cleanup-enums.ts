import { pool } from "./src/config/db.js";

async function cleanup() {
  const client = await pool.connect();

  try {
    console.log("Dropping existing enum types...");

    await client.query("DROP TYPE IF EXISTS user_type_enum CASCADE");
    await client.query("DROP TYPE IF EXISTS user_role_enum CASCADE");

    console.log("✓ Enum types dropped successfully");
  } catch (error) {
    console.error("Error:", error);
  } finally {
    client.release();
    await pool.end();
  }
}

cleanup();

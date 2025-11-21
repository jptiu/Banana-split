import { pool } from "../config/db.js";
import bcrypt from "bcrypt";

/**
 * Seeder to populate admin user
 */
async function seedUsers() {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // Check if admin user already exists
    const existingAdmin = await client.query(
      "SELECT id FROM users WHERE email = 'admin@example.com'"
    );

    let adminUserId;

    // Insert admin user if not exists
    if (existingAdmin.rows.length === 0) {
      const hashedAdminPassword = await bcrypt.hash("admin123", 10);
      const adminResult = await client.query(
        `INSERT INTO users (first_name, last_name, email, password) 
         VALUES ($1, $2, $3, $4) 
         RETURNING id`,
        ["Admin", "User", "admin@example.com", hashedAdminPassword]
      );
      adminUserId = adminResult.rows[0].id;
      console.log("✓ Created admin user:", adminUserId);
    } else {
      adminUserId = existingAdmin.rows[0].id;
      console.log("✓ Admin user already exists");
    }

    // Check and insert user_role for admin (user_type is NULL for admin)
    const existingAdminRole = await client.query(
      "SELECT id FROM user_role WHERE user_id = $1",
      [adminUserId]
    );
    if (existingAdminRole.rows.length === 0) {
      await client.query(
        `INSERT INTO user_role (user_id, role, user_type) 
         VALUES ($1, $2, $3)`,
        [adminUserId, "admin", null]
      );
      console.log("✓ Created admin role");
    } else {
      console.log("✓ Admin role already exists");
    }

    await client.query("COMMIT");
    console.log("\n✅ Seeding completed successfully!");
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("❌ Error seeding users:", error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// Run the seeder
seedUsers()
  .then(() => {
    console.log("Seeder execution finished");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Seeder failed:", error);
    process.exit(1);
  });

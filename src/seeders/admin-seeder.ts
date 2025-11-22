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
        `INSERT INTO users (first_name, last_name, email, password, role, user_type, is_email_verified) 
         VALUES ($1, $2, $3, $4, $5, $6, $7) 
         RETURNING id`,
        [
          "Admin",
          "User",
          "admin@example.com",
          hashedAdminPassword,
          "admin",
          null,
          true,
        ]
      );
      adminUserId = adminResult.rows[0].id;
      console.log("✓ Created admin user:", adminUserId);
    } else {
      adminUserId = existingAdmin.rows[0].id;
      console.log("✓ Admin user already exists");
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

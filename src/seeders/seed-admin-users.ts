import { pool } from "../config/db.js";
import bcrypt from "bcrypt";

/**
 * Seeder to populate admin and regular users
 */
async function seedUsers() {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // Check if users already exist
    const existingAdmin = await client.query(
      "SELECT id FROM users WHERE email = 'admin@example.com'"
    );
    const existingUser = await client.query(
      "SELECT id FROM users WHERE email = 'user@example.com'"
    );

    let adminUserId, regularUserId;

    // Insert admin user if not exists
    if (existingAdmin.rows.length === 0) {
      const hashedAdminPassword = await bcrypt.hash("admin123", 10);
      const adminResult = await client.query(
        `INSERT INTO users (firstname, lastname, email, password) 
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

    // Insert regular user if not exists
    if (existingUser.rows.length === 0) {
      const hashedUserPassword = await bcrypt.hash("user123", 10);
      const userResult = await client.query(
        `INSERT INTO users (firstname, lastname, email, password) 
         VALUES ($1, $2, $3, $4) 
         RETURNING id`,
        ["Regular", "User", "user@example.com", hashedUserPassword]
      );
      regularUserId = userResult.rows[0].id;
      console.log("✓ Created regular user:", regularUserId);
    } else {
      regularUserId = existingUser.rows[0].id;
      console.log("✓ Regular user already exists");
    }

    // Check and insert user_role for admin (userType is NULL for admin)
    const existingAdminRole = await client.query(
      'SELECT id FROM user_role WHERE "userId" = $1',
      [adminUserId]
    );
    if (existingAdminRole.rows.length === 0) {
      await client.query(
        `INSERT INTO user_role ("userId", role, "userType") 
         VALUES ($1, $2, $3)`,
        [adminUserId, "admin", null]
      );
      console.log("✓ Created admin role");
    } else {
      console.log("✓ Admin role already exists");
    }

    // Check and insert user_role for regular user (userType is 'owner')
    const existingUserRole = await client.query(
      'SELECT id FROM user_role WHERE "userId" = $1',
      [regularUserId]
    );
    if (existingUserRole.rows.length === 0) {
      await client.query(
        `INSERT INTO user_role ("userId", role, "userType") 
         VALUES ($1, $2, $3)`,
        [regularUserId, "user", "creator"]
      );
      console.log("✓ Created user role with creator type");
    } else {
      console.log("✓ User role already exists");
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

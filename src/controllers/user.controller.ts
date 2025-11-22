import type { Context } from "hono";
import { pool } from "../config/db.js";
import { getErrorMessage } from "../utils/getErrorMessage.js";

export class UserController {
  // GET /users
  static async getUsers(c: Context) {
    try {
      const res = await pool.query("SELECT * FROM users");
      return c.json(res.rows);
    } catch (err: unknown) {
      console.error("Error fetching users:", err);
      return c.json({ error: getErrorMessage(err) }, 500);
    }
  }

  // POST /users
  static async createUser(c: Context) {
    try {
      const { name, email } = await c.req.json();
      if (!name || !email) {
        return c.json({ error: "Name and email are required" }, 400);
      }

      const res = await pool.query(
        "INSERT INTO users (name, email) VALUES ($1, $2) RETURNING *",
        [name, email]
      );

      return c.json(res.rows[0], 201);
    } catch (err: unknown) {
      console.error("Error creating user:", err);
      return c.json({ error: getErrorMessage(err) }, 500);
    }
  }

  // PATCH /users/:userId/user-type
  static async updateUserType(c: Context) {
    try {
      const userId = c.req.param("userId");
      const { user_type } = await c.req.json();

      // Validate user_type
      if (!user_type || !["creator", "member"].includes(user_type)) {
        return c.json(
          {
            error: 'Invalid user_type. Must be either "creator" or "member"',
          },
          400
        );
      }

      // Check if user exists
      const userCheck = await pool.query("SELECT id FROM users WHERE id = $1", [
        userId,
      ]);

      if (userCheck.rows.length === 0) {
        return c.json({ error: "User not found" }, 404);
      }

      // Update user_type in users table
      const res = await pool.query(
        "UPDATE users SET user_type = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING id, first_name, last_name, email, role, user_type",
        [user_type, userId]
      );

      return c.json(
        {
          message: "User type updated successfully",
          data: res.rows[0],
        },
        200
      );
    } catch (err: unknown) {
      console.error("Error updating user type:", err);
      return c.json({ error: getErrorMessage(err) }, 500);
    }
  }
}

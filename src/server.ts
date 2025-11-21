import { serve } from "@hono/node-server";
import app from "./app.js";
import dotenv from "dotenv";
import { validateJWTConfig } from "./utils/jwt.js";

dotenv.config();

// Validate JWT configuration on startup
try {
  validateJWTConfig();
  console.log("✓ JWT configuration validated");
} catch (error) {
  console.error(
    "✗ JWT configuration error:",
    error instanceof Error ? error.message : "Unknown error"
  );
  console.error(
    "Please set JWT_ACCESS_SECRET and JWT_REFRESH_SECRET in your .env file"
  );
  process.exit(1);
}

const PORT = Number(process.env.PORT) || 3000;

serve({
  fetch: app.fetch,
  port: PORT,
});

console.log(`Server running at http://localhost:${PORT}`);

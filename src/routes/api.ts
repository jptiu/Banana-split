import { Hono } from "hono";
import userRoutes from "./users.js";
import plaidRoutes from "./plaid.js";
import authRoutes from "./auth.js";

const apiRoutes = new Hono();

apiRoutes.route("/auth", authRoutes);
apiRoutes.route("/users", userRoutes);
apiRoutes.route("/plaid", plaidRoutes);

export default apiRoutes;

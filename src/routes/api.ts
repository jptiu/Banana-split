import { Hono } from "hono";
import userRoutes from "./users.js";
import plaidRoutes from "./plaid.js";
import authRoutes from "./auth.js";
import stripeRoutes from "./stripe.js";

const apiRoutes = new Hono();

apiRoutes.route("/auth", authRoutes);
apiRoutes.route("/users", userRoutes);
apiRoutes.route("/plaid", plaidRoutes);
apiRoutes.route("/stripe", stripeRoutes);

export default apiRoutes;

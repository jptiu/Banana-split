import { Hono } from 'hono'
import { cors } from 'hono/cors';
import dotenv from 'dotenv'
import apiRoutes from './routes/api.js'

dotenv.config()

const app = new Hono()

if (!process.env.FRONTEND_URL) {
  throw new Error("FRONTEND_URL must be set in environment variables")
}

// ✅ Apply CORS BEFORE any routes
app.use(
    '/*',
    cors({
        origin: process.env.FRONTEND_URL,
        allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
        allowHeaders: ['Content-Type', 'Authorization'],
    })
)

app.get('/', (c) => c.text('Hono + Postgres is running!'))

app.route('/api', apiRoutes)

export default app

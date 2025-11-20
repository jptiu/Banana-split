import { Hono } from 'hono'
import dotenv from 'dotenv'
import userRoutes from './routes/users.js'

dotenv.config()

const app = new Hono()

app.get('/', (c) => c.text('Hono + Postgres is running!'))

// mount API routes
app.route('/api', userRoutes)

export default app

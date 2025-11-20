import { Hono } from 'hono'
import dotenv from 'dotenv'
import apiRoutes from './routes/api.js'

dotenv.config()

const app = new Hono()

app.get('/', (c) => c.text('Hono + Postgres is running!'))

app.route('/api', apiRoutes)

export default app

import { serve } from '@hono/node-server'
import app from './app.js'
import dotenv from 'dotenv'

dotenv.config()

const PORT = Number(process.env.PORT) || 3000

serve({
  fetch: app.fetch,
  port: PORT,
})

console.log(`Server running at http://localhost:${PORT}`)

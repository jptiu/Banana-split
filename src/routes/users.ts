import { Hono } from 'hono'
import { pool } from '../config/db.js'

const app = new Hono()

app.get('/users', async (c) => {
  try {
    const res = await pool.query('SELECT * FROM users')
    return c.json(res.rows)
  } catch (err) {
    console.error(err)
    return c.json({ error: 'Database query failed' }, 500)
  }
})

export default app

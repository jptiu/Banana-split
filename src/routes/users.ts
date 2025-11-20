import { Hono } from 'hono'
import { pool } from '../config/db.js'

const app = new Hono()

app.get('/', async (c) => {
  try {
    const res = await pool.query('SELECT * FROM users')
    return c.json(res.rows)
  } catch (err) {
    console.error(err)
    return c.json({ error: 'Database query failed' }, 500)
  }
})

// POST a new user
app.post('/', async (c) => {
  try {
    const { name, email } = await c.req.json()

    // Basic validation
    if (!name || !email) {
      return c.json({ error: 'Name and email are required' }, 400)
    }

    const res = await pool.query(
      'INSERT INTO users (name, email) VALUES ($1, $2) RETURNING *',
      [name, email]
    )

    return c.json(res.rows[0], 201) // 201 Created
  } catch (err) {
    console.error(err)
    return c.json({ error: 'Failed to create user' }, 500)
  }
})

export default app

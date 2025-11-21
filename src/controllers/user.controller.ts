import type { Context } from 'hono'
import { pool } from '../config/db.js'
import { getErrorMessage } from '../utils/getErrorMessage.js'

// GET /users
export const getUsers = async (c: Context) => {
  try {
    const res = await pool.query('SELECT * FROM users')
    return c.json(res.rows)
  } catch (err: unknown) {
    console.error('Error fetching users:', err)
    return c.json({ error: getErrorMessage(err) }, 500)
  }
}

// POST /users
export const createUser = async (c: Context) => {
  try {
    const { name, email } = await c.req.json()
    if (!name || !email) return c.json({ error: 'Name and email are required' }, 400)

    const res = await pool.query(
      'INSERT INTO users (name, email) VALUES ($1, $2) RETURNING *',
      [name, email]
    )
    return c.json(res.rows[0], 201)
  } catch (err: unknown) {
    console.error('Error creating user:', err)
    return c.json({ error: getErrorMessage(err) }, 500)
  }
}
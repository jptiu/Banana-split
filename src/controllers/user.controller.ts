import { pool } from '../config/db.js'
import { getErrorMessage } from '../utils/getErrorMessage.js'

export const getUsers = async () => {
  try {
    const res = await pool.query('SELECT * FROM users')
    return res.rows
  } catch (err: unknown) {
    console.error('Error fetching users:', err)
    throw new Error(getErrorMessage(err))
  }
}

export const createUser = async (name: string, email: string) => {
  try {
    const res = await pool.query(
      'INSERT INTO users (name, email) VALUES ($1, $2) RETURNING *',
      [name, email]
    )
    return res.rows[0]
  } catch (err: unknown) {
    console.error('Error creating user:', err)
    throw new Error(getErrorMessage(err))
  }
}

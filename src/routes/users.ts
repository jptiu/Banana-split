import { Hono } from 'hono'
import { getUsers, createUser } from '../controllers/user.controller.js'

const app = new Hono()

// GET /users
app.get('/', async (c) => {
  try {
    const users = await getUsers()
    return c.json(users)
  } catch (err) {
    console.error(err)
    return c.json({ error: 'Database query failed' }, 500)
  }
})

// POST /users
app.post('/', async (c) => {
  try {
    const { name, email } = await c.req.json()

    if (!name || !email) {
      return c.json({ error: 'Name and email are required' }, 400)
    }

    const newUser = await createUser(name, email)
    return c.json(newUser, 201)
  } catch (err) {
    console.error(err)
    return c.json({ error: 'Failed to create user' }, 500)
  }
})

export default app
import { Hono } from 'hono'
import { getUsers, createUser } from '../controllers/user.controller.js'

const app = new Hono()

// GET /users
app.get('/', async (c) => {
  const users = await getUsers()
  return c.json(users)
})

// POST /users
app.post('/', async (c) => {
  const { name, email } = await c.req.json()

  if (!name || !email) {
    return c.json({ error: 'Name and email are required' }, 400)
  }

  const newUser = await createUser(name, email)
  return c.json(newUser, 201)
})

export default app

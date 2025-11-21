import { Hono } from 'hono'
import * as UserController from '../controllers/user.controller.js'

const app = new Hono()

// GET /users
app.get('/', UserController.getUsers)

// POST /users
app.post('/', UserController.createUser)

export default app

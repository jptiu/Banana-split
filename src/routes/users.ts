import { Hono } from 'hono'
import { UserController } from '../controllers/user.controller.js'
import { authenticate, requireAdmin } from '../middleware/auth.middleware.js'

const app = new Hono()

app.get('/', authenticate, requireAdmin, UserController.getUsers)
app.post('/', authenticate, requireAdmin, UserController.createUser)

export default app

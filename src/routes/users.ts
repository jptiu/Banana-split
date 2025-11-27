import { Hono } from 'hono'
import { UserController } from '../controllers/user.controller.js'
import { authenticate, requireRole } from '../middleware/auth.middleware.js'

const app = new Hono()

app.get('/', authenticate, requireRole('admin'), UserController.getUsers)
app.post('/', authenticate, requireRole('admin'), UserController.createUser)

export default app

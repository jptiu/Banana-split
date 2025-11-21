import { Hono } from 'hono'
import { UserController } from '../controllers/user.controller.js'
import { authenticate, requireAdmin, requireRole } from '../middleware/auth.middleware.js'

const app = new Hono()

app.get('/', authenticate, requireAdmin, UserController.getUsers)
app.post('/', authenticate, requireAdmin, UserController.createUser)
app.patch('/:userId/user-type', authenticate, requireRole(['admin', 'user']), UserController.updateUserType)

export default app

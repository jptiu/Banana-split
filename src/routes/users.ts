import { Hono } from 'hono'
import { UserController } from '../controllers/user.controller.js'

const app = new Hono()

app.get('/', UserController.getUsers)
app.post('/', UserController.createUser)

export default app

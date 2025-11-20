import { Hono } from 'hono'
import userRoutes from './users.js'

const apiRoutes = new Hono()

apiRoutes.route('/users', userRoutes)

export default apiRoutes

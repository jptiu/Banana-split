import { Hono } from 'hono'
import userRoutes from './users.js'
import plaidRoutes from './plaid.js'

const apiRoutes = new Hono()

apiRoutes.route('/users', userRoutes)
apiRoutes.route('/plaid', plaidRoutes)

export default apiRoutes

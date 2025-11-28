import { Hono } from 'hono'
import { PlaidController } from '../controllers/plaid.controller.js'
import { authenticate, requireRole } from '../middleware/auth.middleware.js'

const app = new Hono()

//for backend testing purposes only
app.get('/sandbox/public-token', PlaidController.createSandboxPublicToken)
app.post('/sandbox/fire-webhook', PlaidController.fireSandboxWebhook)

app.get('/link-token', authenticate, requireRole('creator'), PlaidController.generateLinkToken)
app.post('/exchange', authenticate, requireRole('creator'), PlaidController.exchangePublicToken)
app.get('/accounts', authenticate, requireRole('creator'), PlaidController.getAccounts)
app.post('/balances', authenticate, requireRole('creator'), PlaidController.getBalances)
app.post('/transactions', authenticate, requireRole('creator'), PlaidController.getTransactions)
app.post('/item', authenticate, requireRole('creator'), PlaidController.getItem)

app.post('/webhook', PlaidController.handleWebhook)

export default app

import { Hono } from 'hono'
import { PlaidController } from '../controllers/plaid.controller.js'

const app = new Hono()

app.get('/link-token', PlaidController.generateLinkToken)
app.post('/exchange', PlaidController.exchangePublicToken)
app.get('/sandbox/public-token', PlaidController.createSandboxPublicToken)
app.post('/accounts', PlaidController.getAccounts)
app.post('/balances', PlaidController.getBalances)
app.post('/transactions', PlaidController.getTransactions)
app.post('/item', PlaidController.getItem)

export default app

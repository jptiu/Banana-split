// src/routes/plaid.routes.ts
import { Hono } from 'hono'
import {
  generateLinkToken,
  exchangePublicToken,
  createSandboxPublicToken,
  getAccounts,
} from '../controllers/plaid.controller.js'

const app = new Hono()

// GET /plaid/link-token
app.get('/link-token', async (c) => {
  const data = await generateLinkToken()
  return c.json(data)
})

// GET /plaid/sandbox/public-token
app.get('/sandbox/public-token', async (c) => {
  const data = await createSandboxPublicToken()
  return c.json(data)
})

// POST /plaid/exchange
app.post('/exchange', async (c) => {
  const { public_token } = await c.req.json()
  if (!public_token) return c.json({ error: 'public_token is required' }, 400)

  const data = await exchangePublicToken(public_token)
  return c.json(data)
})

// POST /plaid/accounts
app.post('/accounts', async (c) => {
  const { access_token } = await c.req.json()
  if (!access_token) return c.json({ error: 'access_token is required' }, 400)

  const data = await getAccounts(access_token)
  return c.json(data)
})

export default app

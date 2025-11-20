import { Hono } from 'hono'
import { generateLinkToken, exchangePublicToken } from '../controllers/plaid.controller.js'

const app = new Hono()

// GET /plaid/link-token
app.get('/link-token', async (c) => {
  try {
    const data = await generateLinkToken()
    return c.json(data)
  } catch (err: any) {
    console.error(err)
    return c.json({ error: err.message }, 500)
  }
})

// POST /plaid/exchange
app.post('/exchange', async (c) => {
  try {
    const { public_token } = await c.req.json()

    if (!public_token) {
      return c.json({ error: 'public_token is required' }, 400)
    }

    const data = await exchangePublicToken(public_token)
    return c.json(data)
  } catch (err: any) {
    console.error(err)
    return c.json({ error: err.message }, 500)
  }
})

export default app

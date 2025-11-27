import { Hono } from 'hono'
import { StripeController } from '../controllers/stripe.controller.js'
import { authenticate } from '../middleware/auth.middleware.js'

const app = new Hono()

// 1️⃣ Create a new Stripe connected account (POST, uses JWT email)
app.post('/account/create', authenticate, StripeController.createAccount)

// 2️⃣ Generate onboarding link for connected account
app.post('/account/onboarding', authenticate, StripeController.createAccountLink)

// 3️⃣ Get platform balance
app.get('/balance', authenticate, StripeController.getBalance)

// 4️⃣ Get connected account balance
app.post('/balance/connected', authenticate, StripeController.getConnectedAccountBalance)

// 5️⃣ Create payment intent
app.post('/payment-intent', authenticate, StripeController.createPaymentIntent)

// 6️⃣ Transfer funds to connected account
app.post('/transfer', authenticate, StripeController.transferToConnectedAccount)

// 7️⃣ Distribute revenue to multiple recipients
app.post('/distribute', authenticate, StripeController.distributeRevenue)

// 8️⃣ List all transfers (for logs/admin)
app.get('/transfers', authenticate, StripeController.listTransfers)

// 9️⃣ Stripe webhook - DO NOT USE authenticate middleware here
app.post('/webhook', StripeController.handleWebhook)

export default app

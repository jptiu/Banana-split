import type { Context } from 'hono'
import { StripeService } from '../services/stripe.service.js'
import { getErrorMessage } from '../utils/getErrorMessage.js'
import { pool } from '../config/db.js'
import Stripe from 'stripe'

export class StripeController {
  /**
   * Create a new Stripe connected account
   */
  static async createAccount(c: Context) {
    try {
      const userId = c.get('userId')
      const email = c.get('userEmail')
      if (!email || !userId) return c.json({ error: 'User info not found in JWT' }, 400)

      // 1️⃣ Check if the user already has a Stripe account
      const existing = await pool.query(
        `SELECT * FROM stripe_accounts WHERE user_id = $1`,
        [userId]
      )
      if (existing.rows.length > 0) {
        // Return existing account
        return c.json({ account: existing.rows[0] })
      }

      // 2️⃣ Create Stripe connected account
      const account = await StripeService.createConnectedAccount(email)

      // 3️⃣ Store in your DB
      const query = `
      INSERT INTO stripe_accounts (user_id, stripe_account_id, onboarded)
      VALUES ($1, $2, $3)
      RETURNING *
    `
      const values = [userId, account.id, false]
      const result = await pool.query(query, values)

      return c.json({ account: result.rows[0] })
    } catch (err: unknown) {
      console.error('Stripe createAccount error:', err)
      return c.json({ error: getErrorMessage(err) }, 500)
    }
  }

  /**
   * Generate onboarding link for connected account
   */
  static async createAccountLink(c: Context) {
    try {
      const userId = c.get('userId')
      if (!userId) return c.json({ error: 'Unauthorized' }, 401)

      const accountId = await StripeService.getStripeAccountIdForUser(userId)
      if (!accountId) return c.json({ error: 'Stripe account not found' }, 404)

      const refreshUrl = `${process.env.FRONTEND_URL}/stripe/refresh`
      const returnUrl = `${process.env.FRONTEND_URL}/stripe/return`

      const link = await StripeService.createAccountLink(accountId, refreshUrl, returnUrl)

      return c.json({ link })

    } catch (err) {
      console.error('Stripe createAccountLink error:', err)
      return c.json({ error: getErrorMessage(err) }, 500)
    }
  }

  /**
   * Retrieve platform balance
   */
  static async getBalance(c: Context) {
    try {
      const balance = await StripeService.getBalance()
      return c.json({ balance })
    } catch (err: unknown) {
      console.error('Stripe getBalance error:', err)
      return c.json({ error: getErrorMessage(err) }, 500)
    }
  }

  /**
   * Retrieve balance for a connected account
   */
  static async getConnectedAccountBalance(c: Context) {
    try {
      const { accountId } = await c.req.json()
      if (!accountId) return c.json({ error: 'accountId is required' }, 400)

      const balance = await StripeService.getConnectedAccountBalance(accountId)
      return c.json({ balance })
    } catch (err: unknown) {
      console.error('Stripe getConnectedAccountBalance error:', err)
      return c.json({ error: getErrorMessage(err) }, 500)
    }
  }

  /**
   * Create a payment intent
   */
  static async createPaymentIntent(c: Context) {
    try {
      const { amount, currency, customerId } = await c.req.json()
      if (!amount || !currency) return c.json({ error: 'amount and currency are required' }, 400)

      const paymentIntent = await StripeService.createPaymentIntent(amount, currency, customerId)
      return c.json({ paymentIntent })
    } catch (err: unknown) {
      console.error('Stripe createPaymentIntent error:', err)
      return c.json({ error: getErrorMessage(err) }, 500)
    }
  }

  /**
   * Transfer funds to a connected account
   */
  static async transferToConnectedAccount(c: Context) {
    try {
      const { accountId, amount, currency } = await c.req.json()
      if (!accountId || !amount) return c.json({ error: 'accountId and amount are required' }, 400)

      const transfer = await StripeService.transferToConnectedAccount(accountId, amount, currency)
      return c.json({ transfer })
    } catch (err: unknown) {
      console.error('Stripe transferToConnectedAccount error:', err)
      return c.json({ error: getErrorMessage(err) }, 500)
    }
  }

  /**
   * Distribute revenue to multiple recipients
   */
  static async distributeRevenue(c: Context) {
    try {
      const { transaction, recipients } = await c.req.json()
      if (!transaction || !recipients || !Array.isArray(recipients)) {
        return c.json({ error: 'transaction and recipients array are required' }, 400)
      }

      const transfers = await StripeService.distributeRevenue(transaction, recipients)
      return c.json({ transfers })
    } catch (err: unknown) {
      console.error('Stripe distributeRevenue error:', err)
      return c.json({ error: getErrorMessage(err) }, 500)
    }
  }

  /**
   * List all transfers
   */
  static async listTransfers(c: Context) {
    try {
      const limitParam = c.req.query('limit')
      const limit = limitParam ? parseInt(limitParam) : 10

      const transfers = await StripeService.listTransfers(limit)
      return c.json({ transfers })
    } catch (err: unknown) {
      console.error('Stripe listTransfers error:', err)
      return c.json({ error: getErrorMessage(err) }, 500)
    }
  }

  /**
   * Handle Stripe webhooks
   */
  static async handleWebhook(c: Context) {
    try {
      const payload = await c.req.text()
      const sig = c.req.header('stripe-signature') || ''

      let event: Stripe.Event

      try {
        event = StripeService.verifyWebhook(payload, sig)
      } catch (err: unknown) {
        return c.json({ error: 'Webhook verification failed' }, 400)
      }

      switch (event.type) {

        /**
         * Mark onboarding completion
         */
        case 'account.updated': {
          const account = event.data.object as Stripe.Account

          if (
            account.details_submitted &&
            account.charges_enabled &&
            account.payouts_enabled
          ) {
            await pool.query(
              `UPDATE stripe_accounts SET onboarded = TRUE WHERE stripe_account_id = $1`,
              [account.id]
            )
          }

          break
        }

        /**
         * Revenue share event
         */
        case 'payment_intent.succeeded': {
          const pi = event.data.object as Stripe.PaymentIntent

          // Extract core transaction data
          const txn = {
            transactionId: pi.id,
            amount: pi.amount_received / 100,
            currency: pi.currency
          }

          // TODO: fetch revenue share recipients from DB
          const recipients = await pool.query(
            `SELECT s.stripe_account_id AS "accountId", r.percentage
             FROM revenue_shares r
             JOIN stripe_accounts s ON r.user_id = s.user_id
             WHERE r.active = true`
          )

          await StripeService.distributeRevenue(
            txn,
            recipients.rows
          )

          break
        }

        default:
          break
      }

      return c.json({ received: true })
    } catch (err: unknown) {
      console.error('Stripe webhook handler error:', err)
      return c.json({ error: 'Internal server error' }, 500)
    }
  }
}

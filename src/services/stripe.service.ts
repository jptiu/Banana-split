import Stripe from 'stripe'
import { pool } from '../config/db.js'

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('STRIPE_SECRET_KEY is not defined in environment variables')
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)

interface Recipient {
  accountId: string
  percentage: number
}

interface Transaction {
  transactionId: string
  amount: number
  currency?: string
}

export class StripeService {
  /**
   * Create a new connected account
   */
  static async createConnectedAccount(email: string) {
    const account = await stripe.accounts.create({
      type: 'express',
      country: 'US',
      email,
      capabilities: {
        transfers: { requested: true },
        card_payments: { requested: true }
      }
    })

    return account
  }

  /**
   * Generate onboarding link for account authentication
   */
  static async createAccountLink(accountId: string, refreshUrl: string, returnUrl: string) {
    const accLink = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: refreshUrl,
      return_url: returnUrl,
      type: 'account_onboarding'
    })

    return accLink
  }

  /**
   * Create a payment intent
   */
  static async createPaymentIntent(amount: number, currency: string, customerId?: string) {
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100),
      currency,
      customer: customerId,

      payment_method: 'pm_card_visa',
      confirm: true,
      capture_method: 'automatic',

      automatic_payment_methods: {
        enabled: true,
        allow_redirects: 'never',
      },
    })

    return paymentIntent
  }

  /**
   * Transfer funds
   */
  static async transferToConnectedAccount(accountId: string, amount: number, currency = 'usd') {
    const transfer = await stripe.transfers.create({
      amount: Math.round(amount * 100),
      currency,
      destination: accountId,
    })
    return transfer
  }

  static async distributeRevenue(txn: Transaction, recipients: Recipient[]) {
    const currency = txn.currency || 'usd'
    const transfers: Stripe.Response<Stripe.Transfer>[] = []

    for (const r of recipients) {
      const amount = (txn.amount * r.percentage) / 100
      if (amount <= 0) continue

      const t = await StripeService.transferToConnectedAccount(
        r.accountId,
        amount,
        currency
      )

      transfers.push(t)
    }

    return transfers
  }

  static async getBalance() {
    return stripe.balance.retrieve()
  }

  static async getConnectedAccountBalance(accountId: string) {
    return stripe.balance.retrieve({ stripeAccount: accountId })
  }

  static async listTransfers(limit = 10) {
    return stripe.transfers.list({ limit })
  }

  static async getStripeAccountIdForUser(userId: string): Promise<string | null> {
    const result = await pool.query(
      `SELECT stripe_account_id FROM stripe_accounts WHERE user_id = $1 LIMIT 1`,
      [userId]
    )

    if (result.rowCount === 0) return null

    return result.rows[0].stripe_account_id
  }

  /**
   * Verify Stripe webhook payload and return event
   */
  static verifyWebhook(payload: string, sig: string): Stripe.Event {
    if (!process.env.STRIPE_WEBHOOK_SECRET) {
      throw new Error('STRIPE_WEBHOOK_SECRET is not defined in .env')
    }

    try {
      const event = stripe.webhooks.constructEvent(
        payload,
        sig,
        process.env.STRIPE_WEBHOOK_SECRET
      )
      return event
    } catch (err) {
      console.error('Stripe webhook signature verification failed:', err)
      throw new Error('Webhook verification failed')
    }
  }
}

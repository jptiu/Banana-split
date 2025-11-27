// src/controllers/plaid.controller.ts
import type { Context } from 'hono'
import { PlaidService } from '../services/plaid.service.js'
import { StripeService } from '../services/stripe.service.js'
import { getErrorMessage } from '../utils/getErrorMessage.js'
import { pool } from '../config/db.js'

export class PlaidController {
  // Generate Link Token
  static async generateLinkToken(c: Context) {
    try {
      const userId = c.get('userId')
      const data = await PlaidService.generatePlaidLinkToken(userId)
      return c.json(data)
    } catch (err: unknown) {
      console.error('Error generating link token:', err)
      return c.json({ error: getErrorMessage(err) }, 500)
    }
  }

  // Exchange Public Token
  static async exchangePublicToken(c: Context) {
    try {
      const { public_token } = await c.req.json()
      if (!public_token) {
        return c.json({ error: 'public_token is required' }, 400)
      }

      // Get user_id from context (logged-in user)
      const userId = c.get('userId')
      if (!userId) return c.json({ error: 'Unauthorized' }, 401)

      // Exchange public token for access token
      const data = await PlaidService.exchangePlaidPublicToken(public_token)

      // Store in database
      await pool.query(
        `INSERT INTO plaid_accounts (user_id, access_token, item_id) VALUES ($1, $2, $3)
       ON CONFLICT (user_id) DO UPDATE SET access_token = $2, item_id = $3`,
        [userId, data.access_token, data.item_id]
      )

      return c.json(data)
    } catch (err: unknown) {
      console.error('Error exchanging public token:', err)
      return c.json({ error: getErrorMessage(err) }, 500)
    }
  }

  // Create Sandbox Public Token
  static async createSandboxPublicToken(c: Context) {
    try {
      const data = await PlaidService.createPlaidSandboxPublicToken()
      return c.json(data)
    } catch (err: unknown) {
      console.error('Error creating sandbox public token:', err)
      return c.json({ error: getErrorMessage(err) }, 500)
    }
  }

  // Get Accounts
  static async getAccounts(c: Context) {
    try {
      const { access_token } = await c.req.json()
      if (!access_token) {
        return c.json({ error: 'access_token is required' }, 400)
      }

      const data = await PlaidService.getPlaidAccounts(access_token)
      return c.json(data)
    } catch (err: unknown) {
      console.error('Error getting accounts:', err)
      return c.json({ error: getErrorMessage(err) }, 500)
    }
  }

  // Get Balances
  static async getBalances(c: Context) {
    try {
      const { access_token } = await c.req.json()
      if (!access_token) {
        return c.json({ error: 'access_token is required' }, 400)
      }

      const data = await PlaidService.getPlaidBalances(access_token)
      return c.json(data)
    } catch (err: unknown) {
      console.error('Error getting balances:', err)
      return c.json({ error: getErrorMessage(err) }, 500)
    }
  }

  // Get Transactions
  static async getTransactions(c: Context) {
    try {
      const { access_token, start_date, end_date } = await c.req.json()

      if (!access_token || !start_date || !end_date) {
        return c.json(
          { error: 'access_token, start_date, and end_date are required' },
          400
        )
      }

      const { transactions } = await PlaidService.getPlaidTransactions(
        access_token,
        start_date,
        end_date
      )

      return c.json(transactions)
    } catch (err: unknown) {
      console.error('Error getting transactions:', err)
      return c.json({ error: getErrorMessage(err) }, 500)
    }
  }

  // Get Item info
  static async getItem(c: Context) {
    try {
      const { access_token } = await c.req.json()
      if (!access_token) {
        return c.json({ error: 'access_token is required' }, 400)
      }

      const data = await PlaidService.getPlaidItem(access_token)
      return c.json(data)
    } catch (err: unknown) {
      console.error('Error getting item info:', err)
      return c.json({ error: getErrorMessage(err) }, 500)
    }
  }

  static async handleWebhook(c: Context) {
    try {
      const body = await c.req.json()
      const { webhook_type, item_id } = body

      if (webhook_type !== 'TRANSACTIONS') {
        return c.json({ status: 'ignored' })
      }

      // 1. Get access token
      const accessToken = await PlaidService.getAccessTokenFromItemId(item_id)
      if (!accessToken) {
        return c.json({ error: 'Access token not found' }, 400)
      }

      // 2. Fetch recent Plaid transactions
      const endDate = new Date().toISOString().split('T')[0]
      const startDateObj = new Date()
      startDateObj.setDate(startDateObj.getDate() - 1)
      const startDate = startDateObj.toISOString().split('T')[0]

      const { transactions } = await PlaidService.getPlaidTransactions(
        accessToken,
        startDate,
        endDate
      )

      const results = []

      // 3. Loop through new deposits
      for (const txn of transactions) {

        // ignore negative amounts
        if (txn.amount <= 0) continue

        // 4. Create Stripe ACH payment intent
        const paymentIntent = await StripeService.createPaymentIntent(
          txn.amount,
          'usd'
        )

        // 5. record
        results.push({
          transactionId: txn.transaction_id,
          amount: txn.amount,
          paymentIntentId: paymentIntent.id
        })
      }

      return c.json({ status: 'ok', processed: results })

    } catch (err) {
      console.error('Error handling Plaid webhook:', err)
      return c.json({ error: getErrorMessage(err) }, 500)
    }
  }

  /**
   * Trigger a Plaid sandbox webhook for testing
   * Only works in sandbox environment
   */
  static async fireSandboxWebhook(c: Context) {
    try {
      const { access_token } = await c.req.json();

      if (!access_token) {
        return c.json({ error: 'access token is required' }, 400);
      }

      await PlaidService.firePlaidSandboxWebhook(
        access_token,
      );

      return c.json({ status: 'ok' });
    } catch (err: unknown) {
      console.error('Error firing sandbox webhook:', err);
      return c.json({ error: getErrorMessage(err) }, 500);
    }
  }
}

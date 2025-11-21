import type { Context } from 'hono'
import { PlaidService } from '../services/plaid.service.js'
import { getErrorMessage } from '../utils/getErrorMessage.js'

// Generate Link Token
export const generateLinkToken = async (c: Context) => {
  try {
    const data = await PlaidService.generatePlaidLinkToken()
    return c.json(data)
  } catch (err: unknown) {
    console.error('Error generating link token:', err)
    return c.json({ error: getErrorMessage(err) }, 500)
  }
}

// Exchange Public Token
export const exchangePublicToken = async (c: Context) => {
  try {
    const { public_token } = await c.req.json()
    if (!public_token) return c.json({ error: 'public_token is required' }, 400)

    const data = await PlaidService.exchangePlaidPublicToken(public_token)
    return c.json(data)
  } catch (err: unknown) {
    console.error('Error exchanging public token:', err)
    return c.json({ error: getErrorMessage(err) }, 500)
  }
}

// Create Sandbox Public Token
export const createSandboxPublicToken = async (c: Context) => {
  try {
    const data = await PlaidService.createPlaidSandboxPublicToken()
    return c.json(data)
  } catch (err: unknown) {
    console.error('Error creating sandbox public token:', err)
    return c.json({ error: getErrorMessage(err) }, 500)
  }
}

// Get Accounts
export const getAccounts = async (c: Context) => {
  try {
    const { access_token } = await c.req.json()
    if (!access_token) return c.json({ error: 'access_token is required' }, 400)

    const data = await PlaidService.getPlaidAccounts(access_token)
    return c.json(data)
  } catch (err: unknown) {
    console.error('Error getting accounts:', err)
    return c.json({ error: getErrorMessage(err) }, 500)
  }
}

// Get Balances
export const getBalances = async (c: Context) => {
  try {
    const { access_token } = await c.req.json()
    if (!access_token) return c.json({ error: 'access_token is required' }, 400)

    const data = await PlaidService.getPlaidBalances(access_token)
    return c.json(data)
  } catch (err: unknown) {
    console.error('Error getting balances:', err)
    return c.json({ error: getErrorMessage(err) }, 500)
  }
}

// Get Transactions
export const getTransactions = async (c: Context) => {
  try {
    const { access_token, start_date, end_date } = await c.req.json()
    if (!access_token || !start_date || !end_date) {
      return c.json(
        { error: 'access_token, start_date, and end_date are required' },
        400
      )
    }

    const data = await PlaidService.getPlaidTransactions(
      access_token,
      start_date,
      end_date
    )

    return c.json(data)
  } catch (err: unknown) {
    console.error('Error getting transactions:', err)
    return c.json({ error: getErrorMessage(err) }, 500)
  }
}

// Get Item info
export const getItem = async (c: Context) => {
  try {
    const { access_token } = await c.req.json()
    if (!access_token) return c.json({ error: 'access_token is required' }, 400)

    const data = await PlaidService.getPlaidItem(access_token)
    return c.json(data)
  } catch (err: unknown) {
    console.error('Error getting item info:', err)
    return c.json({ error: getErrorMessage(err) }, 500)
  }
}
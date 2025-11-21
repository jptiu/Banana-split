import { PlaidService } from '../services/plaid.service.js'
import { getErrorMessage } from '../utils/getErrorMessage.js'

// Generate Link Token
export const generateLinkToken = async () => {
  try {
    return await PlaidService.generateLinkToken()
  } catch (err: unknown) {
    console.error('Error generating link token:', err)
    throw new Error(getErrorMessage(err))
  }
}

// Exchange Public Token
export const exchangePublicToken = async (publicToken: string) => {
  try {
    return await PlaidService.exchangePublicToken(publicToken)
  } catch (err: unknown) {
    console.error('Error exchanging public token:', err)
    throw new Error(getErrorMessage(err))
  }
}

// Sandbox Public Token
export const createSandboxPublicToken = async () => {
  try {
    return await PlaidService.createSandboxPublicToken()
  } catch (err: unknown) {
    console.error('Error creating sandbox public token:', err)
    throw new Error(getErrorMessage(err))
  }
}

// Get Accounts
export const getAccounts = async (accessToken: string) => {
  try {
    return await PlaidService.getAccounts(accessToken)
  } catch (err: unknown) {
    console.error('Error getting accounts:', err)
    throw new Error(getErrorMessage(err))
  }
}

// Get Balances
export const getBalances = async (accessToken: string) => {
  try {
    return await PlaidService.getBalances(accessToken)
  } catch (err: unknown) {
    console.error('Error getting balances:', err)
    throw new Error(getErrorMessage(err))
  }
}

// Get Transactions
export const getTransactions = async (accessToken: string, startDate: string, endDate: string) => {
  try {
    return await PlaidService.getTransactions(accessToken, startDate, endDate)
  } catch (err: unknown) {
    console.error('Error getting transactions:', err)
    throw new Error(getErrorMessage(err))
  }
}

// Get Item info
export const getItem = async (accessToken: string) => {
  try {
    return await PlaidService.getItem(accessToken)
  } catch (err: unknown) {
    console.error('Error getting item info:', err)
    throw new Error(getErrorMessage(err))
  }
}

import { plaidClient } from '../config/plaid.js'
import { Products, CountryCode } from 'plaid'

export class PlaidService {
    // Generate a Link Token for a user
    static async generatePlaidLinkToken(userId: string = 'user-123') {
        const response = await plaidClient.linkTokenCreate({
            user: { client_user_id: userId },
            client_name: 'Banana Splits',
            products: [Products.Auth, Products.Transactions],
            country_codes: Object.values(CountryCode),
            language: 'en',
        })
        return response.data
    }

    // Exchange a public token for an access token
    static async exchangePlaidPublicToken(publicToken: string) {
        const response = await plaidClient.itemPublicTokenExchange({
            public_token: publicToken,
        })
        return response.data
    }

    // Create a sandbox public token
    static async createPlaidSandboxPublicToken() {
        const response = await plaidClient.sandboxPublicTokenCreate({
            institution_id: 'ins_109508', // Example sandbox bank
            initial_products: [Products.Auth, Products.Transactions],
        })
        return response.data
    }

    // Get all accounts for an access token
    static async getPlaidAccounts(accessToken: string) {
        const response = await plaidClient.accountsGet({ access_token: accessToken })
        return response.data
    }

    // Get account balances
    static async getPlaidBalances(accessToken: string) {
        const response = await plaidClient.accountsBalanceGet({ access_token: accessToken })
        return response.data
    }

    // Get transactions within a date range
    static async getPlaidTransactions(accessToken: string, startDate: string, endDate: string) {
        const response = await plaidClient.transactionsGet({
            access_token: accessToken,
            start_date: startDate,
            end_date: endDate,
        })
        return response.data
    }

    // Get item info (metadata)
    static async getPlaidItem(accessToken: string) {
        const response = await plaidClient.itemGet({ access_token: accessToken })
        return response.data
    }
}

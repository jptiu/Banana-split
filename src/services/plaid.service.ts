import { plaidClient } from '../config/plaid.js'
import { Products, CountryCode } from 'plaid'
import { pool } from '../config/db.js'
import {
    SandboxItemFireWebhookRequestWebhookCodeEnum,
    WebhookType,
} from 'plaid'

import type { SandboxTransactionsCreateRequest } from 'plaid'
export class PlaidService {
    // Generate a Link Token for a user
    static async generatePlaidLinkToken(userId: string) {
        const response = await plaidClient.linkTokenCreate({
            user: { client_user_id: userId },
            client_name: 'Banana Splits',
            products: [Products.Auth, Products.Transactions],
            country_codes: Object.values(CountryCode),
            language: 'en',
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

    // 1️⃣ Exchange public token for access token
    static async exchangePlaidPublicToken(publicToken: string) {
        const response = await plaidClient.itemPublicTokenExchange({
            public_token: publicToken,
        })
        const accessToken = response.data.access_token

        // 2️⃣ Update webhook immediately after exchange
        if (!process.env.PLAID_SANDBOX_WEBHOOK_URL) {
            throw new Error('PLAID_SANDBOX_WEBHOOK is not defined in .env')
        }

        await plaidClient.itemWebhookUpdate({
            access_token: accessToken,
            webhook: process.env.PLAID_SANDBOX_WEBHOOK_URL,
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

    static async simulateTransaction(
        accessToken: string,
        date: string,
        amount: number,
        description = 'Sandbox Test Transaction'
    ) {
        const requestBody: SandboxTransactionsCreateRequest = {
            access_token: accessToken,
            transactions: [
                {
                    amount,
                    date_posted: date,
                    date_transacted: date,
                    description,
                },
            ],
        }
        await plaidClient.transactionsRefresh({ access_token: accessToken });

        const response = await plaidClient.sandboxTransactionsCreate(requestBody)
        return response.data
    }

    /**
     * Get the access token for a given Plaid item_id
    */
    static async getAccessTokenFromItemId(itemId: string): Promise<string | null> {
        const res = await pool.query(
            'SELECT access_token FROM plaid_accounts WHERE item_id = $1 LIMIT 1',
            [itemId]
        )
        if (res.rows.length === 0) return null
        return res.rows[0].access_token
    }

    /**
     * Fire a sandbox webhook to simulate a transaction update
     * Only works in Plaid sandbox environment
     */

    // Simulate a sandbox transaction + refresh + fire webhook + fetch transactions
    static async firePlaidSandboxWebhook(accessToken: string) {
        try {
            await plaidClient.sandboxItemFireWebhook({
                access_token: accessToken,
                webhook_code: SandboxItemFireWebhookRequestWebhookCodeEnum.DefaultUpdate,
                webhook_type: WebhookType.Transactions,
            })

            console.log('Sandbox transactions webhook fired successfully')
        } catch (err) {
            console.error('Error firing Plaid sandbox webhook:', err)
            throw err
        }
    }
}

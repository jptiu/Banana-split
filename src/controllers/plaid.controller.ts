import { plaidClient } from '../config/plaid.js'
import { Products, CountryCode } from 'plaid'

export const generateLinkToken = async () => {
    const response = await plaidClient.linkTokenCreate({
        user: { client_user_id: 'user-123' },
        client_name: 'My App',
        products: [Products.Auth, Products.Transactions],
        country_codes: Object.values(CountryCode),
        language: 'en',
    })

    return response.data
}

export const exchangePublicToken = async (publicToken: string) => {
    const response = await plaidClient.itemPublicTokenExchange({
        public_token: publicToken,
    })

    return response.data
}
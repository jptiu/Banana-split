// src/services/stripe.service.ts
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-11-17.clover", // required by your Stripe SDK version
});

export class StripeService {
  // ----------------------------------------------------
  // CUSTOMERS
  // ----------------------------------------------------

  static async createCustomer(name: string, email: string) {
    return await stripe.customers.create({ name, email });
  }

  static async getCustomer(customerId: string) {
    return await stripe.customers.retrieve(customerId);
  }

  // ----------------------------------------------------
  // BANK ACCOUNTS (ACH via Financial Connections)
  // ----------------------------------------------------
  // Plaid direct bank tokens are deprecated — use Financial Connections

  static async createFinancialConnectionsSession(customerId: string) {
    return await stripe.financialConnections.sessions.create({
      account_holder: {
        type: "customer",
        customer: customerId,
      },
      permissions: ["payment_method", "balances", "ownership"],
    });
  }

  static async linkBankAccount(customerId: string, accountId: string) {
    // Attach a Financial Connections account as a payment method
    return await stripe.customers.update(customerId, {
      invoice_settings: {
        default_payment_method: accountId,
      },
    });
  }

  // ----------------------------------------------------
  // PAYMENTS
  // ----------------------------------------------------

  static async createPaymentIntent(
    customerId: string,
    amount: number,
    currency = "usd",
    paymentMethodId?: string
  ) {
    return await stripe.paymentIntents.create({
      amount,
      currency,
      customer: customerId,
      payment_method: paymentMethodId,
      confirm: !!paymentMethodId,
      off_session: !!paymentMethodId,
      automatic_payment_methods: paymentMethodId
        ? undefined
        : { enabled: true },
    });
  }

  // ----------------------------------------------------
  // CONNECT (Revenue Sharing)
  // ----------------------------------------------------

  static async createConnectedAccount(email: string) {
    return await stripe.accounts.create({
      type: "express",
      email,
      country: "US",
      capabilities: {
        transfers: { requested: true },
        card_payments: { requested: true },
      },
    });
  }

  static async createAccountLink(accountId: string, refreshUrl: string, returnUrl: string) {
    return await stripe.accountLinks.create({
      account: accountId,
      refresh_url: refreshUrl,
      return_url: returnUrl,
      type: "account_onboarding",
    });
  }

  static async transferToConnectedAccount(
    amount: number,
    currency: string,
    connectedAccountId: string
  ) {
    return await stripe.transfers.create({
      amount,
      currency,
      destination: connectedAccountId,
    });
  }

  // ----------------------------------------------------
  // UTILITIES
  // ----------------------------------------------------

  static async listPaymentIntents(customerId: string) {
    return await stripe.paymentIntents.list({ customer: customerId, limit: 10 });
  }

  static async listConnectedAccounts() {
    return await stripe.accounts.list({ limit: 10 });
  }
}

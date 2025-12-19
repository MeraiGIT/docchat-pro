import Stripe from 'stripe'

// Environment variable validation
const stripeSecretKey = process.env.STRIPE_SECRET_KEY
const stripePublishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY

if (!stripeSecretKey) {
  throw new Error('Missing STRIPE_SECRET_KEY environment variable')
}

if (!stripePublishableKey) {
  throw new Error('Missing NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY environment variable')
}

/**
 * Initialize Stripe client
 */
export const stripe = new Stripe(stripeSecretKey, {
  apiVersion: '2025-12-15.clover',
  typescript: true,
})

/**
 * Product configuration
 */
export const PRODUCTS = {
  PRO_MONTHLY: {
    priceId: process.env.STRIPE_PRO_MONTHLY_PRICE_ID || '',
    amount: 2000, // $20.00 in cents
    name: 'DocChat Pro Monthly',
    interval: 'month' as const,
  },
  PRO_YEARLY: {
    priceId: process.env.STRIPE_PRO_YEARLY_PRICE_ID || '',
    amount: 20000, // $200.00 in cents
    name: 'DocChat Pro Yearly',
    interval: 'year' as const,
  },
} as const

/**
 * Type for subscription tier
 */
export type SubscriptionTier = 'free' | 'pro'

/**
 * Type for subscription status
 */
export type SubscriptionStatus = 
  | 'active' 
  | 'canceled' 
  | 'incomplete' 
  | 'incomplete_expired' 
  | 'past_due' 
  | 'trialing' 
  | 'unpaid'

/**
 * Create a Stripe Checkout Session for subscription
 * @param customerId - Stripe customer ID (optional, will create if not provided)
 * @param priceId - Stripe price ID for the subscription
 * @param successUrl - URL to redirect to after successful payment
 * @param cancelUrl - URL to redirect to after canceled payment
 * @returns Stripe Checkout Session
 */
export async function createCheckoutSession(
  customerId: string | null,
  priceId: string,
  successUrl: string,
  cancelUrl: string
): Promise<Stripe.Checkout.Session> {
  try {
    const sessionParams: Stripe.Checkout.SessionCreateParams = {
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: successUrl,
      cancel_url: cancelUrl,
      allow_promotion_codes: true,
    }
    
    // If customer exists, use it; otherwise Stripe will create a new one
    if (customerId) {
      sessionParams.customer = customerId
    } else {
      sessionParams.customer_email = undefined // Will be collected during checkout
    }
    
    const session = await stripe.checkout.sessions.create(sessionParams)
    
    if (!session.url) {
      throw new Error('Failed to create checkout session: no URL returned')
    }
    
    return session
  } catch (error) {
    console.error('Error creating checkout session:', error)
    throw new Error(
      error instanceof Error
        ? `Failed to create checkout session: ${error.message}`
        : 'Failed to create checkout session'
    )
  }
}

/**
 * Create a Stripe Customer Portal session
 * Allows customers to manage their subscription, payment methods, and billing
 * @param customerId - Stripe customer ID
 * @param returnUrl - URL to return to after managing subscription
 * @returns Stripe Billing Portal Session
 */
export async function createCustomerPortalSession(
  customerId: string,
  returnUrl: string
): Promise<Stripe.BillingPortal.Session> {
  try {
    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: returnUrl,
    })
    
    return session
  } catch (error) {
    console.error('Error creating customer portal session:', error)
    throw new Error(
      error instanceof Error
        ? `Failed to create customer portal session: ${error.message}`
        : 'Failed to create customer portal session'
    )
  }
}

/**
 * Get subscription details from Stripe
 * @param subscriptionId - Stripe subscription ID
 * @returns Stripe Subscription object
 */
export async function getSubscription(
  subscriptionId: string
): Promise<Stripe.Subscription> {
  try {
    const subscription = await stripe.subscriptions.retrieve(subscriptionId)
    return subscription
  } catch (error) {
    console.error('Error getting subscription:', error)
    throw new Error(
      error instanceof Error
        ? `Failed to get subscription: ${error.message}`
        : 'Failed to get subscription'
    )
  }
}

/**
 * Cancel a subscription immediately
 * @param subscriptionId - Stripe subscription ID
 * @returns Canceled Stripe Subscription object
 */
export async function cancelSubscription(
  subscriptionId: string
): Promise<Stripe.Subscription> {
  try {
    const subscription = await stripe.subscriptions.cancel(subscriptionId)
    return subscription
  } catch (error) {
    console.error('Error canceling subscription:', error)
    throw new Error(
      error instanceof Error
        ? `Failed to cancel subscription: ${error.message}`
        : 'Failed to cancel subscription'
    )
  }
}


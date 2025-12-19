import { NextRequest, NextResponse } from 'next/server'
import { headers } from 'next/headers'
import Stripe from 'stripe'
import { stripe } from '@/lib/stripe'
import { createServiceRoleSupabase } from '@/lib/supabase'

// Get webhook secret from environment
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET

if (!webhookSecret) {
  throw new Error('Missing STRIPE_WEBHOOK_SECRET environment variable')
}

/**
 * Handle Stripe Webhooks
 * 
 * POST /api/stripe/webhook
 * 
 * Processes Stripe webhook events and updates user subscriptions
 * 
 * Events handled:
 * - checkout.session.completed → Activate subscription
 * - customer.subscription.updated → Update subscription status
 * - customer.subscription.deleted → Downgrade to free
 * - invoice.payment_succeeded → Extend subscription period
 * - invoice.payment_failed → Mark as past_due
 */
export async function POST(request: NextRequest) {
  const body = await request.text()
  const headersList = await headers()
  const signature = headersList.get('stripe-signature')

  if (!signature) {
    return NextResponse.json(
      { error: 'Missing stripe-signature header' },
      { status: 400 }
    )
  }

  let event: Stripe.Event

  try {
    // Verify webhook signature
    if (!webhookSecret) {
      throw new Error('STRIPE_WEBHOOK_SECRET is not configured')
    }
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
  } catch (err) {
    console.error('Webhook signature verification failed:', err)
    return NextResponse.json(
      { error: 'Invalid signature' },
      { status: 400 }
    )
  }

  const supabase = createServiceRoleSupabase()

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session

        if (session.mode === 'subscription' && session.customer && session.customer_email) {
          const subscriptionId = session.subscription as string
          const customerId = session.customer as string

          // Get subscription details
          const subscription = await stripe.subscriptions.retrieve(subscriptionId)

          // Find user by customer ID or email
          let { data: user } = await supabase
            .from('users')
            .select('id')
            .eq('stripe_customer_id', customerId)
            .single()

          // If not found by customer ID, try email
          if (!user && session.customer_email) {
            const { data: userByEmail } = await supabase
              .from('users')
              .select('id')
              .eq('email', session.customer_email)
              .single()
            user = userByEmail
          }

          if (user) {
            // Update user subscription
            await supabase
              .from('users')
              .update({
                subscription_tier: 'pro',
                subscription_status: subscription.status,
                stripe_subscription_id: subscriptionId,
                stripe_customer_id: customerId,
                updated_at: new Date().toISOString(),
              })
              .eq('id', user.id)
          }
        }
        break
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription
        const customerId = subscription.customer as string

        // Find user by customer ID
        const { data: user } = await supabase
          .from('users')
          .select('id')
          .eq('stripe_customer_id', customerId)
          .single()

        if (user) {
          // Update subscription status
          await supabase
            .from('users')
            .update({
              subscription_status: subscription.status,
              updated_at: new Date().toISOString(),
            })
            .eq('id', user.id)
        }
        break
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription
        const customerId = subscription.customer as string

        // Find user by customer ID
        const { data: user } = await supabase
          .from('users')
          .select('id')
          .eq('stripe_customer_id', customerId)
          .single()

        if (user) {
          // Downgrade to free tier
          await supabase
            .from('users')
            .update({
              subscription_tier: 'free',
              subscription_status: 'canceled',
              stripe_subscription_id: null,
              updated_at: new Date().toISOString(),
            })
            .eq('id', user.id)
        }
        break
      }

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as Stripe.Invoice & { subscription?: string | Stripe.Subscription }
        const customerId = invoice.customer as string
        // Get subscription ID from invoice - it may be expanded or just an ID
        const subscriptionId = 
          typeof invoice.subscription === 'string' 
            ? invoice.subscription 
            : invoice.subscription?.id || null

        if (subscriptionId) {
          // Find user by customer ID
          const { data: user } = await supabase
            .from('users')
            .select('id')
            .eq('stripe_customer_id', customerId)
            .single()

          if (user) {
            // Get subscription to check status
            const subscription = await stripe.subscriptions.retrieve(subscriptionId)

            // Update subscription status
            await supabase
              .from('users')
              .update({
                subscription_status: subscription.status,
                subscription_tier: 'pro',
                updated_at: new Date().toISOString(),
              })
              .eq('id', user.id)
          }
        }
        break
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice
        const customerId = invoice.customer as string

        // Find user by customer ID
        const { data: user } = await supabase
          .from('users')
          .select('id')
          .eq('stripe_customer_id', customerId)
          .single()

        if (user) {
          // Mark subscription as past_due
          await supabase
            .from('users')
            .update({
              subscription_status: 'past_due',
              updated_at: new Date().toISOString(),
            })
            .eq('id', user.id)
        }
        break
      }

      default:
        console.log(`Unhandled event type: ${event.type}`)
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error('Error processing webhook:', error)
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'Webhook processing failed',
      },
      { status: 500 }
    )
  }
}


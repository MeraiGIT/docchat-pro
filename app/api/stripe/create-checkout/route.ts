import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { createCheckoutSession, PRODUCTS } from '@/lib/stripe'
import { createServiceRoleSupabase } from '@/lib/supabase'

/**
 * Create Stripe Checkout Session
 * 
 * POST /api/stripe/create-checkout
 * Body: { tier: 'monthly' | 'annual' } OR { priceId: string }
 * 
 * Creates a Stripe checkout session for subscription
 * Returns session URL for redirect
 * 
 * STRIPE SETUP INSTRUCTIONS:
 * 1. Create products in Stripe Dashboard:
 *    - Product: "DocChat Pro"
 *    - Price 1: $20/month (recurring, monthly)
 *    - Price 2: $200/year (recurring, yearly)
 * 
 * 2. Copy price IDs to environment variables:
 *    STRIPE_PRO_MONTHLY_PRICE_ID=price_xxx
 *    STRIPE_PRO_YEARLY_PRICE_ID=price_xxx
 * 
 * 3. Set up webhook endpoint:
 *    - URL: https://your-domain.vercel.app/api/stripe/webhook
 *    - Events: checkout.session.completed, customer.subscription.*, invoice.*
 *    - Copy webhook secret to STRIPE_WEBHOOK_SECRET
 * 
 * TESTING:
 * - Use Stripe test cards: 4242 4242 4242 4242
 * - Test mode: Use test API keys
 */
export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { priceId, tier } = body

    // Get price ID from tier or use provided priceId
    let finalPriceId = priceId
    if (!finalPriceId && tier) {
      if (tier === 'monthly') {
        finalPriceId = process.env.STRIPE_PRO_MONTHLY_PRICE_ID
      } else if (tier === 'annual' || tier === 'yearly') {
        finalPriceId = process.env.STRIPE_PRO_YEARLY_PRICE_ID
      }
    }

    if (!finalPriceId) {
      return NextResponse.json(
        { error: 'Price ID or tier is required' },
        { status: 400 }
      )
    }

    // Validate price ID matches our products
    const validPriceIds = [
      process.env.STRIPE_PRO_MONTHLY_PRICE_ID,
      process.env.STRIPE_PRO_YEARLY_PRICE_ID,
    ].filter(Boolean)

    if (!validPriceIds.includes(finalPriceId)) {
      return NextResponse.json(
        { error: 'Invalid price ID' },
        { status: 400 }
      )
    }

    // Get user's Stripe customer ID if exists
    const supabase = createServiceRoleSupabase()
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('stripe_customer_id, email')
      .eq('id', session.user.id)
      .single()

    if (userError || !user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    // Create checkout session
    const baseUrl = process.env.NEXTAUTH_URL || request.nextUrl.origin
    const successUrl = `${baseUrl}/dashboard?session_id={CHECKOUT_SESSION_ID}`
    const cancelUrl = `${baseUrl}/pricing`

    const checkoutSession = await createCheckoutSession(
      user.stripe_customer_id,
      finalPriceId,
      successUrl,
      cancelUrl
    )

    return NextResponse.json({
      sessionId: checkoutSession.id,
      url: checkoutSession.url,
    })
  } catch (error) {
    console.error('Error creating checkout session:', error)
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'Failed to create checkout session',
      },
      { status: 500 }
    )
  }
}


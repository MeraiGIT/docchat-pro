import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { createCustomerPortalSession } from '@/lib/stripe'
import { createServiceRoleSupabase } from '@/lib/supabase'

/**
 * Create Stripe Customer Portal Session
 * 
 * POST /api/stripe/create-portal
 * 
 * Creates a Stripe billing portal session for managing subscription
 * Returns portal URL for redirect
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

    // Get user's Stripe customer ID
    const supabase = createServiceRoleSupabase()
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('stripe_customer_id')
      .eq('id', session.user.id)
      .single()

    if (userError || !user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    if (!user.stripe_customer_id) {
      return NextResponse.json(
        { error: 'No active subscription found' },
        { status: 400 }
      )
    }

    // Create portal session
    const baseUrl = process.env.NEXTAUTH_URL || request.nextUrl.origin
    const returnUrl = `${baseUrl}/dashboard`

    const portalSession = await createCustomerPortalSession(
      user.stripe_customer_id,
      returnUrl
    )

    return NextResponse.json({
      url: portalSession.url,
    })
  } catch (error) {
    console.error('Error creating portal session:', error)
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'Failed to create portal session',
      },
      { status: 500 }
    )
  }
}


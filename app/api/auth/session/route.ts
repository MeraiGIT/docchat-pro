import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '../[...nextauth]/route'
import { createServerSupabase, createServiceRoleSupabase } from '@/lib/supabase'
import { getUserUsage } from '@/lib/rate-limit'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ user: null }, { status: 200 })
    }

    // Get full user data from Supabase
    const supabase = await createServerSupabase()
    const { data: users, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('id', session.user.id)
      .limit(1)
    
    const user = users && users.length > 0 ? users[0] : null
    
    if (userError || !user) {
      // If user doesn't exist in users table, create one (shouldn't happen but handle gracefully)
      const serviceSupabase = createServiceRoleSupabase()
      const { data: newUser, error: createError } = await serviceSupabase
        .from('users')
        .insert({
          id: session.user.id,
          email: session.user.email,
          name: session.user.name || null,
          subscription_tier: 'free',
          subscription_status: 'inactive',
        })
        .select()
        .single()

      if (createError || !newUser) {
        // Return session data from NextAuth even if user profile creation failed
        return NextResponse.json({
          user: {
            id: session.user.id,
            email: session.user.email,
            name: session.user.name,
            subscription_tier: session.user.subscription_tier || 'free',
            subscription_status: 'inactive',
          },
          usage: {
            chatsCount: 0,
            chatsLimit: 3,
            documentsCount: 0,
            documentsLimit: 3,
            isPro: false,
          },
        })
      }
      
      // Use the newly created user
      const finalUser = newUser
      const usage = await getUserUsage(finalUser.id)
      
      return NextResponse.json({
        user: {
          id: finalUser.id,
          email: finalUser.email,
          name: finalUser.name,
          subscription_tier: finalUser.subscription_tier,
          subscription_status: finalUser.subscription_status,
          stripe_customer_id: finalUser.stripe_customer_id,
          stripe_subscription_id: finalUser.stripe_subscription_id,
          created_at: finalUser.created_at,
          updated_at: finalUser.updated_at,
        },
        usage: {
          chatsCount: usage.chatsCount,
          chatsLimit: usage.chatsLimit,
          documentsCount: usage.documentsCount,
          documentsLimit: usage.documentsLimit,
          isPro: usage.isPro,
        },
      })
    }

    // Get usage statistics
    const usage = await getUserUsage(session.user.id)

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        subscription_tier: user.subscription_tier,
        subscription_status: user.subscription_status,
        stripe_customer_id: user.stripe_customer_id,
        stripe_subscription_id: user.stripe_subscription_id,
        created_at: user.created_at,
        updated_at: user.updated_at,
      },
      usage: {
        chatsCount: usage.chatsCount,
        chatsLimit: usage.chatsLimit,
        documentsCount: usage.documentsCount,
        documentsLimit: usage.documentsLimit,
        isPro: usage.isPro,
      },
    })
  } catch (error) {
    console.error('Session API error:', error)
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'Failed to get session data',
      },
      { status: 500 }
    )
  }
}


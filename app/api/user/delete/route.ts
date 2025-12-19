import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { createServiceRoleSupabase } from '@/lib/supabase'
import { stripe } from '@/lib/stripe'

/**
 * DELETE /api/user/delete
 * Delete user account and all associated data
 * WARNING: This is irreversible!
 */
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { password } = body

    if (!password) {
      return NextResponse.json(
        { error: 'Password confirmation is required' },
        { status: 400 }
      )
    }

    const supabase = createServiceRoleSupabase()

    // Verify password
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: session.user.email!,
      password,
    })

    if (authError || !authData.user) {
      return NextResponse.json(
        { error: 'Invalid password' },
        { status: 401 }
      )
    }

    // Get user data
    const { data: user } = await supabase
      .from('users')
      .select('stripe_customer_id, stripe_subscription_id')
      .eq('id', session.user.id)
      .single()

    // Cancel Stripe subscription if exists
    if (user?.stripe_subscription_id) {
      try {
        await stripe.subscriptions.cancel(user.stripe_subscription_id)
      } catch (error) {
        console.error('Error canceling subscription:', error)
        // Continue with deletion even if subscription cancel fails
      }
    }

    // Delete all user data (cascade should handle related records)
    // Delete in order: chunks -> documents -> chats -> usage -> user

    // Delete document chunks
    const { data: documents } = await supabase
      .from('documents')
      .select('id')
      .eq('user_id', session.user.id)

    if (documents && documents.length > 0) {
      const documentIds = documents.map((d) => d.id)
      await supabase
        .from('document_chunks')
        .delete()
        .in('document_id', documentIds)
    }

    // Delete documents
    await supabase
      .from('documents')
      .delete()
      .eq('user_id', session.user.id)

    // Delete chats
    await supabase
      .from('chats')
      .delete()
      .eq('user_id', session.user.id)

    // Delete usage records
    await supabase
      .from('usage')
      .delete()
      .eq('user_id', session.user.id)

    // Delete user profile
    const { error: deleteError } = await supabase
      .from('users')
      .delete()
      .eq('id', session.user.id)

    if (deleteError) {
      console.error('Error deleting user:', deleteError)
      return NextResponse.json(
        { error: 'Failed to delete user account' },
        { status: 500 }
      )
    }

    // Delete auth user
    try {
      await supabase.auth.admin.deleteUser(session.user.id)
    } catch (error) {
      console.error('Error deleting auth user:', error)
      // User profile is deleted, auth user deletion failure is less critical
    }

    return NextResponse.json({
      success: true,
      message: 'Account deleted successfully',
    })
  } catch (error) {
    console.error('Error in DELETE /api/user/delete:', error)
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'Failed to delete account',
      },
      { status: 500 }
    )
  }
}


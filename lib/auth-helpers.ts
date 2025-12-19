import { getServerSession as getNextAuthSession } from 'next-auth/next'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { getCurrentUser as getSupabaseUser, type User } from './supabase'
import { createServerSupabase } from './supabase'

/**
 * Get server session using NextAuth
 * Use this in Server Components and Server Actions
 */
export async function getServerSession() {
  return await getNextAuthSession(authOptions)
}

/**
 * Get current authenticated user from NextAuth session
 * Returns null if not authenticated
 */
export async function getCurrentUser(): Promise<User | null> {
  try {
    const session = await getServerSession()
    
    if (!session?.user?.id) {
      return null
    }

    // Fetch full user data from Supabase
    const supabase = await createServerSupabase()
    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', session.user.id)
      .single()

    if (error || !user) {
      return null
    }

    return user as User
  } catch (error) {
    console.error('Error getting current user:', error)
    return null
  }
}

/**
 * Check if user has access based on subscription tier
 * @param requirePro - If true, requires Pro subscription
 * @returns Object with access status and user data
 */
export async function checkUserAccess(requirePro: boolean = false): Promise<{
  hasAccess: boolean
  user: User | null
  message?: string
}> {
  const user = await getCurrentUser()

  if (!user) {
    return {
      hasAccess: false,
      user: null,
      message: 'Authentication required',
    }
  }

  if (requirePro) {
    const isPro = user.subscription_tier === 'pro' && user.subscription_status === 'active'
    
    if (!isPro) {
      return {
        hasAccess: false,
        user,
        message: 'Pro subscription required',
      }
    }
  }

  return {
    hasAccess: true,
    user,
  }
}

/**
 * Sign out helper
 * Clears NextAuth session and Supabase session
 */
export async function signOut() {
  const { signOut: nextAuthSignOut } = await import('next-auth/react')
  const supabase = await createServerSupabase()
  
  // Sign out from Supabase
  await supabase.auth.signOut()
  
  // Sign out from NextAuth (client-side)
  // Note: This needs to be called from client component
  return nextAuthSignOut()
}


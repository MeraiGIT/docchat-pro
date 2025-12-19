import { getCurrentUser, type User } from './supabase'
import { createServerSupabase } from './supabase'

/**
 * Get the current authenticated user from the session
 * @returns User object if authenticated, null otherwise
 */
export async function getAuthUser(): Promise<User | null> {
  return await getCurrentUser()
}

/**
 * Check if the current user is authenticated
 * @returns true if authenticated, false otherwise
 */
export async function isAuthenticated(): Promise<boolean> {
  const user = await getAuthUser()
  return user !== null
}

/**
 * Get the user's subscription status
 * @returns Object with subscription tier and status
 */
export async function getSubscriptionStatus(): Promise<{
  tier: 'free' | 'pro'
  status: string
  isPro: boolean
} | null> {
  const user = await getAuthUser()
  
  if (!user) {
    return null
  }
  
  return {
    tier: user.subscription_tier,
    status: user.subscription_status,
    isPro: user.subscription_tier === 'pro' && user.subscription_status === 'active',
  }
}

/**
 * Check if user has an active Pro subscription
 * @returns true if user has active Pro subscription, false otherwise
 */
export async function isProUser(): Promise<boolean> {
  const subscriptionStatus = await getSubscriptionStatus()
  return subscriptionStatus?.isPro ?? false
}

/**
 * Require authentication - throws error if not authenticated
 * Use this in Server Actions and Route Handlers that require auth
 * @returns User object
 * @throws Error if not authenticated
 */
export async function requireAuth(): Promise<User> {
  const user = await getAuthUser()
  
  if (!user) {
    throw new Error('Authentication required')
  }
  
  return user
}

/**
 * Require Pro subscription - throws error if not Pro user
 * Use this in Server Actions and Route Handlers that require Pro subscription
 * @returns User object with Pro subscription
 * @throws Error if not authenticated or not Pro user
 */
export async function requirePro(): Promise<User> {
  const user = await requireAuth()
  
  const subscriptionStatus = await getSubscriptionStatus()
  if (!subscriptionStatus?.isPro) {
    throw new Error('Pro subscription required')
  }
  
  return user
}

/**
 * Middleware helper to check authentication
 * Returns user if authenticated, redirects to login if not
 * Use this in middleware.ts
 */
export async function checkAuth(): Promise<{
  user: User | null
  isAuthenticated: boolean
}> {
  try {
    const supabase = await createServerSupabase()
    const { data: { user }, error } = await supabase.auth.getUser()
    
    if (error || !user) {
      return { user: null, isAuthenticated: false }
    }
    
    // Fetch user profile
    const { data: userProfile } = await supabase
      .from('users')
      .select('*')
      .eq('id', user.id)
      .single()
    
    if (!userProfile) {
      return { user: null, isAuthenticated: false }
    }
    
    return { user: userProfile as User, isAuthenticated: true }
  } catch (error) {
    console.error('Error checking auth:', error)
    return { user: null, isAuthenticated: false }
  }
}


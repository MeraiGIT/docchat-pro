import { createServerSupabase, type User, type Usage } from './supabase'

/**
 * Free tier limits
 */
export const FREE_TIER_LIMITS = {
  CHATS_PER_MONTH: 3,
  DOCUMENTS_TOTAL: 3,
} as const

/**
 * Result type for rate limit checks
 */
export type RateLimitResult = {
  allowed: boolean
  message?: string
  currentCount: number
  limit: number
}

/**
 * Get current usage for a user
 * @param userId - User ID
 * @returns Current usage object
 */
async function getCurrentUsage(userId: string): Promise<Usage | null> {
  try {
    const supabase = await createServerSupabase()
    
    // Get current month's usage
    const now = new Date()
    const periodStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
    const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString()
    
    const { data, error } = await supabase
      .from('usage')
      .select('*')
      .eq('user_id', userId)
      .gte('period_start', periodStart)
      .lte('period_end', periodEnd)
      .single()
    
    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
      console.error('Error getting usage:', error)
      return null
    }
    
    return data || null
  } catch (error) {
    console.error('Error getting current usage:', error)
    return null
  }
}

/**
 * Get total document count for a user
 * @param userId - User ID
 * @returns Total document count
 */
async function getDocumentCount(userId: string): Promise<number> {
  try {
    const supabase = await createServerSupabase()
    
    const { count, error } = await supabase
      .from('documents')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
    
    if (error) {
      console.error('Error getting document count:', error)
      return 0
    }
    
    return count || 0
  } catch (error) {
    console.error('Error getting document count:', error)
    return 0
  }
}

/**
 * Get user subscription status by userId
 * @param userId - User ID
 * @returns Subscription status or null if user not found
 */
async function getUserSubscriptionStatus(userId: string): Promise<{
  tier: 'free' | 'pro'
  status: string
  isPro: boolean
} | null> {
  try {
    const supabase = await createServerSupabase()
    
    const { data: user, error } = await supabase
      .from('users')
      .select('subscription_tier, subscription_status')
      .eq('id', userId)
      .single()
    
    if (error || !user) {
      return null
    }
    
    return {
      tier: user.subscription_tier,
      status: user.subscription_status,
      isPro: user.subscription_tier === 'pro' && user.subscription_status === 'active',
    }
  } catch (error) {
    console.error('Error getting user subscription status:', error)
    return null
  }
}

/**
 * Check if user can create a new chat
 * @param userId - User ID
 * @returns Rate limit result
 */
export async function checkChatLimit(userId: string): Promise<RateLimitResult> {
  try {
    const subscriptionStatus = await getUserSubscriptionStatus(userId)
    
    // Pro users have unlimited chats
    if (subscriptionStatus?.isPro) {
      return {
        allowed: true,
        currentCount: 0,
        limit: Infinity,
      }
    }
    
    // Free tier: check monthly chat limit
    const usage = await getCurrentUsage(userId)
    const currentChats = usage?.chats_count || 0
    
    if (currentChats >= FREE_TIER_LIMITS.CHATS_PER_MONTH) {
      return {
        allowed: false,
        message: `You've reached your monthly chat limit of ${FREE_TIER_LIMITS.CHATS_PER_MONTH}. Upgrade to Pro for unlimited chats.`,
        currentCount: currentChats,
        limit: FREE_TIER_LIMITS.CHATS_PER_MONTH,
      }
    }
    
    return {
      allowed: true,
      currentCount: currentChats,
      limit: FREE_TIER_LIMITS.CHATS_PER_MONTH,
    }
  } catch (error) {
    console.error('Error checking chat limit:', error)
    return {
      allowed: false,
      message: 'Error checking chat limit. Please try again.',
      currentCount: 0,
      limit: FREE_TIER_LIMITS.CHATS_PER_MONTH,
    }
  }
}

/**
 * Check if user can upload a new document
 * @param userId - User ID
 * @returns Rate limit result
 */
export async function checkDocumentLimit(userId: string): Promise<RateLimitResult> {
  try {
    const subscriptionStatus = await getUserSubscriptionStatus(userId)
    
    // Pro users have unlimited documents
    if (subscriptionStatus?.isPro) {
      return {
        allowed: true,
        currentCount: 0,
        limit: Infinity,
      }
    }
    
    // Free tier: check total document limit
    const documentCount = await getDocumentCount(userId)
    
    if (documentCount >= FREE_TIER_LIMITS.DOCUMENTS_TOTAL) {
      return {
        allowed: false,
        message: `You've reached your document limit of ${FREE_TIER_LIMITS.DOCUMENTS_TOTAL}. Upgrade to Pro for unlimited documents.`,
        currentCount: documentCount,
        limit: FREE_TIER_LIMITS.DOCUMENTS_TOTAL,
      }
    }
    
    return {
      allowed: true,
      currentCount: documentCount,
      limit: FREE_TIER_LIMITS.DOCUMENTS_TOTAL,
    }
  } catch (error) {
    console.error('Error checking document limit:', error)
    return {
      allowed: false,
      message: 'Error checking document limit. Please try again.',
      currentCount: 0,
      limit: FREE_TIER_LIMITS.DOCUMENTS_TOTAL,
    }
  }
}

/**
 * Increment chat count for a user
 * @param userId - User ID
 */
export async function incrementChatCount(userId: string): Promise<void> {
  try {
    const supabase = await createServerSupabase()
    
    // Get or create current month's usage record
    const now = new Date()
    const periodStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
    const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString()
    
    // Try to get existing usage
    const { data: existingUsage } = await supabase
      .from('usage')
      .select('*')
      .eq('user_id', userId)
      .gte('period_start', periodStart)
      .lte('period_end', periodEnd)
      .single()
    
    if (existingUsage) {
      // Update existing usage
      const { error } = await supabase
        .from('usage')
        .update({
          chats_count: existingUsage.chats_count + 1,
        })
        .eq('id', existingUsage.id)
      
      if (error) {
        throw error
      }
    } else {
      // Create new usage record
      const { error } = await supabase
        .from('usage')
        .insert({
          user_id: userId,
          chats_count: 1,
          documents_count: 0,
          period_start: periodStart,
          period_end: periodEnd,
        })
      
      if (error) {
        throw error
      }
    }
  } catch (error) {
    console.error('Error incrementing chat count:', error)
    throw new Error(
      error instanceof Error
        ? `Failed to increment chat count: ${error.message}`
        : 'Failed to increment chat count'
    )
  }
}

/**
 * Get user's current usage statistics
 * @param userId - User ID
 * @returns Usage statistics
 */
export async function getUserUsage(userId: string): Promise<{
  chatsCount: number
  chatsLimit: number
  documentsCount: number
  documentsLimit: number
  isPro: boolean
}> {
  try {
    const subscriptionStatus = await getUserSubscriptionStatus(userId)
    const isPro = subscriptionStatus?.isPro ?? false
    
    const usage = await getCurrentUsage(userId)
    const documentCount = await getDocumentCount(userId)
    
    return {
      chatsCount: usage?.chats_count || 0,
      chatsLimit: isPro ? Infinity : FREE_TIER_LIMITS.CHATS_PER_MONTH,
      documentsCount: documentCount,
      documentsLimit: isPro ? Infinity : FREE_TIER_LIMITS.DOCUMENTS_TOTAL,
      isPro,
    }
  } catch (error) {
    console.error('Error getting user usage:', error)
    return {
      chatsCount: 0,
      chatsLimit: FREE_TIER_LIMITS.CHATS_PER_MONTH,
      documentsCount: 0,
      documentsLimit: FREE_TIER_LIMITS.DOCUMENTS_TOTAL,
      isPro: false,
    }
  }
}


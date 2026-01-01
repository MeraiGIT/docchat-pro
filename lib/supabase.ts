import { createClient } from '@supabase/supabase-js'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

// Database schema types
export type User = {
  id: string
  email: string
  name: string | null
  subscription_tier: 'free' | 'pro'
  stripe_customer_id: string | null
  stripe_subscription_id: string | null
  subscription_status: string
  created_at: string
  updated_at: string
}

export type Document = {
  id: string
  user_id: string
  name: string
  content: string
  chunk_count: number
  created_at: string
}

export type DocumentChunk = {
  id: string
  document_id: string
  content: string
  embedding: number[]
  chunk_index: number
}

export type Chat = {
  id: string
  document_id: string
  user_id: string
  title: string
  messages: Array<{role: 'user' | 'assistant', content: string}>
  created_at: string
  updated_at: string
}

export type Usage = {
  id: string
  user_id: string
  chats_count: number
  documents_count: number
  period_start: string
  period_end: string
}

// Lazy environment variable validation (only when functions are called)
function getSupabaseConfig() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL environment variable')
  }

  if (!supabaseAnonKey) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_ANON_KEY environment variable')
  }

  if (!supabaseServiceRoleKey) {
    throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY environment variable')
  }

  return { supabaseUrl, supabaseAnonKey, supabaseServiceRoleKey }
}

/**
 * Client-side Supabase client
 * Use this in Client Components and browser-side code
 */
export function createClientSupabase() {
  const { supabaseUrl, supabaseAnonKey } = getSupabaseConfig()
  return createClient(supabaseUrl, supabaseAnonKey)
}

/**
 * Server-side Supabase client with user session
 * Use this in Server Components, Server Actions, and Route Handlers
 * Automatically handles cookie-based authentication
 */
export async function createServerSupabase() {
  const cookieStore = await cookies()
  const { supabaseUrl, supabaseAnonKey } = getSupabaseConfig()
  
  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options)
          })
        } catch (error) {
          // The `setAll` method was called from a Server Component.
          // This can be ignored if you have middleware refreshing
          // user sessions.
        }
      },
    },
  })
}

/**
 * Server-side Supabase client with service role
 * Use this for admin operations that bypass RLS (Row Level Security)
 * WARNING: Only use in secure server-side contexts, never expose to client
 */
export function createServiceRoleSupabase() {
  const { supabaseUrl, supabaseServiceRoleKey } = getSupabaseConfig()
  return createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}

/**
 * Get the current authenticated user from the session
 * Returns null if not authenticated
 */
export async function getCurrentUser(): Promise<User | null> {
  try {
    const supabase = await createServerSupabase()
    const { data: { user }, error } = await supabase.auth.getUser()
    
    if (error || !user) {
      return null
    }
    
    // Fetch user profile from users table
    const { data: userProfile, error: profileError } = await supabase
      .from('users')
      .select('*')
      .eq('id', user.id)
      .single()
    
    if (profileError || !userProfile) {
      return null
    }
    
    return userProfile as User
  } catch (error) {
    console.error('Error getting current user:', error)
    return null
  }
}


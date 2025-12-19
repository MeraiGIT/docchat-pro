import NextAuth, { NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import { createClientSupabase, createServiceRoleSupabase } from '@/lib/supabase'

// Extend NextAuth types
declare module 'next-auth' {
  interface Session {
    user: {
      id: string
      email: string
      subscription_tier: 'free' | 'pro'
      name?: string | null
    }
  }
  
  interface User {
    id: string
    email: string
    subscription_tier: 'free' | 'pro'
    name?: string | null
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string
    email: string
    subscription_tier: 'free' | 'pro'
  }
}

const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error('Email and password are required')
        }

        try {
          // Use client Supabase for auth
          const supabase = createClientSupabase()
          
          // Sign in with Supabase
          const { data, error } = await supabase.auth.signInWithPassword({
            email: credentials.email,
            password: credentials.password,
          })

          if (error || !data.user) {
            throw new Error('Invalid email or password')
          }

          // Get user profile from users table
          const serviceSupabase = createServiceRoleSupabase()
          const { data: userProfile, error: profileError } = await serviceSupabase
            .from('users')
            .select('*')
            .eq('id', data.user.id)
            .single()

          if (profileError || !userProfile) {
            // If user doesn't exist in users table, create one
            const { data: newUser, error: createError } = await serviceSupabase
              .from('users')
              .insert({
                id: data.user.id,
                email: data.user.email!,
                name: data.user.user_metadata?.name || null,
                subscription_tier: 'free',
                subscription_status: 'inactive',
              })
              .select()
              .single()

            if (createError || !newUser) {
              throw new Error('Failed to create user profile')
            }

            return {
              id: newUser.id,
              email: newUser.email,
              subscription_tier: newUser.subscription_tier,
              name: newUser.name,
            }
          }

          return {
            id: userProfile.id,
            email: userProfile.email,
            subscription_tier: userProfile.subscription_tier,
            name: userProfile.name,
          }
        } catch (error) {
          console.error('Auth error:', error)
          return null
        }
      },
    }),
  ],
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  pages: {
    signIn: '/login',
    error: '/login',
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
        token.email = user.email
        token.subscription_tier = user.subscription_tier
      }
      return token
    },
    async session({ session, token }) {
      if (session.user && token) {
        session.user.id = token.id as string
        session.user.email = token.email as string
        session.user.subscription_tier = token.subscription_tier as 'free' | 'pro'
      }
      return session
    },
    async redirect({ url, baseUrl }) {
      // Allows relative callback URLs
      if (url.startsWith('/')) return `${baseUrl}${url}`
      // Allows callback URLs on the same origin
      if (new URL(url).origin === baseUrl) return url
      return baseUrl
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
  debug: process.env.NODE_ENV === 'development',
}

const handler = NextAuth(authOptions)

export { handler as GET, handler as POST }
export { authOptions }


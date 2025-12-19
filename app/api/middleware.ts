import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'

/**
 * API Route Middleware
 * Handles common concerns for API routes:
 * - Authentication
 * - Rate limiting
 * - Request logging
 * - CORS headers
 */

interface MiddlewareOptions {
  requireAuth?: boolean
  requirePro?: boolean
  rateLimit?: {
    maxRequests: number
    windowMs: number
  }
}

// Simple in-memory rate limit store (use Redis in production)
const rateLimitStore = new Map<string, { count: number; resetAt: number }>()

function checkRateLimit(
  userId: string,
  maxRequests: number,
  windowMs: number
): { allowed: boolean; remaining: number; resetAt: number } {
  const key = userId
  const now = Date.now()
  const record = rateLimitStore.get(key)

  if (!record || now > record.resetAt) {
    // Create new window
    const resetAt = now + windowMs
    rateLimitStore.set(key, { count: 1, resetAt })
    return { allowed: true, remaining: maxRequests - 1, resetAt }
  }

  if (record.count >= maxRequests) {
    return { allowed: false, remaining: 0, resetAt: record.resetAt }
  }

  // Increment count
  record.count++
  rateLimitStore.set(key, record)
  return { allowed: true, remaining: maxRequests - record.count, resetAt: record.resetAt }
}

export async function apiMiddleware(
  request: NextRequest,
  options: MiddlewareOptions = {}
): Promise<NextResponse | null> {
  const { requireAuth = false, requirePro = false, rateLimit } = options

  // CORS headers
  const corsHeaders = {
    'Access-Control-Allow-Origin': process.env.NEXTAUTH_URL || '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  }

  // Handle OPTIONS request
  if (request.method === 'OPTIONS') {
    return new NextResponse(null, { status: 200, headers: corsHeaders })
  }

  // Check authentication
  if (requireAuth) {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401, headers: corsHeaders }
      )
    }

    // Check Pro requirement
    if (requirePro) {
      const isPro =
        session.user.subscription_tier === 'pro' &&
        session.user.subscription_tier !== undefined

      if (!isPro) {
        return NextResponse.json(
          { error: 'Pro subscription required' },
          { status: 403, headers: corsHeaders }
        )
      }
    }

    // Check rate limiting
    if (rateLimit && session.user.id) {
      const limitCheck = checkRateLimit(
        session.user.id,
        rateLimit.maxRequests,
        rateLimit.windowMs
      )

      if (!limitCheck.allowed) {
        return NextResponse.json(
          {
            error: 'Rate limit exceeded',
            message: `Too many requests. Please try again after ${new Date(limitCheck.resetAt).toISOString()}`,
            retryAfter: Math.ceil((limitCheck.resetAt - Date.now()) / 1000),
          },
          {
            status: 429,
            headers: {
              ...corsHeaders,
              'Retry-After': Math.ceil((limitCheck.resetAt - Date.now()) / 1000).toString(),
              'X-RateLimit-Limit': rateLimit.maxRequests.toString(),
              'X-RateLimit-Remaining': limitCheck.remaining.toString(),
              'X-RateLimit-Reset': limitCheck.resetAt.toString(),
            },
          }
        )
      }
    }
  }

  // Log request (in production, use proper logging service)
  if (process.env.NODE_ENV === 'development') {
    console.log(`[API] ${request.method} ${request.nextUrl.pathname}`)
  }

  // Return null to continue with request
  return null
}


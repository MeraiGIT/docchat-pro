import { NextResponse } from 'next/server'
import { createClientSupabase } from '@/lib/supabase'
import { openai, anthropic } from '@/lib/openai'

/**
 * GET /api/health
 * Health check endpoint for monitoring
 * Checks database, OpenAI (embeddings), Anthropic (chat), and Stripe connections
 */
export async function GET() {
  const checks = {
    database: { status: 'unknown' as 'ok' | 'error' | 'unknown', message: '' },
    openai: { status: 'unknown' as 'ok' | 'error' | 'unknown', message: '' },
    anthropic: { status: 'unknown' as 'ok' | 'error' | 'unknown', message: '' },
    stripe: { status: 'unknown' as 'ok' | 'error' | 'unknown', message: '' },
  }

  let overallStatus = 200

  // Check database connection
  try {
    const supabase = await createClientSupabase()
    const { error } = await supabase.from('users').select('count').limit(1)
    
    if (error) {
      checks.database = { status: 'error', message: error.message }
      overallStatus = 503
    } else {
      checks.database = { status: 'ok', message: 'Connected' }
    }
  } catch (error) {
    checks.database = {
      status: 'error',
      message: error instanceof Error ? error.message : 'Connection failed',
    }
    overallStatus = 503
  }

  // Check OpenAI API (for embeddings)
  try {
    // Simple check - try to create a minimal embedding
    await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: 'health check',
    })
    checks.openai = { status: 'ok', message: 'Connected' }
  } catch (error) {
    checks.openai = {
      status: 'error',
      message: error instanceof Error ? error.message : 'Connection failed',
    }
    overallStatus = 503
  }

  // Check Anthropic API (for chat)
  try {
    // Simple check - try to create a minimal message
    await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 10,
      messages: [{ role: 'user', content: 'health check' }],
    })
    checks.anthropic = { status: 'ok', message: 'Connected' }
  } catch (error) {
    checks.anthropic = {
      status: 'error',
      message: error instanceof Error ? error.message : 'Connection failed',
    }
    overallStatus = 503
  }

  // Check Stripe API (optional - only if configured)
  try {
    if (process.env.STRIPE_SECRET_KEY) {
      const { stripe } = await import('@/lib/stripe')
      // Simple check - try to list products (will fail if invalid key, but won't throw if key is valid)
      await stripe.products.list({ limit: 1 })
      checks.stripe = { status: 'ok', message: 'Connected' }
    } else {
      checks.stripe = { status: 'ok', message: 'Not configured (optional)' }
    }
  } catch (error) {
    // Stripe errors are expected if key is invalid, but we still want to know
    const errorMessage = error instanceof Error ? error.message : 'Connection failed'
    if (errorMessage.includes('Invalid API Key')) {
      checks.stripe = { status: 'error', message: 'Invalid API key' }
      overallStatus = 503
    } else {
      // Other errors might be rate limiting, etc. - consider it ok for health check
      checks.stripe = { status: 'ok', message: 'API accessible' }
    }
  }

  const allHealthy = Object.values(checks).every((check) => check.status === 'ok')

  return NextResponse.json(
    {
      status: allHealthy ? 'healthy' : 'degraded',
      timestamp: new Date().toISOString(),
      checks,
    },
    { status: overallStatus }
  )
}


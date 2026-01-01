/**
 * Environment variable validation and type-safe access
 * Validates all required environment variables on import
 */

const requiredEnvVars = {
  // Supabase
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,

  // NextAuth
  NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET,
  NEXTAUTH_URL: process.env.NEXTAUTH_URL,

  // OpenAI (for embeddings)
  OPENAI_API_KEY: process.env.OPENAI_API_KEY,
  // Anthropic (for chat)
  ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY,

  // Stripe
  STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY,
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY,
} as const

const optionalEnvVars = {
  STRIPE_PRO_MONTHLY_PRICE_ID: process.env.STRIPE_PRO_MONTHLY_PRICE_ID,
  STRIPE_PRO_YEARLY_PRICE_ID: process.env.STRIPE_PRO_YEARLY_PRICE_ID,
  STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET,
} as const

/**
 * Validate all required environment variables
 * Throws error with clear message if any are missing
 */
function validateEnvVars() {
  const missing: string[] = []

  for (const [key, value] of Object.entries(requiredEnvVars)) {
    if (!value) {
      missing.push(key)
    }
  }

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables:\n${missing.join('\n')}\n\n` +
        'Please check your .env.local file and ensure all required variables are set.'
    )
  }
}

// Don't validate on module load - only validate when explicitly called
// This prevents build failures when env vars aren't set yet
// Call validateEnvironment() explicitly if you need to validate

/**
 * Type-safe environment variable access
 */
export const env = {
  // Supabase
  supabase: {
    url: requiredEnvVars.NEXT_PUBLIC_SUPABASE_URL!,
    anonKey: requiredEnvVars.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    serviceRoleKey: requiredEnvVars.SUPABASE_SERVICE_ROLE_KEY!,
  },

  // NextAuth
  nextAuth: {
    secret: requiredEnvVars.NEXTAUTH_SECRET!,
    url: requiredEnvVars.NEXTAUTH_URL || 'http://localhost:3000',
  },

  // OpenAI (for embeddings)
  openai: {
    apiKey: requiredEnvVars.OPENAI_API_KEY!,
  },
  // Anthropic (for chat)
  anthropic: {
    apiKey: requiredEnvVars.ANTHROPIC_API_KEY!,
  },

  // Stripe
  stripe: {
    secretKey: requiredEnvVars.STRIPE_SECRET_KEY!,
    publishableKey: requiredEnvVars.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!,
    monthlyPriceId: optionalEnvVars.STRIPE_PRO_MONTHLY_PRICE_ID,
    yearlyPriceId: optionalEnvVars.STRIPE_PRO_YEARLY_PRICE_ID,
    webhookSecret: optionalEnvVars.STRIPE_WEBHOOK_SECRET,
  },

  // App
  app: {
    nodeEnv: process.env.NODE_ENV || 'development',
    isProduction: process.env.NODE_ENV === 'production',
    isDevelopment: process.env.NODE_ENV === 'development',
  },
} as const

/**
 * Validate environment variables (call this explicitly if needed)
 */
export function validateEnvironment() {
  validateEnvVars()
}


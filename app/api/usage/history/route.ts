import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { createServerSupabase } from '@/lib/supabase'

/**
 * GET /api/usage/history
 * Get usage history for the user
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const supabase = await createServerSupabase()

    const { data: usageHistory, error } = await supabase
      .from('usage')
      .select('*')
      .eq('user_id', session.user.id)
      .order('period_start', { ascending: false })
      .limit(12) // Last 12 months

    if (error) {
      console.error('Error fetching usage history:', error)
      return NextResponse.json(
        { error: 'Failed to fetch usage history' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      history: usageHistory || [],
    })
  } catch (error) {
    console.error('Error in GET /api/usage/history:', error)
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'Failed to fetch usage history',
      },
      { status: 500 }
    )
  }
}


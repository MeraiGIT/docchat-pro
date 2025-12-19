import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { createServerSupabase } from '@/lib/supabase'

/**
 * GET /api/user/export
 * Export all user data as JSON (GDPR compliance)
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

    // Get user profile
    const { data: user } = await supabase
      .from('users')
      .select('*')
      .eq('id', session.user.id)
      .single()

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    // Get all documents (without embeddings)
    const { data: documents } = await supabase
      .from('documents')
      .select('id, name, content, chunk_count, created_at')
      .eq('user_id', session.user.id)
      .order('created_at', { ascending: false })

    // Get all chats
    const { data: chats } = await supabase
      .from('chats')
      .select('id, document_id, title, messages, created_at, updated_at')
      .eq('user_id', session.user.id)
      .order('created_at', { ascending: false })

    // Get usage history
    const { data: usage } = await supabase
      .from('usage')
      .select('*')
      .eq('user_id', session.user.id)
      .order('period_start', { ascending: false })

    // Compile export data
    const exportData = {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        subscription_tier: user.subscription_tier,
        subscription_status: user.subscription_status,
        created_at: user.created_at,
        updated_at: user.updated_at,
      },
      documents: documents || [],
      chats: chats || [],
      usage: usage || [],
      exported_at: new Date().toISOString(),
    }

    // Return as JSON download
    return new NextResponse(JSON.stringify(exportData, null, 2), {
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="docchat-pro-export-${new Date().toISOString().split('T')[0]}.json"`,
      },
    })
  } catch (error) {
    console.error('Error in GET /api/user/export:', error)
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'Failed to export data',
      },
      { status: 500 }
    )
  }
}


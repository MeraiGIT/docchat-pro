import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { createServerSupabase, createServiceRoleSupabase } from '@/lib/supabase'

/**
 * GET /api/chat/[chatId]
 * Load chat history
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ chatId: string }> }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const { chatId } = await params
    const supabase = await createServerSupabase()

    const { data: chat, error } = await supabase
      .from('chats')
      .select(`
        *,
        documents (
          id,
          name,
          content
        )
      `)
      .eq('id', chatId)
      .eq('user_id', session.user.id)
      .single()

    if (error || !chat) {
      return NextResponse.json(
        { error: 'Chat not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({ chat })
  } catch (error) {
    console.error('Error in GET /api/chat/[chatId]:', error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to load chat',
      },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/chat/[chatId]
 * Delete a chat
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ chatId: string }> }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const { chatId } = await params
    const supabase = await createServerSupabase()
    const serviceSupabase = createServiceRoleSupabase()

    // Verify ownership
    const { data: chat } = await supabase
      .from('chats')
      .select('id, user_id')
      .eq('id', chatId)
      .single()

    if (!chat || chat.user_id !== session.user.id) {
      return NextResponse.json(
        { error: 'Chat not found' },
        { status: 404 }
      )
    }

    // Delete chat
    const { error } = await serviceSupabase
      .from('chats')
      .delete()
      .eq('id', chatId)

    if (error) {
      return NextResponse.json(
        { error: 'Failed to delete chat' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error in DELETE /api/chat/[chatId]:', error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to delete chat',
      },
      { status: 500 }
    )
  }
}

/**
 * PUT /api/chat/[chatId]
 * Update chat title
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ chatId: string }> }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const { chatId } = await params
    const body = await request.json()
    const { title } = body

    if (!title || typeof title !== 'string') {
      return NextResponse.json(
        { error: 'Title is required' },
        { status: 400 }
      )
    }

    const supabase = await createServerSupabase()
    const serviceSupabase = createServiceRoleSupabase()

    // Verify ownership
    const { data: chat } = await supabase
      .from('chats')
      .select('id, user_id')
      .eq('id', chatId)
      .single()

    if (!chat || chat.user_id !== session.user.id) {
      return NextResponse.json(
        { error: 'Chat not found' },
        { status: 404 }
      )
    }

    // Update title
    const { error } = await serviceSupabase
      .from('chats')
      .update({
        title: title.substring(0, 100),
        updated_at: new Date().toISOString(),
      })
      .eq('id', chatId)

    if (error) {
      return NextResponse.json(
        { error: 'Failed to update chat' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error in PUT /api/chat/[chatId]:', error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to update chat',
      },
      { status: 500 }
    )
  }
}


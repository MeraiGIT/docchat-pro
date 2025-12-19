import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { createServiceRoleSupabase } from '@/lib/supabase'

/**
 * PUT /api/user/update
 * Update user profile information
 */
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { name } = body

    // Validate input
    if (name !== undefined) {
      if (typeof name !== 'string') {
        return NextResponse.json(
          { error: 'Name must be a string' },
          { status: 400 }
        )
      }

      if (name.length < 2) {
        return NextResponse.json(
          { error: 'Name must be at least 2 characters' },
          { status: 400 }
        )
      }

      if (name.length > 100) {
        return NextResponse.json(
          { error: 'Name must be less than 100 characters' },
          { status: 400 }
        )
      }
    }

    const supabase = createServiceRoleSupabase()

    // Update user
    const updateData: { name?: string; updated_at: string } = {
      updated_at: new Date().toISOString(),
    }

    if (name !== undefined) {
      updateData.name = name.trim()
    }

    const { data: updatedUser, error } = await supabase
      .from('users')
      .update(updateData)
      .eq('id', session.user.id)
      .select()
      .single()

    if (error) {
      console.error('Error updating user:', error)
      return NextResponse.json(
        { error: 'Failed to update user' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      user: {
        id: updatedUser.id,
        email: updatedUser.email,
        name: updatedUser.name,
      },
    })
  } catch (error) {
    console.error('Error in PUT /api/user/update:', error)
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'Failed to update user',
      },
      { status: 500 }
    )
  }
}


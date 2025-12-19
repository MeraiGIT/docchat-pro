import { NextRequest, NextResponse } from 'next/server'
import { createClientSupabase } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, email, password } = body

    // Validate input
    if (!name || !email || !password) {
      return NextResponse.json(
        { error: 'Name, email, and password are required' },
        { status: 400 }
      )
    }

    // Validate name length
    if (name.length < 2) {
      return NextResponse.json(
        { error: 'Name must be at least 2 characters' },
        { status: 400 }
      )
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Please enter a valid email address' },
        { status: 400 }
      )
    }

    // Validate password strength
    if (password.length < 8) {
      return NextResponse.json(
        { error: 'Password must be at least 8 characters' },
        { status: 400 }
      )
    }

    if (!/[A-Z]/.test(password)) {
      return NextResponse.json(
        { error: 'Password must contain at least one uppercase letter' },
        { status: 400 }
      )
    }

    if (!/[0-9]/.test(password)) {
      return NextResponse.json(
        { error: 'Password must contain at least one number' },
        { status: 400 }
      )
    }

    // Create user in Supabase Auth
    // Database trigger will automatically create the user profile in the users table
    const supabase = createClientSupabase()
    
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          name,
        },
      },
    })

    if (authError) {
      console.error('Supabase auth error:', authError)
      
      // Handle specific Supabase errors
      const errorMessage = authError.message?.toLowerCase() || ''
      if (errorMessage.includes('already registered') || 
          errorMessage.includes('already exists') || 
          errorMessage.includes('user already registered') ||
          errorMessage.includes('email address is already registered')) {
        return NextResponse.json(
          { error: 'An account with this email already exists' },
          { status: 409 }
        )
      }
      
      // Return more detailed error message for debugging
      return NextResponse.json(
        { error: authError.message || 'Failed to create account. Please try again.' },
        { status: 500 }
      )
    }

    if (!authData?.user) {
      return NextResponse.json(
        { error: 'Failed to create user account. No user data returned.' },
        { status: 500 }
      )
    }

    // Database trigger handles user profile creation automatically
    // Note: If email confirmation is required, user will need to confirm email before logging in
    return NextResponse.json(
      {
        success: true,
        message: 'Account created successfully',
        user: {
          id: authData.user.id,
          email: authData.user.email,
        },
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('Signup error:', error)
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'Something went wrong. Please try again.',
      },
      { status: 500 }
    )
  }
}


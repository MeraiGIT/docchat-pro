import { withAuth } from 'next-auth/middleware'
import { NextResponse } from 'next/server'

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token
    const path = req.nextUrl.pathname

    // Check for Pro subscription requirement on specific routes
    const proRoutes = ['/pro-features', '/advanced-chat']
    
    if (proRoutes.some((route) => path.startsWith(route))) {
      if (token?.subscription_tier !== 'pro') {
        return NextResponse.redirect(new URL('/pricing', req.url))
      }
    }

    // Allow the request to proceed
    return NextResponse.next()
  },
  {
    callbacks: {
      authorized: ({ token }) => {
        // Check if user is authenticated
        return !!token
      },
    },
    pages: {
      signIn: '/login',
    },
  }
)

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - api/auth routes (handled by NextAuth)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (public folder)
     * - login, register, pricing, and home page
     */
    '/((?!api/auth|_next/static|_next/image|favicon.ico|login|register|pricing|$).*)',
  ],
}


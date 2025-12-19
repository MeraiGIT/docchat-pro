'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'

interface AuthGuardProps {
  children: React.ReactNode
  requirePro?: boolean
}

export function AuthGuard({ children, requirePro = false }: AuthGuardProps) {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [isChecking, setIsChecking] = useState(true)

  useEffect(() => {
    if (status === 'loading') {
      return
    }

    if (status === 'unauthenticated') {
      router.push('/login')
      return
    }

      if (status === 'authenticated' && session) {
        // Check Pro requirement
        if (requirePro) {
          const isPro = session.user.subscription_tier === 'pro'

          if (!isPro) {
            router.push('/pricing')
            return
          }
        }

        setIsChecking(false)
      }
  }, [status, session, router, requirePro])

  if (status === 'loading' || isChecking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-50 dark:bg-black">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-zinc-900 dark:text-zinc-50 mx-auto mb-4" />
          <p className="text-zinc-600 dark:text-zinc-400">Loading...</p>
        </div>
      </div>
    )
  }

  if (status === 'unauthenticated') {
    return null
  }

  return <>{children}</>
}


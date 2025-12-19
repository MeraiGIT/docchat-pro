'use client'

import { useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { AlertTriangle } from 'lucide-react'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Log error to console (replace with error tracking service in production)
    console.error('Application error:', error)
  }, [error])

  return (
    <div className="flex min-h-screen items-center justify-center bg-black p-4">
      <div className="max-w-md text-center">
        <div className="mb-6 flex justify-center">
          <div className="rounded-full bg-red-500/20 p-4">
            <AlertTriangle className="h-12 w-12 text-red-400" />
          </div>
        </div>
        <h1 className="mb-4 text-3xl font-bold text-white">Something went wrong</h1>
        <p className="mb-6 text-zinc-400">
          We encountered an unexpected error. Don't worry, your data is safe.
        </p>
        {process.env.NODE_ENV === 'development' && error.message && (
          <div className="mb-6 rounded-lg border border-red-500/50 bg-red-900/10 p-4 text-left">
            <p className="mb-2 text-sm font-semibold text-red-400">Error details:</p>
            <p className="text-xs text-red-300 font-mono">{error.message}</p>
          </div>
        )}
        <div className="flex gap-4 justify-center">
          <Button onClick={reset} variant="default">
            Try again
          </Button>
          <Button onClick={() => window.location.href = '/'} variant="outline">
            Go home
          </Button>
        </div>
      </div>
    </div>
  )
}


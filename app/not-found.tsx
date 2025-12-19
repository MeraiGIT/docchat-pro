import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { FileQuestion } from 'lucide-react'

export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-black p-4">
      <div className="max-w-md text-center">
        <div className="mb-6 flex justify-center">
          <div className="rounded-full bg-purple-500/20 p-4">
            <FileQuestion className="h-12 w-12 text-purple-400" />
          </div>
        </div>
        <h1 className="mb-4 text-4xl font-bold text-white">404</h1>
        <h2 className="mb-4 text-2xl font-semibold text-zinc-300">Page not found</h2>
        <p className="mb-8 text-zinc-400">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="flex gap-4 justify-center">
          <Link href="/dashboard">
            <Button>Go to Dashboard</Button>
          </Link>
          <Link href="/">
            <Button variant="outline">Go Home</Button>
          </Link>
        </div>
      </div>
    </div>
  )
}


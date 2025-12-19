import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-purple-900/20 to-black">
      {/* Back to Home Button */}
      <div className="absolute top-8 left-8 z-10">
        <Link
          href="/"
          className="flex items-center gap-2 text-white hover:text-purple-400 transition-colors"
        >
          <ArrowLeft size={20} />
          <span className="text-xl font-bold bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">
            DocChat Pro
          </span>
        </Link>
      </div>

      {/* Centered Form Container */}
      <div className="flex items-center justify-center min-h-screen px-4 py-20">
        <div className="w-full max-w-md">{children}</div>
      </div>
    </div>
  )
}

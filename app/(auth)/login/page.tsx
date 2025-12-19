'use client'

import { useState } from 'react'
import { signIn, useSession } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { useToast } from '@/components/ui/toast'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Mail, Lock, Loader2 } from 'lucide-react'

export default function LoginPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { data: session, update: updateSession } = useSession()
  const { showToast } = useToast()
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    rememberMe: false,
  })

  const callbackUrl = searchParams.get('callbackUrl') || '/dashboard'

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const result = await signIn('credentials', {
        email: formData.email,
        password: formData.password,
        redirect: false,
      })

      if (result?.error) {
        showToast({
          variant: 'error',
          title: 'Sign in failed',
          message: 'Invalid email or password. Please try again.',
        })
        setLoading(false)
        return
      }

      if (result?.ok) {
        // Update the session to ensure it's fresh
        await updateSession()
        
        showToast({
          variant: 'success',
          title: 'Welcome back!',
          message: 'You have been signed in successfully.',
        })
        
        // Redirect to dashboard after successful login
        router.push('/dashboard')
        router.refresh()
      } else {
        setLoading(false)
      }
    } catch (error) {
      console.error('Login error:', error)
      showToast({
        variant: 'error',
        title: 'Something went wrong',
        message: 'Please try again later.',
      })
      setLoading(false)
    }
  }

  return (
    <div className="w-full">
      <div className="bg-zinc-900/80 backdrop-blur-xl rounded-2xl shadow-xl border border-zinc-800 p-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">
            Welcome back
          </h1>
          <p className="text-zinc-400">
            Sign in to your DocChat Pro account
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <label
              htmlFor="email"
              className="text-sm font-medium text-zinc-300"
            >
              Email
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-zinc-400" />
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={formData.email}
                onChange={(e) =>
                  setFormData({ ...formData, email: e.target.value })
                }
                required
                className="pl-10"
                disabled={loading}
              />
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label
                htmlFor="password"
                className="text-sm font-medium text-zinc-300"
              >
                Password
              </label>
              <Link
                href="/forgot-password"
                className="text-sm text-zinc-400 hover:text-purple-400 transition-colors"
              >
                Forgot password?
              </Link>
            </div>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-zinc-400" />
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={formData.password}
                onChange={(e) =>
                  setFormData({ ...formData, password: e.target.value })
                }
                required
                className="pl-10"
                disabled={loading}
              />
            </div>
          </div>

          <div className="flex items-center">
            <input
              id="rememberMe"
              type="checkbox"
              checked={formData.rememberMe}
              onChange={(e) =>
                setFormData({ ...formData, rememberMe: e.target.checked })
              }
              className="h-4 w-4 rounded border-zinc-700 text-purple-500 focus:ring-purple-500"
              disabled={loading}
            />
            <label
              htmlFor="rememberMe"
              className="ml-2 text-sm text-zinc-400"
            >
              Remember me
            </label>
          </div>

          <Button
            type="submit"
            className="w-full"
            disabled={loading}
            loading={loading}
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Signing in...
              </>
            ) : (
              'Sign in'
            )}
          </Button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-sm text-zinc-400">
            Don't have an account?{' '}
            <Link
              href="/register"
              className="font-medium text-purple-400 hover:text-purple-300 hover:underline"
            >
              Sign up
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}


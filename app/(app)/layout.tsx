'use client'

import { useState } from 'react'
import { useSession, signOut } from 'next-auth/react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { LayoutDashboard, FileText, Settings, LogOut, Menu, X, User } from 'lucide-react'
import { AuthGuard } from '@/components/AuthGuard'
import { Button } from '@/components/ui/button'
import { clsx } from 'clsx'

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Documents', href: '/documents', icon: FileText },
  { name: 'Settings', href: '/settings', icon: Settings },
]

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { data: session } = useSession()
  const pathname = usePathname()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <AuthGuard>
      <div className="flex h-screen bg-black text-white">
        {/* Sidebar - Desktop */}
        <aside className="hidden w-64 border-r border-zinc-800 bg-zinc-900/50 md:flex md:flex-col">
          <div className="flex h-16 items-center border-b border-zinc-800 px-6">
            <Link href="/" className="text-xl font-bold bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent hover:opacity-80 transition-opacity">
              DocChat Pro
            </Link>
          </div>
          <nav className="flex-1 space-y-1 px-3 py-4">
            {navigation.map((item) => {
              const isActive = pathname === item.href
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={clsx(
                    'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-purple-500/20 text-purple-400'
                      : 'text-zinc-400 hover:bg-zinc-800 hover:text-white'
                  )}
                >
                  <item.icon className="h-5 w-5" />
                  {item.name}
                </Link>
              )
            })}
          </nav>
          <div className="border-t border-zinc-800 p-4">
            <div className="mb-4 flex items-center gap-3 px-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-purple-500/20">
                <User className="h-4 w-4 text-purple-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="truncate text-sm font-medium text-white">
                  {session?.user?.name || session?.user?.email}
                </p>
                <p className="truncate text-xs text-zinc-400">
                  {session?.user?.subscription_tier === 'pro' ? 'Pro' : 'Free'}
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              className="w-full justify-start"
              onClick={() => signOut({ callbackUrl: '/' })}
            >
              <LogOut className="mr-2 h-4 w-4" />
              Logout
            </Button>
          </div>
        </aside>

        {/* Mobile Sidebar */}
        <AnimatePresence>
          {sidebarOpen && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-40 bg-black/50 md:hidden"
                onClick={() => setSidebarOpen(false)}
              />
              <motion.aside
                initial={{ x: -256 }}
                animate={{ x: 0 }}
                exit={{ x: -256 }}
                transition={{ type: 'spring', damping: 30, stiffness: 300 }}
                className="fixed inset-y-0 left-0 z-50 w-64 border-r border-zinc-800 bg-zinc-900 md:hidden"
              >
                <div className="flex h-16 items-center justify-between border-b border-zinc-800 px-6">
                  <Link 
                    href="/" 
                    onClick={() => setSidebarOpen(false)}
                    className="text-xl font-bold bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent hover:opacity-80 transition-opacity"
                  >
                    DocChat Pro
                  </Link>
                  <button
                    onClick={() => setSidebarOpen(false)}
                    className="rounded-lg p-1 text-zinc-400 hover:text-white"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
                <nav className="flex-1 space-y-1 px-3 py-4">
                  {navigation.map((item) => {
                    const isActive = pathname === item.href
                    return (
                      <Link
                        key={item.name}
                        href={item.href}
                        onClick={() => setSidebarOpen(false)}
                        className={clsx(
                          'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                          isActive
                            ? 'bg-purple-500/20 text-purple-400'
                            : 'text-zinc-400 hover:bg-zinc-800 hover:text-white'
                        )}
                      >
                        <item.icon className="h-5 w-5" />
                        {item.name}
                      </Link>
                    )
                  })}
                </nav>
                <div className="border-t border-zinc-800 p-4">
                  <Button
                    variant="ghost"
                    className="w-full justify-start"
                    onClick={() => signOut({ callbackUrl: '/' })}
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    Logout
                  </Button>
                </div>
              </motion.aside>
            </>
          )}
        </AnimatePresence>

        {/* Main Content */}
        <div className="flex flex-1 flex-col overflow-hidden">
          {/* Header */}
          <header className="flex h-16 items-center border-b border-zinc-800 bg-zinc-900/50 px-4 md:px-6">
            <button
              onClick={() => setSidebarOpen(true)}
              className="rounded-lg p-2 text-zinc-400 hover:bg-zinc-800 hover:text-white md:hidden"
            >
              <Menu className="h-5 w-5" />
            </button>
            <div className="ml-auto flex items-center gap-4">
              <div className="hidden items-center gap-2 md:flex">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-purple-500/20">
                  <User className="h-4 w-4 text-purple-400" />
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-white">
                    {session?.user?.name || session?.user?.email}
                  </p>
                  <p className="text-xs text-zinc-400">
                    {session?.user?.subscription_tier === 'pro' ? 'Pro' : 'Free'}
                  </p>
                </div>
              </div>
            </div>
          </header>

          {/* Page Content */}
          <main className="flex-1 overflow-y-auto p-4 md:p-6">{children}</main>
        </div>
      </div>
    </AuthGuard>
  )
}


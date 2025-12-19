'use client'

import { useState } from 'react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Zap, Shield, Infinity } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface UpgradePromptProps {
  usage: {
    chatsCount: number
    chatsLimit: number
    documentsCount: number
    documentsLimit: number
  }
}

export function UpgradePrompt({ usage }: UpgradePromptProps) {
  const [dismissed, setDismissed] = useState(false)

  if (dismissed) return null

  const isAtLimit = usage.chatsCount >= usage.chatsLimit || usage.documentsCount >= usage.documentsLimit

  return (
    <AnimatePresence>
      {isAtLimit && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className="relative overflow-hidden rounded-xl border border-purple-500/50 bg-gradient-to-br from-purple-900/20 to-blue-900/20 p-6 backdrop-blur-xl"
        >
          <button
            onClick={() => setDismissed(true)}
            className="absolute right-4 top-4 rounded-lg p-1 text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>

          <div className="pr-8">
            <h3 className="mb-2 text-xl font-bold text-white">Upgrade to Pro</h3>
            <p className="mb-4 text-zinc-400">
              You've reached your free tier limit. Upgrade to unlock unlimited access.
            </p>

            <div className="mb-6 grid grid-cols-3 gap-4">
              <div className="flex items-center gap-2">
                <Infinity className="h-5 w-5 text-purple-400" />
                <span className="text-sm text-zinc-300">Unlimited</span>
              </div>
              <div className="flex items-center gap-2">
                <Zap className="h-5 w-5 text-purple-400" />
                <span className="text-sm text-zinc-300">Faster</span>
              </div>
              <div className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-purple-400" />
                <span className="text-sm text-zinc-300">Priority</span>
              </div>
            </div>

            <Link href="/pricing">
              <Button className="w-full">
                Upgrade to Pro
              </Button>
            </Link>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}


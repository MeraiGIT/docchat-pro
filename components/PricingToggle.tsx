'use client'

import { motion } from 'framer-motion'
import { clsx } from 'clsx'

interface PricingToggleProps {
  isAnnual: boolean
  onToggle: (isAnnual: boolean) => void
}

export function PricingToggle({ isAnnual, onToggle }: PricingToggleProps) {
  return (
    <div className="flex items-center justify-center gap-4 mb-12">
      <span className={clsx('text-sm font-medium transition-colors', isAnnual ? 'text-zinc-400' : 'text-white')}>
        Monthly
      </span>
      <button
        onClick={() => onToggle(!isAnnual)}
        className="relative inline-flex h-8 w-14 items-center rounded-full bg-zinc-800 transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 focus:ring-offset-black"
        aria-label="Toggle billing period"
      >
        <motion.span
          layout
          transition={{ type: 'spring', stiffness: 500, damping: 30 }}
          className={clsx(
            'inline-block h-6 w-6 transform rounded-full bg-white shadow-lg transition-colors',
            isAnnual && 'translate-x-7'
          )}
        />
      </button>
      <div className="flex items-center gap-2">
        <span className={clsx('text-sm font-medium transition-colors', isAnnual ? 'text-white' : 'text-zinc-400')}>
          Annual
        </span>
        {isAnnual && (
          <motion.span
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className="rounded-full bg-green-500/20 px-2 py-0.5 text-xs font-semibold text-green-400"
          >
            Save $40
          </motion.span>
        )}
      </div>
    </div>
  )
}


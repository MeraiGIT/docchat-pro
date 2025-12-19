'use client'

import { motion } from 'framer-motion'
import { Check } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { clsx } from 'clsx'

interface PricingCardProps {
  tier: 'free' | 'pro'
  price: string
  period: string
  features: string[]
  highlighted?: boolean
  ctaText: string
  ctaHref: string
  onCtaClick?: () => void
}

export function PricingCard({
  tier,
  price,
  period,
  features,
  highlighted = false,
  ctaText,
  ctaHref,
  onCtaClick,
}: PricingCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5 }}
      whileHover={{ scale: 1.02, y: -5 }}
      className={clsx(
        'relative rounded-2xl border p-8 transition-all duration-300',
        highlighted
          ? 'border-purple-500 bg-gradient-to-br from-purple-900/20 to-blue-900/20 shadow-[0_0_40px_rgba(168,85,247,0.4)]'
          : 'border-zinc-800 bg-zinc-900/50 backdrop-blur-xl hover:border-zinc-700'
      )}
    >
      {highlighted && (
        <div className="absolute -top-4 left-1/2 -translate-x-1/2 rounded-full bg-gradient-to-r from-purple-500 to-blue-500 px-4 py-1 text-sm font-semibold text-white">
          Most Popular
        </div>
      )}
      
      <div className="mb-6">
        <h3 className="mb-2 text-2xl font-bold text-white capitalize">{tier}</h3>
        <div className="flex items-baseline gap-2">
          <span className="text-4xl font-bold text-white">{price}</span>
          <span className="text-zinc-400">/{period}</span>
        </div>
      </div>

      <ul className="mb-8 space-y-3">
        {features.map((feature, index) => (
          <li key={index} className="flex items-start gap-3">
            <Check className="mt-0.5 h-5 w-5 flex-shrink-0 text-purple-400" />
            <span className="text-zinc-300">{feature}</span>
          </li>
        ))}
      </ul>

      {onCtaClick ? (
        <Button
          onClick={onCtaClick}
          variant={highlighted ? 'default' : 'outline'}
          className="w-full"
        >
          {ctaText}
        </Button>
      ) : ctaHref !== '#' ? (
        <Link href={ctaHref} className="block">
          <Button
            variant={highlighted ? 'default' : 'outline'}
            className="w-full"
          >
            {ctaText}
          </Button>
        </Link>
      ) : (
        <Button
          variant={highlighted ? 'default' : 'outline'}
          className="w-full"
          disabled
        >
          {ctaText}
        </Button>
      )}
    </motion.div>
  )
}


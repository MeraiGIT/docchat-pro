'use client'

import { motion } from 'framer-motion'
import { LucideIcon } from 'lucide-react'
import { clsx } from 'clsx'

interface FeatureCardProps {
  icon: LucideIcon
  title: string
  description: string
  delay?: number
}

export function FeatureCard({ icon: Icon, title, description, delay = 0 }: FeatureCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-100px' }}
      transition={{ duration: 0.5, delay }}
      whileHover={{ scale: 1.05, y: -5 }}
      className={clsx(
        'group relative rounded-2xl border border-zinc-800 bg-zinc-900/50 p-8',
        'backdrop-blur-xl transition-all duration-300',
        'hover:border-purple-500/50 hover:bg-zinc-900/80',
        'hover:shadow-[0_0_30px_rgba(168,85,247,0.3)]'
      )}
    >
      <div className="mb-4 inline-flex rounded-lg bg-gradient-to-br from-purple-500/20 to-blue-500/20 p-3">
        <Icon className="h-6 w-6 text-purple-400" />
      </div>
      <h3 className="mb-2 text-xl font-semibold text-white">{title}</h3>
      <p className="text-zinc-400">{description}</p>
    </motion.div>
  )
}


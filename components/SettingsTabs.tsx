'use client'

import { motion } from 'framer-motion'
import { User, CreditCard, BarChart3, AlertTriangle } from 'lucide-react'
import { clsx } from 'clsx'

interface Tab {
  id: string
  label: string
  icon: React.ComponentType<{ className?: string }>
}

const tabs: Tab[] = [
  { id: 'profile', label: 'Profile', icon: User },
  { id: 'subscription', label: 'Subscription', icon: CreditCard },
  { id: 'usage', label: 'Usage', icon: BarChart3 },
  { id: 'danger', label: 'Danger Zone', icon: AlertTriangle },
]

interface SettingsTabsProps {
  activeTab: string
  onTabChange: (tab: string) => void
}

export function SettingsTabs({ activeTab, onTabChange }: SettingsTabsProps) {
  return (
    <div className="border-b border-zinc-800">
      {/* Desktop: Horizontal tabs */}
      <div className="hidden md:flex">
        {tabs.map((tab) => {
          const Icon = tab.icon
          const isActive = activeTab === tab.id
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={clsx(
                'relative flex items-center gap-2 px-6 py-4 text-sm font-medium transition-colors',
                isActive
                  ? 'text-purple-400'
                  : 'text-zinc-400 hover:text-zinc-300'
              )}
            >
              <Icon className="h-4 w-4" />
              {tab.label}
              {isActive && (
                <motion.div
                  layoutId="activeTab"
                  className="absolute bottom-0 left-0 right-0 h-0.5 bg-purple-500"
                  initial={false}
                  transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                />
              )}
            </button>
          )
        })}
      </div>

      {/* Mobile: Vertical tabs */}
      <div className="md:hidden space-y-1">
        {tabs.map((tab) => {
          const Icon = tab.icon
          const isActive = activeTab === tab.id
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={clsx(
                'flex w-full items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-purple-500/20 text-purple-400'
                  : 'text-zinc-400 hover:bg-zinc-800 hover:text-zinc-300'
              )}
            >
              <Icon className="h-4 w-4" />
              {tab.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}


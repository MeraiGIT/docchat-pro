'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { FileText, MessageSquare, Crown, Upload, ArrowRight } from 'lucide-react'
import { formatRelativeTime } from '@/lib/document-helpers'
import { DocumentCard } from '@/components/DocumentCard'
import { DocumentUploader } from '@/components/DocumentUploader'
import { UpgradePrompt } from '@/components/UpgradePrompt'
import { EmptyState } from '@/components/EmptyState'
import { Button } from '@/components/ui/button'
import { clsx } from 'clsx'
import type { Document, Chat } from '@/lib/supabase'

interface UsageStats {
  chatsCount: number
  chatsLimit: number
  documentsCount: number
  documentsLimit: number
  isPro: boolean
}

export default function DashboardPage() {
  const { data: session } = useSession()
  const [documents, setDocuments] = useState<Document[]>([])
  const [recentChats, setRecentChats] = useState<Chat[]>([])
  const [usage, setUsage] = useState<UsageStats>({
    chatsCount: 0,
    chatsLimit: 3,
    documentsCount: 0,
    documentsLimit: 3,
    isPro: false,
  })
  const [loading, setLoading] = useState(true)
  const [uploadModalOpen, setUploadModalOpen] = useState(false)

  useEffect(() => {
    fetchDashboardData()
  }, [])

  const fetchDashboardData = async () => {
    try {
      // Fetch documents
      const docsRes = await fetch('/api/documents')
      if (docsRes.ok) {
        const docsData = await docsRes.json()
        setDocuments(docsData.documents || [])
      }

      // Fetch usage stats
      const usageRes = await fetch('/api/auth/session')
      if (usageRes.ok) {
        const usageData = await usageRes.json()
        if (usageData.usage) {
          setUsage(usageData.usage)
        }
      }

      // TODO: Fetch recent chats
      // const chatsRes = await fetch('/api/chats?limit=5')
      // if (chatsRes.ok) {
      //   const chatsData = await chatsRes.json()
      //   setRecentChats(chatsData.chats || [])
      // }
    } catch (error) {
      console.error('Error fetching dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteDocument = async (id: string) => {
    try {
      const response = await fetch(`/api/documents?id=${id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        throw new Error('Failed to delete document')
      }

      setDocuments(documents.filter((doc) => doc.id !== id))
    } catch (error) {
      throw error
    }
  }

  const getProgressPercentage = (current: number, limit: number) => {
    if (limit === Infinity) return 0
    return Math.min((current / limit) * 100, 100)
  }

  const getStatusColor = (current: number, limit: number) => {
    if (limit === Infinity) return 'text-green-400'
    const percentage = (current / limit) * 100
    if (percentage >= 100) return 'text-red-400'
    if (percentage >= 80) return 'text-yellow-400'
    return 'text-green-400'
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="mb-4 h-8 w-8 animate-spin rounded-full border-4 border-purple-500 border-t-transparent mx-auto" />
          <p className="text-zinc-400">Loading dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">
            Welcome back, {session?.user?.name || 'there'}!
          </h1>
          <p className="mt-1 text-zinc-400">
            {session?.user?.subscription_tier === 'pro' ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-purple-500/20 px-3 py-1 text-sm font-medium text-purple-400">
                <Crown className="h-4 w-4" />
                Pro Member
              </span>
            ) : (
              <span className="inline-flex items-center rounded-full bg-zinc-800 px-3 py-1 text-sm font-medium text-zinc-400">
                Free Tier
              </span>
            )}
          </p>
        </div>
        <Button onClick={() => setUploadModalOpen(true)}>
          <Upload className="mr-2 h-4 w-4" />
          Upload Document
        </Button>
      </div>

      {/* Upgrade Prompt */}
      {!usage.isPro && <UpgradePrompt usage={usage} />}

      {/* Usage Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        {/* Documents Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-6 backdrop-blur-xl"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="rounded-lg bg-blue-500/20 p-2">
              <FileText className="h-5 w-5 text-blue-400" />
            </div>
            <span className={clsx('text-sm font-medium', getStatusColor(usage.documentsCount, usage.documentsLimit))}>
              {usage.documentsLimit === Infinity ? 'Unlimited' : `${usage.documentsCount}/${usage.documentsLimit}`}
            </span>
          </div>
          <h3 className="mb-1 text-sm font-medium text-zinc-400">Documents</h3>
          {usage.documentsLimit !== Infinity && (
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-zinc-800">
              <motion.div
                className="h-full bg-blue-500"
                initial={{ width: 0 }}
                animate={{ width: `${getProgressPercentage(usage.documentsCount, usage.documentsLimit)}%` }}
                transition={{ duration: 0.5 }}
              />
            </div>
          )}
        </motion.div>

        {/* Chats Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-6 backdrop-blur-xl"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="rounded-lg bg-purple-500/20 p-2">
              <MessageSquare className="h-5 w-5 text-purple-400" />
            </div>
            <span className={clsx('text-sm font-medium', getStatusColor(usage.chatsCount, usage.chatsLimit))}>
              {usage.chatsLimit === Infinity ? 'Unlimited' : `${usage.chatsCount}/${usage.chatsLimit}`}
            </span>
          </div>
          <h3 className="mb-1 text-sm font-medium text-zinc-400">Chats This Month</h3>
          {usage.chatsLimit !== Infinity && (
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-zinc-800">
              <motion.div
                className="h-full bg-purple-500"
                initial={{ width: 0 }}
                animate={{ width: `${getProgressPercentage(usage.chatsCount, usage.chatsLimit)}%` }}
                transition={{ duration: 0.5, delay: 0.1 }}
              />
            </div>
          )}
        </motion.div>

        {/* Subscription Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-6 backdrop-blur-xl"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="rounded-lg bg-green-500/20 p-2">
              <Crown className="h-5 w-5 text-green-400" />
            </div>
          </div>
          <h3 className="mb-1 text-sm font-medium text-zinc-400">Subscription</h3>
          <p className="text-lg font-semibold text-white">
            {usage.isPro ? 'Pro - Active' : 'Free Tier'}
          </p>
          {!usage.isPro && (
            <Link href="/pricing" className="mt-3 inline-block text-sm text-purple-400 hover:text-purple-300">
              Upgrade →
            </Link>
          )}
        </motion.div>
      </div>

      {/* Documents Section */}
      <section>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-white">Your Documents</h2>
        </div>

        {documents.length === 0 ? (
          <EmptyState
            icon={<FileText className="h-12 w-12" />}
            title="No documents yet"
            description="Upload your first document to get started with AI-powered document chat."
            action={{
              label: 'Upload Document',
              onClick: () => setUploadModalOpen(true),
            }}
          />
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {documents.map((document) => (
              <DocumentCard
                key={document.id}
                document={document}
                onDelete={handleDeleteDocument}
              />
            ))}
          </div>
        )}
      </section>

      {/* Recent Chats Section */}
      {recentChats.length > 0 && (
        <section>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-2xl font-bold text-white">Recent Chats</h2>
            <Link href="/chats" className="text-sm text-purple-400 hover:text-purple-300">
              View all →
            </Link>
          </div>
          <div className="space-y-2">
            {recentChats.map((chat) => (
              <Link
                key={chat.id}
                href={`/chat/${chat.id}`}
                className="block rounded-lg border border-zinc-800 bg-zinc-900/50 p-4 transition-colors hover:border-zinc-700 hover:bg-zinc-900"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-medium text-white">{chat.title}</h3>
                    <p className="text-sm text-zinc-400">{formatRelativeTime(chat.created_at)}</p>
                  </div>
                  <ArrowRight className="h-5 w-5 text-zinc-600" />
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Upload Modal */}
      <DocumentUploader
        open={uploadModalOpen}
        onOpenChange={setUploadModalOpen}
        onUploadComplete={fetchDashboardData}
      />
    </div>
  )
}


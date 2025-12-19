'use client'

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { FileText, Download } from 'lucide-react'
import { ChatInterface } from '@/components/ChatInterface'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/toast'
import { formatDate } from '@/lib/document-helpers'
import type { Document } from '@/lib/supabase'

export default function NewChatPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { showToast } = useToast()
  const documentId = searchParams.get('document') || ''
  const [document, setDocument] = useState<Document | null>(null)
  const [activeView, setActiveView] = useState<'chat' | 'document'>('chat')
  const [highlightedChunk, setHighlightedChunk] = useState<number | null>(null)

  useEffect(() => {
    if (documentId) {
      loadDocument()
    } else {
      router.push('/dashboard')
    }
  }, [documentId])

  const loadDocument = async () => {
    try {
      const response = await fetch('/api/documents')
      if (response.ok) {
        const data = await response.json()
        const doc = data.documents?.find((d: Document) => d.id === documentId)
        if (doc) {
          setDocument(doc)
        } else {
          showToast({
            variant: 'error',
            title: 'Document not found',
            message: 'The requested document could not be found.',
          })
          router.push('/dashboard')
        }
      }
    } catch (error) {
      console.error('Error loading document:', error)
    }
  }

  const handleSourceClick = (chunkIndex: number) => {
    setHighlightedChunk(chunkIndex)
    setActiveView('document')
    setTimeout(() => {
      const element = typeof window !== 'undefined' ? window.document.getElementById(`chunk-${chunkIndex}`) : null
      element?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }, 100)
  }

  const handleNewChat = () => {
    // Reset to new chat (same document)
    router.push(`/chat?document=${documentId}`)
  }

  const getChunks = () => {
    if (!document?.content) return []
    return document.content.split('\n\n').filter((chunk) => chunk.trim())
  }

  const chunks = getChunks()

  if (!documentId) {
    return null
  }

  return (
    <div className="flex h-screen bg-black text-white">
      {/* Desktop: Split View */}
      <div className="hidden md:flex md:flex-1 md:overflow-hidden">
        {/* Document Preview - 30% */}
        <div className="w-[30%] border-r border-zinc-800 flex flex-col">
          <div className="border-b border-zinc-800 p-4">
            <h2 className="text-lg font-semibold text-white mb-2">Document</h2>
            {document && (
              <>
                <p className="text-sm text-zinc-400 truncate">{document.name}</p>
                <p className="text-xs text-zinc-500 mt-1">
                  {formatDate(document.created_at)} • {document.chunk_count} chunks
                </p>
              </>
            )}
          </div>
          <div className="flex-1 overflow-y-auto p-4">
            {document ? (
              <div className="space-y-4">
                {chunks.map((chunk, index) => (
                  <motion.div
                    key={index}
                    id={`chunk-${index}`}
                    initial={{ opacity: 0 }}
                    animate={{
                      opacity: highlightedChunk === index ? 1 : 0.7,
                      backgroundColor:
                        highlightedChunk === index
                          ? 'rgba(168, 85, 247, 0.2)'
                          : 'transparent',
                    }}
                    className="rounded-lg p-3 border border-zinc-800 transition-all"
                  >
                    <div className="text-xs text-purple-400 mb-2 font-medium">
                      Chunk {index + 1}
                    </div>
                    <p className="text-sm text-zinc-300 whitespace-pre-wrap">{chunk}</p>
                  </motion.div>
                ))}
              </div>
            ) : (
              <div className="flex h-full items-center justify-center">
                <p className="text-zinc-400">Loading document...</p>
              </div>
            )}
          </div>
        </div>

        {/* Chat Interface - 70% */}
        <div className="flex-1 flex flex-col">
          <div className="border-b border-zinc-800 p-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-white">New Chat</h2>
            </div>
          </div>
          <div className="flex-1 overflow-hidden">
            <ChatInterface
              documentId={documentId}
              onNewChat={handleNewChat}
              onSourceClick={handleSourceClick}
            />
          </div>
        </div>
      </div>

      {/* Mobile: Tab View */}
      <div className="md:hidden flex flex-col w-full h-full">
        <div className="flex border-b border-zinc-800">
          <button
            onClick={() => setActiveView('chat')}
            className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
              activeView === 'chat'
                ? 'border-b-2 border-purple-500 text-purple-400'
                : 'text-zinc-400'
            }`}
          >
            Chat
          </button>
          <button
            onClick={() => setActiveView('document')}
            className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
              activeView === 'document'
                ? 'border-b-2 border-purple-500 text-purple-400'
                : 'text-zinc-400'
            }`}
          >
            Document
          </button>
        </div>

        <div className="flex-1 overflow-hidden">
          {activeView === 'chat' ? (
            <div className="h-full flex flex-col">
              <div className="border-b border-zinc-800 p-4">
                <h2 className="text-lg font-semibold text-white">New Chat</h2>
              </div>
              <div className="flex-1 overflow-hidden">
                <ChatInterface
                  documentId={documentId}
                  onNewChat={handleNewChat}
                  onSourceClick={handleSourceClick}
                />
              </div>
            </div>
          ) : (
            <div className="h-full flex flex-col">
              <div className="border-b border-zinc-800 p-4">
                <h2 className="text-lg font-semibold text-white">Document</h2>
                {document && (
                  <>
                    <p className="text-sm text-zinc-400 truncate mt-1">{document.name}</p>
                    <p className="text-xs text-zinc-500 mt-1">
                      {formatDate(document.created_at)} • {document.chunk_count} chunks
                    </p>
                  </>
                )}
              </div>
              <div className="flex-1 overflow-y-auto p-4">
                {document ? (
                  <div className="space-y-4">
                    {chunks.map((chunk, index) => (
                      <motion.div
                        key={index}
                        id={`chunk-${index}`}
                        initial={{ opacity: 0 }}
                        animate={{
                          opacity: highlightedChunk === index ? 1 : 0.7,
                          backgroundColor:
                            highlightedChunk === index
                              ? 'rgba(168, 85, 247, 0.2)'
                              : 'transparent',
                        }}
                        className="rounded-lg p-3 border border-zinc-800 transition-all"
                      >
                        <div className="text-xs text-purple-400 mb-2 font-medium">
                          Chunk {index + 1}
                        </div>
                        <p className="text-sm text-zinc-300 whitespace-pre-wrap">{chunk}</p>
                      </motion.div>
                    ))}
                  </div>
                ) : (
                  <div className="flex h-full items-center justify-center">
                    <p className="text-zinc-400">Loading document...</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}


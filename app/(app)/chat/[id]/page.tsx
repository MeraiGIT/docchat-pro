'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { FileText, Download, X } from 'lucide-react'
import { ChatInterface } from '@/components/ChatInterface'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/toast'
import { formatDate } from '@/lib/document-helpers'
import type { Document } from '@/lib/supabase'

export default function ChatPage() {
  const params = useParams()
  const router = useRouter()
  const { showToast } = useToast()
  const chatId = params.id as string
  const [document, setDocument] = useState<Document | null>(null)
  const [documentId, setDocumentId] = useState<string>('')
  const [activeView, setActiveView] = useState<'chat' | 'document'>('chat')
  const [highlightedChunk, setHighlightedChunk] = useState<number | null>(null)

  useEffect(() => {
    loadChatData()
  }, [chatId])

  const loadChatData = async () => {
    try {
      const response = await fetch(`/api/chat/${chatId}`)
      if (response.ok) {
        const data = await response.json()
        if (data.chat) {
          setDocumentId(data.chat.document_id)
          if (data.chat.documents) {
            setDocument(data.chat.documents)
          } else {
            // Fetch document separately if not included
            const docResponse = await fetch(`/api/documents`)
            if (docResponse.ok) {
              const docsData = await docResponse.json()
              const doc = docsData.documents?.find(
                (d: Document) => d.id === data.chat.document_id
              )
              if (doc) setDocument(doc)
            }
          }
        }
      }
    } catch (error) {
      console.error('Error loading chat:', error)
    }
  }

  const handleSourceClick = (chunkIndex: number) => {
    setHighlightedChunk(chunkIndex)
    setActiveView('document')
    // Scroll to chunk in document view
    setTimeout(() => {
      const element = typeof window !== 'undefined' ? window.document.getElementById(`chunk-${chunkIndex}`) : null
      element?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }, 100)
  }

  const handleExport = async () => {
    try {
      const response = await fetch(`/api/chat/${chatId}`)
      if (response.ok) {
        const data = await response.json()
        const chat = data.chat

        const exportData = {
          document: document?.name || 'Unknown',
          date: new Date().toISOString(),
          messages: chat.messages,
          metadata: {
            chatId: chat.id,
            documentId: chat.document_id,
            createdAt: chat.created_at,
            updatedAt: chat.updated_at,
          },
        }

        const blob = new Blob([JSON.stringify(exportData, null, 2)], {
          type: 'application/json',
        })
        const url = URL.createObjectURL(blob)
        const a = window.document.createElement('a')
        a.href = url
        a.download = `chat-${document?.name || 'document'}-${new Date().toISOString().split('T')[0]}.json`
        window.document.body.appendChild(a)
        a.click()
        window.document.body.removeChild(a)
        URL.revokeObjectURL(url)

        showToast({
          variant: 'success',
          title: 'Exported',
          message: 'Chat history downloaded successfully.',
        })
      }
    } catch (error) {
      showToast({
        variant: 'error',
        title: 'Export failed',
        message: 'Failed to export chat history.',
      })
    }
  }

  const handleNewChat = () => {
    if (documentId) {
      router.push(`/chat?document=${documentId}`)
    } else {
      router.push('/dashboard')
    }
  }

  // Split document content into chunks for highlighting
  const getChunks = () => {
    if (!document?.content) return []
    // Simple split by double newlines (chunks are stored with \n\n separators)
    return document.content.split('\n\n').filter((chunk) => chunk.trim())
  }

  const chunks = getChunks()

  return (
    <div className="flex h-screen bg-black text-white">
      {/* Desktop: Split View */}
      <div className="hidden md:flex md:flex-1 md:overflow-hidden">
        {/* Document Preview - 30% */}
        <div className="w-[30%] border-r border-zinc-800 flex flex-col">
          <div className="border-b border-zinc-800 p-4">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-lg font-semibold text-white">Document</h2>
              <Button variant="ghost" size="sm" onClick={handleExport}>
                <Download className="h-4 w-4" />
              </Button>
            </div>
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
                    <p className="text-sm text-zinc-300 whitespace-pre-wrap">
                      {chunk}
                    </p>
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
              <h2 className="text-lg font-semibold text-white">Chat</h2>
              <Button variant="ghost" size="sm" onClick={handleNewChat}>
                New Chat
              </Button>
            </div>
          </div>
          <div className="flex-1 overflow-hidden">
            {documentId ? (
              <ChatInterface
                documentId={documentId}
                chatId={chatId}
                onNewChat={handleNewChat}
                onSourceClick={handleSourceClick}
              />
            ) : (
              <div className="flex h-full items-center justify-center">
                <p className="text-zinc-400">Loading chat...</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Mobile: Tab View */}
      <div className="md:hidden flex flex-col w-full h-full">
        {/* Tabs */}
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

        {/* Content */}
        <div className="flex-1 overflow-hidden">
          {activeView === 'chat' ? (
            <div className="h-full flex flex-col">
              <div className="border-b border-zinc-800 p-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-white">Chat</h2>
                  <div className="flex gap-2">
                    <Button variant="ghost" size="sm" onClick={handleExport}>
                      <Download className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={handleNewChat}>
                      New
                    </Button>
                  </div>
                </div>
              </div>
              <div className="flex-1 overflow-hidden">
                {documentId ? (
                  <ChatInterface
                    documentId={documentId}
                    chatId={chatId}
                    onNewChat={handleNewChat}
                    onSourceClick={handleSourceClick}
                  />
                ) : (
                  <div className="flex h-full items-center justify-center">
                    <p className="text-zinc-400">Loading chat...</p>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="h-full flex flex-col">
              <div className="border-b border-zinc-800 p-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-white">Document</h2>
                  {document && (
                    <Button variant="ghost" size="sm" onClick={handleExport}>
                      <Download className="h-4 w-4" />
                    </Button>
                  )}
                </div>
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


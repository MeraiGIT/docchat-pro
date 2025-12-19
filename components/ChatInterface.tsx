'use client'

import { useState, useEffect, useRef } from 'react'
import { Send, Loader2 } from 'lucide-react'
import { useToast } from '@/components/ui/toast'
import { Button } from '@/components/ui/button'
import { ChatMessage } from './ChatMessage'
import { StreamingMessage } from './StreamingMessage'
import { EmptyState } from './EmptyState'
import { checkChatLimit } from '@/lib/rate-limit'
import { formatRelativeTime } from '@/lib/document-helpers'
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts'
import { MessageSquare } from 'lucide-react'

interface Message {
  role: 'user' | 'assistant'
  content: string
  sources?: Array<{ chunkIndex: number; preview?: string; similarity?: number }>
  timestamp?: string
}

interface ChatInterfaceProps {
  documentId: string
  chatId?: string
  onNewChat?: () => void
  onSourceClick?: (chunkIndex: number) => void
}

export function ChatInterface({
  documentId,
  chatId,
  onNewChat,
  onSourceClick,
}: ChatInterfaceProps) {
  const { showToast } = useToast()
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isStreaming, setIsStreaming] = useState(false)
  const [streamingText, setStreamingText] = useState('')
  const [streamingSources, setStreamingSources] = useState<
    Array<{ chunkIndex: number; preview?: string; similarity?: number }>
  >([])
  const [currentChatId, setCurrentChatId] = useState<string | undefined>(chatId)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const [canSend, setCanSend] = useState(true)

  useEffect(() => {
    if (chatId) {
      loadChatHistory()
    }
  }, [chatId])

  useEffect(() => {
    scrollToBottom()
  }, [messages, streamingText])

  useEffect(() => {
    checkLimit()
  }, [])

  const checkLimit = async () => {
    try {
      const response = await fetch('/api/auth/session')
      if (response.ok) {
        const data = await response.json()
        if (data.user && data.usage) {
          // Check if user has reached limit
          const isAtLimit = !data.usage.isPro && 
            (data.usage.chatsCount >= data.usage.chatsLimit)
          setCanSend(!isAtLimit)
        }
      }
    } catch (error) {
      console.error('Error checking limit:', error)
    }
  }

  const loadChatHistory = async () => {
    if (!chatId) return

    try {
      const response = await fetch(`/api/chat/${chatId}`)
      if (response.ok) {
        const data = await response.json()
        if (data.chat?.messages) {
          setMessages(
            data.chat.messages.map((msg: any) => ({
              ...msg,
              timestamp: formatRelativeTime(data.chat.updated_at),
            }))
          )
        }
      }
    } catch (error) {
      console.error('Error loading chat history:', error)
    }
  }

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const handleSend = async () => {
    if (!input.trim() || isLoading || !canSend) return

    const userMessage = input.trim()
    setInput('')
    setIsLoading(true)
    setIsStreaming(true)
    setStreamingText('')
    setStreamingSources([])

    // Add user message to UI
    const newUserMessage: Message = {
      role: 'user',
      content: userMessage,
      timestamp: 'Just now',
    }
    setMessages((prev) => [...prev, newUserMessage])

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: userMessage,
          documentId,
          chatId: currentChatId,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to send message')
      }

      // Handle streaming response
      const reader = response.body?.getReader()
      const decoder = new TextDecoder()

      if (!reader) {
        throw new Error('No response stream')
      }

      let fullResponse = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const chunk = decoder.decode(value)
        const lines = chunk.split('\n')

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.substring(6))

              if (data.chunk) {
                fullResponse += data.chunk
                setStreamingText(fullResponse)
              }

              if (data.chatId) {
                setCurrentChatId(data.chatId)
              }

              if (data.sources) {
                setStreamingSources(data.sources)
              }

              if (data.done) {
                setIsStreaming(false)
                setMessages((prev) => [
                  ...prev,
                  {
                    role: 'assistant',
                    content: fullResponse,
                    sources: data.sources,
                    timestamp: 'Just now',
                  },
                ])
                setStreamingText('')
                setStreamingSources([])
              }

              if (data.error) {
                throw new Error(data.error)
              }
            } catch (e) {
              // Skip invalid JSON
            }
          }
        }
      }
    } catch (error) {
      console.error('Error sending message:', error)
      showToast({
        variant: 'error',
        title: 'Error',
        message: error instanceof Error ? error.message : 'Failed to send message',
      })
      // Remove user message on error
      setMessages((prev) => prev.slice(0, -1))
    } finally {
      setIsLoading(false)
      setIsStreaming(false)
      checkLimit()
    }
  }

  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Keyboard shortcuts
  useKeyboardShortcuts([
    {
      key: 'Enter',
      meta: true,
      handler: () => {
        if (!isLoading && canSend && input.trim()) {
          handleSend()
        }
      },
    },
    {
      key: 'Enter',
      ctrl: true,
      handler: () => {
        if (!isLoading && canSend && input.trim()) {
          handleSend()
        }
      },
    },
  ])

  const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div className="flex h-full flex-col bg-black">
      {/* Messages Container */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && !isStreaming && (
          <EmptyState
            icon={<MessageSquare className="h-12 w-12" />}
            title="Start a conversation"
            description="Ask questions about your document to get AI-powered answers with source citations."
            className="h-full"
          />
        )}

        {messages.map((message, index) => (
          <ChatMessage
            key={index}
            role={message.role}
            content={message.content}
            sources={message.sources}
            timestamp={message.timestamp}
            onSourceClick={onSourceClick}
          />
        ))}

        {isStreaming && (
          <StreamingMessage
            text={streamingText}
            isComplete={false}
            sources={streamingSources}
            onSourceClick={onSourceClick}
          />
        )}

        {isLoading && !isStreaming && (
          <div className="flex gap-4 justify-start">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-purple-500/20">
              <span className="text-sm font-semibold text-purple-400">AI</span>
            </div>
            <div className="rounded-2xl bg-zinc-800 px-4 py-3">
              <Loader2 className="h-5 w-5 animate-spin text-purple-400" />
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="border-t border-zinc-800 bg-zinc-900/50 p-4">
        {!canSend && (
          <div className="mb-2 rounded-lg bg-yellow-500/20 p-2 text-sm text-yellow-400">
            You've reached your chat limit. Upgrade to Pro for unlimited chats.
          </div>
        )}
        <div className="flex gap-2">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Ask a question about the document... (Press Enter to send, Shift+Enter for new line)"
            disabled={isLoading || !canSend}
            className="flex-1 resize-none rounded-lg border border-zinc-800 bg-zinc-900 px-4 py-3 text-white placeholder-zinc-500 focus:border-purple-500 focus:outline-none disabled:opacity-50"
            rows={1}
            maxLength={1000}
            aria-label="Chat message input"
            style={{
              minHeight: '44px',
              maxHeight: '120px',
            }}
            onInput={(e) => {
              const target = e.target as HTMLTextAreaElement
              target.style.height = 'auto'
              target.style.height = `${Math.min(target.scrollHeight, 120)}px`
            }}
          />
          <Button
            onClick={handleSend}
            disabled={!input.trim() || isLoading || !canSend}
            loading={isLoading}
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
        {onNewChat && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onNewChat}
            className="mt-2 w-full"
          >
            Start New Chat
          </Button>
        )}
      </div>
    </div>
  )
}


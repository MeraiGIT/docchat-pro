'use client'

import { useState } from 'react'
import { Copy, Check } from 'lucide-react'
import { motion } from 'framer-motion'
import { SourceCitation } from './SourceCitation'
import { clsx } from 'clsx'

// Simple markdown renderer (basic support)
function renderMarkdown(text: string) {
  // Convert markdown to HTML-like structure
  let html = text
  
  // Headers
  html = html.replace(/^### (.*$)/gim, '<h3 class="text-lg font-semibold mb-2 mt-4">$1</h3>')
  html = html.replace(/^## (.*$)/gim, '<h2 class="text-xl font-semibold mb-2 mt-4">$1</h2>')
  html = html.replace(/^# (.*$)/gim, '<h1 class="text-2xl font-bold mb-2 mt-4">$1</h1>')
  
  // Bold
  html = html.replace(/\*\*(.*?)\*\*/g, '<strong class="font-semibold">$1</strong>')
  
  // Italic
  html = html.replace(/\*(.*?)\*/g, '<em class="italic">$1</em>')
  
  // Code blocks
  html = html.replace(/```([\s\S]*?)```/g, '<pre class="bg-zinc-900 rounded p-3 my-2 overflow-x-auto"><code>$1</code></pre>')
  
  // Inline code
  html = html.replace(/`([^`]+)`/g, '<code class="bg-zinc-900 rounded px-1.5 py-0.5 text-xs text-purple-300">$1</code>')
  
  // Lists
  html = html.replace(/^\* (.*$)/gim, '<li class="ml-4">$1</li>')
  html = html.replace(/^- (.*$)/gim, '<li class="ml-4">$1</li>')
  html = html.replace(/^(\d+)\. (.*$)/gim, '<li class="ml-4">$2</li>')
  
  // Links
  html = html.replace(/\[([^\]]+)\]\(([^\)]+)\)/g, '<a href="$2" class="text-purple-400 hover:underline" target="_blank" rel="noopener">$1</a>')
  
  // Paragraphs
  html = html.split('\n\n').map(p => {
    if (p.trim() && !p.startsWith('<')) {
      return `<p class="mb-2">${p}</p>`
    }
    return p
  }).join('\n')
  
  return html
}

interface ChatMessageProps {
  role: 'user' | 'assistant'
  content: string
  sources?: Array<{ chunkIndex: number; preview?: string; similarity?: number }>
  timestamp?: string
  onSourceClick?: (chunkIndex: number) => void
}

export function ChatMessage({
  role,
  content,
  sources,
  timestamp,
  onSourceClick,
}: ChatMessageProps) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    await navigator.clipboard.writeText(content)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const isUser = role === 'user'

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={clsx('flex gap-4', isUser ? 'justify-end' : 'justify-start')}
    >
      {!isUser && (
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-purple-500/20">
          <span className="text-sm font-semibold text-purple-400">AI</span>
        </div>
      )}

      <div
        className={clsx(
          'group relative max-w-[80%] rounded-2xl px-4 py-3',
          isUser
            ? 'bg-blue-500 text-white'
            : 'bg-zinc-800 text-zinc-100'
        )}
      >
        {isUser ? (
          <p className="whitespace-pre-wrap break-words">{content}</p>
        ) : (
          <div
            className="prose prose-invert prose-sm max-w-none"
            dangerouslySetInnerHTML={{ __html: renderMarkdown(content) }}
          />
        )}

        {sources && sources.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2 border-t border-zinc-700/50 pt-3">
            <span className="text-xs text-zinc-400">Sources:</span>
            {sources.map((source, index) => (
              <SourceCitation
                key={index}
                chunkIndex={source.chunkIndex}
                preview={source.preview}
                similarity={source.similarity}
                onClick={() => onSourceClick?.(source.chunkIndex)}
              />
            ))}
          </div>
        )}

        {timestamp && (
          <div className="mt-2 text-xs text-zinc-400 opacity-0 transition-opacity group-hover:opacity-100">
            {timestamp}
          </div>
        )}

        <button
          onClick={handleCopy}
          className="absolute right-2 top-2 rounded-lg p-1.5 opacity-0 transition-opacity hover:bg-black/20 group-hover:opacity-100"
          title="Copy message"
        >
          {copied ? (
            <Check className="h-4 w-4 text-green-400" />
          ) : (
            <Copy className="h-4 w-4" />
          )}
        </button>
      </div>

      {isUser && (
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-500/20">
          <span className="text-sm font-semibold text-blue-400">You</span>
        </div>
      )}
    </motion.div>
  )
}


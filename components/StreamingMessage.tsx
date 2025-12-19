'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { SourceCitation } from './SourceCitation'

interface StreamingMessageProps {
  text: string
  isComplete: boolean
  sources?: Array<{ chunkIndex: number; preview?: string; similarity?: number }>
  onSourceClick?: (chunkIndex: number) => void
}

export function StreamingMessage({
  text,
  isComplete,
  sources,
  onSourceClick,
}: StreamingMessageProps) {
  const [displayedText, setDisplayedText] = useState('')
  const [showCursor, setShowCursor] = useState(true)

  useEffect(() => {
    if (text.length > displayedText.length) {
      // Animate text appearing
      const timeout = setTimeout(() => {
        setDisplayedText(text.substring(0, displayedText.length + 1))
      }, 20) // Adjust speed here

      return () => clearTimeout(timeout)
    } else if (text.length === displayedText.length && isComplete) {
      setShowCursor(false)
    }
  }, [text, displayedText, isComplete])

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex gap-4 justify-start"
    >
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-purple-500/20">
        <span className="text-sm font-semibold text-purple-400">AI</span>
      </div>

      <div className="max-w-[80%] rounded-2xl bg-zinc-800 px-4 py-3 text-zinc-100">
        <div className="prose prose-invert prose-sm max-w-none">
          <p className="whitespace-pre-wrap break-words">
            {displayedText}
            {showCursor && (
              <motion.span
                animate={{ opacity: [1, 0] }}
                transition={{ duration: 0.8, repeat: Infinity, repeatType: 'reverse' }}
                className="ml-1 inline-block h-4 w-0.5 bg-purple-400"
              />
            )}
          </p>
        </div>

        {sources && sources.length > 0 && isComplete && (
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
      </div>
    </motion.div>
  )
}


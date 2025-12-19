'use client'

import { motion } from 'framer-motion'
import { FileText } from 'lucide-react'
import { clsx } from 'clsx'

interface SourceCitationProps {
  chunkIndex: number
  preview?: string
  similarity?: number
  onClick?: () => void
  className?: string
}

export function SourceCitation({
  chunkIndex,
  preview,
  similarity,
  onClick,
  className,
}: SourceCitationProps) {
  return (
    <motion.button
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      onClick={onClick}
      className={clsx(
        'inline-flex items-center gap-1.5 rounded-full bg-purple-500/20 px-2.5 py-1 text-xs font-medium text-purple-400 transition-colors hover:bg-purple-500/30',
        className
      )}
      title={preview || `Chunk ${chunkIndex + 1}`}
    >
      <FileText className="h-3 w-3" />
      <span>Chunk {chunkIndex + 1}</span>
      {similarity !== undefined && (
        <span className="text-purple-300/70">
          ({Math.round(similarity * 100)}%)
        </span>
      )}
    </motion.button>
  )
}


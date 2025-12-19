'use client'

import { useState, useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import { Upload, File, X, Loader2 } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { validateFileType, validateFileSize, formatFileSize } from '@/lib/document-helpers'
import { useToast } from '@/components/ui/toast'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

interface DocumentUploaderProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onUploadComplete: () => void
}

export function DocumentUploader({ open, onOpenChange, onUploadComplete }: DocumentUploaderProps) {
  const { showToast } = useToast()
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0]
    if (!file) return

    // Validate file type
    const typeValidation = validateFileType(file)
    if (!typeValidation.valid) {
      showToast({
        variant: 'error',
        title: 'Invalid file type',
        message: typeValidation.error || 'Please upload a valid file.',
      })
      return
    }

    // Validate file size
    const sizeValidation = validateFileSize(file, 10)
    if (!sizeValidation.valid) {
      showToast({
        variant: 'error',
        title: 'File too large',
        message: sizeValidation.error || 'File size exceeds limit.',
      })
      return
    }

    setSelectedFile(file)
  }, [showToast])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'text/plain': ['.txt'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
    },
    maxFiles: 1,
    maxSize: 10 * 1024 * 1024, // 10MB
  })

  const handleUpload = async () => {
    if (!selectedFile) return

    setUploading(true)
    setUploadProgress(0)

    try {
      // Create FormData properly
      const formData = new FormData()
      formData.append('file', selectedFile)

      // Use fetch API with progress tracking
      const response = await fetch('/api/documents/upload', {
        method: 'POST',
        body: formData, // Don't set Content-Type, browser sets it automatically
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Upload failed')
      }

      const data = await response.json()

      showToast({
        variant: 'success',
        title: 'Upload successful',
        message: data.message || 'Your document has been uploaded and processed.',
      })

      setSelectedFile(null)
      setUploadProgress(0)
      onOpenChange(false)
      onUploadComplete()
    } catch (error) {
      console.error('Upload error:', error)
      showToast({
        variant: 'error',
        title: 'Upload failed',
        message: error instanceof Error ? error.message : 'Failed to upload document. Please try again.',
      })
    } finally {
      setUploading(false)
    }
  }

  const handleClose = () => {
    if (!uploading) {
      setSelectedFile(null)
      setUploadProgress(0)
      onOpenChange(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Upload Document</DialogTitle>
          <DialogDescription>
            Upload a PDF, TXT, or DOCX file to start chatting with it.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {!selectedFile ? (
            <div
              {...getRootProps()}
              className={`
                flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed p-8 transition-colors
                ${isDragActive ? 'border-purple-500 bg-purple-500/10' : 'border-zinc-700 bg-zinc-900/50'}
                hover:border-purple-500 hover:bg-purple-500/10
              `}
            >
              <input {...getInputProps()} />
              <Upload className="mb-4 h-12 w-12 text-zinc-400" />
              <p className="mb-2 text-center text-sm font-medium text-white">
                {isDragActive ? 'Drop the file here' : 'Drag & drop a file here'}
              </p>
              <p className="text-center text-xs text-zinc-400">
                or click to browse
              </p>
              <p className="mt-2 text-center text-xs text-zinc-500">
                PDF, TXT, DOCX up to 10MB
              </p>
            </div>
          ) : (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-4"
            >
              <div className="flex items-center gap-3 rounded-lg border border-zinc-800 bg-zinc-900/50 p-4">
                <File className="h-5 w-5 text-purple-400" />
                <div className="flex-1 min-w-0">
                  <p className="truncate font-medium text-white">{selectedFile.name}</p>
                  <p className="text-sm text-zinc-400">{formatFileSize(selectedFile.size)}</p>
                </div>
                {!uploading && (
                  <button
                    onClick={() => setSelectedFile(null)}
                    className="rounded-lg p-1 text-zinc-400 hover:text-white"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>

              {uploading && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-zinc-400">Uploading...</span>
                    <span className="text-zinc-400">{Math.round(uploadProgress)}%</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-zinc-800">
                    <motion.div
                      className="h-full bg-gradient-to-r from-purple-500 to-blue-500"
                      initial={{ width: 0 }}
                      animate={{ width: `${uploadProgress}%` }}
                      transition={{ duration: 0.2 }}
                    />
                  </div>
                </div>
              )}
            </motion.div>
          )}

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={handleClose} disabled={uploading}>
              Cancel
            </Button>
            <Button
              onClick={handleUpload}
              disabled={!selectedFile || uploading}
              loading={uploading}
            >
              {uploading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Uploading...
                </>
              ) : (
                'Upload'
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}


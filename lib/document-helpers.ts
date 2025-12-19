import { FileText, File, FileType } from 'lucide-react'
import { format, formatDistanceToNow } from 'date-fns'

/**
 * Format file size in bytes to human-readable string
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes'
  
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i]
}

/**
 * Format date string to readable format
 */
export function formatDate(dateString: string): string {
  try {
    return format(new Date(dateString), 'MMM d, yyyy')
  } catch {
    return 'Unknown date'
  }
}

/**
 * Format date to relative time (e.g., "2 hours ago")
 */
export function formatRelativeTime(dateString: string): string {
  try {
    return formatDistanceToNow(new Date(dateString), { addSuffix: true })
  } catch {
    return 'Unknown time'
  }
}

/**
 * Get icon component for file type
 */
export function getDocumentIcon(fileType: string) {
  const type = fileType.toLowerCase()
  
  if (type === 'pdf') {
    return FileText
  } else if (type === 'txt' || type === 'text') {
    return FileType
  } else if (type === 'docx' || type === 'doc') {
    return File
  }
  
  return FileText
}

/**
 * Validate file type
 */
export function validateFileType(file: File): { valid: boolean; error?: string } {
  const allowedTypes = ['application/pdf', 'text/plain', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
  const allowedExtensions = ['.pdf', '.txt', '.docx']
  
  const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase()
  
  if (!allowedTypes.includes(file.type) && !allowedExtensions.includes(fileExtension)) {
    return {
      valid: false,
      error: 'Invalid file type. Please upload PDF, TXT, or DOCX files.',
    }
  }
  
  return { valid: true }
}

/**
 * Validate file size (max 10MB)
 */
export function validateFileSize(file: File, maxSizeMB: number = 10): { valid: boolean; error?: string } {
  const maxSizeBytes = maxSizeMB * 1024 * 1024
  
  if (file.size > maxSizeBytes) {
    return {
      valid: false,
      error: `File size exceeds ${maxSizeMB}MB limit.`,
    }
  }
  
  return { valid: true }
}

/**
 * Get file type from filename
 */
export function getFileType(filename: string): string {
  const extension = filename.split('.').pop()?.toLowerCase() || ''
  
  if (extension === 'pdf') return 'pdf'
  if (extension === 'txt') return 'txt'
  if (extension === 'docx' || extension === 'doc') return 'docx'
  
  return 'unknown'
}


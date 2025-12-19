/**
 * Input validation utilities
 * Client and server-side validation helpers
 */

/**
 * Validate email format
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

/**
 * Validate password strength
 * Requirements:
 * - At least 8 characters
 * - At least one uppercase letter
 * - At least one lowercase letter
 * - At least one number
 */
export function isValidPassword(password: string): {
  valid: boolean
  errors: string[]
} {
  const errors: string[] = []

  if (password.length < 8) {
    errors.push('Password must be at least 8 characters long')
  }
  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter')
  }
  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter')
  }
  if (!/\d/.test(password)) {
    errors.push('Password must contain at least one number')
  }

  return {
    valid: errors.length === 0,
    errors,
  }
}

/**
 * Validate file type
 */
export function isValidFileType(
  filename: string,
  allowedTypes: string[] = ['pdf', 'txt', 'docx']
): boolean {
  const extension = filename.split('.').pop()?.toLowerCase()
  return extension ? allowedTypes.includes(extension) : false
}

/**
 * Validate file size
 */
export function isValidFileSize(
  size: number,
  maxSizeBytes: number = 10 * 1024 * 1024 // 10MB default
): { valid: boolean; message?: string } {
  if (size > maxSizeBytes) {
    const maxSizeMB = Math.round(maxSizeBytes / (1024 * 1024))
    return {
      valid: false,
      message: `File size exceeds ${maxSizeMB}MB limit. Please choose a smaller file.`,
    }
  }
  return { valid: true }
}

/**
 * Validate chat message
 */
export function isValidChatMessage(message: string): {
  valid: boolean
  message?: string
} {
  const trimmed = message.trim()
  if (trimmed.length === 0) {
    return { valid: false, message: 'Message cannot be empty' }
  }
  if (trimmed.length > 1000) {
    return { valid: false, message: 'Message cannot exceed 1000 characters' }
  }
  return { valid: true }
}

/**
 * Sanitize string input (basic XSS prevention)
 */
export function sanitizeString(input: string): string {
  return input
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;')
}

/**
 * Validate UUID format
 */
export function isValidUUID(uuid: string): boolean {
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  return uuidRegex.test(uuid)
}

/**
 * Validate document ID
 */
export function isValidDocumentId(id: string): boolean {
  return isValidUUID(id)
}

/**
 * Validate chat ID
 */
export function isValidChatId(id: string): boolean {
  return isValidUUID(id)
}


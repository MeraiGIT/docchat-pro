/**
 * Keyboard shortcuts utilities
 * Handles global keyboard shortcuts for the application
 */

export type KeyboardShortcut = {
  key: string
  ctrl?: boolean
  meta?: boolean
  shift?: boolean
  alt?: boolean
  handler: () => void
  description?: string
}

/**
 * Check if a keyboard event matches a shortcut
 */
export function matchesShortcut(
  event: KeyboardEvent,
  shortcut: KeyboardShortcut
): boolean {
  if (event.key.toLowerCase() !== shortcut.key.toLowerCase()) {
    return false
  }

  if (shortcut.ctrl && !event.ctrlKey) return false
  if (shortcut.meta && !event.metaKey) return false
  if (shortcut.shift && !event.shiftKey) return false
  if (shortcut.alt && !event.altKey) return false

  // Ensure other modifiers are not pressed
  if (!shortcut.ctrl && event.ctrlKey) return false
  if (!shortcut.meta && event.metaKey) return false
  if (!shortcut.shift && event.shiftKey) return false
  if (!shortcut.alt && event.altKey) return false

  return true
}

/**
 * Common keyboard shortcuts
 */
export const COMMON_SHORTCUTS = {
  // Command/Ctrl + K: Quick command menu
  COMMAND_MENU: {
    key: 'k',
    meta: true,
    description: 'Open command menu',
  },
  // Command/Ctrl + K (Windows/Linux)
  COMMAND_MENU_ALT: {
    key: 'k',
    ctrl: true,
    description: 'Open command menu',
  },
  // Escape: Close modals/dialogs
  ESCAPE: {
    key: 'Escape',
    description: 'Close modal or dialog',
  },
  // Command/Ctrl + Enter: Submit form
  SUBMIT: {
    key: 'Enter',
    meta: true,
    description: 'Submit form',
  },
  SUBMIT_ALT: {
    key: 'Enter',
    ctrl: true,
    description: 'Submit form',
  },
  // Slash: Focus search
  FOCUS_SEARCH: {
    key: '/',
    description: 'Focus search input',
  },
} as const


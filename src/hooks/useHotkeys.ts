import { useEffect } from 'react'

import { TOOL_KEY_BINDINGS } from '../constants/tools'
import type { Tool } from '../types/shape'

const TOOL_BY_KEY = Object.entries(TOOL_KEY_BINDINGS).reduce<Record<string, Tool>>(
  (bindings, [tool, key]) => {
    bindings[key.toLowerCase()] = tool as Tool
    return bindings
  },
  {},
)

interface UseHotkeysOptions {
  onToolChange: (tool: Tool) => void
  onDelete: () => void
  onDuplicate: () => void
  onEscape: () => void
  onUndo: () => void
  onRedo: () => void
  onCopy: () => void
  onPaste: () => void
  onGroup: () => void
  onUngroup: () => void
}

function isTypingTarget(target: EventTarget | null): boolean {
  return (
    target instanceof HTMLInputElement ||
    target instanceof HTMLTextAreaElement ||
    target instanceof HTMLSelectElement ||
    (target instanceof HTMLElement && target.isContentEditable)
  )
}

export function useHotkeys({
  onToolChange,
  onDelete,
  onDuplicate,
  onEscape,
  onUndo,
  onRedo,
  onCopy,
  onPaste,
  onGroup,
  onUngroup,
}: UseHotkeysOptions): void {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (isTypingTarget(event.target)) return

      const modifier = event.ctrlKey || event.metaKey
      const key = event.key.toLowerCase()

      if (modifier) {
        if (key === 'd') {
          event.preventDefault()
          onDuplicate()
          return
        }
        if (key === 'z') {
          event.preventDefault()
          if (event.shiftKey) onRedo()
          else onUndo()
          return
        }
        if (key === 'y') {
          event.preventDefault()
          onRedo()
          return
        }
        if (key === 'c') {
          event.preventDefault()
          onCopy()
          return
        }
        if (key === 'v') {
          event.preventDefault()
          onPaste()
          return
        }
        if (key === 'g') {
          event.preventDefault()
          if (event.shiftKey) onUngroup()
          else onGroup()
          return
        }
      }

      if (event.key === 'Delete' || event.key === 'Backspace') {
        event.preventDefault()
        onDelete()
        return
      }

      if (event.key === 'Escape') {
        onEscape()
        return
      }

      if (event.repeat) return

      const tool = TOOL_BY_KEY[event.key.toLowerCase()]
      if (!tool) return

      event.preventDefault()
      onToolChange(tool)
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onCopy, onDelete, onDuplicate, onEscape, onGroup, onPaste, onRedo, onToolChange, onUndo, onUngroup])
}
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
}: UseHotkeysOptions): void {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (isTypingTarget(event.target)) return

      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'd') {
        event.preventDefault()
        onDuplicate()
        return
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
  }, [onDelete, onDuplicate, onEscape, onToolChange])
}
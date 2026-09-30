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

function isTypingTarget(target: EventTarget | null): boolean {
  return (
    target instanceof HTMLInputElement ||
    target instanceof HTMLTextAreaElement ||
    target instanceof HTMLSelectElement ||
    (target instanceof HTMLElement && target.isContentEditable)
  )
}

export function useHotkeys(onToolChange: (tool: Tool) => void): void {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.repeat || isTypingTarget(event.target)) return

      const tool = TOOL_BY_KEY[event.key.toLowerCase()]
      if (!tool) return

      event.preventDefault()
      onToolChange(tool)
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onToolChange])
}

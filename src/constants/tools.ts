import type { Tool } from '../types/shape'

export const DEFAULT_TOOL: Tool = 'select'

export const TOOL_KEY_BINDINGS: Record<Tool, string> = {
  select: 'V',
  rectangle: 'R',
  ellipse: 'O',
}

export const TOOLS: ReadonlyArray<{
  id: Tool
  label: string
  shortcut: string
}> = [
  { id: 'select', label: 'Move', shortcut: TOOL_KEY_BINDINGS.select },
  { id: 'rectangle', label: 'Rectangle', shortcut: TOOL_KEY_BINDINGS.rectangle },
  { id: 'ellipse', label: 'Ellipse', shortcut: TOOL_KEY_BINDINGS.ellipse },
]

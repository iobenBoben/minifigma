import type { AutoLayout, Shape, ShapeType, TextProps, Tool } from '../types/shape'

export const DEFAULT_TOOL = 'select'

export const TOOL_KEY_BINDINGS: Record<Tool, string> = {
  select: 'V',
  rectangle: 'R',
  ellipse: 'O',
  frame: 'F',
  text: 'T',
}

export const TOOLS: ReadonlyArray<{
  id: Tool
  label: string
  shortcut: string
}> = [
  { id: 'select', label: 'Move', shortcut: TOOL_KEY_BINDINGS.select },
  { id: 'frame', label: 'Frame', shortcut: TOOL_KEY_BINDINGS.frame },
  { id: 'rectangle', label: 'Rectangle', shortcut: TOOL_KEY_BINDINGS.rectangle },
  { id: 'ellipse', label: 'Ellipse', shortcut: TOOL_KEY_BINDINGS.ellipse },
  { id: 'text', label: 'Text', shortcut: TOOL_KEY_BINDINGS.text },
]

export const ACCENT = '#5b6bd8'

export const SHAPE_PALETTE: Record<ShapeType, { fill: string; stroke: string }> = {
  rectangle: { fill: '#4a5bc4', stroke: '#8290ee' },
  ellipse: { fill: '#1a6f80', stroke: '#3fc4d4' },
  frame: { fill: 'transparent', stroke: '#5a5d72' },
  text: { fill: '#f2f4fb', stroke: 'transparent' },
}

export const DEFAULT_FRAME_SIZE = { width: 480, height: 320 }

export const DEFAULT_AUTO_LAYOUT: AutoLayout = {
  mode: 'none',
  gap: 16,
  paddingTop: 24,
  paddingRight: 24,
  paddingBottom: 24,
  paddingLeft: 24,
  alignItems: 'start',
  justifyContent: 'start',
}

export const DEFAULT_TEXT: TextProps = {
  content: 'Text',
  fontFamily: 'Inter',
  fontSize: 16,
  fontStyle: 'Regular',
  letterSpacing: 0,
  lineHeight: 24,
  textAlign: 'LEFT',
}

let idCounter = 0

export function createShape(type: ShapeType, x: number, y: number, width: number, height: number): Shape {
  idCounter += 1
  const palette = SHAPE_PALETTE[type]
  const isFrame = type === 'frame'
  const isText = type === 'text'

  return {
    id: `${type}-${Date.now().toString(36)}-${idCounter}`,
    name: isFrame ? 'Frame' : isText ? 'Text' : type === 'rectangle' ? 'Rectangle' : 'Ellipse',
    type,
    x,
    y,
    width,
    height,
    fill: palette.fill,
    stroke: palette.stroke,
    strokeWidth: isFrame ? 1 : 1,
    radius: type === 'rectangle' ? 4 : 0,
    rotation: 0,
    opacity: 100,
    visible: true,
    locked: false,
    autoLayout: isFrame ? { ...DEFAULT_AUTO_LAYOUT, mode: 'vertical' } : { ...DEFAULT_AUTO_LAYOUT },
    text: { ...DEFAULT_TEXT },
    children: [],
  }
}

export const FONT_STACKS = [
  'Inter',
  'Roboto',
  'Arial',
  'Georgia',
  'JetBrains Mono',
  'Georgia Pro',
  'SF Pro Display',
] as const

export const FONT_STYLES = ['Regular', 'Medium', 'Semi Bold', 'Bold'] as const
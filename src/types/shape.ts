export type ShapeType = 'rectangle' | 'ellipse' | 'frame' | 'text'

export type Tool = 'select' | ShapeType

export type LayoutMode = 'none' | 'horizontal' | 'vertical'

export type AlignItems = 'start' | 'center' | 'end'

export type JustifyContent = 'start' | 'center' | 'end' | 'space-between'

export type TextAlign = 'LEFT' | 'CENTER' | 'RIGHT'

export interface Point {
  x: number
  y: number
}

export interface Size {
  width: number
  height: number
}

export interface Rect extends Point, Size {}

export interface AutoLayout {
  mode: LayoutMode
  gap: number
  paddingTop: number
  paddingRight: number
  paddingBottom: number
  paddingLeft: number
  alignItems: AlignItems
  justifyContent: JustifyContent
}

export interface TextProps {
  content: string
  fontFamily: string
  fontSize: number
  fontStyle: string
  letterSpacing: number
  lineHeight: number
  textAlign: TextAlign
}

export interface Shape {
  id: string
  name: string
  type: ShapeType
  x: number
  y: number
  width: number
  height: number
  fill: string
  stroke: string
  strokeWidth: number
  radius: number
  rotation: number
  opacity: number
  visible: boolean
  locked: boolean
  autoLayout: AutoLayout
  text: TextProps
  children: Shape[]
}
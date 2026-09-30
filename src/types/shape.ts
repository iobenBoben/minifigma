export type ShapeType = 'rectangle' | 'ellipse'

export type Tool = ShapeType | 'select'

export interface Point {
  x: number
  y: number
}

export interface Size {
  width: number
  height: number
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
  rotation: number
}

export interface Rect extends Point, Size {}

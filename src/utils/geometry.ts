import type { Point, Rect } from '../types/shape'

export function screenToCanvas(point: Point, transform: { pan: Point; zoom: number }): Point {
  return {
    x: (point.x - transform.pan.x) / transform.zoom,
    y: (point.y - transform.pan.y) / transform.zoom,
  }
}

export function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(Math.max(value, minimum), maximum)
}

export function rectFromPoints(start: Point, end: Point, equalSides = false): Rect {
  let deltaX = end.x - start.x
  let deltaY = end.y - start.y

  if (equalSides) {
    const size = Math.max(Math.abs(deltaX), Math.abs(deltaY))
    deltaX = (deltaX < 0 ? -1 : 1) * size
    deltaY = (deltaY < 0 ? -1 : 1) * size
  }

  return {
    x: deltaX < 0 ? start.x + deltaX : start.x,
    y: deltaY < 0 ? start.y + deltaY : start.y,
    width: Math.abs(deltaX),
    height: Math.abs(deltaY),
  }
}


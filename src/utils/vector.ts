import type { Shape, VectorVertex } from '../types/shape'

const HANDLE_EPSILON = 0.5

export function vertexBounds(vertices: VectorVertex[]): { minX: number; minY: number; maxX: number; maxY: number } {
  if (vertices.length === 0) return { minX: 0, minY: 0, maxX: 0, maxY: 0 }

  let minX = Number.POSITIVE_INFINITY
  let minY = Number.POSITIVE_INFINITY
  let maxX = Number.NEGATIVE_INFINITY
  let maxY = Number.NEGATIVE_INFINITY

  for (const vertex of vertices) {
    const points: Array<[number, number]> = [
      [vertex.x, vertex.y],
      [vertex.x + vertex.inX, vertex.y + vertex.inY],
      [vertex.x + vertex.outX, vertex.y + vertex.outY],
    ]
    for (const [x, y] of points) {
      minX = Math.min(minX, x)
      minY = Math.min(minY, y)
      maxX = Math.max(maxX, x)
      maxY = Math.max(maxY, y)
    }
  }

  return { minX, minY, maxX, maxY }
}

/** Converts vertices from absolute canvas space into node-local coordinates. */
export function normalizeVertices(vertices: VectorVertex[]): { vertices: VectorVertex[]; x: number; y: number } {
  const bounds = vertexBounds(vertices)
  return {
    vertices: vertices.map((vertex) => ({
      ...vertex,
      x: vertex.x - bounds.minX,
      y: vertex.y - bounds.minY,
    })),
    x: bounds.minX,
    y: bounds.minY,
  }
}

export function vectorDimensions(vertices: VectorVertex[]): { width: number; height: number } {
  const bounds = vertexBounds(vertices)
  return {
    width: Math.max(bounds.maxX - bounds.minX, 1),
    height: Math.max(bounds.maxY - bounds.minY, 1),
  }
}

export function buildPathData(vertices: VectorVertex[], closed: boolean): string {
  if (vertices.length === 0) return ''

  const parts: string[] = [`M ${round(vertices[0].x)} ${round(vertices[0].y)}`]
  const last = closed ? vertices.length : vertices.length - 1

  for (let index = 0; index < last; index += 1) {
    const current = vertices[index]
    const next = vertices[(index + 1) % vertices.length]
    const hasCurve = hasHandle(current.outX, current.outY) || hasHandle(next.inX, next.inY)

    if (!hasCurve) {
      parts.push(`L ${round(next.x)} ${round(next.y)}`)
      continue
    }

    parts.push(
      `C ${round(current.x + current.outX)} ${round(current.y + current.outY)}, ` +
        `${round(next.x + next.inX)} ${round(next.y + next.inY)}, ` +
        `${round(next.x)} ${round(next.y)}`,
    )
  }

  if (closed) parts.push('Z')
  return parts.join(' ')
}

function hasHandle(x: number, y: number): boolean {
  return Math.abs(x) > HANDLE_EPSILON || Math.abs(y) > HANDLE_EPSILON
}

function round(value: number): number {
  return Math.round(value * 100) / 100
}

/** Recomputes the node box from its vertices after a move or an edit. */
export function reflowVector(shape: Shape): Shape {
  if (shape.type !== 'vector' || shape.vector.vertices.length === 0) return shape
  const dims = vectorDimensions(shape.vector.vertices)
  return { ...shape, width: dims.width, height: dims.height }
}

export function vertexIndexAt(vertices: VectorVertex[], x: number, y: number, radius: number): number | null {
  let closest: number | null = null
  let closestDistance = radius

  vertices.forEach((vertex, index) => {
    const distance = Math.hypot(vertex.x - x, vertex.y - y)
    if (distance <= closestDistance) {
      closest = index
      closestDistance = distance
    }
  })

  return closest
}
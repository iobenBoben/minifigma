import type { Point, Shape } from '../types/shape'

interface FlatNode {
  node: Shape
  parentId: string | null
  depth: number
  worldX: number
  worldY: number
  worldWidth: number
  worldHeight: number
}

export function flattenTree(shapes: Shape[], parentId: string | null = null, depth = 0, offsetX = 0, offsetY = 0): FlatNode[] {
  const result: FlatNode[] = []

  for (const node of shapes) {
    const worldX = offsetX + node.x
    const worldY = offsetY + node.y
    result.push({
      node,
      parentId,
      depth,
      worldX,
      worldY,
      worldWidth: node.width,
      worldHeight: node.height,
    })
    result.push(...flattenTree(node.children, node.id, depth + 1, worldX, worldY))
  }

  return result
}

export function findNode(shapes: Shape[], id: string): Shape | null {
  for (const node of shapes) {
    if (node.id === id) return node
    const found = findNode(node.children, id)
    if (found) return found
  }
  return null
}

export function findParentId(shapes: Shape[], id: string, parentId: string | null = null): string | null {
  for (const node of shapes) {
    if (node.id === id) return parentId
    const found = findParentId(node.children, id, node.id)
    if (found !== null) return found
  }
  return null
}

export function isDescendant(shapes: Shape[], ancestorId: string, candidateId: string): boolean {
  const ancestor = findNode(shapes, ancestorId)
  if (!ancestor) return false
  return findNode(ancestor.children, candidateId) !== null
}

export function updateNodeInTree(shapes: Shape[], id: string, updates: Partial<Shape>): Shape[] {
  return shapes.map((node) => {
    if (node.id === id) return { ...node, ...updates }
    if (node.children.length === 0) return node
    return { ...node, children: updateNodeInTree(node.children, id, updates) }
  })
}

export function removeNodeFromTree(shapes: Shape[], id: string): Shape[] {
  return shapes
    .filter((node) => node.id !== id)
    .map((node) =>
      node.children.length === 0 ? node : { ...node, children: removeNodeFromTree(node.children, id) },
    )
}

export function insertNodeIntoTree(
  shapes: Shape[],
  parentId: string | null,
  node: Shape,
  index?: number,
): Shape[] {
  if (parentId === null) {
    const next = [...shapes]
    next.splice(index ?? next.length, 0, node)
    return next
  }
  return shapes.map((shape) => {
    if (shape.id === parentId) {
      const children = [...shape.children]
      children.splice(index ?? children.length, 0, node)
      return { ...shape, children }
    }
    return { ...shape, children: insertNodeIntoTree(shape.children, parentId, node, index) }
  })
}

export function appendChild(shapes: Shape[], parentId: string, child: Shape): Shape[] {
  return shapes.map((node) => {
    if (node.id === parentId) return { ...node, children: [...node.children, child] }
    return { ...node, children: appendChild(node.children, parentId, child) }
  })
}

export function absoluteOffset(shapes: Shape[], id: string): Point {
  const entry = flattenTree(shapes).find((item) => item.node.id === id)
  return entry ? { x: entry.worldX, y: entry.worldY } : { x: 0, y: 0 }
}

/** Порядковый номер узла среди соседей, либо -1, если узла в дереве нет. */
export function siblingIndex(shapes: Shape[], id: string): number {
  for (const node of shapes) {
    if (node.id === id) return shapes.indexOf(node)
    const nested = siblingIndex(node.children, id)
    if (nested !== -1) return nested
  }
  return -1
}

export function moveNodeTo(shapes: Shape[], id: string, targetParentId: string | null, targetIndex: number): Shape[] {
  const node = findNode(shapes, id)
  if (!node) return shapes
  if (targetParentId === id || (targetParentId && isDescendant(shapes, id, targetParentId))) return shapes

  const entry = flattenTree(shapes).find((item) => item.node.id === id)
  const parentOffset = targetParentId ? absoluteOffset(shapes, targetParentId) : { x: 0, y: 0 }
  const detached = removeNodeFromTree(shapes, id)

  // Узел изымается до вставки, поэтому вставка ниже него в том же родителе сдвигается на один.
  const currentIndex = siblingIndex(shapes, id)
  const sameParent = (entry?.parentId ?? null) === targetParentId
  const index = sameParent && currentIndex !== -1 && targetIndex > currentIndex ? targetIndex - 1 : targetIndex

  const positioned: Shape = {
    ...node,
    x: (entry?.worldX ?? node.x) - parentOffset.x,
    y: (entry?.worldY ?? node.y) - parentOffset.y,
  }
  return insertNodeIntoTree(detached, targetParentId, positioned, index)
}

export function isLockedInTree(shapes: Shape[], id: string): boolean {
  const entry = flattenTree(shapes).find((item) => item.node.id === id)
  if (!entry) return false

  let current: Shape | null = entry.node
  let parentId = entry.parentId

  while (current) {
    if (current.locked) return true
    if (!parentId) return false
    current = findNode(shapes, parentId)
    parentId = current ? findParentId(shapes, current.id) : null
  }

  return false
}
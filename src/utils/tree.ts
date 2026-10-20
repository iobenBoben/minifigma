import { createShape } from '../constants/tools'
import type { Point, Shape } from '../types/shape'

interface FlatNode {
  node: Shape
  parentId: string | null
  depth: number
  /** Положение узла в системе координат холста без учёта поворота: от него считаются координаты потомков. */
  worldX: number
  worldY: number
  worldWidth: number
  worldHeight: number
  /** Габариты с учётом поворота: по ним определяется попадание курсора и рисуется рамка выделения. */
  boundsX: number
  boundsY: number
  boundsWidth: number
  boundsHeight: number
}

export function flattenTree(shapes: Shape[], parentId: string | null = null, depth = 0, offsetX = 0, offsetY = 0): FlatNode[] {
  const result: FlatNode[] = []

  for (const node of shapes) {
    const worldX = offsetX + node.x
    const worldY = offsetY + node.y
    const angle = (node.rotation * Math.PI) / 180
    const cos = Math.abs(Math.cos(angle))
    const sin = Math.abs(Math.sin(angle))
    const boundsWidth = node.width * cos + node.height * sin
    const boundsHeight = node.width * sin + node.height * cos

    result.push({
      node,
      parentId,
      depth,
      worldX,
      worldY,
      worldWidth: node.width,
      worldHeight: node.height,
      boundsX: worldX + (node.width - boundsWidth) / 2,
      boundsY: worldY + (node.height - boundsHeight) / 2,
      boundsWidth,
      boundsHeight,
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

export type ArrangePosition = 'front' | 'back' | 'forward' | 'backward'

/**
 * Объединяет выбранные узлы в группу. Узлы должны быть соседями: общий родитель.
 * Дети группы хранят координаты относительно её левого верхнего угла.
 */
export function groupNodes(shapes: Shape[], ids: string[]): Shape[] {
  if (ids.length < 2) return shapes

  const parentId = findParentId(shapes, ids[0])
  const siblings = parentId ? findNode(shapes, parentId)?.children : shapes
  if (!siblings) return shapes

  const targets: Shape[] = []
  for (const id of ids) {
    const target = siblings.find((node) => node.id === id)
    if (!target) return shapes
    targets.push(target)
  }

  const minX = Math.min(...targets.map((node) => node.x))
  const minY = Math.min(...targets.map((node) => node.y))
  const maxX = Math.max(...targets.map((node) => node.x + node.width))
  const maxY = Math.max(...targets.map((node) => node.y + node.height))

  const group = createShape('group', minX, minY, maxX - minX, maxY - minY)
  group.name = 'Group'
  group.children = targets.map((node) => ({ ...node, x: node.x - minX, y: node.y - minY }))

  const firstIndex = siblings.findIndex((node) => ids.includes(node.id))
  const rest = siblings.filter((node) => !ids.includes(node.id))
  rest.splice(Math.min(firstIndex, rest.length), 0, group)

  return replaceChildren(shapes, parentId, rest)
}

/** Разбирает группу: её дети выходят на место группы, координаты пересчитываются. */
export function ungroupNode(shapes: Shape[], id: string): Shape[] {
  const parentId = findParentId(shapes, id)
  const group = findNode(shapes, id)
  if (!group || group.type !== 'group') return shapes

  const siblings = parentId ? findNode(shapes, parentId)?.children : shapes
  if (!siblings) return shapes

  const index = siblings.findIndex((node) => node.id === id)
  if (index === -1) return shapes

  const children = group.children.map((child) => ({
    ...child,
    x: child.x + group.x,
    y: child.y + group.y,
  }))

  const next = [...siblings]
  next.splice(index, 1, ...children)

  return replaceChildren(shapes, parentId, next)
}

/** Растягивает содержимое группы пропорционально её новому размеру. */
export function scaleGroupChildren(children: Shape[], scaleX: number, scaleY: number): Shape[] {
  return children.map((child) => ({
    ...child,
    x: child.x * scaleX,
    y: child.y * scaleY,
    width: child.width * scaleX,
    height: child.height * scaleY,
  }))
}

function replaceChildren(shapes: Shape[], parentId: string | null, children: Shape[]): Shape[] {
  if (parentId === null) return children
  return shapes.map((node) => (node.id === parentId ? { ...node, children } : node))
}

/**
 * Меняет порядок узла среди его соседей: вперёд, назад, на передний или на задний план.
 * Узел перемещается внутри своего родителя — структура документа не меняется.
 */
export function arrangeNodeInTree(
  shapes: Shape[],
  id: string,
  position: ArrangePosition,
): Shape[] {
  const index = shapes.findIndex((node) => node.id === id)
  if (index !== -1) return reorderWithin(shapes, index, position)

  let changed = false
  const next = shapes.map((node) => {
    if (node.children.length === 0) return node
    const updated = arrangeNodeInTree(node.children, id, position)
    if (updated === node.children) return node
    changed = true
    return { ...node, children: updated }
  })

  return changed ? next : shapes
}

function reorderWithin(siblings: Shape[], index: number, position: ArrangePosition): Shape[] {
  let target = index
  if (position === 'front') target = siblings.length - 1
  if (position === 'back') target = 0
  if (position === 'forward') target = Math.min(index + 1, siblings.length - 1)
  if (position === 'backward') target = Math.max(index - 1, 0)
  if (target === index) return siblings

  const next = [...siblings]
  const [node] = next.splice(index, 1)
  next.splice(target, 0, node)
  return next
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
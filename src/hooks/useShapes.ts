import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import type { Shape } from '../types/shape'
import { layoutTree } from '../utils/layout'
import {
  appendChild,
  findNode,
  findParentId,
  flattenTree,
  moveNodeTo,
  removeNodeFromTree,
  updateNodeInTree,
} from '../utils/tree'

const STORAGE_KEY = 'mini-figma:document:v1'
const SAVE_DEBOUNCE_MS = 400

let idCounter = 0

export interface UseShapesResult {
  shapes: Shape[]
  selectedId: string | null
  selectedShape: Shape | null
  selectedParentId: string | null
  flat: ReturnType<typeof flattenTree>
  select: (id: string | null) => void
  addShape: (shape: Shape, parentId?: string | null) => void
  updateShape: (id: string, updates: Partial<Shape>) => void
  removeShape: (id: string) => void
  duplicateShape: (id: string) => void
  reorderShape: (id: string, parentId: string | null, index?: number) => void
  toggleVisibility: (id: string) => void
  toggleLock: (id: string) => void
}

export function useShapes(): UseShapesResult {
  const [rawShapes, setRawShapes] = useState<Shape[]>(loadShapes)
  const [selectedId, setSelectedId] = useState<string | null>(null)

  useDebouncedEffect(saveShapes, [rawShapes], SAVE_DEBOUNCE_MS)

  const shapes = useMemo(() => layoutTree(rawShapes), [rawShapes])
  const flat = useMemo(() => flattenTree(shapes), [shapes])
  const selectedShape = useMemo(
    () => (selectedId ? findNode(shapes, selectedId) : null),
    [selectedId, shapes],
  )
  const selectedParentId = useMemo(
    () => (selectedId ? findParentId(shapes, selectedId) : null),
    [selectedId, shapes],
  )

  const select = useCallback((id: string | null) => setSelectedId(id), [])

  const addShape = useCallback((shape: Shape, parentId: string | null = null) => {
    setRawShapes((current) => (parentId ? appendChild(current, parentId, shape) : [...current, shape]))
    setSelectedId(shape.id)
  }, [])

  const updateShape = useCallback((id: string, updates: Partial<Shape>) => {
    setRawShapes((current) => updateNodeInTree(current, id, updates))
  }, [])

  const removeShape = useCallback((id: string) => {
    setRawShapes((current) => removeNodeFromTree(current, id))
    setSelectedId((current) => (current === id ? null : current))
  }, [])

  const duplicateShape = useCallback((id: string) => {
    const cloneId = createNodeId()
    let created = false

    setRawShapes((current) => {
      const node = findNode(current, id)
      if (!node) return current

      const clone = cloneWithNewIds({
        ...node,
        id: cloneId,
        name: `${node.name} copy`,
        x: node.x + 16,
        y: node.y + 16,
      })
      created = true
      return insertAfter(current, id, clone) ?? current
    })

    if (created) setSelectedId(cloneId)
  }, [])

  const reorderShape = useCallback((id: string, parentId: string | null, index?: number) => {
    setRawShapes((current) => moveNodeTo(current, id, parentId, index ?? Number.MAX_SAFE_INTEGER))
  }, [])

  const toggleVisibility = useCallback((id: string) => {
    setRawShapes((current) => {
      const node = findNode(current, id)
      if (!node) return current
      return updateNodeInTree(current, id, { visible: !node.visible })
    })
  }, [])

  const toggleLock = useCallback((id: string) => {
    setRawShapes((current) => {
      const node = findNode(current, id)
      if (!node) return current
      return updateNodeInTree(current, id, { locked: !node.locked })
    })
  }, [])

  return {
    shapes,
    selectedId,
    selectedShape,
    selectedParentId,
    flat,
    select,
    addShape,
    updateShape,
    removeShape,
    duplicateShape,
    reorderShape,
    toggleVisibility,
    toggleLock,
  }
}

function createNodeId(): string {
  idCounter += 1
  return `node-${Date.now().toString(36)}-${idCounter}`
}

function cloneWithNewIds(node: Shape): Shape {
  return {
    ...node,
    id: createNodeId(),
    children: node.children.map((child) => cloneWithNewIds(child)),
  }
}

/** Inserts a node directly after the node with `afterId`, at any nesting depth. */
function insertAfter(shapes: Shape[], afterId: string, node: Shape): Shape[] | null {
  for (let index = 0; index < shapes.length; index += 1) {
    if (shapes[index].id === afterId) {
      const next = [...shapes]
      next.splice(index + 1, 0, node)
      return next
    }

    if (shapes[index].children.length > 0) {
      const updatedChildren = insertAfter(shapes[index].children, afterId, node)
      if (updatedChildren) {
        return shapes.map((shape, position) =>
          position === index ? { ...shape, children: updatedChildren } : shape,
        )
      }
    }
  }

  return null
}

function loadShapes(): Shape[] {
  if (typeof window === 'undefined') return []

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.filter(isShapeNode)
  } catch {
    return []
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function isShapeNode(value: unknown): value is Shape {
  if (!isRecord(value)) return false
  if (typeof value.id !== 'string' || typeof value.type !== 'string') return false
  if (typeof value.x !== 'number' || typeof value.y !== 'number') return false
  if (typeof value.width !== 'number' || typeof value.height !== 'number') return false
  if (!Array.isArray(value.children)) return false
  return value.children.every(isShapeNode)
}

function saveShapes(shapes: Shape[]): void {
  if (typeof window === 'undefined') return

  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(shapes))
  } catch {
    // Переполненное хранилище или приватный режим — работа продолжается без автосохранения.
  }
}

/** Откладывает запись, чтобы перетаскивание фигуры не сериализовало дерево на каждый кадр. */
function useDebouncedEffect(
  effect: (value: Shape[]) => void,
  [value]: [Shape[]],
  delayMs: number,
): void {
  const latest = useRef(value)

  useEffect(() => {
    latest.current = value
  }, [value])

  useEffect(() => {
    const timer = window.setTimeout(() => effect(latest.current), delayMs)
    return () => window.clearTimeout(timer)
  }, [value, delayMs, effect])
}
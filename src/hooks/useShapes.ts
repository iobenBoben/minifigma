import { useCallback, useEffect, useMemo, useState } from 'react'

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

  useEffect(() => {
    saveShapes(rawShapes)
  }, [rawShapes])

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
    let cloneId: string | null = null

    setRawShapes((current) => {
      const node = findNode(current, id)
      if (!node) return current

      const clone = cloneWithNewIds({
        ...node,
        name: `${node.name} copy`,
        x: node.x + 16,
        y: node.y + 16,
      })
      cloneId = clone.id
      return insertAfter(current, id, clone) ?? current
    })

    if (cloneId) setSelectedId(cloneId)
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

function cloneWithNewIds(node: Shape): Shape {
  return {
    ...node,
    id: `${node.type}-${Date.now().toString(36)}-${Math.floor(Math.random() * 1e6)}`,
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
    return Array.isArray(parsed) ? (parsed as Shape[]) : []
  } catch {
    return []
  }
}

function saveShapes(shapes: Shape[]): void {
  if (typeof window === 'undefined') return

  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(shapes))
  } catch {
    // Переполненное хранилище или приватный режим — работа продолжается без автосохранения.
  }
}
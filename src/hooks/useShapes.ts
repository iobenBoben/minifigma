import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react'

import type { Shape } from '../types/shape'
import { DEFAULT_IMAGE } from '../constants/tools'
import { layoutTree } from '../utils/layout'
import {
  appendChild,
  arrangeNodeInTree,
  findNode,
  findParentId,
  flattenTree,
  groupNodes,
  moveNodeTo,
  removeNodeFromTree,
  ungroupNode,
  updateNodeInTree,
} from '../utils/tree'
import type { ArrangePosition } from '../utils/tree'

const STORAGE_KEY = 'mini-figma:document:v1'
const SAVE_DEBOUNCE_MS = 400
const HISTORY_LIMIT = 50

let idCounter = 0

interface DocumentState {
  shapes: Shape[]
  /** Снимки документа до последних изменений — основа отмены. */
  past: Shape[][]
  /** Снимки, отменённые пользователем, — основа повтора. */
  future: Shape[][]
  /** Метка текущей группы правок: перетаскивание не должно занимать всю историю. */
  lastGroup: string | null
}

type DocumentAction =
  | { type: 'commit'; updater: (current: Shape[]) => Shape[]; group?: string }
  | { type: 'undo' }
  | { type: 'redo' }

function documentReducer(state: DocumentState, action: DocumentAction): DocumentState {
  switch (action.type) {
    case 'commit': {
      const next = action.updater(state.shapes)
      if (next === state.shapes) return state

      // Продолжение той же группы не добавляет снимок: отмена вернёт к состоянию
      // до начала перетаскивания, а не к каждому кадру.
      const continuesGroup = action.group !== undefined && action.group === state.lastGroup

      return {
        shapes: next,
        past: continuesGroup ? state.past : [...state.past, state.shapes].slice(-HISTORY_LIMIT),
        future: [],
        lastGroup: action.group ?? null,
      }
    }
    case 'undo': {
      if (state.past.length === 0) return state
      const previous = state.past[state.past.length - 1]
      return {
        shapes: previous,
        past: state.past.slice(0, -1),
        future: [state.shapes, ...state.future].slice(0, HISTORY_LIMIT),
        lastGroup: null,
      }
    }
    case 'redo': {
      if (state.future.length === 0) return state
      const [next, ...rest] = state.future
      return {
        shapes: next,
        past: [...state.past, state.shapes].slice(-HISTORY_LIMIT),
        future: rest,
        lastGroup: null,
      }
    }
  }
}

export interface UseShapesResult {
  shapes: Shape[]
  selectedId: string | null
  selectedIds: string[]
  selectedShape: Shape | null
  selectedParentId: string | null
  flat: ReturnType<typeof flattenTree>
  canUndo: boolean
  canRedo: boolean
  select: (id: string | null) => void
  toggleSelect: (id: string) => void
  addShape: (shape: Shape, parentId?: string | null) => void
  updateShape: (id: string, updates: Partial<Shape>, group?: string) => void
  removeShape: (id: string) => void
  duplicateShape: (id: string) => void
  reorderShape: (id: string, parentId: string | null, index?: number) => void
  toggleVisibility: (id: string) => void
  toggleLock: (id: string) => void
  arrangeShape: (id: string, position: ArrangePosition) => void
  groupShapes: (ids: string[]) => void
  ungroupShape: (id: string) => void
  scaleGroup: (id: string, rect: Partial<Shape>, children: Shape[], group?: string) => void
  copyShape: (id: string) => void
  pasteShape: () => void
  undo: () => void
  redo: () => void
}

export function useShapes(): UseShapesResult {
  const [document, dispatch] = useReducer(documentReducer, undefined, createInitialState)
  const [selection, setSelection] = useState<string[]>([])
  const clipboardRef = useRef<string | null>(null)

  const rawShapes = document.shapes

  // Выделение хранит только живые узлы: удалённый слой из выделения выпадает сам.
  const selectedIds = useMemo(
    () => selection.filter((id) => findNode(rawShapes, id) !== null),
    [selection, rawShapes],
  )
  const selectedId = selectedIds.length > 0 ? selectedIds[selectedIds.length - 1] : null

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

  const commit = useCallback(
    (updater: (current: Shape[]) => Shape[], group?: string) => {
      dispatch({ type: 'commit', updater, group })
    },
    [],
  )

  const select = useCallback((id: string | null) => setSelection(id ? [id] : []), [])

  const toggleSelect = useCallback((id: string) => {
    setSelection((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id],
    )
  }, [])

  const addShape = useCallback(
    (shape: Shape, parentId: string | null = null) => {
      commit((current) => (parentId ? appendChild(current, parentId, shape) : [...current, shape]))
      setSelection([shape.id])
    },
    [commit],
  )

  const updateShape = useCallback(
    (id: string, updates: Partial<Shape>, group?: string) => {
      commit((current) => {
        const node = findNode(current, id)
        if (!node) return current
        if (!hasChanges(node, updates)) return current
        return updateNodeInTree(current, id, updates)
      }, group)
    },
    [commit],
  )

  const removeShape = useCallback(
    (id: string) => {
      commit((current) => removeNodeFromTree(current, id))
      setSelection((current) => current.filter((item) => item !== id))
    },
    [commit],
  )

  const duplicateShape = useCallback(
    (id: string) => {
      const source = findNode(rawShapes, id)
      if (!source) return

      const clone = cloneWithNewIds({
        ...source,
        name: `${source.name} copy`,
        x: source.x + 16,
        y: source.y + 16,
      })

      commit((current) => insertAfter(current, id, clone) ?? current)
      setSelection([clone.id])
    },
    [commit, rawShapes],
  )

  const reorderShape = useCallback(
    (id: string, parentId: string | null, index?: number) => {
      commit((current) => moveNodeTo(current, id, parentId, index ?? Number.MAX_SAFE_INTEGER))
    },
    [commit],
  )

  const toggleVisibility = useCallback(
    (id: string) => {
      commit((current) => {
        const node = findNode(current, id)
        if (!node) return current
        return updateNodeInTree(current, id, { visible: !node.visible })
      })
    },
    [commit],
  )

  const toggleLock = useCallback(
    (id: string) => {
      commit((current) => {
        const node = findNode(current, id)
        if (!node) return current
        return updateNodeInTree(current, id, { locked: !node.locked })
      })
    },
    [commit],
  )

  const undo = useCallback(() => dispatch({ type: 'undo' }), [])
  const redo = useCallback(() => dispatch({ type: 'redo' }), [])

  const arrangeShape = useCallback(
    (id: string, position: ArrangePosition) => {
      commit((current) => arrangeNodeInTree(current, id, position))
    },
    [commit],
  )

  const groupShapes = useCallback(
    (ids: string[]) => {
      if (ids.length < 2) return
      const group = groupNodes(rawShapes, ids)
      if (group === rawShapes) return
      commit((current) => groupNodes(current, ids))
      setSelection([])
    },
    [commit, rawShapes],
  )

  const ungroupShape = useCallback(
    (id: string) => {
      const next = ungroupNode(rawShapes, id)
      if (next === rawShapes) return
      commit((current) => ungroupNode(current, id))
      setSelection([])
    },
    [commit, rawShapes],
  )

  const scaleGroup = useCallback(
    (id: string, rect: Partial<Shape>, children: Shape[], group?: string) => {
      commit((current) => updateNodeInTree(current, id, { ...rect, children }), group)
    },
    [commit],
  )

  const copyShape = useCallback((id: string) => {
    const node = findNode(rawShapes, id)
    if (!node) return

    const payload = JSON.stringify(node)
    clipboardRef.current = payload
    // Системный буфер нужен, чтобы вставить фигуру в другую вкладку или приложение.
    if (navigator.clipboard) {
      void navigator.clipboard.writeText(payload).catch(() => undefined)
    }
  }, [rawShapes])

  const pasteShape = useCallback(() => {
    const apply = (payload: string | null) => {
      if (!payload) return
      const source = parseShape(payload)
      if (!source) return

      const copy = cloneWithNewIds({
        ...source,
        name: `${source.name} copy`,
        x: source.x + 16,
        y: source.y + 16,
      })

      commit((current) => insertAfter(current, source.id, copy) ?? [...current, copy])
      setSelection([copy.id])
    }

    const internal = clipboardRef.current
    if (internal) {
      apply(internal)
      return
    }

    if (navigator.clipboard) {
      void navigator.clipboard
        .readText()
        .then((text) => apply(text))
        .catch(() => undefined)
    }
  }, [commit])

  return {
    shapes,
    selectedId,
    selectedIds,
    selectedShape,
    selectedParentId,
    flat,
    canUndo: document.past.length > 0,
    canRedo: document.future.length > 0,
    select,
    toggleSelect,
    addShape,
    updateShape,
    removeShape,
    duplicateShape,
    reorderShape,
    toggleVisibility,
    toggleLock,
    arrangeShape,
    groupShapes,
    ungroupShape,
    scaleGroup,
    copyShape,
    pasteShape,
    undo,
    redo,
  }
}

function createInitialState(): DocumentState {
  return { shapes: loadShapes(), past: [], future: [], lastGroup: null }
}

/** Правка ничего не меняет — значит, её не нужно ни применять, ни запоминать. */
function hasChanges(node: Shape, updates: Partial<Shape>): boolean {
  return Object.entries(updates).some(([key, value]) => {
    const current = (node as unknown as Record<string, unknown>)[key]
    return !Object.is(current, value)
  })
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
    return parsed.filter(isShapeNode).map(withDefaults)
  } catch {
    return []
  }
}

/** Документы, созданные до появления картинок и теней, не содержат этих полей. */
function withDefaults(node: Shape): Shape {
  const stored = node as unknown as {
    image?: Partial<Shape['image']>
    shadow?: Shape['shadow']
  }

  return {
    ...node,
    image: { ...DEFAULT_IMAGE, ...(stored.image ?? {}) },
    // Старые фреймы хранили служебный цвет обводки, который никогда не показывался.
    stroke: node.type === 'frame' && node.stroke === '#5a5d72' ? 'transparent' : node.stroke,
    shadow: stored.shadow ?? null,
    children: node.children.map(withDefaults),
  }
}

/** Разбирает содержимое буфера: подходит только фигура из этого редактора. */
function parseShape(payload: string): Shape | null {
  try {
    const parsed: unknown = JSON.parse(payload)
    if (!isShapeNode(parsed)) return null
    return withDefaults(parsed)
  } catch {
    return null
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

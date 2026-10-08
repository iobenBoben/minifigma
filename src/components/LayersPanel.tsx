import { useState } from 'react'

import type { Shape } from '../types/shape'
import { findNode, findParentId, isDescendant, siblingIndex } from '../utils/tree'

export type DropMode = 'before' | 'after' | 'inside'

interface DropState {
  rowId: string
  mode: DropMode
}

interface LayersPanelProps {
  shapes: Shape[]
  selectedId: string | null
  onSelect: (id: string) => void
  onToggleVisibility: (id: string) => void
  onToggleLock: (id: string) => void
  onReorder: (id: string, parentId: string | null, index?: number) => void
}

export function LayersPanel({
  shapes,
  selectedId,
  onSelect,
  onToggleVisibility,
  onToggleLock,
  onReorder,
}: LayersPanelProps) {
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({})
  const [draggingId, setDraggingId] = useState<string | null>(null)
  const [dropState, setDropState] = useState<DropState | null>(null)

  const count = countNodes(shapes)

  const clearDrag = () => {
    setDraggingId(null)
    setDropState(null)
  }

  const applyDrop = (rowId: string, mode: DropMode) => {
    if (draggingId && draggingId !== rowId) {
      const target = resolveDropTarget(shapes, draggingId, rowId, mode)
      if (target) onReorder(draggingId, target.parentId, target.index)
    }
    clearDrag()
  }

  return (
    <section className="flex min-h-0 flex-1 flex-col px-2 py-3">
      <div className="mb-2 flex items-center justify-between px-2">
        <h2 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#807e96]">
          Layers
        </h2>
        <span className="text-[10px] tabular-nums text-[#5f5d72]">{count}</span>
      </div>

      {count === 0 ? (
        <div className="mx-1 rounded-xl border border-dashed border-white/10 bg-white/2 px-3 py-5 text-center">
          <p className="text-[11px] font-medium text-[#85839a]">No layers yet</p>
          <p className="mt-1 text-[10px] leading-4 text-[#5f5d72]">
            Press F to draw a frame, R for a rectangle.
          </p>
        </div>
      ) : (
        <ul className="min-h-0 flex-1 space-y-0.5 overflow-y-auto">
          {shapes.map((shape) => (
            <LayerRow
              key={shape.id}
              shape={shape}
              depth={0}
              selectedId={selectedId}
              collapsed={collapsed}
              onToggleCollapse={(id) =>
                setCollapsed((current) => ({ ...current, [id]: !current[id] }))
              }
              onSelect={onSelect}
              onToggleVisibility={onToggleVisibility}
              onToggleLock={onToggleLock}
              draggingId={draggingId}
              dropState={dropState}
              onDragStart={setDraggingId}
              onDragEnd={clearDrag}
              onDragOverRow={(rowId, mode) => setDropState({ rowId, mode })}
              onDropRow={applyDrop}
            />
          ))}
        </ul>
      )}
    </section>
  )
}

interface LayerRowProps {
  shape: Shape
  depth: number
  selectedId: string | null
  collapsed: Record<string, boolean>
  draggingId: string | null
  dropState: DropState | null
  onToggleCollapse: (id: string) => void
  onSelect: (id: string) => void
  onToggleVisibility: (id: string) => void
  onToggleLock: (id: string) => void
  onDragStart: (id: string) => void
  onDragEnd: () => void
  onDragOverRow: (rowId: string, mode: DropMode) => void
  onDropRow: (rowId: string, mode: DropMode) => void
}

function LayerRow({
  shape,
  depth,
  selectedId,
  collapsed,
  draggingId,
  dropState,
  onToggleCollapse,
  onSelect,
  onToggleVisibility,
  onToggleLock,
  onDragStart,
  onDragEnd,
  onDragOverRow,
  onDropRow,
}: LayerRowProps) {
  const isContainer = shape.children.length > 0
  const isCollapsed = Boolean(collapsed[shape.id])
  const dropMode = dropState && dropState.rowId === shape.id ? dropState.mode : null

  return (
    <li>
      <div
        draggable
        onDragStart={() => onDragStart(shape.id)}
        onDragEnd={onDragEnd}
        onDragOver={(event) => {
          event.preventDefault()
          event.stopPropagation()
          onDragOverRow(shape.id, dropModeFromEvent(event, isContainer))
        }}
        onDrop={(event) => {
          event.preventDefault()
          event.stopPropagation()
          if (dropMode) onDropRow(shape.id, dropMode)
        }}
        onClick={() => onSelect(shape.id)}
        className={`group flex cursor-pointer items-center gap-1 rounded-lg py-1.5 pr-2 text-left text-[11px] transition ${
          selectedId === shape.id
            ? 'bg-[#5b6bd8]/18 text-[#c2c8f5]'
            : 'text-[#8b8aa3] hover:bg-white/6 hover:text-[#e7e4f5]'
        } ${
          dropMode === 'before'
            ? 'border-t-2 border-[#5b6bd8]'
            : dropMode === 'after'
              ? 'border-b-2 border-[#5b6bd8]'
              : dropMode === 'inside'
                ? 'bg-[#5b6bd8]/25 ring-1 ring-inset ring-[#5b6bd8]'
                : ''
        }`}
        style={{ paddingLeft: 8 + depth * 14 }}
      >
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation()
            if (isContainer) onToggleCollapse(shape.id)
          }}
          className={`size-3.5 shrink-0 text-[9px] text-[#5f5d72] ${isContainer ? '' : 'invisible'}`}
          aria-label={isCollapsed ? 'Expand' : 'Collapse'}
        >
          {isCollapsed ? '▸' : '▾'}
        </button>

        <span
          className={`size-2.5 shrink-0 border ${
            shape.type === 'ellipse'
              ? 'rounded-full'
              : shape.type === 'frame'
                ? 'rounded-[2px] bg-transparent'
                : shape.type === 'text'
                  ? 'rounded-[1px] bg-[#f2f4fb]'
                  : 'rounded-[2px]'
          }`}
          style={{
            backgroundColor: shape.type === 'frame' ? 'transparent' : shape.fill,
            borderColor: shape.type === 'frame' ? '#6f6d82' : shape.stroke,
          }}
        />

        <span className="min-w-0 flex-1 truncate">{shape.name}</span>

        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation()
            onToggleLock(shape.id)
          }}
          className={`shrink-0 text-[10px] ${shape.locked ? 'text-[#e0a05c]' : 'text-transparent group-hover:text-[#5f5d72]'}`}
          aria-label={shape.locked ? 'Unlock' : 'Lock'}
        >
          {shape.locked ? '◆' : '◇'}
        </button>

        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation()
            onToggleVisibility(shape.id)
          }}
          className={`shrink-0 text-[10px] ${shape.visible ? 'text-transparent group-hover:text-[#5f5d72]' : 'text-[#5f5d72]'}`}
          aria-label={shape.visible ? 'Hide' : 'Show'}
        >
          {shape.visible ? '◉' : '◌'}
        </button>
      </div>

      {shape.children.length > 0 && !isCollapsed ? (
        <ul className="space-y-0.5">
          {shape.children.map((child) => (
            <LayerRow
              key={child.id}
              shape={child}
              depth={depth + 1}
              selectedId={selectedId}
              collapsed={collapsed}
              draggingId={draggingId}
              dropState={dropState}
              onToggleCollapse={onToggleCollapse}
              onSelect={onSelect}
              onToggleVisibility={onToggleVisibility}
              onToggleLock={onToggleLock}
              onDragStart={onDragStart}
              onDragEnd={onDragEnd}
              onDragOverRow={onDragOverRow}
              onDropRow={onDropRow}
            />
          ))}
        </ul>
      ) : null}
    </li>
  )
}

/**
 * Верхняя и нижняя четверти строки — вставка рядом, середина контейнера — внутрь.
 * Для строки без детей середина делит пополам, чтобы «до» и «после» были равнозначны.
 */
function dropModeFromEvent(event: React.DragEvent<HTMLDivElement>, isContainer: boolean): DropMode {
  const bounds = event.currentTarget.getBoundingClientRect()
  if (bounds.height === 0) return 'after'

  const ratio = (event.clientY - bounds.top) / bounds.height
  if (isContainer) {
    if (ratio < 0.25) return 'before'
    if (ratio > 0.75) return 'after'
    return 'inside'
  }
  return ratio < 0.5 ? 'before' : 'after'
}

interface DropTarget {
  parentId: string | null
  index: number
}

function resolveDropTarget(
  shapes: Shape[],
  dragId: string,
  rowId: string,
  mode: DropMode,
): DropTarget | null {
  if (mode === 'inside') {
    const row = findNode(shapes, rowId)
    if (!row || row.type !== 'frame') return null
    if (isDescendant(shapes, dragId, row.id)) return null
    return { parentId: row.id, index: row.children.length }
  }

  const parentId = findParentId(shapes, rowId)
  const rowIndex = siblingIndex(shapes, rowId)
  if (rowIndex === -1) return null
  if (parentId !== null && (parentId === dragId || isDescendant(shapes, dragId, parentId))) {
    return null
  }
  return { parentId, index: mode === 'before' ? rowIndex : rowIndex + 1 }
}

function countNodes(shapes: Shape[]): number {
  return shapes.reduce((total, shape) => total + 1 + countNodes(shape.children), 0)
}
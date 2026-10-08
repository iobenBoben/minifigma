import { useCallback, useEffect, useRef, useState } from 'react'
import type { PointerEvent as ReactPointerEvent } from 'react'

import { DEFAULT_FRAME_SIZE, DEFAULT_TOOL, SHAPE_PALETTE, createShape } from '../constants/tools'
import { useViewport } from '../hooks/useViewport'
import type { Point, Shape as ShapeModel, ShapeType, Tool, VectorVertex } from '../types/shape'
import { clamp, rectFromPoints, screenToCanvas } from '../utils/geometry'
import { isLockedInTree } from '../utils/tree'
import { buildPathData, normalizeVertices } from '../utils/vector'
import { Shape } from './Shape'

const GRID_SIZE = 20
const DEFAULT_DRAG_SIZE = 140
const DEFAULT_TEXT_SIZE = { width: 180, height: 32 }
const HANDLE_SIZE = 8
const CURSORS = {
  nw: 'nwse-resize',
  n: 'ns-resize',
  ne: 'nesw-resize',
  e: 'ew-resize',
  se: 'nwse-resize',
  s: 'ns-resize',
  sw: 'nesw-resize',
  w: 'ew-resize',
} as const

type Handle = keyof typeof CURSORS

const EMPTY_VERTICES: VectorVertex[] = []

interface CanvasProps {
  shapes: ShapeModel[]
  flat: ReturnType<typeof import('../utils/tree').flattenTree>
  selectedId: string | null
  activeTool: Tool
  onAddShape: (shape: ShapeModel, parentId?: string | null) => void
  onUpdateShape: (id: string, updates: Partial<ShapeModel>) => void
  onSelect: (id: string | null) => void
}

type Interaction =
  | {
      kind: 'draw'
      tool: ShapeType
      start: { x: number; y: number }
      current: { x: number; y: number }
      equalSides: boolean
      pointerId: number
      parentId: string | null
    }
  | {
      kind: 'move'
      nodeId: string
      parentId: string | null
      startCanvas: { x: number; y: number }
      origin: { x: number; y: number }
      pointerId: number
    }
  | {
      kind: 'resize'
      nodeId: string
      handle: Handle
      startCanvas: { x: number; y: number }
      origin: { x: number; y: number; width: number; height: number }
      pointerId: number
    }
  | { kind: 'pen'; pointerId: number; anchor: { x: number; y: number } }

export function Canvas({
  shapes,
  flat,
  selectedId,
  activeTool,
  onAddShape,
  onUpdateShape,
  onSelect,
}: CanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const interactionRef = useRef<Interaction | null>(null)
  const [ghost, setGhost] = useState<ShapeModel | null>(null)
  const [rawPathVertices, setPathVertices] = useState<VectorVertex[]>([])
  const [rawPathCursor, setPathCursor] = useState<{ x: number; y: number } | null>(null)
  const {
    viewport,
    isPanning,
    isSpacePressed,
    zoomPercentage,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
    handleWheel,
    resetViewport,
  } = useViewport(containerRef)

  useEffect(() => {
    resetViewport(containerRef.current)
  }, [resetViewport])

  const isPenTool = activeTool === 'vector'
  const pathVertices = isPenTool ? rawPathVertices : EMPTY_VERTICES
  const pathCursor = isPenTool ? rawPathCursor : null

  const frameUnderPoint = useCallback(
    (point: Point): string | null => {
      for (let index = flat.length - 1; index >= 0; index -= 1) {
        const item = flat[index]
        if (item.node.type !== 'frame' || !item.node.visible || item.node.locked) continue
        const inside =
          point.x >= item.worldX &&
          point.x <= item.worldX + item.worldWidth &&
          point.y >= item.worldY &&
          point.y <= item.worldY + item.worldHeight
        if (inside) return item.node.id
      }
      return null
    },
    [flat],
  )

  const finishPath = useCallback(
    (closed: boolean) => {
      if (pathVertices.length === 0) return

      const parentId = frameUnderPoint(pathVertices[0])
      const parent = parentId ? flat.find((item) => item.node.id === parentId) : undefined

      const originX = parent ? parent.worldX : 0
      const originY = parent ? parent.worldY : 0
      const local = pathVertices.map((vertex) => ({
        ...vertex,
        x: vertex.x - originX,
        y: vertex.y - originY,
      }))
      const { vertices, x, y } = normalizeVertices(local)

      const created = createShape('vector', x, y, 1, 1)
      created.vector = { vertices, closed }
      created.width = Math.max(
        vertices.reduce((max, vertex) => Math.max(max, vertex.x), 0),
        1,
      )
      created.height = Math.max(
        vertices.reduce((max, vertex) => Math.max(max, vertex.y), 0),
        1,
      )
      created.strokeWidth = 2

      onAddShape(created, parentId)
      setPathVertices([])
      setPathCursor(null)
    },
    [pathVertices, flat, onAddShape, frameUnderPoint],
  )

  const onPenPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (activeTool !== 'vector' || event.button !== 0 || isSpacePressed) return
    event.preventDefault()

    const point = toCanvas(event.clientX, event.clientY)

    if (event.shiftKey && pathVertices.length >= 3) {
      const first = pathVertices[0]
      if (Math.hypot(first.x - point.x, first.y - point.y) <= 10 / viewport.zoom) {
        finishPath(true)
        return
      }
    }

    if (event.altKey || event.metaKey) {
      if (pathVertices.length > 0) finishPath(false)
      return
    }

    interactionRef.current = {
      kind: 'pen',
      pointerId: event.pointerId,
      anchor: point,
    }
    setPathVertices((current) => [
      ...current,
      { x: point.x, y: point.y, inX: 0, inY: 0, outX: 0, outY: 0 },
    ])
  }

  const onPenPointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (activeTool !== 'vector') return
    const point = toCanvas(event.clientX, event.clientY)
    setPathCursor(point)

    const interaction = interactionRef.current
    if (!interaction || interaction.kind !== 'pen' || interaction.pointerId !== event.pointerId) return

    const outX = point.x - interaction.anchor.x
    const outY = point.y - interaction.anchor.y

    setPathVertices((current) => {
      if (current.length === 0) return current
      const next = [...current]
      const last = next[next.length - 1]
      next[next.length - 1] = { ...last, outX, outY, inX: -outX, inY: -outY }
      return next
    })
  }

  const onPenPointerUp = () => {
    if (interactionRef.current?.kind === 'pen') interactionRef.current = null
  }

  const toCanvas = (clientX: number, clientY: number) => {
    const bounds = containerRef.current?.getBoundingClientRect()
    const originX = bounds ? bounds.left : 0
    const originY = bounds ? bounds.top : 0
    return screenToCanvas({ x: clientX - originX, y: clientY - originY }, viewport)
  }

  const selectedEntry = flat.find((item) => item.node.id === selectedId)
  const selectedNode = selectedEntry?.node ?? null

  const parentOfNode = (nodeId: string): string | null => {
    const entry = flat.find((item) => item.node.id === nodeId)
    return entry?.parentId ?? null
  }

  const startDraw = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.button !== 0 || isSpacePressed || activeTool === 'select') return
    event.preventDefault()

    const point = toCanvas(event.clientX, event.clientY)
    const tool = activeTool as ShapeType
    const parentId = frameUnderPoint(point)

    if (tool === 'text') {
      const created = createShape('text', point.x, point.y, DEFAULT_TEXT_SIZE.width, DEFAULT_TEXT_SIZE.height)
      if (parentId) {
        const parent = flat.find((item) => item.node.id === parentId)
        if (parent) {
          created.x = point.x - parent.worldX
          created.y = point.y - parent.worldY
        }
      }
      onAddShape(created, parentId)
      return
    }

    interactionRef.current = {
      kind: 'draw',
      tool,
      start: point,
      current: point,
      equalSides: false,
      pointerId: event.pointerId,
      parentId,
    }
    const base = createShape(tool, point.x, point.y, 0, 0)
    const palette = SHAPE_PALETTE[tool]
    setGhost({ ...base, fill: palette.fill, stroke: palette.stroke })
  }

  const startMove = (
    event: ReactPointerEvent<HTMLDivElement>,
    node: ShapeModel,
  ) => {
    if (event.button !== 0 || isSpacePressed || activeTool !== 'select') return
    if (isLockedInTree(shapes, node.id)) {
      onSelect(node.id)
      return
    }
    event.preventDefault()
    event.stopPropagation()

    const parentId = parentOfNode(node.id)
    const point = toCanvas(event.clientX, event.clientY)
    const parent = parentId ? flat.find((item) => item.node.id === parentId) : undefined

    interactionRef.current = {
      kind: 'move',
      nodeId: node.id,
      parentId,
      startCanvas: point,
      origin: {
        x: parent ? point.x - parent.worldX : point.x,
        y: parent ? point.y - parent.worldY : point.y,
      },
      pointerId: event.pointerId,
    }

    onSelect(node.id)
    onUpdateShape(node.id, {
      x: parent ? node.x : point.x,
      y: parent ? node.y : point.y,
    })
  }

  const startResize = (event: ReactPointerEvent<HTMLButtonElement>, handle: Handle) => {
    if (!selectedNode) return
    if (isLockedInTree(shapes, selectedNode.id)) return
    event.preventDefault()
    event.stopPropagation()

    interactionRef.current = {
      kind: 'resize',
      nodeId: selectedNode.id,
      handle,
      startCanvas: toCanvas(event.clientX, event.clientY),
      origin: {
        x: selectedNode.x,
        y: selectedNode.y,
        width: selectedNode.width,
        height: selectedNode.height,
      },
      pointerId: event.pointerId,
    }
  }

  const updateInteraction = (event: ReactPointerEvent<HTMLDivElement>) => {
    const interaction = interactionRef.current
    if (!interaction || interaction.pointerId !== event.pointerId) return

    const point = toCanvas(event.clientX, event.clientY)

    if (interaction.kind === 'draw') {
      interaction.current = point
      interaction.equalSides = event.shiftKey
      const rect = rectFromPoints(interaction.start, point, event.shiftKey)
      const parent = interaction.parentId
        ? flat.find((item) => item.node.id === interaction.parentId)
        : undefined
      const localX = parent ? rect.x - parent.worldX : rect.x
      const localY = parent ? rect.y - parent.worldY : rect.y
      setGhost((current) =>
        current ? { ...current, x: localX, y: localY, width: rect.width, height: rect.height } : current,
      )
      return
    }

    if (interaction.kind === 'move') {
      const parent = interaction.parentId
        ? flat.find((item) => item.node.id === interaction.parentId)
        : undefined
      const baseX = parent ? interaction.startCanvas.x - parent.worldX : interaction.startCanvas.x
      const baseY = parent ? interaction.startCanvas.y - parent.worldY : interaction.startCanvas.y
      onUpdateShape(interaction.nodeId, {
        x: baseX + (point.x - interaction.startCanvas.x),
        y: baseY + (point.y - interaction.startCanvas.y),
      })
      return
    }

    if (interaction.kind !== 'resize') return

    const dx = point.x - interaction.startCanvas.x
    const dy = point.y - interaction.startCanvas.y
    const next = resizeRect(interaction, dx, dy, event.shiftKey)
    onUpdateShape(interaction.nodeId, next)
  }

  const finishInteraction = () => {
    const interaction = interactionRef.current
    if (!interaction) return

    if (interaction.kind === 'draw') {
      const rect = rectFromPoints(interaction.start, interaction.current, interaction.equalSides)
      const isClick = rect.width < 3 && rect.height < 3
      const defaults =
        interaction.tool === 'frame' ? DEFAULT_FRAME_SIZE : { width: DEFAULT_DRAG_SIZE, height: DEFAULT_DRAG_SIZE }
      const parent = interaction.parentId
        ? flat.find((item) => item.node.id === interaction.parentId)
        : undefined

      const size = isClick
        ? { width: defaults.width, height: defaults.height }
        : { width: rect.width, height: rect.height }
      const x = isClick && parent ? 0 : parent ? rect.x - parent.worldX : rect.x
      const y = isClick && parent ? 0 : parent ? rect.y - parent.worldY : rect.y

      const created = createShape(interaction.tool, x, y, size.width, size.height)
      onAddShape(created, interaction.parentId)
    }

    interactionRef.current = null
    setGhost(null)
  }

  return (
    <main className="relative h-dvh w-screen overflow-hidden bg-[#0a0c11] text-[#f2f4fb]">
      <div
        ref={containerRef}
        className={`absolute inset-0 overflow-hidden ${
          isPanning ? 'cursor-grabbing' : isSpacePressed ? 'cursor-grab' : 'cursor-crosshair'
        }`}
        onPointerDown={(event) => {
          if (isSpacePressed) {
            handlePointerDown(event)
            return
          }
          if (activeTool === 'vector') {
            onPenPointerDown(event)
            return
          }
          if (event.target === event.currentTarget) onSelect(null)
          startDraw(event)
        }}
        onPointerMove={(event) => {
          handlePointerMove(event)
          if (activeTool === 'vector') {
            onPenPointerMove(event)
            return
          }
          updateInteraction(event)
        }}
        onPointerUp={(event) => {
          handlePointerUp(event)
          if (activeTool === 'vector') {
            onPenPointerUp()
            return
          }
          finishInteraction()
        }}
        onPointerCancel={(event) => {
          handlePointerUp(event)
          if (activeTool === 'vector') {
            onPenPointerUp()
            return
          }
          finishInteraction()
        }}
        onDoubleClick={() => {
          if (activeTool === 'vector') finishPath(false)
        }}
        onWheel={handleWheel}
        aria-label="Design canvas"
      >
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            backgroundImage:
              'linear-gradient(to right, rgba(160, 178, 230, 0.10) 1px, transparent 1px), linear-gradient(to bottom, rgba(160, 178, 230, 0.10) 1px, transparent 1px)',
            backgroundPosition: `${viewport.pan.x}px ${viewport.pan.y}px`,
            backgroundSize: `${GRID_SIZE * viewport.zoom}px ${GRID_SIZE * viewport.zoom}px`,
          }}
        />

        <div
          className="absolute left-0 top-0 origin-top-left will-change-transform"
          style={{
            transform: `translate3d(${viewport.pan.x}px, ${viewport.pan.y}px, 0) scale(${viewport.zoom})`,
          }}
        >
          {shapes.map((shape) => (
            <Shape
              key={shape.id}
              shape={shape}
              selectedId={selectedId}
              onSelect={(event) => startMove(event, shape)}
            />
          ))}

          {selectedEntry &&
          selectedNode &&
          selectedNode.visible &&
          !isLockedInTree(shapes, selectedNode.id) ? (
            <SelectionBox
              x={selectedEntry.worldX}
              y={selectedEntry.worldY}
              width={selectedEntry.worldWidth}
              height={selectedEntry.worldHeight}
              zoom={viewport.zoom}
              isFrame={selectedNode.type === 'frame'}
              onHandlePointerDown={startResize}
            />
          ) : null}

          {pathVertices.length > 0 ? (
            <PenPreview vertices={pathVertices} cursor={pathCursor} zoom={viewport.zoom} />
          ) : null}

          {ghost ? <Shape shape={ghost} selectedId={null} isGhost onSelect={() => undefined} /> : null}
        </div>
      </div>

      <div className="pointer-events-none absolute inset-x-0 bottom-5 flex justify-center">
        <div className="pointer-events-auto flex items-center gap-1 rounded-xl border border-white/10 bg-[#161821]/95 px-2 py-1.5 shadow-[0_12px_40px_rgba(0,0,0,0.4)] backdrop-blur">
          <button
            type="button"
            onClick={() => resetViewport(containerRef.current)}
            className="rounded-lg px-2.5 py-1.5 text-[11px] font-semibold tracking-wide text-[#9c98b5] transition hover:bg-white/8 hover:text-white"
          >
            Fit
          </button>
          <span className="h-4 w-px bg-white/10" />
          <span className="min-w-11 px-2 text-right text-[11px] font-semibold tabular-nums text-[#b9b4d1]">
            {zoomPercentage}%
          </span>
          <span className="h-4 w-px bg-white/10" />
          <span className="px-2 text-[10px] font-medium text-[#6f6d82]">
            {TOOL_LABEL[activeTool] ?? DEFAULT_TOOL}
          </span>
        </div>
      </div>
    </main>
  )
}

const TOOL_LABEL: Record<Tool, string> = {
  select: 'Move',
  rectangle: 'Rectangle',
  ellipse: 'Ellipse',
  frame: 'Frame',
  text: 'Text',
  vector: 'Pen',
}

interface PenPreviewProps {
  vertices: VectorVertex[]
  cursor: { x: number; y: number } | null
  zoom: number
}

function PenPreview({ vertices, cursor, zoom }: PenPreviewProps) {
  if (vertices.length === 0) return null

  const withCursor: VectorVertex[] = cursor
    ? [
        ...vertices,
        { x: cursor.x, y: cursor.y, inX: 0, inY: 0, outX: 0, outY: 0 },
      ]
    : vertices

  const xs = withCursor.map((vertex) => vertex.x)
  const ys = withCursor.map((vertex) => vertex.y)
  const minX = Math.min(...xs) - 20
  const minY = Math.min(...ys) - 20
  const width = Math.max(Math.max(...xs) - minX + 20, 40)
  const height = Math.max(Math.max(...ys) - minY + 20, 40)

  return (
    <svg
      className="pointer-events-none absolute overflow-visible"
      style={{ left: minX, top: minY, width, height }}
      viewBox={`0 0 ${width} ${height}`}
    >
      <path
        d={buildPathData(
          withCursor.map((vertex) => ({ ...vertex, x: vertex.x - minX, y: vertex.y - minY })),
          false,
        )}
        fill="none"
        stroke="#8290ee"
        strokeWidth={2}
        strokeLinecap="round"
      />
      {vertices.map((vertex, index) => {
        const cx = vertex.x - minX
        const cy = vertex.y - minY
        const isFirst = index === 0
        return (
          <g key={index}>
            {vertex.outX !== 0 || vertex.outY !== 0 ? (
              <>
                <line x1={cx} y1={cy} x2={cx + vertex.outX} y2={cy + vertex.outY} stroke="#5b6bd8" strokeWidth={1 / zoom} />
                <circle cx={cx + vertex.outX} cy={cy + vertex.outY} r={3 / zoom} fill="#5b6bd8" />
                <line x1={cx} y1={cy} x2={cx + vertex.inX} y2={cy + vertex.inY} stroke="#5b6bd8" strokeWidth={1 / zoom} />
                <circle cx={cx + vertex.inX} cy={cy + vertex.inY} r={3 / zoom} fill="#5b6bd8" />
              </>
            ) : null}
            <circle
              cx={cx}
              cy={cy}
              r={4 / zoom}
              fill={isFirst ? '#f2f4fb' : '#5b6bd8'}
              stroke="#0a0c11"
              strokeWidth={1 / zoom}
            />
          </g>
        )
      })}
    </svg>
  )
}

interface SelectionBoxProps {
  x: number
  y: number
  width: number
  height: number
  zoom: number
  isFrame: boolean
  onHandlePointerDown: (event: ReactPointerEvent<HTMLButtonElement>, handle: Handle) => void
}

function SelectionBox({ x, y, width, height, zoom, isFrame, onHandlePointerDown }: SelectionBoxProps) {
  const size = HANDLE_SIZE / zoom
  const offset = -size / 2
  const handles: Handle[] = ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w']

  return (
    <div
      className="pointer-events-none absolute"
      style={{ left: x, top: y, width, height, outline: `${1 / zoom}px solid #8290ee` }}
    >
      {handles.map((handle) => {
        const horizontal = handle.includes('e') ? 1 : handle.includes('w') ? 0 : null
        const vertical = handle.includes('s') ? 1 : handle.includes('n') ? 0 : null
        const left = horizontal === null ? '50%' : horizontal === 1 ? '100%' : '0%'
        const top = vertical === null ? '50%' : vertical === 1 ? '100%' : '0%'

        return (
          <button
            key={handle}
            type="button"
            aria-label={`Resize ${handle}`}
            onPointerDown={(event) => onHandlePointerDown(event, handle)}
            className={`pointer-events-auto absolute rounded-[2px] border border-[#0a0c11] ${
              isFrame && (handle === 'n' || handle === 's' || handle === 'w' || handle === 'e')
                ? 'hidden'
                : ''
            }`}
            style={{
              width: size,
              height: size,
              left: `calc(${left}% + ${offset}px)`,
              top: `calc(${top}% + ${offset}px)`,
              transform: 'translate(-50%, -50%)',
              background: '#f2f4fb',
              cursor: CURSORS[handle],
            }}
          />
        )
      })}
    </div>
  )
}

function resizeRect(
  interaction: Extract<Interaction, { kind: 'resize' }>,
  dx: number,
  dy: number,
  keepAspect: boolean,
): Partial<ShapeModel> {
  const { origin, handle } = interaction
  const minSize = 4

  let { x, y, width, height } = origin

  if (handle.includes('e')) width = Math.max(minSize, origin.width + dx)
  if (handle.includes('s')) height = Math.max(minSize, origin.height + dy)
  if (handle.includes('w')) {
    width = Math.max(minSize, origin.width - dx)
    x = origin.x + (origin.width - width)
  }
  if (handle.includes('n')) {
    height = Math.max(minSize, origin.height - dy)
    y = origin.y + (origin.height - height)
  }

  if (keepAspect && origin.width > 0 && origin.height > 0) {
    const ratio = origin.width / origin.height
    if (handle === 'n' || handle === 's') {
      height = Math.max(minSize, origin.height + dy)
      width = Math.max(minSize, height * ratio)
    } else {
      width = Math.max(minSize, origin.width + dx)
      height = Math.max(minSize, width / ratio)
    }
    if (handle.includes('w')) x = origin.x + (origin.width - width)
    if (handle.includes('n')) y = origin.y + (origin.height - height)
  }

  return {
    x,
    y,
    width: clamp(width, minSize, 100000),
    height: clamp(height, minSize, 100000),
  }
}
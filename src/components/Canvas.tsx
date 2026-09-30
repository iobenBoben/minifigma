import { useEffect, useRef, useState } from 'react'
import type { PointerEvent as ReactPointerEvent } from 'react'

import { useViewport } from '../hooks/useViewport'
import type { Point, Shape as ShapeModel, ShapeType, Tool } from '../types/shape'
import { rectFromPoints, screenToCanvas } from '../utils/geometry'
import { Shape } from './Shape'

const GRID_SIZE = 20
const DEFAULT_SHAPE_SIZE = 120
const SHAPE_PALETTE: Record<ShapeType, { fill: string; stroke: string }> = {
  rectangle: { fill: '#4a5bc4', stroke: '#8290ee' },
  ellipse: { fill: '#1a6f80', stroke: '#3fc4d4' },
}

interface CanvasProps {
  shapes: ShapeModel[]
  selectedShapeId: string | null
  activeTool: Tool
  onAddShape: (shape: ShapeModel) => void
  onUpdateShape: (id: string, updates: Partial<Omit<ShapeModel, 'id'>>) => void
  onSelectShape: (id: string | null) => void
}

type Interaction =
  | { kind: 'draw'; tool: ShapeType; start: Point; pointerId: number }
  | { kind: 'move'; shapeId: string; start: Point; origin: Point; pointerId: number }

export function Canvas({
  shapes,
  selectedShapeId,
  activeTool,
  onAddShape,
  onUpdateShape,
  onSelectShape,
}: CanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const interactionRef = useRef<Interaction | null>(null)
  const [ghost, setGhost] = useState<ShapeModel | null>(null)
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
  } = useViewport()

  useEffect(() => {
    resetViewport(containerRef.current)
  }, [resetViewport])

  const getCanvasPoint = (event: ReactPointerEvent<HTMLElement>): Point => {
    const bounds = event.currentTarget.getBoundingClientRect()
    return screenToCanvas(
      { x: event.clientX - bounds.left, y: event.clientY - bounds.top },
      viewport,
    )
  }

  const startDrawing = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.button !== 0 || isSpacePressed || activeTool === 'select') return

    event.preventDefault()
    const start = getCanvasPoint(event)
    const palette = SHAPE_PALETTE[activeTool]

    interactionRef.current = {
      kind: 'draw',
      tool: activeTool,
      start,
      pointerId: event.pointerId,
    }
    setGhost({
      id: 'ghost',
      name: `New ${activeTool}`,
      type: activeTool,
      x: start.x,
      y: start.y,
      width: 0,
      height: 0,
      fill: palette.fill,
      stroke: palette.stroke,
      strokeWidth: 1,
      rotation: 0,
    })
  }

  const startMoving = (event: ReactPointerEvent<HTMLButtonElement>, shape: ShapeModel) => {
    if (event.button !== 0 || isSpacePressed || activeTool !== 'select') return

    event.preventDefault()
    onSelectShape(shape.id)
    interactionRef.current = {
      kind: 'move',
      shapeId: shape.id,
      start: { x: event.clientX, y: event.clientY },
      origin: { x: shape.x, y: shape.y },
      pointerId: event.pointerId,
    }
  }

  const updateInteraction = (event: ReactPointerEvent<HTMLDivElement>) => {
    const interaction = interactionRef.current
    if (!interaction || interaction.pointerId !== event.pointerId) return

    if (interaction.kind === 'draw') {
      const rect = rectFromPoints(
        interaction.start,
        getCanvasPoint(event),
        event.shiftKey,
      )
      setGhost((current) => (current ? { ...current, ...rect } : current))
      return
    }

    onUpdateShape(interaction.shapeId, {
      x: interaction.origin.x + (event.clientX - interaction.start.x) / viewport.zoom,
      y: interaction.origin.y + (event.clientY - interaction.start.y) / viewport.zoom,
    })
  }

  const finishInteraction = () => {
    const interaction = interactionRef.current
    if (!interaction) return

    if (interaction.kind === 'draw' && ghost) {
      const isClick = ghost.width < 3 && ghost.height < 3
      const rect = isClick
        ? { x: ghost.x, y: ghost.y, width: DEFAULT_SHAPE_SIZE, height: DEFAULT_SHAPE_SIZE }
        : ghost
      const count = shapes.filter((shape) => shape.type === interaction.tool).length + 1

      onAddShape({
        ...ghost,
        id: crypto.randomUUID(),
        name: `${interaction.tool === 'rectangle' ? 'Rectangle' : 'Ellipse'} ${count}`,
        ...rect,
      })
    }

    interactionRef.current = null
    setGhost(null)
  }

  return (
    <main className="relative h-dvh w-screen overflow-hidden bg-[#0b0c10] text-[#f4f2ff]">
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

          if (event.target === event.currentTarget && activeTool === 'select') {
            onSelectShape(null)
          }
          startDrawing(event)
        }}
        onPointerMove={(event) => {
          handlePointerMove(event)
          updateInteraction(event)
        }}
        onPointerUp={(event) => {
          handlePointerUp(event)
          finishInteraction()
        }}
        onPointerCancel={(event) => {
          handlePointerUp(event)
          finishInteraction()
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
              isSelected={shape.id === selectedShapeId}
              onSelect={() => onSelectShape(shape.id)}
              onMoveStart={(event) => startMoving(event, shape)}
            />
          ))}
          {ghost ? (
            <Shape
              shape={ghost}
              isSelected={false}
              isGhost
              onSelect={() => undefined}
            />
          ) : null}
        </div>
      </div>

      <div className="pointer-events-none absolute inset-x-0 bottom-5 flex justify-center">
        <div className="pointer-events-auto flex items-center gap-1 rounded-xl border border-white/10 bg-[#161821]/95 px-2 py-1.5 shadow-[0_12px_40px_rgba(0,0,0,0.4)] backdrop-blur">
          <button
            type="button"
            onClick={() => resetViewport(containerRef.current)}
            className="rounded-lg px-2.5 py-1.5 text-[11px] font-semibold tracking-wide text-[#9c98b5] transition hover:bg-white/8 hover:text-white"
            aria-label="Reset viewport"
            title="Reset viewport (center at 100%)"
          >
            Fit
          </button>
          <span className="h-4 w-px bg-white/10" />
          <span className="min-w-11 px-2 text-right text-[11px] font-semibold tabular-nums text-[#b9b4d1]">
            {zoomPercentage}%
          </span>
        </div>
      </div>
    </main>
  )
}

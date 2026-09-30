import { memo } from 'react'

import type { Shape as ShapeModel } from '../types/shape'
import { buildPathData } from '../utils/vector'

interface ShapeProps {
  shape: ShapeModel
  depth: number
  isSelected: boolean
  isGhost?: boolean
  isDropTarget?: boolean
  onSelect: (event: React.PointerEvent<HTMLDivElement>) => void
  onPointerDownChild?: (event: React.PointerEvent<HTMLDivElement>, child: ShapeModel) => void
  onPointerDownFrame?: (event: React.PointerEvent<HTMLDivElement>, frame: ShapeModel) => void
  onDropOnFrame?: (frameId: string) => void
}

function ShapeImpl({
  shape,
  depth,
  isSelected,
  isGhost = false,
  isDropTarget = false,
  onSelect,
  onPointerDownChild,
  onPointerDownFrame,
  onDropOnFrame,
}: ShapeProps) {
  if (!shape.visible && !isGhost) return null

  const baseStyle: React.CSSProperties = {
    left: shape.x,
    top: shape.y,
    width: shape.width,
    height: shape.height,
    opacity: isGhost ? 0.6 : shape.opacity / 100,
    transform: shape.rotation ? `rotate(${shape.rotation}deg)` : undefined,
  }

  if (shape.type === 'frame') {
    return (
      <div
        className="absolute"
        style={baseStyle}
        onPointerDown={(event) => onPointerDownFrame?.(event, shape)}
        onDragOver={(event) => {
          if (isGhost) return
          event.preventDefault()
          event.stopPropagation()
        }}
        onDrop={(event) => {
          if (isGhost) return
          event.preventDefault()
          event.stopPropagation()
          onDropOnFrame?.(shape.id)
        }}
        data-frame={shape.id}
        data-depth={depth}
      >
        <div
          className={`pointer-events-none absolute inset-0 rounded-[2px] border ${
            isDropTarget ? 'border-[#5b6bd8] bg-[#5b6bd8]/12' : 'border-white/22'
          }`}
        />
        {isSelected && !isGhost ? (
          <div className="pointer-events-none absolute -inset-px rounded-[2px] ring-2 ring-[#8290ee]" />
        ) : null}
        {shape.autoLayout.mode === 'none' ? null : null}
        {shape.children.map((child) => (
          <ShapeImpl
            key={child.id}
            shape={child}
            depth={depth + 1}
            isSelected={false}
            onSelect={() => undefined}
            onPointerDownChild={onPointerDownChild}
            onPointerDownFrame={onPointerDownFrame}
            onDropOnFrame={onDropOnFrame}
          />
        ))}
      </div>
    )
  }

  const isEllipse = shape.type === 'ellipse'
  const isText = shape.type === 'text'
  const isVector = shape.type === 'vector'

  return (
    <div
      className={`absolute ${isGhost ? '' : 'pointer-events-auto'} ${
        isSelected && !isGhost ? 'ring-2 ring-[#8290ee]' : ''
      }`}
      style={{
        ...baseStyle,
        backgroundColor: isText || isVector ? 'transparent' : shape.fill,
        border: !isVector && shape.strokeWidth > 0 ? `${shape.strokeWidth}px solid ${shape.stroke}` : undefined,
        borderRadius: isEllipse ? '9999px' : shape.radius,
      }}
      onPointerDown={(event) => onSelect(event)}
      data-node={shape.id}
      data-depth={depth}
    >
      {isVector ? (
        <svg
          className="h-full w-full overflow-visible"
          viewBox={`0 0 ${shape.width} ${shape.height}`}
          preserveAspectRatio="none"
        >
          <path
            d={buildPathData(shape.vector.vertices, shape.vector.closed)}
            fill={shape.fill === 'transparent' ? 'none' : shape.fill}
            stroke={shape.stroke}
            strokeWidth={shape.strokeWidth}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {isSelected && !isGhost
            ? shape.vector.vertices.map((vertex, index) => (
                <circle
                  key={index}
                  cx={vertex.x}
                  cy={vertex.y}
                  r={3}
                  fill="#f2f4fb"
                  stroke="#0a0c11"
                  strokeWidth={1}
                />
              ))
            : null}
        </svg>
      ) : null}
      {isText ? (
        <div
          className="h-full w-full whitespace-pre-wrap break-words"
          style={{
            color: shape.fill,
            fontFamily: `${shape.text.fontFamily}, system-ui, sans-serif`,
            fontSize: shape.text.fontSize,
            fontWeight: fontWeightOf(shape.text.fontStyle),
            letterSpacing: shape.text.letterSpacing,
            lineHeight: `${shape.text.lineHeight}px`,
            textAlign: shape.text.textAlign.toLowerCase() as 'left' | 'center' | 'right',
          }}
        >
          {shape.text.content}
        </div>
      ) : null}
    </div>
  )
}

function fontWeightOf(style: string): number {
  if (style === 'Bold') return 700
  if (style === 'Semi Bold') return 600
  if (style === 'Medium') return 500
  return 400
}

export const Shape = memo(ShapeImpl)
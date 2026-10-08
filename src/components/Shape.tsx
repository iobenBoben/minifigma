import { memo } from 'react'

import type { Shape as ShapeModel } from '../types/shape'
import { buildPathData } from '../utils/vector'

interface ShapeProps {
  shape: ShapeModel
  selectedId: string | null
  isGhost?: boolean
  onSelect: (event: React.PointerEvent<HTMLDivElement>) => void
}

function ShapeImpl({ shape, selectedId, isGhost = false, onSelect }: ShapeProps) {
  if (!shape.visible && !isGhost) return null

  const isSelected = shape.id === selectedId
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
        onPointerDown={(event) => onSelect(event)}
        data-frame={shape.id}
      >
        <div
          className={`pointer-events-none absolute inset-0 rounded-[2px] border ${
            isSelected ? 'border-[#8290ee]' : 'border-white/22'
          }`}
        />
        {shape.children.map((child) => (
          <ShapeImpl
            key={child.id}
            shape={child}
            selectedId={selectedId}
            onSelect={onSelect}
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
      className={`absolute ${
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
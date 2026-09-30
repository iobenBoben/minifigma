import type { PointerEvent as ReactPointerEvent } from 'react'

import type { Shape as ShapeModel } from '../types/shape'

interface ShapeProps {
  shape: ShapeModel
  isSelected: boolean
  isGhost?: boolean
  onSelect: () => void
  onMoveStart?: (event: ReactPointerEvent<HTMLButtonElement>) => void
}

export function Shape({ shape, isSelected, isGhost = false, onSelect, onMoveStart }: ShapeProps) {
  const borderRadius = shape.type === 'ellipse' ? '9999px' : '4px'

  return (
    <button
      type="button"
      aria-label={`${shape.name}, ${shape.type}`}
      onClick={(event) => {
        event.stopPropagation()
        onSelect()
      }}
      onPointerDown={(event) => {
        event.stopPropagation()
        onMoveStart?.(event)
      }}
      className={`absolute touch-none border ${
        onMoveStart ? 'cursor-move' : 'cursor-default'
      } ${isSelected && !isGhost ? 'ring-2 ring-[#8b7cff]' : ''} ${
        isGhost ? 'opacity-70' : ''
      }`}
      style={{
        left: shape.x,
        top: shape.y,
        width: shape.width,
        height: shape.height,
        transform: `rotate(${shape.rotation}deg)`,
        transformOrigin: 'center',
        borderRadius,
        backgroundColor: shape.fill,
        borderWidth: shape.strokeWidth,
        borderColor: shape.stroke,
      }}
    />
  )
}

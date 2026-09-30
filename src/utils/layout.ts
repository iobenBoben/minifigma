import type { Shape } from '../types/shape'

interface Slot {
  main: number
  cross: number
}

export function applyAutoLayout(shape: Shape): Shape {
  if (shape.children.length === 0) return shape

  const { autoLayout } = shape
  if (autoLayout.mode === 'none') {
    return { ...shape, children: shape.children.map((child) => applyAutoLayout(child)) }
  }

  const horizontal = autoLayout.mode === 'horizontal'
  const paddingCross = horizontal ? autoLayout.paddingTop : autoLayout.paddingLeft
  const crossStart = horizontal ? autoLayout.paddingLeft : autoLayout.paddingTop
  const innerCross = (horizontal ? shape.height : shape.width) - paddingCross * 2 - (horizontal ? autoLayout.paddingBottom : autoLayout.paddingRight)
  const children = shape.children.map((child) => applyAutoLayout(child))
  const sizes = children.map((child) => (horizontal ? child.width : child.height))

  const totalMain = sizes.reduce((sum, size) => sum + size, 0)
  const contentMain = totalMain + autoLayout.gap * Math.max(children.length - 1, 0)
  const innerMain = (horizontal ? shape.width : shape.height) - (horizontal ? autoLayout.paddingLeft + autoLayout.paddingRight : autoLayout.paddingTop + autoLayout.paddingBottom)

  let cursor = horizontal ? autoLayout.paddingLeft : autoLayout.paddingTop
  let extraGap = 0

  if (autoLayout.justifyContent === 'center') {
    cursor += Math.max(innerMain - contentMain, 0) / 2
  } else if (autoLayout.justifyContent === 'end') {
    cursor += Math.max(innerMain - contentMain, 0)
  } else if (autoLayout.justifyContent === 'space-between' && children.length > 1) {
    extraGap = Math.max(innerMain - totalMain, 0) / (children.length - 1)
  }

  const laidOut = children.map((child, index): Shape => {
    const slot: Slot = {
      main: cursor,
      cross: crossStart + alignOffset(autoLayout.alignItems, innerCross, horizontal ? child.height : child.width),
    }
    cursor += sizes[index] + autoLayout.gap + extraGap

    return horizontal
      ? { ...child, x: slot.main, y: slot.cross }
      : { ...child, x: slot.cross, y: slot.main }
  })

  return { ...shape, children: laidOut }
}

function alignOffset(align: Shape['autoLayout']['alignItems'], innerCross: number, childCross: number): number {
  if (align === 'center') return Math.max(innerCross - childCross, 0) / 2
  if (align === 'end') return Math.max(innerCross - childCross, 0)
  return 0
}

export function layoutTree(shapes: Shape[]): Shape[] {
  return shapes.map((shape) => applyAutoLayout(shape))
}
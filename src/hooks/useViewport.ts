import { useCallback, useEffect, useRef, useState } from 'react'

import type { Point } from '../types/shape'
import { clamp, screenToCanvas } from '../utils/geometry'

const MIN_ZOOM = 0.1
const MAX_ZOOM = 4
const WHEEL_ZOOM_STEP = 0.0015

export interface ViewportState {
  pan: Point
  zoom: number
}

export interface ViewportControls {
  viewport: ViewportState
  isPanning: boolean
  isSpacePressed: boolean
  zoomPercentage: number
  handlePointerDown: (event: React.PointerEvent<HTMLElement>) => void
  handlePointerMove: (event: React.PointerEvent<HTMLElement>) => void
  handlePointerUp: (event: React.PointerEvent<HTMLElement>) => void
  handleWheel: (event: React.WheelEvent<HTMLElement>) => void
  resetViewport: (container: HTMLElement | null) => void
}

function isTypingTarget(target: EventTarget | null): boolean {
  return (
    target instanceof HTMLInputElement ||
    target instanceof HTMLTextAreaElement ||
    target instanceof HTMLSelectElement ||
    (target instanceof HTMLElement && target.isContentEditable)
  )
}

export function useViewport(containerRef?: React.RefObject<HTMLElement | null>): ViewportControls {
  const [viewport, setViewport] = useState<ViewportState>({ pan: { x: 0, y: 0 }, zoom: 1 })
  const [isPanning, setIsPanning] = useState(false)
  const [spacePressed, setSpacePressed] = useState(false)
  const panOriginRef = useRef<{
    pointerId: number
    pointer: Point
    pan: Point
  } | null>(null)

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.code === 'Space' && !isTypingTarget(event.target)) {
        event.preventDefault()
        setSpacePressed(true)
      }
    }

    const handleKeyUp = (event: KeyboardEvent) => {
      if (event.code === 'Space') {
        setSpacePressed(false)
      }
    }

    const handleBlur = () => {
      setSpacePressed(false)
      setIsPanning(false)
      panOriginRef.current = null
    }

    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)
    window.addEventListener('blur', handleBlur)

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
      window.removeEventListener('blur', handleBlur)
    }
  }, [])

  const resetViewport = useCallback((container: HTMLElement | null) => {
    if (!container) return

    const bounds = container.getBoundingClientRect()
    setViewport({
      pan: { x: bounds.width / 2, y: bounds.height / 2 },
      zoom: 1,
    })
  }, [])

  useEffect(() => {
    const container = containerRef?.current
    if (!container) return

    let previousWidth = container.clientWidth
    let previousHeight = container.clientHeight

    const handleResize = () => {
      const nextWidth = container.clientWidth
      const nextHeight = container.clientHeight
      const deltaX = (nextWidth - previousWidth) / 2
      const deltaY = (nextHeight - previousHeight) / 2
      previousWidth = nextWidth
      previousHeight = nextHeight

      setViewport((current) => ({
        ...current,
        pan: { x: current.pan.x + deltaX, y: current.pan.y + deltaY },
      }))
    }

    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [containerRef])

  const handlePointerDown = useCallback(
    (event: React.PointerEvent<HTMLElement>) => {
      if (!spacePressed) return

      event.preventDefault()
      try {
        event.currentTarget.setPointerCapture(event.pointerId)
      } catch {
        // Synthetic pointer events may not have an active browser pointer to capture.
      }
      panOriginRef.current = {
        pointerId: event.pointerId,
        pointer: { x: event.clientX, y: event.clientY },
        pan: viewport.pan,
      }
      setIsPanning(true)
    },
    [spacePressed, viewport.pan],
  )

  const handlePointerMove = useCallback(
    (event: React.PointerEvent<HTMLElement>) => {
      const origin = panOriginRef.current
      if (!origin || origin.pointerId !== event.pointerId) return

      setViewport((current) => ({
        ...current,
        pan: {
          x: origin.pan.x + event.clientX - origin.pointer.x,
          y: origin.pan.y + event.clientY - origin.pointer.y,
        },
      }))
    },
    [],
  )

  const stopPanning = useCallback((event: React.PointerEvent<HTMLElement>) => {
    if (panOriginRef.current?.pointerId !== event.pointerId) return

    panOriginRef.current = null
    setIsPanning(false)
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      try {
        event.currentTarget.releasePointerCapture(event.pointerId)
      } catch {
        // The browser may release an inactive synthetic pointer automatically.
      }
    }
  }, [])

  const handleWheel = useCallback((event: React.WheelEvent<HTMLElement>) => {
    event.preventDefault()

    const bounds = event.currentTarget.getBoundingClientRect()
    const pointer = { x: event.clientX - bounds.left, y: event.clientY - bounds.top }
    const zoomFactor = Math.exp(-event.deltaY * WHEEL_ZOOM_STEP)

    setViewport((current) => {
      const nextZoom = clamp(current.zoom * zoomFactor, MIN_ZOOM, MAX_ZOOM)
      const canvasPoint = screenToCanvas(pointer, current)

      return {
        zoom: nextZoom,
        pan: {
          x: pointer.x - canvasPoint.x * nextZoom,
          y: pointer.y - canvasPoint.y * nextZoom,
        },
      }
    })
  }, [])

  return {
    viewport,
    isPanning,
    zoomPercentage: Math.round(viewport.zoom * 100),
    isSpacePressed: spacePressed,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp: stopPanning,
    handleWheel,
    resetViewport,
  }
}

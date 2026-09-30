import { useCallback, useMemo, useState } from 'react'

import type { Shape } from '../types/shape'

export interface UseShapesResult {
  shapes: Shape[]
  selectedShapeId: string | null
  selectedShape: Shape | null
  addShape: (shape: Shape) => void
  updateShape: (id: string, updates: Partial<Omit<Shape, 'id'>>) => void
  selectShape: (id: string | null) => void
  removeShape: (id: string) => void
}

export function useShapes(): UseShapesResult {
  const [shapes, setShapes] = useState<Shape[]>([])
  const [selectedShapeId, setSelectedShapeId] = useState<string | null>(null)

  const addShape = useCallback((shape: Shape) => {
    setShapes((current) => [...current, shape])
    setSelectedShapeId(shape.id)
  }, [])

  const updateShape = useCallback((id: string, updates: Partial<Omit<Shape, 'id'>>) => {
    setShapes((current) =>
      current.map((shape) => (shape.id === id ? { ...shape, ...updates } : shape)),
    )
  }, [])

  const removeShape = useCallback((id: string) => {
    setShapes((current) => current.filter((shape) => shape.id !== id))
    setSelectedShapeId((current) => (current === id ? null : current))
  }, [])

  const selectedShape = useMemo(
    () => shapes.find((shape) => shape.id === selectedShapeId) ?? null,
    [selectedShapeId, shapes],
  )

  return {
    shapes,
    selectedShapeId,
    selectedShape,
    addShape,
    updateShape,
    selectShape: setSelectedShapeId,
    removeShape,
  }
}

import { useCallback, useState } from 'react'

import { Canvas } from './components/Canvas'
import { LayersPanel } from './components/LayersPanel'
import { PropertiesPanel } from './components/PropertiesPanel'
import { Toolbar } from './components/Toolbar'
import { DEFAULT_TOOL } from './constants/tools'
import { useHotkeys } from './hooks/useHotkeys'
import { useShapes } from './hooks/useShapes'
import type { Tool } from './types/shape'

export default function App() {
  const [activeTool, setActiveTool] = useState<Tool>(DEFAULT_TOOL)
  const [dropTargetId, setDropTargetId] = useState<string | null>(null)
  const {
    shapes,
    flat,
    selectedId,
    selectedShape,
    select,
    addShape,
    updateShape,
    removeShape,
    duplicateShape,
    reorderShape,
    toggleVisibility,
    toggleLock,
  } = useShapes()

  const handleDelete = useCallback(() => {
    if (selectedId) removeShape(selectedId)
  }, [removeShape, selectedId])

  const handleDuplicate = useCallback(() => {
    if (selectedId) duplicateShape(selectedId)
  }, [duplicateShape, selectedId])

  const handleEscape = useCallback(() => {
    if (selectedId) select(null)
  }, [select, selectedId])

  useHotkeys({
    onToolChange: setActiveTool,
    onDelete: handleDelete,
    onDuplicate: handleDuplicate,
    onEscape: handleEscape,
  })

  return (
    <div className="relative h-dvh min-h-[480px] w-full overflow-hidden bg-[#0a0c11]">
      <Canvas
        shapes={shapes}
        flat={flat}
        selectedId={selectedId}
        activeTool={activeTool}
        onAddShape={addShape}
        onUpdateShape={updateShape}
        onSelect={select}
        onReorder={reorderShape}
        dropTargetId={dropTargetId}
        setDropTargetId={setDropTargetId}
      />
      <Toolbar activeTool={activeTool} onToolChange={setActiveTool} />

      <aside className="absolute right-4 top-4 z-20 flex h-[calc(100%-2rem)] w-64 flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#14161c]/95 shadow-[0_18px_60px_rgba(0,0,0,0.5)] backdrop-blur">
        <header className="flex items-center justify-between border-b border-white/8 px-4 py-4">
          <div>
            <p className="text-[13px] font-semibold tracking-[-0.01em] text-[#f0edf9]">Untitled</p>
            <p className="mt-0.5 text-[9px] font-semibold uppercase tracking-[0.16em] text-[#6f6d82]">
              Mini Figma
            </p>
          </div>
          <span
            className="size-2 rounded-full bg-[#5b6bd8] ring-4 ring-[#5b6bd8]/15"
            aria-label="Document saved"
          />
        </header>
        <PropertiesPanel
          shape={selectedShape}
          onUpdate={updateShape}
          onDuplicate={duplicateShape}
          onDelete={removeShape}
        />
        <LayersPanel
          shapes={shapes}
          selectedId={selectedId}
          onSelect={select}
          onToggleVisibility={toggleVisibility}
          onToggleLock={toggleLock}
          onReorder={reorderShape}
        />
      </aside>

      <div className="pointer-events-none absolute left-1/2 top-4 z-20 -translate-x-1/2 rounded-xl border border-white/10 bg-[#14161c]/90 px-3 py-2 text-[10px] font-medium text-[#85839a] shadow-lg backdrop-blur">
        <kbd className="mr-1 rounded border border-white/10 bg-white/6 px-1.5 py-0.5 font-sans text-[#c9c6da]">
          F
        </kbd>
        frame
        <span className="mx-2 text-white/20">·</span>
        <kbd className="mr-1 rounded border border-white/10 bg-white/6 px-1.5 py-0.5 font-sans text-[#c9c6da]">
          R
        </kbd>
        rectangle
        <span className="mx-2 text-white/20">·</span>
        <kbd className="mr-1 rounded border border-white/10 bg-white/6 px-1.5 py-0.5 font-sans text-[#c9c6da]">
          T
        </kbd>
        text
        <span className="mx-2 text-white/20">·</span>
        hold <kbd className="mx-1 rounded border border-white/10 bg-white/6 px-1.5 py-0.5 font-sans text-[#c9c6da]">Space</kbd> to pan
      </div>
    </div>
  )
}
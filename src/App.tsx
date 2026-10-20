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
  const [pendingImage, setPendingImage] = useState<{ file: File; token: number } | null>(null)
  const {
    shapes,
    flat,
    selectedId,
    selectedShape,
    canUndo,
    canRedo,
    select,
    addShape,
    updateShape,
    removeShape,
    duplicateShape,
    reorderShape,
    toggleVisibility,
    toggleLock,
    arrangeShape,
    copyShape,
    pasteShape,
    undo,
    redo,
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

  const handleImageSelected = useCallback((file: File) => {
    setPendingImage({ file, token: Date.now() })
  }, [])

  const handleCopy = useCallback(() => {
    if (selectedId) copyShape(selectedId)
  }, [copyShape, selectedId])

  const handlePaste = useCallback(() => {
    pasteShape()
  }, [pasteShape])

  useHotkeys({
    onToolChange: setActiveTool,
    onDelete: handleDelete,
    onDuplicate: handleDuplicate,
    onEscape: handleEscape,
    onUndo: undo,
    onRedo: redo,
    onCopy: handleCopy,
    onPaste: handlePaste,
  })

  return (
    <div className="relative h-dvh min-h-[480px] w-full overflow-hidden bg-[#0a0c11]">
      <Canvas
        shapes={shapes}
        flat={flat}
        selectedId={selectedId}
        activeTool={activeTool}
        pendingImage={pendingImage}
        onAddShape={addShape}
        onUpdateShape={updateShape}
        onSelect={select}
      />
      <Toolbar
        activeTool={activeTool}
        onToolChange={setActiveTool}
        onImageSelected={handleImageSelected}
      />

      <aside className="absolute right-4 top-4 z-20 flex h-[calc(100%-2rem)] w-64 flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#14161c]/95 shadow-[0_18px_60px_rgba(0,0,0,0.5)] backdrop-blur">
        <header className="flex items-center justify-between border-b border-white/8 px-4 py-4">
          <div>
            <p className="text-[13px] font-semibold tracking-[-0.01em] text-[#f0edf9]">Untitled</p>
            <p className="mt-0.5 text-[9px] font-semibold uppercase tracking-[0.16em] text-[#6f6d82]">
              Mini Figma
            </p>
          </div>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={undo}
              disabled={!canUndo}
              className="flex size-7 items-center justify-center rounded-md text-[#86889e] transition enabled:hover:bg-white/8 enabled:hover:text-[#f0edf9] disabled:opacity-25"
              aria-label="Undo"
              title="Undo · Ctrl+Z"
            >
              <svg viewBox="0 0 24 24" fill="none" className="size-4" aria-hidden="true">
                <path
                  d="M9 7H5v-4M5.5 7.5A8 8 0 1 1 4.6 13"
                  stroke="currentColor"
                  strokeWidth="1.7"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
            <button
              type="button"
              onClick={redo}
              disabled={!canRedo}
              className="flex size-7 items-center justify-center rounded-md text-[#86889e] transition enabled:hover:bg-white/8 enabled:hover:text-[#f0edf9] disabled:opacity-25"
              aria-label="Redo"
              title="Redo · Ctrl+Shift+Z"
            >
              <svg viewBox="0 0 24 24" fill="none" className="size-4" aria-hidden="true">
                <path
                  d="M15 7h4v-4M18.5 7.5A8 8 0 1 0 19.4 13"
                  stroke="currentColor"
                  strokeWidth="1.7"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
            <span
              className="ml-1 size-2 rounded-full bg-[#5b6bd8] ring-4 ring-[#5b6bd8]/15"
              aria-label="Document saved"
            />
          </div>
        </header>
        <PropertiesPanel
          shape={selectedShape}
          onUpdate={updateShape}
          onArrange={arrangeShape}
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
        <kbd className="mr-1 rounded border border-white/10 bg-white/6 px-1.5 py-0.5 font-sans text-[#c9c6da]">
          Ctrl
        </kbd>
        <span className="mr-1">+</span>
        <kbd className="mr-1 rounded border border-white/10 bg-white/6 px-1.5 py-0.5 font-sans text-[#c9c6da]">
          Z
        </kbd>
        undo
        <span className="mx-2 text-white/20">·</span>
        <kbd className="mr-1 rounded border border-white/10 bg-white/6 px-1.5 py-0.5 font-sans text-[#c9c6da]">
          C
        </kbd>
        copy
        <span className="mx-2 text-white/20">·</span>
        hold <kbd className="mx-1 rounded border border-white/10 bg-white/6 px-1.5 py-0.5 font-sans text-[#c9c6da]">Space</kbd> to pan
      </div>
    </div>
  )
}
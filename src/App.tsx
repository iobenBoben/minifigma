import { useState } from 'react'

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
  const { shapes, selectedShapeId, selectedShape, addShape, updateShape, selectShape } = useShapes()

  useHotkeys(setActiveTool)

  return (
    <div className="relative h-dvh min-h-[480px] w-full overflow-hidden bg-[#0b0c10]">
      <Canvas
        shapes={shapes}
        selectedShapeId={selectedShapeId}
        activeTool={activeTool}
        onAddShape={addShape}
        onUpdateShape={updateShape}
        onSelectShape={selectShape}
      />
      <Toolbar activeTool={activeTool} onToolChange={setActiveTool} />

      <aside className="absolute right-4 top-4 z-20 flex h-[calc(100%-2rem)] w-60 flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#14161c]/95 shadow-[0_18px_60px_rgba(0,0,0,0.5)] backdrop-blur">
        <header className="flex items-center justify-between border-b border-white/8 px-4 py-4">
          <div>
            <p className="text-[13px] font-semibold tracking-[-0.01em] text-[#f0edf9]">Untitled</p>
            <p className="mt-0.5 text-[9px] font-semibold uppercase tracking-[0.16em] text-[#6f6d82]">
              Mini Figma
            </p>
          </div>
          <span
            className="size-2 rounded-full bg-[#6c5ce7] ring-4 ring-[#6c5ce7]/15"
            aria-label="Document saved"
          />
        </header>
        <PropertiesPanel selectedShape={selectedShape} />
        <LayersPanel
          shapes={shapes}
          selectedShapeId={selectedShapeId}
          onSelectShape={selectShape}
        />
      </aside>

      <div className="pointer-events-none absolute left-1/2 top-4 z-20 -translate-x-1/2 rounded-xl border border-white/10 bg-[#14161c]/90 px-3 py-2 text-[10px] font-medium text-[#85839a] shadow-lg backdrop-blur">
        <kbd className="mr-1 rounded border border-white/10 bg-white/6 px-1.5 py-0.5 font-sans text-[#c9c6da]">
          R
        </kbd>
        rectangle
        <span className="mx-2 text-white/20">/</span>
        <kbd className="mr-1 rounded border border-white/10 bg-white/6 px-1.5 py-0.5 font-sans text-[#c9c6da]">
          O
        </kbd>
        circle
        <span className="mx-2 text-white/20">/</span>
        hold <kbd className="mx-1 rounded border border-white/10 bg-white/6 px-1.5 py-0.5 font-sans text-[#c9c6da]">Space</kbd> to pan
      </div>
    </div>
  )
}

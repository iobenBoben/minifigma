import type { Shape } from '../types/shape'

interface PropertiesPanelProps {
  selectedShape: Shape | null
}

export function PropertiesPanel({ selectedShape }: PropertiesPanelProps) {
  return (
    <aside className="border-b border-white/8 px-4 py-4">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#807e96]">
          Properties
        </h2>
        <span className="rounded-md border border-white/8 bg-white/5 px-1.5 py-0.5 text-[9px] font-semibold text-[#6f6d82]">
          SOON
        </span>
      </div>

      {selectedShape ? (
        <div className="space-y-2.5 text-[11px] text-[#8b8aa3]">
          <div className="flex justify-between gap-4">
            <span>Name</span>
            <strong className="truncate font-medium text-[#e7e4f5]">{selectedShape.name}</strong>
          </div>
          <div className="flex justify-between">
            <span>Type</span>
            <strong className="font-medium capitalize text-[#e7e4f5]">{selectedShape.type}</strong>
          </div>
          <div className="flex justify-between">
            <span>Size</span>
            <span className="tabular-nums">
              {Math.round(selectedShape.width)} × {Math.round(selectedShape.height)}
            </span>
          </div>
        </div>
      ) : (
        <p className="text-[11px] leading-5 text-[#68667a]">
          Select a layer to inspect its properties.
        </p>
      )}
    </aside>
  )
}

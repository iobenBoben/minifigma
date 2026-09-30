import type { Shape } from '../types/shape'

interface LayersPanelProps {
  shapes: Shape[]
  selectedShapeId: string | null
  onSelectShape: (id: string) => void
}

export function LayersPanel({ shapes, selectedShapeId, onSelectShape }: LayersPanelProps) {
  return (
    <section className="min-h-0 flex-1 px-2 py-4">
      <div className="mb-2 flex items-center justify-between px-2">
        <h2 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#807e96]">
          Layers
        </h2>
        <span className="text-[10px] tabular-nums text-[#5f5d72]">{shapes.length}</span>
      </div>

      {shapes.length === 0 ? (
        <div className="mx-1 rounded-xl border border-dashed border-white/10 bg-white/2 px-3 py-5 text-center">
          <p className="text-[11px] font-medium text-[#85839a]">No layers yet</p>
          <p className="mt-1 text-[10px] leading-4 text-[#5f5d72]">
            Choose a shape tool and drag on the canvas.
          </p>
        </div>
      ) : (
        <ul className="space-y-0.5">
          {shapes.map((shape) => (
            <li key={shape.id}>
              <button
                type="button"
                onClick={() => onSelectShape(shape.id)}
                className={`flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-[11px] transition ${
                  selectedShapeId === shape.id
                    ? 'bg-[#5b6bd8]/18 text-[#c2c8f5]'
                    : 'text-[#8b8aa3] hover:bg-white/6 hover:text-[#e7e4f5]'
                }`}
              >
                <span
                  className={`size-2.5 border ${
                    shape.type === 'ellipse' ? 'rounded-full' : 'rounded-[2px]'
                  }`}
                  style={{ backgroundColor: shape.fill, borderColor: shape.stroke }}
                />
                <span className="truncate">{shape.name}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

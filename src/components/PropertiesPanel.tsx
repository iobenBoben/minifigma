import { FONT_STACKS, FONT_STYLES } from '../constants/tools'
import type { AlignItems, JustifyContent, LayoutMode, Shape, TextAlign } from '../types/shape'

interface PropertiesPanelProps {
  shape: Shape | null
  onUpdate: (id: string, updates: Partial<Shape>) => void
  onDuplicate: (id: string) => void
  onDelete: (id: string) => void
}

const LAYOUT_MODES: LayoutMode[] = ['none', 'horizontal', 'vertical']
const ALIGN_ITEMS: AlignItems[] = ['start', 'center', 'end']
const JUSTIFY: JustifyContent[] = ['start', 'center', 'end', 'space-between']
const TEXT_ALIGNS: TextAlign[] = ['LEFT', 'CENTER', 'RIGHT']

export function PropertiesPanel({ shape, onUpdate, onDuplicate, onDelete }: PropertiesPanelProps) {
  if (!shape) {
    return (
      <aside className="border-b border-white/8 px-4 py-4">
        <h2 className="mb-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#807e96]">
          Properties
        </h2>
        <p className="text-[11px] leading-5 text-[#68667a]">
          Select a layer to inspect its properties.
        </p>
      </aside>
    )
  }

  const set = (updates: Partial<Shape>) => onUpdate(shape.id, updates)
  const setAutoLayout = (updates: Partial<Shape['autoLayout']>) =>
    onUpdate(shape.id, { autoLayout: { ...shape.autoLayout, ...updates } })
  const setText = (updates: Partial<Shape['text']>) =>
    onUpdate(shape.id, { text: { ...shape.text, ...updates } })

  return (
    <aside className="max-h-[62vh] overflow-y-auto border-b border-white/8 px-4 py-4">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#807e96]">
          Properties
        </h2>
        <span className="rounded-md border border-white/8 bg-white/5 px-1.5 py-0.5 text-[9px] font-semibold capitalize text-[#8f8da3]">
          {shape.type}
        </span>
      </div>

      <Field label="Name">
        <input
          value={shape.name}
          onChange={(event) => set({ name: event.target.value })}
          className={inputClass}
        />
      </Field>

      <div className="mt-3 grid grid-cols-2 gap-2">
        <NumberField label="X" value={shape.x} onChange={(value) => set({ x: value })} />
        <NumberField label="Y" value={shape.y} onChange={(value) => set({ y: value })} />
        <NumberField
          label="W"
          value={shape.width}
          min={1}
          onChange={(value) => set({ width: value })}
        />
        <NumberField
          label="H"
          value={shape.height}
          min={1}
          onChange={(value) => set({ height: value })}
        />
      </div>

      <Field label="Opacity">
        <div className="flex items-center gap-2">
          <input
            type="range"
            min={0}
            max={100}
            value={shape.opacity}
            onChange={(event) => set({ opacity: Number(event.target.value) })}
            className="h-1 flex-1 accent-[#5b6bd8]"
          />
          <span className="w-9 text-right text-[11px] tabular-nums text-[#8b8aa3]">
            {shape.opacity}%
          </span>
        </div>
      </Field>

      <Field label={shape.type === 'text' ? 'Text color' : 'Fill'}>
        <div className="flex items-center gap-2">
          <input
            type="color"
            value={shape.type === 'frame' || shape.fill === 'transparent' ? '#0a0c11' : shape.fill}
            onChange={(event) => set({ fill: event.target.value })}
            className="size-7 cursor-pointer rounded border border-white/10 bg-transparent"
            aria-label="Fill color"
          />
          {shape.type === 'vector' ? (
            <button
              type="button"
              onClick={() => set({ fill: shape.fill === 'transparent' ? '#4a5bc4' : 'transparent' })}
              className="rounded-md border border-white/10 px-2 py-1 text-[10px] font-medium text-[#9a98ad] transition hover:bg-white/6"
            >
              {shape.fill === 'transparent' ? 'Fill: off' : 'Fill: on'}
            </button>
          ) : (
            <span className="text-[11px] uppercase text-[#8b8aa3]">{shape.fill}</span>
          )}
        </div>
      </Field>

      {shape.type === 'vector' ? (
        <>
          <Field label="Stroke">
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={shape.stroke}
                onChange={(event) => set({ stroke: event.target.value })}
                className="size-7 cursor-pointer rounded border border-white/10 bg-transparent"
                aria-label="Stroke color"
              />
              <span className="text-[11px] uppercase text-[#8b8aa3]">{shape.stroke}</span>
            </div>
          </Field>
          <NumberField
            label="Stroke width"
            value={shape.strokeWidth}
            min={1}
            onChange={(value) => set({ strokeWidth: value })}
          />
          <button
            type="button"
            onClick={() => set({ vector: { ...shape.vector, closed: !shape.vector.closed } })}
            className="mt-3 w-full rounded-lg border border-white/10 px-2 py-1.5 text-[11px] font-medium text-[#b9b4d1] transition hover:bg-white/6"
          >
            {shape.vector.closed ? 'Open path' : 'Close path'} · {shape.vector.vertices.length} points
          </button>
        </>
      ) : null}

      {shape.type === 'rectangle' ? (
        <NumberField
          label="Radius"
          value={shape.radius}
          min={0}
          onChange={(value) => set({ radius: value })}
        />
      ) : null}

      {shape.type === 'frame' ? (
        <div className="mt-4 space-y-2 rounded-lg border border-white/8 bg-white/3 p-2.5">
          <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#807e96]">
            Auto layout
          </p>

          <SelectField
            label="Mode"
            value={shape.autoLayout.mode}
            options={LAYOUT_MODES}
            onChange={(value) => setAutoLayout({ mode: value as LayoutMode })}
          />
          <NumberField
            label="Gap"
            value={shape.autoLayout.gap}
            min={0}
            onChange={(value) => setAutoLayout({ gap: value })}
          />

          {shape.autoLayout.mode !== 'none' ? (
            <>
              <div className="grid grid-cols-2 gap-2">
                <NumberField
                  label="Pad X"
                  value={shape.autoLayout.paddingLeft}
                  min={0}
                  onChange={(value) =>
                    setAutoLayout({ paddingLeft: value, paddingRight: value })
                  }
                />
                <NumberField
                  label="Pad Y"
                  value={shape.autoLayout.paddingTop}
                  min={0}
                  onChange={(value) =>
                    setAutoLayout({ paddingTop: value, paddingBottom: value })
                  }
                />
              </div>
              <SelectField
                label="Align"
                value={shape.autoLayout.alignItems}
                options={ALIGN_ITEMS}
                onChange={(value) => setAutoLayout({ alignItems: value as AlignItems })}
              />
              <SelectField
                label="Justify"
                value={shape.autoLayout.justifyContent}
                options={JUSTIFY}
                onChange={(value) => setAutoLayout({ justifyContent: value as JustifyContent })}
              />
            </>
          ) : null}
        </div>
      ) : null}

      {shape.type === 'text' ? (
        <div className="mt-4 space-y-2 rounded-lg border border-white/8 bg-white/3 p-2.5">
          <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#807e96]">
            Typography
          </p>
          <textarea
            value={shape.text.content}
            onChange={(event) => setText({ content: event.target.value })}
            rows={3}
            className={`${inputClass} resize-y`}
            aria-label="Text content"
          />
          <SelectField
            label="Font"
            value={shape.text.fontFamily}
            options={FONT_STACKS as unknown as string[]}
            onChange={(value) => setText({ fontFamily: value })}
          />
          <SelectField
            label="Weight"
            value={shape.text.fontStyle}
            options={FONT_STYLES as unknown as string[]}
            onChange={(value) => setText({ fontStyle: value })}
          />
          <div className="grid grid-cols-2 gap-2">
            <NumberField
              label="Size"
              value={shape.text.fontSize}
              min={1}
              onChange={(value) => setText({ fontSize: value })}
            />
            <NumberField
              label="Line"
              value={shape.text.lineHeight}
              min={1}
              onChange={(value) => setText({ lineHeight: value })}
            />
          </div>
          <NumberField
            label="Spacing"
            value={shape.text.letterSpacing}
            onChange={(value) => setText({ letterSpacing: value })}
          />
          <SelectField
            label="Align"
            value={shape.text.textAlign}
            options={TEXT_ALIGNS}
            onChange={(value) => setText({ textAlign: value as TextAlign })}
          />
        </div>
      ) : null}

      <div className="mt-4 flex gap-2">
        <button
          type="button"
          onClick={() => onDuplicate(shape.id)}
          className="flex-1 rounded-lg border border-white/10 px-2 py-1.5 text-[11px] font-medium text-[#b9b4d1] transition hover:bg-white/6"
        >
          Duplicate
        </button>
        <button
          type="button"
          onClick={() => onDelete(shape.id)}
          className="flex-1 rounded-lg border border-[#c2556b]/30 px-2 py-1.5 text-[11px] font-medium text-[#e08a9c] transition hover:bg-[#c2556b]/12"
        >
          Delete
        </button>
      </div>
    </aside>
  )
}

const inputClass =
  'w-full rounded-md border border-white/10 bg-[#101219] px-2 py-1.5 text-[11px] text-[#e7e4f5] outline-none focus:border-[#5b6bd8]'

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="mt-3 block">
      <span className="mb-1 block text-[10px] font-medium text-[#6f6d82]">{label}</span>
      {children}
    </label>
  )
}

interface NumberFieldProps {
  label: string
  value: number
  onChange: (value: number) => void
  min?: number
}

function NumberField({ label, value, onChange, min }: NumberFieldProps) {
  return (
    <label className="block">
      <span className="mb-1 block text-[10px] font-medium text-[#6f6d82]">{label}</span>
      <input
        type="number"
        value={Math.round(value)}
        min={min}
        onChange={(event) => {
          const parsed = Number(event.target.value)
          if (!Number.isNaN(parsed)) onChange(min !== undefined ? Math.max(parsed, min) : parsed)
        }}
        className={inputClass}
      />
    </label>
  )
}

interface SelectFieldProps {
  label: string
  value: string
  options: string[]
  onChange: (value: string) => void
}

function SelectField({ label, value, options, onChange }: SelectFieldProps) {
  return (
    <label className="block">
      <span className="mb-1 block text-[10px] font-medium text-[#6f6d82]">{label}</span>
      <select value={value} onChange={(event) => onChange(event.target.value)} className={inputClass}>
        {options.map((option) => (
          <option key={option} value={option} className="bg-[#101219]">
            {option}
          </option>
        ))}
      </select>
    </label>
  )
}
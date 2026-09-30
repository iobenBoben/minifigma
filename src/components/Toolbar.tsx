import { TOOLS } from '../constants/tools'
import type { Tool } from '../types/shape'

interface ToolbarProps {
  activeTool: Tool
  onToolChange: (tool: Tool) => void
}

const TOOL_ICON_PATHS: Record<Tool, string> = {
  select: 'M5 3.75 18.5 9l-5.9 1.9-1.9 5.9L5 3.75Z',
  rectangle: 'M4.5 5.25h15v13.5h-15z',
  ellipse: 'M20 12c0 3.59-3.58 6.5-8 6.5S4 15.59 4 12s3.58-6.5 8-6.5 8 2.91 8 6.5Z',
}

export function Toolbar({ activeTool, onToolChange }: ToolbarProps) {
  return (
    <aside className="absolute left-4 top-1/2 z-20 -translate-y-1/2 rounded-2xl border border-white/10 bg-[#151720]/95 p-1.5 shadow-[0_16px_50px_rgba(0,0,0,0.45)] backdrop-blur">
      <nav aria-label="Tools" className="flex flex-col gap-1">
        {TOOLS.map((tool) => {
          const Icon = ({ className }: { className?: string }) => (
            <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
              <path
                d={TOOL_ICON_PATHS[tool.id]}
                stroke="currentColor"
                strokeWidth="1.7"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          )

          return (
            <button
              key={tool.id}
              type="button"
              onClick={() => onToolChange(tool.id)}
              className={`group relative flex size-10 items-center justify-center rounded-xl transition ${
                activeTool === tool.id
                  ? 'bg-[#5b6bd8] text-white shadow-[0_8px_24px_rgba(91,107,216,0.32)]'
                  : 'text-[#86889e] hover:bg-white/7 hover:text-[#f2f4fb]'
              }`}
              aria-label={`${tool.label} (${tool.shortcut})`}
              aria-pressed={activeTool === tool.id}
            >
              <Icon className="size-[18px]" />
              <span className="pointer-events-none absolute left-12 hidden whitespace-nowrap rounded-lg border border-white/10 bg-[#1b1d27] px-2.5 py-1.5 text-[10px] font-medium text-[#d9d6ea] shadow-xl group-hover:block">
                {tool.label} · {tool.shortcut}
              </span>
            </button>
          )
        })}
      </nav>
    </aside>
  )
}

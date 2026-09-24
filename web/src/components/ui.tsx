import { useState, type ReactNode } from 'react'
import { ChevronDown } from 'lucide-react'

export function Toggle({ checked, onChange, label, hint, color }: { checked: boolean; onChange: (v: boolean) => void; label: ReactNode; hint?: string; color?: string }) {
  return (
    <label className="flex items-center gap-3 py-1.5 cursor-pointer select-none group">
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative h-5 w-9 shrink-0 rounded-full transition-colors ${checked ? 'bg-forest-600' : 'bg-sand-300'}`}
      >
        <span className={`absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${checked ? 'translate-x-4' : ''}`} />
      </button>
      {color && <span className="h-3 w-3 rounded-sm shrink-0" style={{ background: color }} />}
      <span className="flex-1 min-w-0">
        <span className="block text-[13px] font-medium text-ink-900 group-hover:text-forest-800">{label}</span>
        {hint && <span className="block text-[11px] text-ink-400 leading-tight">{hint}</span>}
      </span>
    </label>
  )
}

export function SectionTitle({ children, right }: { children: ReactNode; right?: ReactNode }) {
  return (
    <div className="flex items-center justify-between mt-5 mb-2 first:mt-0">
      <h3 className="text-[11px] font-bold uppercase tracking-[0.12em] text-ink-400">{children}</h3>
      {right}
    </div>
  )
}

export function Chip({ active, onClick, children, count, color }: { active: boolean; onClick: () => void; children: ReactNode; count?: number; color?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[12px] font-medium transition-colors ${active ? 'bg-forest-900 text-white border-forest-900' : 'bg-white text-ink-600 border-sand-300 hover:border-forest-500 hover:text-forest-800'}`}
    >
      {color && <span className="h-2 w-2 rounded-full" style={{ background: color }} />}
      <span className="truncate max-w-[180px]">{children}</span>
      {count != null && <span className={`text-[10.5px] tabular-nums ${active ? 'text-white/70' : 'text-ink-400'}`}>{count}</span>}
    </button>
  )
}

export function Accordion({ title, subtitle, children, defaultOpen = false, badge, color }: { title: ReactNode; subtitle?: ReactNode; children: ReactNode; defaultOpen?: boolean; badge?: ReactNode; color?: string }) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="border-b border-sand-200 last:border-b-0">
      <button type="button" onClick={() => setOpen((o) => !o)} className="flex w-full items-center gap-2.5 py-2.5 text-left hover:bg-sand-100/70 -mx-1 px-1 rounded-md">
        {color && <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ background: color }} />}
        <span className="flex-1 min-w-0">
          <span className="block text-[13px] font-semibold text-ink-900 leading-snug">{title}</span>
          {subtitle && <span className="block text-[11px] text-ink-400 mt-0.5">{subtitle}</span>}
        </span>
        {badge}
        <ChevronDown size={15} className={`text-ink-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && <div className="pb-3 pl-1 animate-fade-up">{children}</div>}
    </div>
  )
}

export function IconButton({ onClick, title, children, active }: { onClick: () => void; title: string; children: ReactNode; active?: boolean }) {
  return (
    <button type="button" onClick={onClick} title={title} aria-label={title}
      className={`inline-flex h-9 w-9 items-center justify-center rounded-lg border transition-colors ${active ? 'bg-forest-900 text-white border-forest-900' : 'bg-white/90 text-ink-600 border-sand-300 hover:bg-white hover:text-forest-800'}`}>
      {children}
    </button>
  )
}

export function Spinner() {
  return <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-forest-600 border-t-transparent" />
}

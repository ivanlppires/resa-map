import { useEffect, useMemo, useRef, useState } from 'react'
import { Search, MapPin, Landmark, Home } from 'lucide-react'
import type { PlacedSettlement, PlacedSurvey } from '../lib/types'
import { normalize, featureCenter, type FeatureCollection } from '../lib/geo'

export interface SearchHit { kind: 'settlement' | 'municipality' | 'survey'; label: string; sub: string; lng: number; lat: number; zoom: number; id?: number }

interface Props {
  settlements: PlacedSettlement[]
  surveys: PlacedSurvey[]
  municipios: FeatureCollection | null
  onPick: (hit: SearchHit) => void
}

export default function SearchBox({ settlements, surveys, municipios, onPick }: Props) {
  const [q, setQ] = useState('')
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const onDoc = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [])
  const munIndex = useMemo(() => {
    if (!municipios) return []
    return municipios.features.map((f) => ({ name: String(f.properties.name ?? ''), center: featureCenter(f) })).filter((m) => m.center)
  }, [municipios])
  const hits = useMemo<SearchHit[]>(() => {
    const t = normalize(q)
    if (t.length < 2) return []
    const out: SearchHit[] = []
    for (const s of settlements) if (normalize(s.name).includes(t)) out.push({ kind: 'settlement', label: s.name, sub: `${s.municipality} · ${s.count} entrevistas`, lng: s.lng, lat: s.lat, zoom: 13.5, id: s.id })
    for (const s of surveys) if (s.lotNumber && (normalize(`lote ${s.lotNumber}`).includes(t) || normalize(`#${s.id}`) === t)) out.push({ kind: 'survey', label: `Lote ${s.lotNumber} · #${s.id}`, sub: s.settlementName, lng: s.lng, lat: s.lat, zoom: 16, id: s.id })
    for (const m of munIndex) if (normalize(m.name).includes(t)) out.push({ kind: 'municipality', label: m.name, sub: 'Município de MT', lng: m.center![0], lat: m.center![1], zoom: 9.5 })
    return out.slice(0, 8)
  }, [q, settlements, surveys, munIndex])
  const icon = (k: SearchHit['kind']) => k === 'settlement' ? <Home size={14} /> : k === 'survey' ? <MapPin size={14} /> : <Landmark size={14} />
  return (
    <div ref={ref} className="relative w-full sm:w-80">
      <Search size={15} className="absolute left-3 top-2.5 text-ink-400" />
      <input value={q} onChange={(e) => { setQ(e.target.value); setOpen(true) }} onFocus={() => setOpen(true)} placeholder="Buscar assentamento, município ou lote…"
        className="w-full rounded-lg border border-sand-300 bg-white/95 pl-9 pr-3 py-2 text-[13px] text-ink-900 placeholder:text-ink-400 shadow-sm focus:outline-none focus:ring-2 focus:ring-forest-500" />
      {open && hits.length > 0 && (
        <ul className="absolute left-0 right-0 mt-1 rounded-xl border border-sand-200 bg-white p-1 shadow-2xl z-30">
          {hits.map((h, i) => (
            <li key={i}>
              <button type="button" onClick={() => { onPick(h); setOpen(false); setQ('') }} className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left hover:bg-sand-100">
                <span className="text-forest-700">{icon(h.kind)}</span>
                <span className="min-w-0">
                  <span className="block truncate text-[13px] font-semibold text-ink-900">{h.label}</span>
                  <span className="block text-[11px] text-ink-400">{h.sub}</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router'
import { Layers, SlidersHorizontal, BarChart3, Info, PanelLeftClose, PanelLeftOpen, LogOut, RefreshCw } from 'lucide-react'
import MapView, { defaultLayers, type BasemapId, type Focus, type LayerVisibility } from '../components/MapView'
import LayerPanel from '../components/LayerPanel'
import FilterPanel from '../components/FilterPanel'
import DashboardPanel from '../components/DashboardPanel'
import DetailDrawer from '../components/DetailDrawer'
import Legend from '../components/Legend'
import ExportMenu from '../components/ExportMenu'
import AccessGate from '../components/AccessGate'
import SearchBox, { type SearchHit } from '../components/SearchBox'
import AboutModal from '../components/AboutModal'
import { Spinner } from '../components/ui'
import { api, ApiError } from '../lib/api'
import type { Dataset, PlacedSurvey } from '../lib/types'
import { placeSettlements, placeSurveys, type FeatureCollection } from '../lib/geo'
import { applyFilters, describeFilters, emptyFilters, activeFilterCount, type Filters } from '../lib/filters'
import { colorScheme, type SymbolVar } from '../lib/colors'
import { primaryValue, labelFor } from '../lib/stats'

type Tab = 'layers' | 'filters' | 'dashboard'

const TABS: { key: Tab; label: string; icon: React.ReactNode }[] = [
  { key: 'layers', label: 'Camadas', icon: <Layers size={16} /> },
  { key: 'filters', label: 'Filtros', icon: <SlidersHorizontal size={16} /> },
  { key: 'dashboard', label: 'Painel', icon: <BarChart3 size={16} /> },
]

export default function MapPage() {
  const [session, setSession] = useState<'checking' | 'denied' | 'ok'>('checking')
  const [data, setData] = useState<Dataset | null>(null)
  const [municipios, setMunicipios] = useState<FeatureCollection | null>(null)
  const [error, setError] = useState('')
  const [tab, setTab] = useState<Tab>('layers')
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [basemap, setBasemap] = useState<BasemapId>('satellite')
  const [layers, setLayers] = useState<LayerVisibility>(defaultLayers)
  const [variable, setVariable] = useState<SymbolVar>('none')
  const [filters, setFilters] = useState<Filters>(emptyFilters)
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [focus, setFocus] = useState<Focus | null>(null)
  const [cursor, setCursor] = useState<{ lng: number; lat: number; zoom: number } | null>(null)
  const [about, setAbout] = useState(false)

  const load = useCallback(async () => {
    try {
      const d = await api.data()
      setData(d)
      setSession('ok')
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) setSession('denied')
      else setError(err instanceof Error ? err.message : 'Erro ao carregar dados')
    }
  }, [])

  useEffect(() => { load() }, [load])
  useEffect(() => {
    fetch('/geo/mt_municipios.geojson').then((r) => r.json()).then(setMunicipios).catch(() => setMunicipios(null))
  }, [])

  const settlements = useMemo(() => (data ? placeSettlements(data.settlements, data.surveys, municipios) : []), [data, municipios])
  const allSurveys = useMemo(() => (data ? placeSurveys(data.surveys, settlements) : []), [data, settlements])
  const filtered = useMemo(() => applyFilters(allSurveys, filters), [allSurveys, filters])
  const questions = data?.questions ?? []
  const colorEntries = useMemo(() => colorScheme(variable, questions, data?.settlements ?? []), [variable, questions, data])
  const question = questions.find((q) => q.key === variable)
  const symbolOf = useCallback((s: PlacedSurvey) => {
    if (variable === 'none') return { value: '*', label: 'Entrevista' }
    if (variable === 'settlement') return { value: String(s.settlementId), label: s.settlementName }
    if (variable === 'biome') return { value: s.biome, label: s.biome }
    if (variable === 'gps') return s.approx ? { value: 'approx', label: 'Posição aproximada' } : { value: 'gps', label: 'Com GPS' }
    const v = primaryValue(s, variable)
    return { value: v, label: v == null ? 'Sem resposta' : labelFor(question, s.answers[variable]) }
  }, [variable, question])
  const legendCounts = useMemo(() => {
    const m = new Map<string, number>()
    for (const s of filtered) { const v = symbolOf(s).value; if (v != null) m.set(v, (m.get(v) ?? 0) + 1) }
    return m
  }, [filtered, symbolOf])
  const selected = selectedId != null ? allSurveys.find((s) => s.id === selectedId) ?? null : null
  const filterSummary = data ? describeFilters(filters, questions, data.settlements) : ''
  const nActive = activeFilterCount(filters)

  const focusSettlement = (id: number) => {
    const s = settlements.find((x) => x.id === id)
    if (!s) return
    const d = Math.max(0.015, s.radiusKm / 70)
    setFocus({ kind: 'bounds', bounds: [[s.lng - d, s.lat - d], [s.lng + d, s.lat + d]], nonce: Date.now() })
  }
  const onPick = (h: SearchHit) => {
    if (h.kind === 'settlement' && h.id != null) return focusSettlement(h.id)
    if (h.kind === 'survey' && h.id != null) setSelectedId(h.id)
    setFocus({ kind: 'point', lng: h.lng, lat: h.lat, zoom: h.zoom, nonce: Date.now() })
  }
  const fitAll = () => {
    if (filtered.length === 0 && settlements.length === 0) return
    const pts = filtered.length > 0 ? filtered : settlements
    const lngs = pts.map((p) => p.lng), lats = pts.map((p) => p.lat)
    const pad = filtered.length > 0 ? 0.02 : 0.5
    setFocus({ kind: 'bounds', bounds: [[Math.min(...lngs) - pad, Math.min(...lats) - pad], [Math.max(...lngs) + pad, Math.max(...lats) + pad]], nonce: Date.now() })
  }

  if (session === 'denied') return <AccessGate onGranted={() => { setSession('checking'); load() }} />
  if (session === 'checking' || !data) {
    return (
      <div className="min-h-full flex flex-col items-center justify-center bg-forest-950 text-white gap-3">
        {error ? <p className="text-red-300">{error}</p> : <><Spinner /><p className="text-[13px] text-white/70">Carregando dados do RESA Survey…</p></>}
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col bg-sand-100 overflow-hidden">
      {/* Barra superior */}
      <header className="h-14 shrink-0 flex items-center gap-3 px-3 sm:px-4 bg-forest-950 text-white border-b border-white/10 z-30">
        <Link to="/" className="flex items-center gap-2.5 shrink-0" title="Página inicial">
          <span className="inline-flex items-center rounded-md bg-white px-1.5 py-0.5"><img src="/logo-resa.png" alt="RESA" className="h-7 object-contain" /></span>
          <span className="hidden md:block text-[13px] font-semibold tracking-tight text-white/90">Plataforma Territorial <span className="ml-1 rounded bg-cerrado/90 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white">MVP</span></span>
        </Link>
        <div className="flex-1 flex justify-center px-2">
          <SearchBox settlements={settlements} surveys={allSurveys} municipios={municipios} onPick={onPick} />
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <button type="button" onClick={fitAll} title="Enquadrar recorte" className="hidden sm:inline-flex h-9 w-9 items-center justify-center rounded-lg text-white/80 hover:bg-white/10 hover:text-white"><RefreshCw size={16} /></button>
          <button type="button" onClick={() => setAbout(true)} title="Sobre" className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-white/80 hover:bg-white/10 hover:text-white"><Info size={17} /></button>
          <ExportMenu ids={filtered.map((s) => s.id)} filterSummary={filterSummary} total={allSurveys.length} />
          <button type="button" onClick={async () => { await api.logout(); setSession('denied') }} title="Sair" className="hidden sm:inline-flex h-9 w-9 items-center justify-center rounded-lg text-white/60 hover:bg-white/10 hover:text-white"><LogOut size={16} /></button>
        </div>
      </header>

      <div className="flex-1 relative flex min-h-0">
        {/* Sidebar */}
        <aside className={`relative z-20 flex flex-col bg-white border-r border-sand-200 transition-[width] duration-300 ${sidebarOpen ? 'w-[380px] max-w-[92vw]' : 'w-0'} shrink-0 overflow-hidden`}>
          <nav className="flex border-b border-sand-200 px-2 pt-2 gap-1">
            {TABS.map((t) => (
              <button key={t.key} type="button" onClick={() => setTab(t.key)}
                className={`flex-1 inline-flex items-center justify-center gap-1.5 rounded-t-lg px-2 py-2 text-[12.5px] font-semibold border-b-2 -mb-px transition-colors ${tab === t.key ? 'border-forest-600 text-forest-800 bg-forest-50' : 'border-transparent text-ink-400 hover:text-ink-900'}`}>
                {t.icon} {t.label}
                {t.key === 'filters' && nActive > 0 && <span className="rounded-full bg-forest-900 px-1.5 text-[10px] font-bold text-white">{nActive}</span>}
              </button>
            ))}
          </nav>
          <div className="flex-1 overflow-y-auto scrollbar-thin pt-4 w-[380px] max-w-[92vw]">
            {tab === 'layers' && (
              <LayerPanel basemap={basemap} onBasemap={setBasemap} layers={layers} onLayers={setLayers} variable={variable} onVariable={setVariable}
                questions={questions} settlements={data.settlements} counts={{ surveys: filtered.length, withGps: filtered.filter((s) => !s.approx).length }} />
            )}
            {tab === 'filters' && (
              <FilterPanel all={allSurveys} filtered={filtered} filters={filters} onFilters={setFilters} questions={questions} settlements={data.settlements} onFocusSettlement={focusSettlement} />
            )}
            {tab === 'dashboard' && (
              <DashboardPanel surveys={filtered} all={allSurveys} questions={questions} settlements={data.settlements} variable={variable} onVariable={setVariable} />
            )}
          </div>
          <footer className="border-t border-sand-200 px-4 py-2 text-[10.5px] text-ink-400 flex items-center justify-between">
            <span>UNEMAT · LAEGC · RESA</span>
            <span>{nActive > 0 ? `${filtered.length} de ${allSurveys.length}` : `${allSurveys.length} entrevistas`}</span>
          </footer>
        </aside>

        {/* Mapa */}
        <main className="relative flex-1 min-w-0">
          <MapView surveys={filtered} settlements={settlements} colorEntries={colorEntries} symbolOf={symbolOf} basemap={basemap} layers={layers}
            selectedId={selectedId} onSelect={setSelectedId} focus={focus} onCursor={setCursor} />

          <button type="button" onClick={() => setSidebarOpen((o) => !o)} title={sidebarOpen ? 'Recolher painel' : 'Abrir painel'}
            className="absolute left-3 top-3 z-10 inline-flex h-9 w-9 items-center justify-center rounded-lg bg-white/95 text-ink-600 shadow-lg hover:text-forest-800">
            {sidebarOpen ? <PanelLeftClose size={17} /> : <PanelLeftOpen size={17} />}
          </button>

          {nActive > 0 && (
            <div className="absolute left-14 top-3 z-10 max-w-[60%] rounded-lg bg-white/95 px-3 py-1.5 text-[11.5px] text-ink-600 shadow-lg truncate">
              <span className="font-semibold text-ink-900">{filtered.length} entrevistas</span> · {filterSummary}
            </div>
          )}

          <div className="pointer-events-none absolute right-3 top-3 z-10 flex flex-col items-end gap-2">
            <Legend entries={colorEntries} variable={variable} question={question} layers={layers} counts={legendCounts} />
          </div>

          <div className="pointer-events-none absolute left-1/2 -translate-x-1/2 bottom-2 z-10 hidden sm:block rounded-md bg-black/55 px-2.5 py-1 text-[10.5px] tabular-nums text-white/90">
            {cursor ? `${cursor.lat.toFixed(5)}, ${cursor.lng.toFixed(5)} · zoom ${cursor.zoom.toFixed(1)}` : 'WGS 84 · EPSG:4326'}
          </div>

          {selected && (
            <DetailDrawer survey={selected} questions={questions} onClose={() => setSelectedId(null)}
              onZoom={() => setFocus({ kind: 'point', lng: selected.lng, lat: selected.lat, zoom: 16.5, nonce: Date.now() })} />
          )}
        </main>
      </div>
      {about && <AboutModal onClose={() => setAbout(false)} generatedAt={data.generatedAt} />}
    </div>
  )
}

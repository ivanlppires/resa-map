import type { Question, Settlement } from '../lib/types'
import { SECTION_LABELS, SECTION_ORDER, BIOME_COLORS } from '../lib/types'
import { BASEMAPS, type BasemapId, type LayerVisibility } from './MapView'
import { SectionTitle, Toggle } from './ui'
import type { SymbolVar } from '../lib/colors'

interface Props {
  basemap: BasemapId
  onBasemap: (b: BasemapId) => void
  layers: LayerVisibility
  onLayers: (l: LayerVisibility) => void
  variable: SymbolVar
  onVariable: (v: SymbolVar) => void
  questions: Question[]
  settlements: Settlement[]
  counts: { surveys: number; withGps: number }
}

const BASEMAP_PREVIEW: Record<BasemapId, string> = {
  satellite: 'linear-gradient(135deg,#2f4a2a,#556b3a 60%,#7a8a55)',
  streets: 'linear-gradient(135deg,#f2efe9,#dfe7d5 60%,#c9d8f0)',
  topo: 'linear-gradient(135deg,#e8e0c8,#cfd8a8 60%,#b6c9a4)',
  light: 'linear-gradient(135deg,#fafafa,#e9ecef)',
  dark: 'linear-gradient(135deg,#1c1c1e,#3a3a3c)',
}

export default function LayerPanel({ basemap, onBasemap, layers, onLayers, variable, onVariable, questions, settlements, counts }: Props) {
  const set = (patch: Partial<LayerVisibility>) => onLayers({ ...layers, ...patch })
  return (
    <div className="px-4 pb-6">
      <SectionTitle>Mapa base</SectionTitle>
      <div className="grid grid-cols-5 gap-1.5">
        {(Object.keys(BASEMAPS) as BasemapId[]).map((id) => (
          <button key={id} type="button" onClick={() => onBasemap(id)} title={BASEMAPS[id].label}
            className={`group flex flex-col items-center gap-1 rounded-lg p-1 transition ${basemap === id ? 'bg-forest-100 ring-2 ring-forest-500' : 'hover:bg-sand-100'}`}>
            <span className="h-9 w-full rounded-md border border-black/10" style={{ background: BASEMAP_PREVIEW[id] }} />
            <span className="text-[10px] font-medium text-ink-600">{BASEMAPS[id].label}</span>
          </button>
        ))}
      </div>

      <SectionTitle>Colorir entrevistas por</SectionTitle>
      <select value={variable} onChange={(e) => onVariable(e.target.value)}
        className="w-full rounded-lg border border-sand-300 bg-white px-3 py-2 text-[13px] focus:outline-none focus:ring-2 focus:ring-forest-500">
        <option value="none">Cor única</option>
        <option value="settlement">Assentamento</option>
        <option value="biome">Bioma</option>
        <option value="gps">Qualidade da localização (GPS)</option>
        {SECTION_ORDER.map((sec) => (
          <optgroup key={sec} label={SECTION_LABELS[sec]}>
            {questions.filter((q) => q.section === sec && q.type !== 'text').map((q) => (
              <option key={q.key} value={q.key}>{q.number}. {q.text.length > 70 ? q.text.slice(0, 68) + '…' : q.text}</option>
            ))}
          </optgroup>
        ))}
      </select>
      <p className="mt-1.5 text-[11px] text-ink-400 leading-snug">Nas perguntas de múltipla escolha, a cor usa a primeira opção assinalada.</p>

      <SectionTitle>Pesquisa RESA</SectionTitle>
      <Toggle checked={layers.points} onChange={(v) => set({ points: v })} label="Entrevistas" hint={`${counts.surveys} no recorte · ${counts.withGps} com GPS`} color="#1D8F47" />
      <div className="pl-12">
        <Toggle checked={layers.clusters} onChange={(v) => set({ clusters: v })} label="Agrupar pontos próximos" />
        <Toggle checked={layers.lotLabels} onChange={(v) => set({ lotLabels: v })} label="Rótulo do lote" hint="visível a partir do zoom 13" />
      </div>
      <Toggle checked={layers.heat} onChange={(v) => set({ heat: v })} label="Mapa de calor" hint="densidade de entrevistas" color="#F97316" />
      <Toggle checked={layers.settlements} onChange={(v) => set({ settlements: v })} label="Assentamentos (PA)" hint={`${settlements.length} cadastrados · área de referência`} color="#D4870A" />
      <div className="pl-12">
        <Toggle checked={layers.settlementLabels} onChange={(v) => set({ settlementLabels: v })} label="Nome do assentamento" />
      </div>

      <SectionTitle>Contexto territorial</SectionTitle>
      <Toggle checked={layers.biomes} onChange={(v) => set({ biomes: v })} label="Biomas (IBGE 2019)" hint="Amazônia · Cerrado · Pantanal" color={BIOME_COLORS['Cerrado']} />
      <Toggle checked={layers.surveyedMun} onChange={(v) => set({ surveyedMun: v })} label="Municípios pesquisados" hint="destaque dos municípios com assentamentos no estudo" color="#22A352" />
      <Toggle checked={layers.municipalities} onChange={(v) => set({ municipalities: v })} label="Limites municipais (IBGE)" hint="141 municípios de MT" color="#9CA3AF" />
      <div className="pl-12">
        <Toggle checked={layers.munLabels} onChange={(v) => set({ munLabels: v })} label="Nome dos municípios" />
      </div>
      <Toggle checked={layers.state} onChange={(v) => set({ state: v })} label="Limite de Mato Grosso" color="#F5B301" />

      <p className="mt-5 text-[11px] text-ink-400 leading-snug">Fontes: malhas territoriais IBGE (estado, municípios, biomas); entrevistas do RESA Survey sincronizadas em campo. Polígonos oficiais dos assentamentos (INCRA) serão integrados na próxima etapa.</p>
    </div>
  )
}

import { useMemo } from 'react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, Legend as RLegend } from 'recharts'
import type { PlacedSurvey, Question, Settlement } from '../lib/types'
import { SECTION_LABELS, SECTION_ORDER, SECTION_COLORS } from '../lib/types'
import { distribution, crossTab, scaleMean, answeredCount } from '../lib/stats'
import { colorScheme, CATEGORICAL, type SymbolVar } from '../lib/colors'
import { SectionTitle } from './ui'

interface Props {
  surveys: PlacedSurvey[]
  all: PlacedSurvey[]
  questions: Question[]
  settlements: Settlement[]
  variable: SymbolVar
  onVariable: (v: SymbolVar) => void
}

const KEY_INDICATORS = ['q05_renda_bruta', 'q01_idade', 'q08_atividades_economicas', 'q02_escolaridade', 'q52_irrigacao', 'q55_agrotoxicos', 'q61_eventos_climaticos', 'q22_continuar_rural', 'q20_financiamento_rural', 'q68_percepcao_clima']

function Kpi({ label, value, hint }: { label: string; value: string | number; hint?: string }) {
  return (
    <div className="rounded-xl bg-forest-50 border border-forest-100 px-3 py-2.5">
      <div className="text-[20px] font-bold text-forest-900 leading-none">{value}</div>
      <div className="mt-1 text-[10.5px] font-bold uppercase tracking-wider text-forest-700">{label}</div>
      {hint && <div className="text-[10.5px] text-ink-400 mt-0.5">{hint}</div>}
    </div>
  )
}

function shortLabel(s: string, n = 26): string {
  return s.length > n ? s.slice(0, n - 1) + '…' : s
}

function DistChart({ q, surveys, color, questions, settlements }: { q: Question; surveys: PlacedSurvey[]; color: string; questions: Question[]; settlements: Settlement[] }) {
  const dist = distribution(q, surveys).filter((d) => d.count > 0 || q.type === 'scale' || (q.options?.length ?? 0) <= 6)
  const scheme = colorScheme(q.key, questions, settlements)
  const colorOf = new Map(scheme.map((e) => [e.value, e.color]))
  const answered = answeredCount(q, surveys)
  const height = Math.max(90, dist.length * 26 + 10)
  return (
    <div>
      <div className="flex items-baseline justify-between">
        <p className="text-[12.5px] font-semibold text-ink-900 leading-snug pr-2">{q.number}. {q.text}</p>
      </div>
      <p className="text-[10.5px] text-ink-400 mb-1">{answered} respostas{q.type === 'multiple_choice' ? ' · múltipla escolha' : ''}{q.type === 'scale' && scaleMean(q, surveys) != null ? ` · média ${scaleMean(q, surveys)!.toFixed(2)}` : ''}</p>
      <ResponsiveContainer width="100%" height={height}>
        <BarChart data={dist} layout="vertical" margin={{ top: 0, right: 34, bottom: 0, left: 0 }} barCategoryGap={4}>
          <XAxis type="number" hide domain={[0, 'dataMax']} allowDecimals={false} />
          <YAxis type="category" dataKey="label" width={130} tick={{ fontSize: 10.5, fill: '#55555C' }} tickFormatter={(v: string) => shortLabel(v)} axisLine={false} tickLine={false} interval={0} />
          <Tooltip cursor={{ fill: 'rgba(0,0,0,0.04)' }} formatter={(v: number, _n, item) => [`${v} (${(item.payload as { pct: number }).pct}%)`, 'Entrevistas']} labelStyle={{ fontSize: 11 }} contentStyle={{ fontSize: 11, borderRadius: 8 }} />
          <Bar dataKey="count" radius={[0, 4, 4, 0]} label={{ position: 'right', fontSize: 10.5, fill: '#55555C', formatter: (v: number) => (v > 0 ? `${v}` : '') }}>
            {dist.map((d) => <Cell key={d.value} fill={colorOf.get(d.value) ?? color} />)}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

export default function DashboardPanel({ surveys, all, questions, settlements, variable, onVariable }: Props) {
  const selected = questions.find((q) => q.key === variable)
  const withGps = surveys.filter((s) => !s.approx).length
  const nSett = new Set(surveys.map((s) => s.settlementId)).size
  const nMun = new Set(surveys.map((s) => s.municipality)).size
  const cross = useMemo(() => {
    if (!selected) return null
    const rows = crossTab(selected, surveys, (s) => s.settlementName)
    const scheme = colorScheme(selected.key, questions, settlements)
    const keys = scheme.filter((e) => rows.some((r) => (r.counts[e.value] ?? 0) > 0))
    const data = rows.map((r) => ({ name: r.group, total: r.total, ...Object.fromEntries(keys.map((k) => [k.value, r.counts[k.value] ?? 0])) }))
    return { data, keys }
  }, [selected, surveys, questions, settlements])

  return (
    <div className="px-4 pb-8">
      <div className="grid grid-cols-2 gap-2">
        <Kpi label="Entrevistas" value={surveys.length} hint={surveys.length !== all.length ? `de ${all.length} no total` : 'sincronizadas'} />
        <Kpi label="Com GPS" value={withGps} hint={`${surveys.length - withGps} aproximadas`} />
        <Kpi label="Assentamentos" value={nSett} hint={`${settlements.length} cadastrados`} />
        <Kpi label="Municípios" value={nMun} hint={[...new Set(surveys.map((s) => s.biome))].join(' · ') || '—'} />
      </div>

      <SectionTitle>Explorar pergunta</SectionTitle>
      <select value={selected ? selected.key : ''} onChange={(e) => onVariable(e.target.value || 'none')}
        className="w-full rounded-lg border border-sand-300 bg-white px-3 py-2 text-[13px] mb-3 focus:outline-none focus:ring-2 focus:ring-forest-500">
        <option value="">Selecione uma pergunta…</option>
        {SECTION_ORDER.map((sec) => (
          <optgroup key={sec} label={SECTION_LABELS[sec]}>
            {questions.filter((q) => q.section === sec && q.type !== 'text').map((q) => (
              <option key={q.key} value={q.key}>{q.number}. {q.text.length > 70 ? q.text.slice(0, 68) + '…' : q.text}</option>
            ))}
          </optgroup>
        ))}
      </select>
      {selected ? (
        <div className="space-y-4">
          <div className="rounded-xl border border-sand-200 bg-white p-3">
            <DistChart q={selected} surveys={surveys} color={SECTION_COLORS[selected.section]} questions={questions} settlements={settlements} />
          </div>
          {cross && cross.data.length > 1 && (
            <div className="rounded-xl border border-sand-200 bg-white p-3">
              <p className="text-[12.5px] font-semibold text-ink-900 mb-1">Por assentamento</p>
              <ResponsiveContainer width="100%" height={Math.max(120, cross.data.length * 34 + 50)}>
                <BarChart data={cross.data} layout="vertical" margin={{ top: 0, right: 12, bottom: 0, left: 0 }}>
                  <XAxis type="number" hide allowDecimals={false} />
                  <YAxis type="category" dataKey="name" width={110} tick={{ fontSize: 10.5, fill: '#55555C' }} tickFormatter={(v: string) => shortLabel(v, 20)} axisLine={false} tickLine={false} interval={0} />
                  <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8 }} />
                  <RLegend wrapperStyle={{ fontSize: 10.5 }} formatter={(v: string) => shortLabel(cross.keys.find((k) => k.value === v)?.label ?? v, 22)} />
                  {cross.keys.map((k) => <Bar key={k.value} dataKey={k.value} stackId="a" fill={k.color} />)}
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      ) : (
        <p className="text-[12px] text-ink-400">Escolha uma pergunta para ver a distribuição das respostas no recorte atual e a comparação entre assentamentos. A escolha também colore os pontos no mapa.</p>
      )}

      <SectionTitle>Indicadores-chave</SectionTitle>
      <div className="space-y-3">
        {KEY_INDICATORS.map((key, i) => {
          const q = questions.find((x) => x.key === key)
          if (!q || q.key === selected?.key) return null
          return (
            <button key={key} type="button" onClick={() => onVariable(key)} className="w-full text-left rounded-xl border border-sand-200 bg-white p-3 hover:border-forest-400 transition-colors">
              <DistChart q={q} surveys={surveys} color={CATEGORICAL[i % CATEGORICAL.length]} questions={questions} settlements={settlements} />
            </button>
          )
        })}
      </div>
    </div>
  )
}

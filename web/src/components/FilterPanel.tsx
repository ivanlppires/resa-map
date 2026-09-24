import { useMemo, useState } from 'react'
import { Search, X } from 'lucide-react'
import type { PlacedSurvey, Question, Settlement } from '../lib/types'
import { SECTION_LABELS, SECTION_ORDER, SECTION_COLORS, BIOME_COLORS } from '../lib/types'
import { applyFilters, activeFilterCount, emptyFilters, toggleIn, type Filters } from '../lib/filters'
import { distribution } from '../lib/stats'
import { Accordion, Chip, SectionTitle, Toggle } from './ui'

interface Props {
  all: PlacedSurvey[]
  filtered: PlacedSurvey[]
  filters: Filters
  onFilters: (f: Filters) => void
  questions: Question[]
  settlements: Settlement[]
  onFocusSettlement: (id: number) => void
}

export default function FilterPanel({ all, filtered, filters, onFilters, questions, settlements, onFocusSettlement }: Props) {
  const [q, setQ] = useState('')
  const active = activeFilterCount(filters)

  // Contagens facetadas: cada faceta é contada com os demais filtros aplicados.
  const listWithout = (key: 'settlements' | 'municipalities' | 'biomes' | string): PlacedSurvey[] => {
    const f: Filters = { ...filters, answers: { ...filters.answers } }
    if (key === 'settlements') f.settlements = []
    else if (key === 'municipalities') f.municipalities = []
    else if (key === 'biomes') f.biomes = []
    else delete f.answers[key]
    return applyFilters(all, f)
  }
  const countBy = (list: PlacedSurvey[], get: (s: PlacedSurvey) => string[]) => {
    const m = new Map<string, number>()
    for (const s of list) for (const v of get(s)) m.set(v, (m.get(v) ?? 0) + 1)
    return m
  }
  const settlementCounts = countBy(listWithout('settlements'), (s) => [String(s.settlementId)])
  const municipalityCounts = countBy(listWithout('municipalities'), (s) => [s.municipality])
  const biomeCounts = countBy(listWithout('biomes'), (s) => [s.biome])
  const municipalities = [...new Set(settlements.map((s) => s.municipality))].sort()
  const biomes = [...new Set(settlements.map((s) => s.biome))].sort()

  const visibleQuestions = useMemo(() => {
    const t = q.trim().toLowerCase()
    return questions.filter((x) => x.type !== 'text' && (t === '' || x.text.toLowerCase().includes(t) || String(x.number) === t))
  }, [questions, q])

  return (
    <div className="px-4 pb-6">
      <div className="flex items-center justify-between">
        <p className="text-[13px] text-ink-600"><span className="font-bold text-ink-900 text-[15px]">{filtered.length}</span> de {all.length} entrevistas</p>
        {active > 0 && (
          <button type="button" onClick={() => onFilters(emptyFilters)} className="inline-flex items-center gap-1 text-[12px] font-semibold text-forest-700 hover:text-forest-900">
            <X size={13} /> Limpar ({active})
          </button>
        )}
      </div>

      <SectionTitle>Assentamento</SectionTitle>
      <div className="flex flex-wrap gap-1.5">
        {settlements.map((s) => (
          <Chip key={s.id} active={filters.settlements.includes(s.id)} count={settlementCounts.get(String(s.id)) ?? 0}
            color={BIOME_COLORS[s.biome]}
            onClick={() => { onFilters({ ...filters, settlements: toggleIn(filters.settlements, s.id) }); if (!filters.settlements.includes(s.id)) onFocusSettlement(s.id) }}>
            {s.name}
          </Chip>
        ))}
      </div>

      <SectionTitle>Município</SectionTitle>
      <div className="flex flex-wrap gap-1.5">
        {municipalities.map((m) => (
          <Chip key={m} active={filters.municipalities.includes(m)} count={municipalityCounts.get(m) ?? 0} onClick={() => onFilters({ ...filters, municipalities: toggleIn(filters.municipalities, m) })}>{m}</Chip>
        ))}
      </div>

      <SectionTitle>Bioma</SectionTitle>
      <div className="flex flex-wrap gap-1.5">
        {biomes.map((b) => (
          <Chip key={b} active={filters.biomes.includes(b)} count={biomeCounts.get(b) ?? 0} color={BIOME_COLORS[b]} onClick={() => onFilters({ ...filters, biomes: toggleIn(filters.biomes, b) })}>{b}</Chip>
        ))}
      </div>

      <div className="mt-3">
        <Toggle checked={filters.onlyGps} onChange={(v) => onFilters({ ...filters, onlyGps: v })} label="Somente entrevistas com GPS" hint="oculta posições aproximadas" />
      </div>

      <SectionTitle>Por resposta</SectionTitle>
      <div className="relative mb-2">
        <Search size={14} className="absolute left-2.5 top-2.5 text-ink-400" />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar pergunta (texto ou número)…"
          className="w-full rounded-lg border border-sand-300 bg-white pl-8 pr-3 py-2 text-[13px] focus:outline-none focus:ring-2 focus:ring-forest-500" />
      </div>
      {SECTION_ORDER.map((sec) => {
        const qs = visibleQuestions.filter((x) => x.section === sec)
        if (qs.length === 0) return null
        const activeInSection = qs.reduce((a, x) => a + (filters.answers[x.key]?.length ?? 0), 0)
        return (
          <Accordion key={sec} title={SECTION_LABELS[sec]} subtitle={`${qs.length} perguntas`} color={SECTION_COLORS[sec]} defaultOpen={q.trim() !== '' || activeInSection > 0}
            badge={activeInSection > 0 ? <span className="rounded-full bg-forest-900 px-1.5 text-[10px] font-bold text-white">{activeInSection}</span> : undefined}>
            <div className="divide-y divide-sand-200">
              {qs.map((x) => {
                const selected = filters.answers[x.key] ?? []
                const dist = distribution(x, listWithout(x.key))
                return (
                  <Accordion key={x.key} title={`${x.number}. ${x.text}`} defaultOpen={selected.length > 0}
                    badge={selected.length > 0 ? <span className="rounded-full bg-forest-900 px-1.5 text-[10px] font-bold text-white">{selected.length}</span> : undefined}>
                    <div className="space-y-0.5">
                      {dist.map((d) => (
                        <label key={d.value} className="flex items-center gap-2 rounded-md px-1 py-1 text-[12.5px] hover:bg-sand-100 cursor-pointer">
                          <input type="checkbox" className="accent-forest-600" checked={selected.includes(d.value)}
                            onChange={() => onFilters({ ...filters, answers: { ...filters.answers, [x.key]: toggleIn(selected, d.value) } })} />
                          <span className="flex-1 text-ink-900 leading-snug">{d.label}</span>
                          <span className="text-[11px] tabular-nums text-ink-400">{d.count}</span>
                        </label>
                      ))}
                      {x.type === 'multiple_choice' && <p className="px-1 pt-1 text-[10.5px] text-ink-400">Múltipla escolha: uma entrevista pode contar em várias opções.</p>}
                    </div>
                  </Accordion>
                )
              })}
            </div>
          </Accordion>
        )
      })}
      <p className="mt-4 text-[11px] text-ink-400">Dica: os totais entre parênteses consideram os demais filtros ativos. Uma entrevista sem resposta na pergunta é excluída quando a pergunta é filtrada.</p>
    </div>
  )
}

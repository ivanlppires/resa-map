import type { PlacedSurvey, Question, Settlement } from './types'

export interface Filters {
  settlements: number[]
  municipalities: string[]
  biomes: string[]
  answers: Record<string, string[]>
  onlyGps: boolean
}

export const emptyFilters: Filters = { settlements: [], municipalities: [], biomes: [], answers: {}, onlyGps: false }

export function valuesOf(v: unknown): string[] {
  if (v == null) return []
  return Array.isArray(v) ? v.map(String) : [String(v)]
}

export function applyFilters(surveys: PlacedSurvey[], f: Filters): PlacedSurvey[] {
  const answerKeys = Object.keys(f.answers).filter((k) => f.answers[k].length > 0)
  return surveys.filter((s) => {
    if (f.settlements.length > 0 && !f.settlements.includes(s.settlementId)) return false
    if (f.municipalities.length > 0 && !f.municipalities.includes(s.municipality)) return false
    if (f.biomes.length > 0 && !f.biomes.includes(s.biome)) return false
    if (f.onlyGps && s.approx) return false
    for (const k of answerKeys) {
      const vals = valuesOf(s.answers[k])
      if (!vals.some((v) => f.answers[k].includes(v))) return false
    }
    return true
  })
}

export function activeFilterCount(f: Filters): number {
  return f.settlements.length + f.municipalities.length + f.biomes.length + (f.onlyGps ? 1 : 0)
    + Object.values(f.answers).reduce((a, v) => a + v.length, 0)
}

export function describeFilters(f: Filters, questions: Question[], settlements: Settlement[]): string {
  const parts: string[] = []
  if (f.settlements.length) parts.push(`Assentamento: ${f.settlements.map((id) => settlements.find((s) => s.id === id)?.name ?? id).join(', ')}`)
  if (f.municipalities.length) parts.push(`Município: ${f.municipalities.join(', ')}`)
  if (f.biomes.length) parts.push(`Bioma: ${f.biomes.join(', ')}`)
  if (f.onlyGps) parts.push('Somente com GPS')
  for (const [k, vals] of Object.entries(f.answers)) {
    if (vals.length === 0) continue
    const q = questions.find((x) => x.key === k)
    const labels = vals.map((v) => q?.options?.find((o) => o.value === v)?.label ?? v)
    parts.push(`${q ? `Q${q.number}` : k}: ${labels.join(' ou ')}`)
  }
  return parts.length ? parts.join(' · ') : 'Todas as entrevistas'
}

export function toggleIn<T>(arr: T[], v: T): T[] {
  return arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]
}

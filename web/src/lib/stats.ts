import type { Question, Survey } from './types'
import { valuesOf } from './filters'

export interface DistRow { value: string; label: string; count: number; pct: number }

export function labelFor(q: Question | undefined, v: unknown): string {
  if (v == null) return '—'
  if (!q) return Array.isArray(v) ? v.join(', ') : String(v)
  const one = (x: unknown) => q.options?.find((o) => o.value === String(x))?.label ?? String(x)
  return Array.isArray(v) ? v.map(one).join(', ') : one(v)
}

export function answeredCount(q: Question, surveys: Survey[]): number {
  return surveys.filter((s) => s.answers[q.key] != null).length
}

export function distribution(q: Question, surveys: Survey[]): DistRow[] {
  const counts = new Map<string, number>()
  let answered = 0
  for (const s of surveys) {
    const vals = valuesOf(s.answers[q.key])
    if (vals.length === 0) continue
    answered++
    for (const v of vals) counts.set(v, (counts.get(v) ?? 0) + 1)
  }
  const rows: DistRow[] = []
  const push = (value: string, label: string) => {
    const count = counts.get(value) ?? 0
    rows.push({ value, label, count, pct: answered ? Math.round((count / answered) * 100) : 0 })
  }
  if (q.type === 'scale') {
    for (let i = q.scaleMin ?? 1; i <= (q.scaleMax ?? 5); i++) push(String(i), String(i))
  } else if (q.options?.length) {
    for (const o of q.options) push(o.value, o.label)
    for (const v of counts.keys()) if (!q.options.some((o) => o.value === v)) push(v, v)
  } else {
    for (const v of counts.keys()) push(v, v)
  }
  return rows
}

export function scaleMean(q: Question, surveys: Survey[]): number | null {
  const vals = surveys.map((s) => Number(s.answers[q.key])).filter((n) => Number.isFinite(n))
  if (vals.length === 0) return null
  return vals.reduce((a, b) => a + b, 0) / vals.length
}

/** Valor "principal" de uma entrevista para simbolização (múltipla escolha usa a 1ª opção). */
export function primaryValue(s: Survey, key: string): string | null {
  const vals = valuesOf(s.answers[key])
  return vals.length ? vals[0] : null
}

export interface CrossRow { group: string; total: number; counts: Record<string, number> }

export function crossTab(q: Question, surveys: Survey[], groupBy: (s: Survey) => string): CrossRow[] {
  const groups = new Map<string, CrossRow>()
  for (const s of surveys) {
    const g = groupBy(s)
    let row = groups.get(g)
    if (!row) { row = { group: g, total: 0, counts: {} }; groups.set(g, row) }
    const vals = valuesOf(s.answers[q.key])
    if (vals.length === 0) continue
    row.total++
    for (const v of vals) row.counts[v] = (row.counts[v] ?? 0) + 1
  }
  return [...groups.values()].sort((a, b) => b.total - a.total)
}

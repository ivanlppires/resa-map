import type { Question, Settlement } from './types'
import { BIOME_COLORS } from './types'

export const CATEGORICAL = ['#2E7CE6', '#D4870A', '#22A352', '#8B5CF6', '#E5484D', '#0F766E', '#C2410C', '#DB2777', '#65A30D', '#6B7280', '#0EA5E9', '#A16207', '#7C3AED', '#14B8A6', '#F59E0B', '#EF4444']
export const SEQUENTIAL_5 = ['#DCFCE7', '#86EFAC', '#22C55E', '#15803D', '#052E16']
export const NEUTRAL = '#9CA3AF'
export const DEFAULT_POINT = '#1D8F47'

/** Perguntas com ordem natural nas opções: usam paleta sequencial. */
const ORDERED_KEYS = new Set(['q01_idade', 'q03_pessoas_residem', 'q04_pessoas_trabalham', 'q05_renda_bruta', 'q11_hectares_producao', 'q13_controle_custo', 'q25_busca_informacoes', 'q27_capacidade_decisao'])

function sequential(n: number): string[] {
  const stops = ['#FEF3C7', '#FBBF24', '#F59E0B', '#D97706', '#B45309', '#92400E', '#78350F', '#451A03']
  if (n <= 1) return ['#D97706']
  return Array.from({ length: n }, (_, i) => stops[Math.round((i / (n - 1)) * (stops.length - 1))])
}

export type SymbolVar = 'none' | 'settlement' | 'biome' | 'gps' | string

export interface ColorEntry { value: string; label: string; color: string }

export function colorScheme(variable: SymbolVar, questions: Question[], settlements: Settlement[]): ColorEntry[] {
  if (variable === 'none') return [{ value: '*', label: 'Entrevista', color: DEFAULT_POINT }]
  if (variable === 'settlement') return settlements.map((s, i) => ({ value: String(s.id), label: s.name, color: CATEGORICAL[i % CATEGORICAL.length] }))
  if (variable === 'biome') return Object.entries(BIOME_COLORS).map(([b, c]) => ({ value: b, label: b, color: c }))
  if (variable === 'gps') return [{ value: 'gps', label: 'Com GPS', color: '#22A352' }, { value: 'approx', label: 'Posição aproximada (sem GPS)', color: '#9CA3AF' }]
  const q = questions.find((x) => x.key === variable)
  if (!q) return []
  if (q.type === 'yes_no') {
    return (q.options ?? []).map((o) => ({ value: o.value, label: o.label, color: o.value === 'sim' ? '#22A352' : o.value === 'nao' ? '#E5484D' : NEUTRAL }))
  }
  if (q.type === 'scale') {
    const min = q.scaleMin ?? 1, max = q.scaleMax ?? 5
    const n = max - min + 1
    return Array.from({ length: n }, (_, i) => ({ value: String(min + i), label: String(min + i), color: SEQUENTIAL_5[Math.round((i / (n - 1)) * 4)] }))
  }
  const opts = q.options ?? []
  if (ORDERED_KEYS.has(q.key)) {
    const seq = sequential(opts.length)
    return opts.map((o, i) => ({ value: o.value, label: o.label, color: seq[i] }))
  }
  return opts.map((o, i) => ({ value: o.value, label: o.label, color: CATEGORICAL[i % CATEGORICAL.length] }))
}

/** Expressão MapLibre `match` para cor a partir da propriedade `sym`. */
export function matchExpression(entries: ColorEntry[]): unknown {
  if (entries.length === 1 && entries[0].value === '*') return entries[0].color
  const expr: unknown[] = ['match', ['to-string', ['get', 'sym']]]
  for (const e of entries) expr.push(e.value, e.color)
  expr.push(NEUTRAL)
  return expr
}

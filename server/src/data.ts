import { sql } from './db.js'

export interface QuestionOption { value: string; label: string; hasTextInput?: boolean }
export interface QuestionRow {
  key: string
  number: number
  text: string
  type: 'single_choice' | 'multiple_choice' | 'yes_no' | 'scale' | 'text'
  section: 'socioeconomic' | 'behavioral' | 'environmental'
  options: QuestionOption[] | null
  scaleMin: number | null
  scaleMax: number | null
  conditional: { dependsOn: string; showWhen: string[] } | null
  sortOrder: number
}
export interface SettlementRow {
  id: number
  name: string
  municipality: string
  biome: string
  geojson: unknown
}
export interface SurveyRow {
  id: number
  settlementId: number
  settlementName: string
  municipality: string
  biome: string
  interviewer: string
  lotNumber: string | null
  gpsLat: number | null
  gpsLng: number | null
  createdAt: string
  completedAt: string | null
  syncedAt: string | null
  answers: Record<string, unknown>
  texts: Record<string, string>
}

export interface Dataset {
  generatedAt: string
  questions: QuestionRow[]
  settlements: SettlementRow[]
  surveys: SurveyRow[]
}

export async function loadQuestions(): Promise<QuestionRow[]> {
  const rows = await sql<{
    key: string; number: number; text: string; type: QuestionRow['type']; section: QuestionRow['section']
    options: QuestionOption[] | null; scale_min: number | null; scale_max: number | null
    conditional: QuestionRow['conditional']; sort_order: number
  }[]>`
    select key, number, text, type, section, options, scale_min, scale_max, conditional, sort_order
    from questions where active = true order by sort_order`
  return rows.map((r) => ({
    key: r.key, number: r.number, text: r.text, type: r.type, section: r.section,
    options: r.options, scaleMin: r.scale_min, scaleMax: r.scale_max, conditional: r.conditional, sortOrder: r.sort_order,
  }))
}

export async function loadSettlements(): Promise<SettlementRow[]> {
  const rows = await sql<{ id: number; name: string; municipality: string; biome: string; geojson: unknown }[]>`
    select id, trim(name) as name, trim(municipality) as municipality, trim(biome) as biome, geojson
    from settlements order by name`
  return rows
}

/** Entrevistas sincronizadas (status = synced) com as respostas achatadas. */
export async function loadSurveys(ids?: number[]): Promise<SurveyRow[]> {
  const rows = await sql<{
    id: number; settlement_id: number; settlement_name: string; municipality: string; biome: string
    interviewer: string; lot_number: string | null; gps_lat: number | null; gps_lng: number | null
    created_at: Date; completed_at: Date | null; synced_at: Date | null
  }[]>`
    select s.id, s.settlement_id, trim(st.name) as settlement_name, trim(st.municipality) as municipality,
           trim(st.biome) as biome, u.name as interviewer, s.lot_number, s.gps_lat, s.gps_lng,
           s.created_at, s.completed_at, s.synced_at
    from surveys s
    join settlements st on st.id = s.settlement_id
    join users u on u.id = s.interviewer_id
    where s.status = 'synced' ${ids && ids.length > 0 ? sql`and s.id in ${sql(ids)}` : sql``}
    order by s.id`
  if (rows.length === 0) return []
  const responses = await sql<{ survey_id: number; question_key: string; value: unknown; text_value: string | null }[]>`
    select survey_id, question_key, value, text_value from responses
    where survey_id in ${sql(rows.map((r) => r.id))}`
  const answers = new Map<number, Record<string, unknown>>()
  const texts = new Map<number, Record<string, string>>()
  for (const r of responses) {
    let a = answers.get(r.survey_id)
    if (!a) { a = {}; answers.set(r.survey_id, a) }
    a[r.question_key] = r.value
    if (r.text_value) {
      let t = texts.get(r.survey_id)
      if (!t) { t = {}; texts.set(r.survey_id, t) }
      t[r.question_key] = r.text_value
    }
  }
  return rows.map((r) => ({
    id: r.id,
    settlementId: r.settlement_id,
    settlementName: r.settlement_name,
    municipality: r.municipality,
    biome: r.biome,
    interviewer: r.interviewer,
    lotNumber: r.lot_number,
    gpsLat: r.gps_lat,
    gpsLng: r.gps_lng,
    createdAt: r.created_at.toISOString(),
    completedAt: r.completed_at?.toISOString() ?? null,
    syncedAt: r.synced_at?.toISOString() ?? null,
    answers: answers.get(r.id) ?? {},
    texts: texts.get(r.id) ?? {},
  }))
}

export async function loadDataset(): Promise<Dataset> {
  const [questions, settlements, surveys] = await Promise.all([loadQuestions(), loadSettlements(), loadSurveys()])
  return { generatedAt: new Date().toISOString(), questions, settlements, surveys }
}

export function parseIds(raw: unknown): number[] | undefined {
  if (typeof raw !== 'string' || raw.trim() === '') return undefined
  const ids = raw.split(',').map((s) => Number(s.trim())).filter((n) => Number.isInteger(n) && n > 0)
  return ids.length > 0 ? ids : [-1]
}

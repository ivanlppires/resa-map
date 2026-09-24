import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify'
import { z } from 'zod'
import { sql } from './db.js'
import { loadDataset, loadQuestions, loadSurveys, parseIds, type QuestionRow, type SurveyRow } from './data.js'
import { buildCsv, buildTable, type CsvQuestion, type CsvSurveyRow } from './lib/csv.js'
import { buildXlsx } from './lib/xlsx.js'
import { buildTerritorialReport } from './lib/report.js'

const exportQuery = z.object({
  ids: z.string().optional(),
  filters: z.string().max(2000).optional(),
  title: z.string().max(200).optional(),
})

function toCsvRows(surveys: SurveyRow[]): CsvSurveyRow[] {
  return surveys.map((s) => ({
    id: s.id,
    clientId: null,
    settlementName: s.settlementName,
    municipality: s.municipality,
    biome: s.biome,
    interviewerName: s.interviewer,
    interviewerEmail: '',
    lotNumber: s.lotNumber,
    gpsLat: s.gpsLat,
    gpsLng: s.gpsLng,
    createdAt: s.createdAt,
    completedAt: s.completedAt,
    syncedAt: s.syncedAt,
    responses: new Map(Object.keys(s.answers).map((k) => [k, { value: s.answers[k], textValue: s.texts[k] ?? null }])),
  }))
}

function toCsvQuestions(questions: QuestionRow[]): CsvQuestion[] {
  return questions.map((q) => ({ key: q.key, sortOrder: q.sortOrder, hasTextOption: (q.options ?? []).some((o) => !!o.hasTextInput) }))
}

/** GeoJSON com uma feature por entrevista georreferenciada e rótulos legíveis. */
function toGeoJson(questions: QuestionRow[], surveys: SurveyRow[]) {
  const byKey = new Map(questions.map((q) => [q.key, q]))
  const labelFor = (key: string, v: unknown): unknown => {
    const q = byKey.get(key)
    if (!q?.options) return v
    const one = (x: unknown) => q.options?.find((o) => o.value === String(x))?.label ?? x
    return Array.isArray(v) ? v.map(one) : one(v)
  }
  return {
    type: 'FeatureCollection',
    features: surveys
      .filter((s) => s.gpsLat != null && s.gpsLng != null)
      .map((s) => ({
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [s.gpsLng, s.gpsLat] },
        properties: {
          id: s.id,
          lote: s.lotNumber,
          assentamento: s.settlementName,
          municipio: s.municipality,
          bioma: s.biome,
          entrevistador: s.interviewer,
          concluida_em: s.completedAt,
          ...Object.fromEntries(Object.entries(s.answers).map(([k, v]) => [k, labelFor(k, v)])),
          ...Object.fromEntries(Object.entries(s.texts).map(([k, v]) => [`${k}_texto`, v])),
        },
      })),
  }
}

function stamp(): string {
  return new Date().toISOString().slice(0, 10)
}

export async function apiRoutes(app: FastifyInstance, opts: { requireAuth: (request: FastifyRequest, reply: FastifyReply) => Promise<void> }): Promise<void> {
  const requireAccess = opts.requireAuth
  app.get('/api/health', async () => {
    try {
      await sql`select 1`
      return { status: 'ok', db: 'connected' }
    } catch {
      return { status: 'degraded', db: 'disconnected' }
    }
  })

  app.get('/api/data', { preHandler: [requireAccess] }, async () => loadDataset())

  // Números agregados e públicos para a landing page (sem dados por entrevista).
  app.get('/api/stats', async () => {
    const [row] = await sql<{ surveys: number; with_gps: number; settlements: number; municipalities: number; biomes: number; questions: number; last_sync: Date | null }[]>`
      select (select count(*)::int from surveys where status = 'synced') as surveys,
             (select count(*)::int from surveys where status = 'synced' and gps_lat is not null) as with_gps,
             (select count(*)::int from settlements) as settlements,
             (select count(distinct trim(municipality))::int from settlements) as municipalities,
             (select count(distinct trim(biome))::int from settlements) as biomes,
             (select count(*)::int from questions where active) as questions,
             (select max(synced_at) from surveys) as last_sync`
    return { ...row, last_sync: row.last_sync?.toISOString() ?? null }
  })

  app.get('/api/export.csv', { preHandler: [requireAccess] }, async (request, reply) => {
    const q = exportQuery.parse(request.query)
    const [questions, surveys] = await Promise.all([loadQuestions(), loadSurveys(parseIds(q.ids))])
    reply.header('Content-Type', 'text/csv; charset=utf-8')
    reply.header('Content-Disposition', `attachment; filename="resa-map-${stamp()}.csv"`)
    return buildCsv(toCsvQuestions(questions), toCsvRows(surveys))
  })

  app.get('/api/export.xlsx', { preHandler: [requireAccess] }, async (request, reply) => {
    const q = exportQuery.parse(request.query)
    const [questions, surveys] = await Promise.all([loadQuestions(), loadSurveys(parseIds(q.ids))])
    const { header, matrix } = buildTable(toCsvQuestions(questions), toCsvRows(surveys))
    reply.header('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
    reply.header('Content-Disposition', `attachment; filename="resa-map-${stamp()}.xlsx"`)
    return buildXlsx(header, matrix)
  })

  app.get('/api/export.geojson', { preHandler: [requireAccess] }, async (request, reply) => {
    const q = exportQuery.parse(request.query)
    const [questions, surveys] = await Promise.all([loadQuestions(), loadSurveys(parseIds(q.ids))])
    reply.header('Content-Type', 'application/geo+json; charset=utf-8')
    reply.header('Content-Disposition', `attachment; filename="resa-map-${stamp()}.geojson"`)
    return JSON.stringify(toGeoJson(questions, surveys))
  })

  app.get('/api/report.pdf', { preHandler: [requireAccess] }, async (request, reply) => {
    const q = exportQuery.parse(request.query)
    const [questions, surveys] = await Promise.all([loadQuestions(), loadSurveys(parseIds(q.ids))])
    reply.header('Content-Type', 'application/pdf')
    reply.header('Content-Disposition', `attachment; filename="resa-relatorio-${stamp()}.pdf"`)
    return buildTerritorialReport(questions, surveys, { title: q.title, filterSummary: q.filters, generatedAt: new Date() })
  })
}

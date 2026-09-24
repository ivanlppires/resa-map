/**
 * Relatório territorial agregado em PDF: cabeçalho do projeto, indicadores
 * gerais, resumo por assentamento e, para cada pergunta do questionário, a
 * distribuição das respostas do recorte selecionado com barras horizontais.
 * Usa o gerador mínimo de PDF (pdf.ts) sem dependências externas.
 */
import { PdfDoc, A4, wrapText, textWidth, type PdfFont, type Rgb } from './pdf.js'
import type { QuestionRow, SurveyRow } from '../data.js'

const MARGIN = 50
const CONTENT_W = A4.width - MARGIN * 2
const FOOTER_H = 40

const GREEN: Rgb = [0.13, 0.64, 0.32]
const GREEN_SOFT: Rgb = [0.85, 0.94, 0.88]
const TEXT: Rgb = [0.11, 0.11, 0.13]
const GRAY: Rgb = [0.45, 0.45, 0.47]
const RULE: Rgb = [0.88, 0.88, 0.9]
const BAR_BG: Rgb = [0.94, 0.94, 0.95]
const SECTION_COLORS: Record<string, Rgb> = {
  socioeconomic: [0.18, 0.49, 0.90],
  behavioral: [0.83, 0.53, 0.04],
  environmental: [0.13, 0.64, 0.32],
}

const SECTION_ORDER = ['socioeconomic', 'behavioral', 'environmental'] as const
const SECTION_LABELS: Record<string, string> = {
  socioeconomic: 'Parte 1 — Perfil Socioeconômico',
  behavioral: 'Parte 2 — Perfil Comportamental',
  environmental: 'Parte 3 — Perfil Ambiental',
}

export interface ReportOptions {
  title?: string
  filterSummary?: string
  generatedAt?: Date
}

function fmtDateTime(iso: string | null | Date): string {
  if (!iso) return '—'
  const d = typeof iso === 'string' ? new Date(iso) : iso
  return d.toLocaleString('pt-BR', { timeZone: 'America/Cuiaba', dateStyle: 'short', timeStyle: 'short' })
}

function fmtDate(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('pt-BR', { timeZone: 'America/Cuiaba' })
}

function pct(n: number, total: number): string {
  if (total === 0) return '0%'
  return `${Math.round((n / total) * 100)}%`
}

class Cursor {
  y: number
  constructor(private doc: PdfDoc) {
    doc.addPage()
    this.y = A4.height - MARGIN
  }
  newPage(): void {
    this.doc.addPage()
    this.y = A4.height - MARGIN
  }
  ensure(height: number): void {
    if (this.y - height < MARGIN + FOOTER_H) this.newPage()
  }
  lines(lines: string[], size: number, font: PdfFont, color: Rgb, lineGap = 1.35, x = MARGIN): void {
    for (const line of lines) {
      this.ensure(size * lineGap)
      this.y -= size
      this.doc.text(x, this.y, line, { font, size, color })
      this.y -= size * (lineGap - 1)
    }
  }
  paragraph(text: string, size: number, font: PdfFont, color: Rgb, width = CONTENT_W, x = MARGIN): void {
    this.lines(wrapText(text, width, size, font), size, font, color, 1.35, x)
  }
  gap(h: number): void { this.y -= h }
  rule(color: Rgb = RULE, width = 0.6): void {
    this.doc.line(MARGIN, this.y, A4.width - MARGIN, this.y, width, color)
  }
}

/** Distribuição de respostas de uma pergunta dentro do recorte. */
export function distribution(q: QuestionRow, surveys: SurveyRow[]): { label: string; value: string; count: number }[] {
  const counts = new Map<string, number>()
  let answered = 0
  for (const s of surveys) {
    const v = s.answers[q.key]
    if (v == null) continue
    answered++
    const values = Array.isArray(v) ? v.map(String) : [String(v)]
    for (const value of values) counts.set(value, (counts.get(value) ?? 0) + 1)
  }
  const rows: { label: string; value: string; count: number }[] = []
  if (q.type === 'scale') {
    const min = q.scaleMin ?? 1
    const max = q.scaleMax ?? 5
    for (let i = min; i <= max; i++) rows.push({ label: String(i), value: String(i), count: counts.get(String(i)) ?? 0 })
  } else if (q.options && q.options.length > 0) {
    for (const o of q.options) rows.push({ label: o.label, value: o.value, count: counts.get(o.value) ?? 0 })
    for (const [value, count] of counts) {
      if (!q.options.some((o) => o.value === value)) rows.push({ label: value, value, count })
    }
  } else {
    for (const [value, count] of counts) rows.push({ label: value, value, count })
  }
  return rows.map((r) => ({ ...r, count: r.count })).concat(answered === 0 ? [] : [])
}

function answeredCount(q: QuestionRow, surveys: SurveyRow[]): number {
  return surveys.filter((s) => s.answers[q.key] != null).length
}

function drawHeader(doc: PdfDoc, cur: Cursor, surveys: SurveyRow[], opts: ReportOptions): void {
  doc.rect(0, A4.height - 8, A4.width, 8, GREEN)
  cur.gap(6)
  cur.paragraph('PROJETO RESA · UNEMAT · LAEGC', 9, 'bold', GREEN)
  cur.gap(4)
  cur.paragraph(opts.title ?? 'Relatório Territorial', 22, 'bold', TEXT)
  cur.gap(2)
  cur.paragraph('Viabilidade Econômica de Assentamentos Rurais nos Três Biomas de Mato Grosso', 10, 'regular', GRAY)
  cur.gap(6)
  const count = surveys.length === 1 ? '1 entrevista' : `${surveys.length} entrevistas`
  cur.paragraph(`Gerado em ${fmtDateTime(opts.generatedAt ?? new Date())} · ${count} no recorte`, 9, 'regular', GRAY)
  if (opts.filterSummary) {
    cur.gap(3)
    cur.paragraph(`Filtros: ${opts.filterSummary}`, 9, 'oblique', GRAY)
  }
  cur.gap(10)
  cur.rule()
  cur.gap(14)
}

function drawKpis(doc: PdfDoc, cur: Cursor, surveys: SurveyRow[]): void {
  const kpis = [
    { label: 'Entrevistas', value: String(surveys.length) },
    { label: 'Assentamentos', value: String(new Set(surveys.map((s) => s.settlementId)).size) },
    { label: 'Municípios', value: String(new Set(surveys.map((s) => s.municipality)).size) },
    { label: 'Com GPS', value: String(surveys.filter((s) => s.gpsLat != null && s.gpsLng != null).length) },
  ]
  const gapX = 10
  const w = (CONTENT_W - gapX * (kpis.length - 1)) / kpis.length
  const h = 54
  cur.ensure(h + 10)
  const top = cur.y
  kpis.forEach((k, i) => {
    const x = MARGIN + i * (w + gapX)
    doc.rect(x, top - h, w, h, GREEN_SOFT)
    doc.text(x + 12, top - 26, k.value, { font: 'bold', size: 20, color: TEXT })
    doc.text(x + 12, top - 42, k.label.toUpperCase(), { font: 'bold', size: 7.5, color: GREEN })
  })
  cur.y = top - h
  cur.gap(18)
}

function drawSettlementSummary(doc: PdfDoc, cur: Cursor, surveys: SurveyRow[]): void {
  const by = new Map<string, { municipality: string; biome: string; count: number; gps: number }>()
  for (const s of surveys) {
    const k = s.settlementName
    const cur0 = by.get(k) ?? { municipality: s.municipality, biome: s.biome, count: 0, gps: 0 }
    cur0.count++
    if (s.gpsLat != null) cur0.gps++
    by.set(k, cur0)
  }
  cur.paragraph('Resumo por assentamento', 13, 'bold', TEXT)
  cur.gap(8)
  const cols = [220, 120, 80, 50, 25]
  const headers = ['Assentamento', 'Município', 'Bioma', 'Entrev.', 'GPS']
  cur.ensure(16)
  let x = MARGIN
  headers.forEach((h, i) => { doc.text(x, cur.y - 8, h, { font: 'bold', size: 8, color: GRAY }); x += cols[i] })
  cur.y -= 12
  cur.rule(RULE, 0.5)
  cur.gap(4)
  for (const [name, r] of [...by.entries()].sort((a, b) => b[1].count - a[1].count)) {
    cur.ensure(16)
    x = MARGIN
    const cells = [name, r.municipality, r.biome, String(r.count), String(r.gps)]
    cells.forEach((c, i) => {
      const lines = wrapText(c, cols[i] - 6, 9.5, i === 0 ? 'bold' : 'regular')
      doc.text(x, cur.y - 9, lines[0] ?? '', { font: i === 0 ? 'bold' : 'regular', size: 9.5, color: TEXT })
      x += cols[i]
    })
    cur.y -= 15
  }
  cur.gap(14)
}

function drawQuestion(doc: PdfDoc, cur: Cursor, q: QuestionRow, surveys: SurveyRow[], color: Rgb): void {
  if (q.type === 'text') return
  const dist = distribution(q, surveys)
  const answered = answeredCount(q, surveys)
  const max = Math.max(1, ...dist.map((d) => d.count))
  const rowH = 15
  const labelW = 230
  const barX = MARGIN + labelW + 8
  const barW = CONTENT_W - labelW - 8 - 70
  const titleLines = wrapText(`${q.number}. ${q.text}`, CONTENT_W, 10, 'bold')
  const blockH = titleLines.length * 10 * 1.35 + 14 + dist.length * rowH + 14
  cur.ensure(Math.min(blockH, 320))
  cur.lines(titleLines, 10, 'bold', TEXT)
  cur.gap(2)
  const multi = q.type === 'multiple_choice' ? ' · múltipla escolha (a soma pode exceder 100%)' : ''
  cur.paragraph(`${answered} de ${surveys.length} entrevistas responderam${multi}`, 8, 'oblique', GRAY)
  cur.gap(6)
  for (const d of dist) {
    cur.ensure(rowH)
    const y = cur.y - rowH + 3
    const label = wrapText(d.label, labelW, 8.5, 'regular')[0] ?? d.label
    doc.text(MARGIN, y + 3, label, { size: 8.5, color: TEXT })
    doc.rect(barX, y, barW, 9, BAR_BG)
    const w = (d.count / max) * barW
    if (w > 0) doc.rect(barX, y, Math.max(2, w), 9, color)
    const stat = `${d.count} (${pct(d.count, answered)})`
    doc.text(barX + barW + 8, y + 2, stat, { size: 8.5, color: GRAY })
    cur.y -= rowH
  }
  if (q.type === 'scale' && answered > 0) {
    const sum = dist.reduce((acc, d) => acc + Number(d.value) * d.count, 0)
    cur.gap(2)
    cur.paragraph(`Média: ${(sum / answered).toFixed(2)}`, 8.5, 'bold', color)
  }
  cur.gap(14)
}

function drawInterviewList(doc: PdfDoc, cur: Cursor, surveys: SurveyRow[]): void {
  cur.newPage()
  cur.paragraph('Anexo — Entrevistas do recorte', 13, 'bold', TEXT)
  cur.gap(8)
  const cols = [30, 40, 165, 110, 60, 90]
  const headers = ['#', 'Lote', 'Assentamento', 'Município', 'Data', 'GPS']
  let x = MARGIN
  headers.forEach((h, i) => { doc.text(x, cur.y - 8, h, { font: 'bold', size: 8, color: GRAY }); x += cols[i] })
  cur.y -= 12
  cur.rule(RULE, 0.5)
  cur.gap(4)
  for (const s of surveys) {
    cur.ensure(15)
    x = MARGIN
    const gps = s.gpsLat != null && s.gpsLng != null ? `${s.gpsLat.toFixed(4)}, ${s.gpsLng.toFixed(4)}` : 'sem GPS'
    const cells = [String(s.id), s.lotNumber ?? '—', s.settlementName, s.municipality, fmtDate(s.completedAt ?? s.createdAt), gps]
    cells.forEach((c, i) => {
      const line = wrapText(c, cols[i] - 4, 8.5, 'regular')[0] ?? c
      doc.text(x, cur.y - 9, line, { size: 8.5, color: TEXT })
      x += cols[i]
    })
    cur.y -= 14
  }
}

function drawFooters(doc: PdfDoc): void {
  const total = doc.pageCount
  for (let i = 0; i < total; i++) {
    doc.line(MARGIN, MARGIN - 14, A4.width - MARGIN, MARGIN - 14, 0.5, RULE, i)
    doc.text(MARGIN, MARGIN - 26, 'RESA Map — Plataforma Territorial · resa.laegc.com.br', { size: 7.5, color: GRAY }, i)
    const label = `Página ${i + 1} de ${total}`
    doc.text(A4.width - MARGIN - textWidth(label, 7.5), MARGIN - 26, label, { size: 7.5, color: GRAY }, i)
  }
}

export function buildTerritorialReport(questions: QuestionRow[], surveys: SurveyRow[], opts: ReportOptions = {}): Buffer {
  const doc = new PdfDoc()
  const cur = new Cursor(doc)
  drawHeader(doc, cur, surveys, opts)
  if (surveys.length === 0) {
    cur.paragraph('Nenhuma entrevista no recorte selecionado.', 11, 'regular', GRAY)
  } else {
    drawKpis(doc, cur, surveys)
    drawSettlementSummary(doc, cur, surveys)
    const sorted = [...questions].sort((a, b) => a.sortOrder - b.sortOrder)
    for (const section of SECTION_ORDER) {
      const qs = sorted.filter((q) => q.section === section)
      if (qs.length === 0) continue
      cur.newPage()
      cur.paragraph(SECTION_LABELS[section], 15, 'bold', SECTION_COLORS[section])
      cur.gap(4)
      cur.rule(SECTION_COLORS[section], 1.2)
      cur.gap(16)
      for (const q of qs) drawQuestion(doc, cur, q, surveys, SECTION_COLORS[section])
    }
    drawInterviewList(doc, cur, surveys)
  }
  drawFooters(doc)
  return doc.toBuffer()
}

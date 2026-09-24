import { X, MapPin, Calendar, User, Download, Crosshair } from 'lucide-react'
import type { PlacedSurvey, Question } from '../lib/types'
import { SECTION_LABELS, SECTION_ORDER, SECTION_COLORS, BIOME_COLORS } from '../lib/types'
import { labelFor } from '../lib/stats'
import { fmtDateTime, fmtCoord } from '../lib/format'
import { exportUrl } from '../lib/api'

interface Props {
  survey: PlacedSurvey
  questions: Question[]
  onClose: () => void
  onZoom: () => void
}

export default function DetailDrawer({ survey, questions, onClose, onZoom }: Props) {
  const answered = questions.filter((q) => survey.answers[q.key] != null)
  return (
    <aside className="absolute top-0 right-0 bottom-0 z-20 w-full sm:w-[400px] bg-white/95 backdrop-blur border-l border-sand-200 shadow-2xl flex flex-col animate-fade-up">
      <header className="px-5 pt-4 pb-3 border-b border-sand-200">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-forest-700">Entrevista #{survey.id} · Lote {survey.lotNumber ?? '—'}</p>
            <h2 className="text-[18px] font-bold text-ink-900 leading-tight mt-0.5">{survey.settlementName}</h2>
            <p className="text-[12.5px] text-ink-600 mt-0.5 flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full" style={{ background: BIOME_COLORS[survey.biome] }} />
              {survey.municipality} · {survey.biome}
            </p>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-1.5 text-ink-400 hover:bg-sand-100 hover:text-ink-900" aria-label="Fechar"><X size={18} /></button>
        </div>
        <dl className="mt-3 grid grid-cols-1 gap-1 text-[12px] text-ink-600">
          <div className="flex items-center gap-2"><Calendar size={13} className="text-ink-400" /> Concluída em {fmtDateTime(survey.completedAt ?? survey.createdAt)}</div>
          <div className="flex items-center gap-2"><User size={13} className="text-ink-400" /> {survey.interviewer}</div>
          <div className="flex items-center gap-2"><MapPin size={13} className="text-ink-400" /> {survey.approx ? 'Sem GPS · posição aproximada no assentamento' : fmtCoord(survey.lat, survey.lng)}</div>
        </dl>
        <div className="mt-3 flex gap-2">
          <button type="button" onClick={onZoom} className="inline-flex items-center gap-1.5 rounded-lg bg-forest-900 px-3 py-1.5 text-[12px] font-semibold text-white hover:bg-forest-800"><Crosshair size={13} /> Centralizar</button>
          <a href={exportUrl('pdf', [survey.id], { title: `Entrevista #${survey.id} · Lote ${survey.lotNumber ?? '—'}` })} className="inline-flex items-center gap-1.5 rounded-lg border border-sand-300 bg-white px-3 py-1.5 text-[12px] font-semibold text-ink-900 hover:border-forest-500"><Download size={13} /> PDF</a>
          <a href={exportUrl('csv', [survey.id])} className="inline-flex items-center gap-1.5 rounded-lg border border-sand-300 bg-white px-3 py-1.5 text-[12px] font-semibold text-ink-900 hover:border-forest-500"><Download size={13} /> CSV</a>
        </div>
      </header>
      <div className="flex-1 overflow-y-auto scrollbar-thin px-5 py-4">
        {answered.length === 0 && <p className="text-[13px] text-ink-400">Nenhuma resposta registrada nesta entrevista.</p>}
        {SECTION_ORDER.map((sec) => {
          const qs = answered.filter((q) => q.section === sec)
          if (qs.length === 0) return null
          return (
            <section key={sec} className="mb-6">
              <h3 className="text-[11px] font-bold uppercase tracking-[0.12em] mb-2 pb-1.5 border-b-2" style={{ color: SECTION_COLORS[sec], borderColor: SECTION_COLORS[sec] }}>{SECTION_LABELS[sec]} · {qs.length}</h3>
              <ol className="space-y-3">
                {qs.map((q) => (
                  <li key={q.key}>
                    <p className="text-[11.5px] text-ink-400 leading-snug">{q.number}. {q.text}</p>
                    <p className="text-[13px] font-semibold text-ink-900 leading-snug">{labelFor(q, survey.answers[q.key])}</p>
                    {survey.texts[q.key] && <p className="text-[12px] italic text-ink-600">“{survey.texts[q.key]}”</p>}
                  </li>
                ))}
              </ol>
            </section>
          )
        })}
      </div>
    </aside>
  )
}

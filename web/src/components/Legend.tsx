import type { ColorEntry } from '../lib/colors'
import type { Question } from '../lib/types'
import { BIOME_COLORS } from '../lib/types'
import type { LayerVisibility } from './MapView'

interface Props {
  entries: ColorEntry[]
  variable: string
  question?: Question
  layers: LayerVisibility
  counts: Map<string, number>
}

export default function Legend({ entries, variable, question, layers, counts }: Props) {
  const title = variable === 'none' ? 'Entrevistas' : variable === 'settlement' ? 'Assentamento' : variable === 'biome' ? 'Bioma' : variable === 'gps' ? 'Localização' : question ? `${question.number}. ${question.text}` : ''
  const shown = entries.filter((e) => e.value === '*' || (counts.get(e.value) ?? 0) > 0 || entries.length <= 6)
  return (
    <div className="pointer-events-auto max-w-[260px] rounded-xl border border-black/10 bg-white/92 backdrop-blur px-3 py-2.5 shadow-lg text-[11.5px]">
      {layers.points && (
        <div>
          <p className="font-semibold text-ink-900 leading-snug mb-1.5">{title}</p>
          <ul className="space-y-1">
            {shown.map((e) => (
              <li key={e.value} className="flex items-center gap-2">
                <span className="h-3 w-3 rounded-full border-2 border-white shadow-sm shrink-0" style={{ background: e.color }} />
                <span className="flex-1 text-ink-600 leading-snug truncate">{e.label}</span>
                {e.value !== '*' && <span className="tabular-nums text-ink-400">{counts.get(e.value) ?? 0}</span>}
              </li>
            ))}
            <li className="flex items-center gap-2 pt-1 border-t border-sand-200 mt-1">
              <span className="h-3 w-3 rounded-full border-2 border-gray-500 bg-gray-300 opacity-70 shrink-0" />
              <span className="text-ink-400 leading-snug">contorno cinza = posição aproximada (sem GPS)</span>
            </li>
          </ul>
        </div>
      )}
      {(layers.biomes || layers.settlements) && (
        <div className={layers.points ? 'mt-2 pt-2 border-t border-sand-200' : ''}>
          <p className="font-semibold text-ink-900 mb-1">Biomas (IBGE)</p>
          <ul className="flex flex-wrap gap-x-3 gap-y-1">
            {Object.entries(BIOME_COLORS).map(([b, c]) => (
              <li key={b} className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm" style={{ background: c, opacity: 0.6 }} />{b}</li>
            ))}
          </ul>
          {layers.settlements && <p className="mt-1 text-ink-400">Área tracejada = assentamento (referência)</p>}
        </div>
      )}
    </div>
  )
}

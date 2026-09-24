import { useEffect, useRef, useState } from 'react'
import { Download, FileText, Table, Map as MapIcon, FileSpreadsheet, ChevronDown, Printer } from 'lucide-react'
import { exportUrl } from '../lib/api'

interface Props { ids: number[]; filterSummary: string; total: number }

export default function ExportMenu({ ids, filterSummary, total }: Props) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!open) return
    const onDoc = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [open])
  const n = ids.length
  const label = n === total ? `todas as ${n}` : `${n} de ${total}`
  const items = [
    { icon: <FileText size={15} />, title: 'Relatório PDF', hint: 'indicadores + distribuição por pergunta', href: exportUrl('pdf', ids, { filters: filterSummary }) },
    { icon: <FileSpreadsheet size={15} />, title: 'Planilha Excel (.xlsx)', hint: 'uma linha por entrevista', href: exportUrl('xlsx', ids) },
    { icon: <Table size={15} />, title: 'CSV', hint: 'separador ; · UTF-8 com BOM', href: exportUrl('csv', ids) },
    { icon: <MapIcon size={15} />, title: 'GeoJSON', hint: 'pontos georreferenciados para QGIS/ArcGIS', href: exportUrl('geojson', ids) },
  ]
  return (
    <div ref={ref} className="relative">
      <button type="button" onClick={() => setOpen((o) => !o)} disabled={n === 0}
        className="inline-flex items-center gap-1.5 rounded-lg bg-forest-900 px-3 py-2 text-[12.5px] font-semibold text-white hover:bg-forest-800 disabled:opacity-50">
        <Download size={14} /> Exportar <ChevronDown size={13} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="absolute right-0 mt-1.5 w-72 rounded-xl border border-sand-200 bg-white p-1.5 shadow-2xl z-30 animate-fade-up">
          <p className="px-2.5 py-1.5 text-[11px] text-ink-400">Recorte atual: <span className="font-semibold text-ink-900">{label} entrevistas</span></p>
          {items.map((it) => (
            <a key={it.title} href={it.href} onClick={() => setOpen(false)} className="flex items-start gap-2.5 rounded-lg px-2.5 py-2 hover:bg-sand-100">
              <span className="mt-0.5 text-forest-700">{it.icon}</span>
              <span>
                <span className="block text-[13px] font-semibold text-ink-900">{it.title}</span>
                <span className="block text-[11px] text-ink-400">{it.hint}</span>
              </span>
            </a>
          ))}
          <button type="button" onClick={() => { setOpen(false); window.print() }} className="flex w-full items-start gap-2.5 rounded-lg px-2.5 py-2 hover:bg-sand-100 text-left">
            <span className="mt-0.5 text-forest-700"><Printer size={15} /></span>
            <span>
              <span className="block text-[13px] font-semibold text-ink-900">Imprimir tela</span>
              <span className="block text-[11px] text-ink-400">mapa e painéis como estão</span>
            </span>
          </button>
        </div>
      )}
    </div>
  )
}

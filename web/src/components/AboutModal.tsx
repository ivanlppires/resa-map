import { X } from 'lucide-react'

export default function AboutModal({ onClose, generatedAt }: { onClose: () => void; generatedAt: string }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl animate-fade-up" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between">
          <img src="/logo-resa.png" alt="RESA" className="h-10 object-contain" />
          <button type="button" onClick={onClose} className="rounded-lg p-1.5 text-ink-400 hover:bg-sand-100" aria-label="Fechar"><X size={18} /></button>
        </div>
        <h2 className="mt-3 text-[20px] font-bold text-ink-900">Sobre a plataforma</h2>
        <p className="mt-2 text-[13.5px] text-ink-600 leading-relaxed">
          O <strong>RESA Map</strong> é a plataforma territorial do projeto <em>Viabilidade Econômica de Assentamentos Rurais nos Três Biomas de Mato Grosso: Análise Integrada de Sustentabilidade, Carbono e Dinâmica Territorial</em> (UNEMAT / LAEGC).
          Ele reúne, em um mapa navegável, as entrevistas coletadas em campo com o aplicativo RESA Survey — 68 perguntas em três eixos (socioeconômico, comportamental e ambiental) — sobre camadas de contexto territorial.
        </p>
        <ul className="mt-3 space-y-1.5 text-[13px] text-ink-600">
          <li><strong>Camadas:</strong> limite estadual, municípios e biomas (IBGE); assentamentos e entrevistas do RESA Survey.</li>
          <li><strong>Filtros:</strong> por assentamento, município, bioma e por qualquer resposta do questionário.</li>
          <li><strong>Painel:</strong> indicadores e distribuições recalculados para o recorte selecionado.</li>
          <li><strong>Exportação:</strong> relatório PDF, Excel, CSV e GeoJSON do recorte.</li>
        </ul>
        <p className="mt-3 text-[12px] text-ink-400">Dados sincronizados do RESA Survey em {new Date(generatedAt).toLocaleString('pt-BR', { timeZone: 'America/Cuiaba' })}. Versão MVP — posições sem GPS são aproximadas; polígonos oficiais dos assentamentos (INCRA) serão integrados.</p>
      </div>
    </div>
  )
}

import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { ArrowRight, Layers, SlidersHorizontal, BarChart3, FileDown, MapPin, Search, Smartphone, RefreshCw, Database, Map as MapIcon, Leaf, TreePine, Waves } from 'lucide-react'
import HeroMap from '../components/HeroMap'

interface Stats { surveys: number; with_gps: number; settlements: number; municipalities: number; biomes: number; questions: number; last_sync: string | null }

const FEATURES = [
  { icon: <Layers size={20} />, title: 'Camadas sobrepostas', text: 'Biomas, municípios, limite estadual, assentamentos e entrevistas — ligue e desligue cada camada sobre satélite, ruas ou relevo.' },
  { icon: <SlidersHorizontal size={20} />, title: 'Filtros por resposta', text: 'Recorte o território por assentamento, município, bioma ou por qualquer uma das 68 perguntas do questionário.' },
  { icon: <BarChart3 size={20} />, title: 'Painel dinâmico', text: 'Indicadores e distribuições recalculados na hora para o recorte selecionado, com comparação entre assentamentos.' },
  { icon: <MapPin size={20} />, title: 'Ficha por lote', text: 'Clique em um ponto e veja as respostas completas da entrevista, organizadas nos três eixos da pesquisa.' },
  { icon: <FileDown size={20} />, title: 'Relatórios e exportação', text: 'Relatório PDF com gráficos, planilha Excel, CSV e GeoJSON prontos para QGIS, R ou Python.' },
  { icon: <Search size={20} />, title: 'Busca territorial', text: 'Encontre um município, um assentamento ou um lote e voe até ele no mapa.' },
]

const BIOMES = [
  { name: 'Amazônia', color: '#1D8F47', icon: <TreePine size={22} />, text: 'Floresta e fronteira agrícola no norte do estado.' },
  { name: 'Cerrado', color: '#D4870A', icon: <Leaf size={22} />, text: 'Savana tropical, coração da produção de grãos.' },
  { name: 'Pantanal', color: '#0F766E', icon: <Waves size={22} />, text: 'Maior planície alagável do planeta, no sudoeste.' },
]

const AXES = [
  { title: 'Socioeconômico', color: '#2E7CE6', items: ['Perfil da família e escolaridade', 'Renda, mão de obra e atividades', 'Planejamento e controle de custos', 'Crédito, programas e assistência técnica', 'Sucessão e permanência no campo'] },
  { title: 'Comportamental', color: '#D4870A', items: ['Busca e fontes de informação', 'Aversão a risco e a dívidas', 'Relação com a comunidade e o lote', 'Abertura a técnicas novas', 'Decisões sob incerteza climática'] },
  { title: 'Ambiental', color: '#22A352', items: ['Irrigação e fontes de água', 'Agrotóxicos e descarte de embalagens', 'Adubação orgânica e conservação do solo', 'Áreas de preservação e recuperação', 'Percepção das mudanças do clima'] },
]

export default function LandingPage() {
  const [stats, setStats] = useState<Stats | null>(null)
  useEffect(() => { fetch('/api/stats').then((r) => r.json()).then(setStats).catch(() => null) }, [])
  const n = (v: number | undefined, fallback: string) => (v == null ? fallback : String(v))

  return (
    <div className="min-h-full bg-sand-50 text-ink-900">
      {/* Nav */}
      <header className="sticky top-0 z-40 border-b border-black/5 bg-sand-50/85 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5">
          <a href="#" className="flex items-center gap-3">
            <img src="/logo-resa.png" alt="RESA — Rede de Pesquisa para uma Economia Sustentável da Amazônia" className="h-9 object-contain" />
            <span className="hidden sm:block text-[13px] font-semibold text-ink-600 border-l border-sand-300 pl-3">Plataforma Territorial</span>
          </a>
          <nav className="hidden md:flex items-center gap-7 text-[13.5px] font-medium text-ink-600">
            <a href="#projeto" className="hover:text-forest-800">O projeto</a>
            <a href="#plataforma" className="hover:text-forest-800">A plataforma</a>
            <a href="#dados" className="hover:text-forest-800">Os dados</a>
            <a href="#eixos" className="hover:text-forest-800">Questionário</a>
          </nav>
          <Link to="/mapa" className="inline-flex items-center gap-2 rounded-full bg-forest-900 px-4 py-2 text-[13.5px] font-semibold text-white hover:bg-forest-800 transition-colors">
            Acessar a plataforma <ArrowRight size={15} />
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden bg-forest-950 text-white">
        <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse 70% 60% at 15% 20%, rgba(34,163,82,0.35), transparent 65%), radial-gradient(ellipse 50% 50% at 90% 80%, rgba(212,135,10,0.22), transparent 70%), radial-gradient(ellipse 40% 40% at 60% 100%, rgba(15,118,110,0.25), transparent 70%)' }} />
        <div className="relative mx-auto grid max-w-6xl grid-cols-1 items-center gap-10 px-5 py-16 md:grid-cols-[1.05fr_1fr] md:py-24">
          <div className="animate-fade-up">
            <p className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-[11.5px] font-semibold uppercase tracking-[0.14em] text-forest-400">
              <span className="h-1.5 w-1.5 rounded-full bg-cerrado" /> UNEMAT · LAEGC · Projeto RESA
            </p>
            <h1 className="mt-5 font-display text-[40px] leading-[1.05] font-semibold sm:text-[52px] md:text-[58px]">
              O território dos assentamentos rurais de Mato Grosso, <span className="text-forest-400">em um mapa vivo.</span>
            </h1>
            <p className="mt-5 max-w-xl text-[16px] leading-relaxed text-white/75">
              O RESA Map transforma as entrevistas coletadas em campo nos três biomas do estado em camadas navegáveis: viabilidade econômica, comportamento do produtor e práticas ambientais, lote a lote, sobre o mapa.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link to="/mapa" className="inline-flex items-center gap-2 rounded-full bg-forest-500 px-6 py-3 text-[15px] font-semibold text-forest-950 hover:bg-forest-400 transition-colors shadow-[0_0_0_6px_rgba(34,163,82,0.18)]">
                Abrir o mapa <ArrowRight size={17} />
              </Link>
              <a href="#projeto" className="inline-flex items-center gap-2 rounded-full border border-white/20 px-6 py-3 text-[15px] font-semibold text-white/90 hover:bg-white/10 transition-colors">Conhecer o projeto</a>
            </div>
            <dl className="mt-10 grid grid-cols-2 gap-x-6 gap-y-5 sm:grid-cols-4">
              {[
                { v: n(stats?.biomes, '3'), l: 'biomas' },
                { v: n(stats?.settlements, '4'), l: 'assentamentos' },
                { v: n(stats?.surveys, '—'), l: 'entrevistas' },
                { v: n(stats?.questions, '68'), l: 'perguntas' },
              ].map((s) => (
                <div key={s.l}>
                  <dt className="font-display text-[34px] font-semibold leading-none text-white">{s.v}</dt>
                  <dd className="mt-1 text-[12px] font-semibold uppercase tracking-[0.12em] text-white/55">{s.l}</dd>
                </div>
              ))}
            </dl>
          </div>
          <div className="relative animate-fade-up" style={{ animationDelay: '0.15s' }}>
            <HeroMap />
            <p className="mt-3 text-center text-[11px] text-white/45">Biomas IBGE · limite estadual · municípios com assentamentos no estudo</p>
          </div>
        </div>
      </section>

      {/* O projeto */}
      <section id="projeto" className="mx-auto max-w-6xl px-5 py-20">
        <div className="grid grid-cols-1 gap-12 md:grid-cols-[1fr_1.1fr] md:items-start">
          <div>
            <p className="text-[12px] font-bold uppercase tracking-[0.14em] text-forest-700">O projeto</p>
            <h2 className="mt-3 font-display text-[34px] leading-tight font-semibold sm:text-[40px]">Viabilidade econômica de assentamentos rurais nos três biomas de Mato Grosso</h2>
            <p className="mt-5 text-[15.5px] leading-relaxed text-ink-600">
              Uma análise integrada de sustentabilidade, carbono e dinâmica territorial conduzida pela UNEMAT com o Laboratório de Análise Econômica, Gestão e Controle (LAEGC). Entrevistadores percorrem lotes de assentamentos da reforma agrária aplicando um questionário estruturado que revela como as famílias produzem, decidem e se relacionam com o ambiente.
            </p>
            <p className="mt-4 text-[15.5px] leading-relaxed text-ink-600">
              Ao georreferenciar cada entrevista, a pesquisa deixa de ser uma tabela e passa a ser um território: padrões espaciais, contrastes entre biomas e assentamentos, e evidências para políticas públicas de desenvolvimento rural.
            </p>
          </div>
          <div className="grid gap-4">
            {BIOMES.map((b) => (
              <div key={b.name} className="flex items-start gap-4 rounded-2xl border border-sand-200 bg-white p-5 shadow-sm">
                <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-white" style={{ background: b.color }}>{b.icon}</span>
                <div>
                  <h3 className="text-[17px] font-bold">{b.name}</h3>
                  <p className="mt-0.5 text-[13.5px] text-ink-600">{b.text}</p>
                </div>
              </div>
            ))}
            <p className="text-[12px] text-ink-400">Os assentamentos pesquisados até o momento estão em Lucas do Rio Verde (Cerrado) e Cáceres (Pantanal); a expansão para a Amazônia mato-grossense está no plano de campo.</p>
          </div>
        </div>
      </section>

      {/* A plataforma */}
      <section id="plataforma" className="bg-forest-900 text-white">
        <div className="mx-auto max-w-6xl px-5 py-20">
          <div className="max-w-2xl">
            <p className="text-[12px] font-bold uppercase tracking-[0.14em] text-forest-400">A plataforma</p>
            <h2 className="mt-3 font-display text-[34px] leading-tight font-semibold sm:text-[40px]">Navegue pelos dados como quem caminha pelo assentamento</h2>
            <p className="mt-4 text-[15.5px] leading-relaxed text-white/70">Inspirado em plataformas públicas de gestão territorial, o RESA Map organiza a pesquisa em camadas, filtros e painéis que respondem a cada clique no mapa.</p>
          </div>
          <div className="mt-12 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f) => (
              <div key={f.title} className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur hover:bg-white/10 transition-colors">
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-forest-500/20 text-forest-400">{f.icon}</span>
                <h3 className="mt-4 text-[17px] font-bold">{f.title}</h3>
                <p className="mt-1.5 text-[13.5px] leading-relaxed text-white/70">{f.text}</p>
              </div>
            ))}
          </div>
          <div className="mt-12 flex flex-wrap items-center gap-4">
            <Link to="/mapa" className="inline-flex items-center gap-2 rounded-full bg-white px-6 py-3 text-[15px] font-semibold text-forest-900 hover:bg-forest-50 transition-colors">Abrir o mapa <ArrowRight size={17} /></Link>
            <span className="text-[13px] text-white/55">Acesso com o mesmo login (e-mail e senha) do aplicativo RESA Survey.</span>
          </div>
        </div>
      </section>

      {/* Os dados */}
      <section id="dados" className="mx-auto max-w-6xl px-5 py-20">
        <p className="text-[12px] font-bold uppercase tracking-[0.14em] text-forest-700">Os dados</p>
        <h2 className="mt-3 max-w-2xl font-display text-[34px] leading-tight font-semibold sm:text-[40px]">Do lote ao mapa, sem internet no caminho</h2>
        <div className="mt-10 grid grid-cols-1 gap-6 md:grid-cols-4">
          {[
            { icon: <Smartphone size={20} />, t: 'Coleta em campo', d: 'O RESA Survey (PWA) funciona 100% offline no celular do entrevistador e registra a posição GPS do lote.' },
            { icon: <RefreshCw size={20} />, t: 'Sincronização', d: 'Ao reencontrar sinal, as entrevistas sobem para o servidor de forma idempotente — nada se perde nem duplica.' },
            { icon: <Database size={20} />, t: 'Base única', d: 'Perguntas, assentamentos e respostas ficam em um banco PostgreSQL no servidor do LAEGC, com backup diário.' },
            { icon: <MapIcon size={20} />, t: 'RESA Map', d: 'A plataforma lê a base (somente leitura) e cruza com as malhas territoriais do IBGE para montar as camadas.' },
          ].map((s, i) => (
            <div key={s.t} className="relative rounded-2xl border border-sand-200 bg-white p-6 shadow-sm">
              <span className="absolute -top-3 left-6 rounded-full bg-forest-900 px-2.5 py-0.5 text-[11px] font-bold text-white">{i + 1}</span>
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-forest-50 text-forest-700">{s.icon}</span>
              <h3 className="mt-4 text-[16px] font-bold">{s.t}</h3>
              <p className="mt-1.5 text-[13.5px] leading-relaxed text-ink-600">{s.d}</p>
            </div>
          ))}
        </div>
        <div className="mt-10 grid grid-cols-2 gap-4 rounded-2xl bg-sand-100 p-6 sm:grid-cols-4">
          {[
            { v: n(stats?.surveys, '—'), l: 'entrevistas sincronizadas' },
            { v: n(stats?.with_gps, '—'), l: 'com coordenada GPS' },
            { v: n(stats?.municipalities, '2'), l: 'municípios' },
            { v: stats?.last_sync ? new Date(stats.last_sync).toLocaleDateString('pt-BR', { timeZone: 'America/Cuiaba' }) : '—', l: 'última sincronização' },
          ].map((s) => (
            <div key={s.l}>
              <div className="font-display text-[30px] font-semibold leading-none text-forest-900">{s.v}</div>
              <div className="mt-1 text-[12px] text-ink-600">{s.l}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Eixos */}
      <section id="eixos" className="border-t border-sand-200 bg-white">
        <div className="mx-auto max-w-6xl px-5 py-20">
          <p className="text-[12px] font-bold uppercase tracking-[0.14em] text-forest-700">O questionário</p>
          <h2 className="mt-3 max-w-2xl font-display text-[34px] leading-tight font-semibold sm:text-[40px]">68 perguntas, três eixos, um retrato do produtor assentado</h2>
          <div className="mt-10 grid grid-cols-1 gap-6 md:grid-cols-3">
            {AXES.map((a) => (
              <div key={a.title} className="rounded-2xl border border-sand-200 p-6" style={{ borderTopWidth: 4, borderTopColor: a.color }}>
                <h3 className="text-[18px] font-bold" style={{ color: a.color }}>{a.title}</h3>
                <ul className="mt-4 space-y-2 text-[14px] text-ink-600">
                  {a.items.map((it) => <li key={it} className="flex gap-2"><span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: a.color }} />{it}</li>)}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA final */}
      <section className="mx-auto max-w-6xl px-5 py-20">
        <div className="relative overflow-hidden rounded-3xl bg-forest-950 px-8 py-14 text-center text-white sm:px-16">
          <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse 60% 80% at 50% 120%, rgba(34,163,82,0.45), transparent 70%)' }} />
          <div className="relative">
            <h2 className="font-display text-[32px] font-semibold leading-tight sm:text-[40px]">Pronto para explorar o território?</h2>
            <p className="mx-auto mt-3 max-w-xl text-[15px] text-white/70">Abra o mapa, escolha uma pergunta e veja o assentamento responder.</p>
            <Link to="/mapa" className="mt-8 inline-flex items-center gap-2 rounded-full bg-forest-500 px-7 py-3.5 text-[15px] font-semibold text-forest-950 hover:bg-forest-400 transition-colors">Acessar a plataforma <ArrowRight size={17} /></Link>
          </div>
        </div>
      </section>

      <footer className="border-t border-sand-200">
        <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-6 px-5 py-10 text-[13px] text-ink-600 md:flex-row md:items-center">
          <div className="flex items-center gap-4">
            <img src="/logo-resa.png" alt="RESA" className="h-10 object-contain" />
            <div>
              <p className="font-semibold text-ink-900">RESA Map · Plataforma Territorial</p>
              <p className="text-[12px] text-ink-400">Universidade do Estado de Mato Grosso · LAEGC — Laboratório de Análise Econômica, Gestão e Controle</p>
            </div>
          </div>
          <div className="text-[12px] text-ink-400">
            <p>Malhas territoriais: IBGE. Imagens: Esri, OpenStreetMap, CARTO, OpenTopoMap.</p>
            <p>© {new Date().getFullYear()} Projeto RESA / UNEMAT · versão MVP</p>
          </div>
        </div>
      </footer>
    </div>
  )
}

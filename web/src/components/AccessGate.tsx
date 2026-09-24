import { useState, type FormEvent } from 'react'
import { Link } from 'react-router'
import { Lock, ArrowRight } from 'lucide-react'
import { api, ApiError } from '../lib/api'

export default function AccessGate({ onGranted }: { onGranted: () => void }) {
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await api.access(code)
      onGranted()
    } catch (err) {
      setError(err instanceof ApiError && err.status === 401 ? 'Código de acesso inválido.' : 'Não foi possível conectar ao servidor.')
    } finally {
      setLoading(false)
    }
  }
  return (
    <div className="min-h-full flex items-center justify-center bg-forest-950 px-6" style={{ backgroundImage: 'radial-gradient(ellipse 60% 50% at 20% 10%, rgba(34,163,82,0.25), transparent 70%), radial-gradient(ellipse 50% 50% at 90% 90%, rgba(212,135,10,0.18), transparent 70%)' }}>
      <form onSubmit={submit} className="w-full max-w-sm rounded-2xl bg-white p-7 shadow-2xl animate-fade-up">
        <img src="/logo-resa.png" alt="RESA" className="h-12 object-contain" />
        <h1 className="mt-4 text-[20px] font-bold text-ink-900">Plataforma Territorial</h1>
        <p className="mt-1 text-[13px] text-ink-600">Área restrita à equipe do projeto. Informe o código de acesso para abrir o mapa.</p>
        <label className="mt-5 block text-[11px] font-bold uppercase tracking-wider text-ink-400">Código de acesso</label>
        <div className="mt-1 relative">
          <Lock size={15} className="absolute left-3 top-3 text-ink-400" />
          <input value={code} onChange={(e) => setCode(e.target.value)} type="password" autoFocus autoComplete="current-password"
            className="w-full rounded-lg border border-sand-300 pl-9 pr-3 py-2.5 text-[14px] focus:outline-none focus:ring-2 focus:ring-forest-500" />
        </div>
        {error && <p className="mt-2 text-[12.5px] text-red-600">{error}</p>}
        <button type="submit" disabled={loading || code === ''} className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-forest-900 py-2.5 text-[14px] font-semibold text-white hover:bg-forest-800 disabled:opacity-50">
          {loading ? 'Verificando…' : 'Entrar'} <ArrowRight size={16} />
        </button>
        <Link to="/" className="mt-4 block text-center text-[12.5px] text-ink-400 hover:text-forest-800">← Voltar à página inicial</Link>
      </form>
    </div>
  )
}

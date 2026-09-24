import { useEffect, useMemo, useState } from 'react'
import type { FeatureCollection } from '../lib/geo'
import { BIOME_COLORS } from '../lib/types'

/** Mapa ilustrativo de Mato Grosso em SVG (biomas IBGE + municípios do estudo), sem dependência do MapLibre. */
const W = 560, H = 520
const BBOX = { minX: -61.7, maxX: -50.2, minY: -18.1, maxY: -7.3 }
const SITES = [
  { name: 'Lucas do Rio Verde', sub: '3 assentamentos · Cerrado', lng: -55.91, lat: -13.06 },
  { name: 'Cáceres', sub: '1 assentamento · Pantanal', lng: -57.68, lat: -16.07 },
]

function project(lng: number, lat: number): [number, number] {
  const x = ((lng - BBOX.minX) / (BBOX.maxX - BBOX.minX)) * W
  const y = ((BBOX.maxY - lat) / (BBOX.maxY - BBOX.minY)) * H
  return [x, y]
}

function pathOf(geometry: { type: string; coordinates: unknown }): string {
  const rings: number[][][] = geometry.type === 'Polygon'
    ? (geometry.coordinates as number[][][])
    : (geometry.coordinates as number[][][][]).flat()
  return rings.map((ring) => ring.map(([lng, lat], i) => { const [x, y] = project(lng, lat); return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)} ${y.toFixed(1)}` }).join(' ') + 'Z').join(' ')
}

export default function HeroMap() {
  const [biomes, setBiomes] = useState<FeatureCollection | null>(null)
  const [state, setState] = useState<FeatureCollection | null>(null)
  useEffect(() => {
    fetch('/geo/biomas_mt.geojson').then((r) => r.json()).then(setBiomes).catch(() => null)
    fetch('/geo/mt_estado.geojson').then((r) => r.json()).then(setState).catch(() => null)
  }, [])
  const biomePaths = useMemo(() => biomes?.features.map((f) => ({ d: pathOf(f.geometry), name: String(f.properties.bioma) })) ?? [], [biomes])
  const statePath = useMemo(() => state?.features.map((f) => pathOf(f.geometry)).join(' ') ?? '', [state])
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto drop-shadow-2xl" role="img" aria-label="Mapa de Mato Grosso com biomas e municípios do estudo">
      <defs>
        <filter id="glow"><feGaussianBlur stdDeviation="3" result="b" /><feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
        <pattern id="grid" width="28" height="28" patternUnits="userSpaceOnUse"><path d="M28 0H0V28" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="1" /></pattern>
      </defs>
      <rect width={W} height={H} fill="url(#grid)" />
      <g className="animate-fade-up">
        {biomePaths.map((b) => (
          <path key={b.name} d={b.d} fill={BIOME_COLORS[b.name] ?? '#6B7280'} fillOpacity={0.55} stroke={BIOME_COLORS[b.name] ?? '#6B7280'} strokeOpacity={0.9} strokeWidth={1} />
        ))}
        {statePath && <path d={statePath} fill="none" stroke="#F5B301" strokeWidth={2.2} strokeLinejoin="round" filter="url(#glow)" />}
      </g>
      {biomePaths.map((b) => {
        const centers: Record<string, [number, number]> = { 'Amazônia': project(-56.3, -10.6), 'Cerrado': project(-54.2, -14.9), 'Pantanal': project(-57.2, -17.1) }
        const c = centers[b.name]
        return c ? <text key={b.name} x={c[0]} y={c[1]} textAnchor="middle" fontSize="12" fontWeight="700" letterSpacing="0.14em" fill="rgba(255,255,255,0.85)" style={{ textTransform: 'uppercase' }}>{b.name.toUpperCase()}</text> : null
      })}
      {SITES.map((s, i) => {
        const [x, y] = project(s.lng, s.lat)
        return (
          <g key={s.name}>
            <circle cx={x} cy={y} r={7} fill="#F5B301" opacity={0.35} style={{ transformOrigin: `${x}px ${y}px`, animation: `pulse-ring 2.4s ease-out ${i * 0.8}s infinite` }} />
            <circle cx={x} cy={y} r={5} fill="#FFFFFF" stroke="#0F3D2E" strokeWidth={2} />
            <g transform={`translate(${x + 12},${y - 14})`}>
              <rect x={0} y={0} width={168} height={38} rx={8} fill="rgba(6,35,26,0.88)" stroke="rgba(255,255,255,0.15)" />
              <text x={10} y={16} fontSize="12" fontWeight="700" fill="#FFFFFF">{s.name}</text>
              <text x={10} y={30} fontSize="10" fill="rgba(255,255,255,0.7)">{s.sub}</text>
            </g>
          </g>
        )
      })}
    </svg>
  )
}

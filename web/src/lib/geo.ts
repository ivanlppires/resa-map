import type { PlacedSettlement, PlacedSurvey, Settlement, Survey } from './types'

export type FeatureCollection = { type: 'FeatureCollection'; features: Feature[] }
export type Feature = { type: 'Feature'; geometry: { type: string; coordinates: unknown }; properties: Record<string, unknown> }

export function normalize(s: string): string {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim()
}

export function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLng = ((lng2 - lng1) * Math.PI) / 180
  const a = Math.sin(dLat / 2) ** 2 + Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(a))
}

/** Centro aproximado de uma feature (média dos vértices do maior anel). */
export function featureCenter(f: Feature): [number, number] | null {
  const g = f.geometry
  let rings: number[][][] = []
  if (g.type === 'Polygon') rings = g.coordinates as number[][][]
  else if (g.type === 'MultiPolygon') rings = (g.coordinates as number[][][][]).map((p) => p[0])
  if (rings.length === 0) return null
  const ring = rings.reduce((a, b) => (b.length > a.length ? b : a))
  let sx = 0, sy = 0
  for (const [x, y] of ring) { sx += x; sy += y }
  return [sx / ring.length, sy / ring.length]
}

/** Polígono circular (GeoJSON) de raio em km. */
export function circlePolygon(lng: number, lat: number, radiusKm: number, steps = 48): Feature['geometry'] {
  const coords: number[][] = []
  const dLat = radiusKm / 110.574
  const dLng = radiusKm / (111.32 * Math.cos((lat * Math.PI) / 180))
  for (let i = 0; i <= steps; i++) {
    const t = (i / steps) * Math.PI * 2
    coords.push([lng + dLng * Math.cos(t), lat + dLat * Math.sin(t)])
  }
  return { type: 'Polygon', coordinates: [coords] }
}

/**
 * Posiciona assentamentos: centro = média dos pontos GPS das entrevistas;
 * sem GPS, usa o centro do município (malha IBGE). O raio é uma área de
 * referência visual até os polígonos oficiais do INCRA serem integrados.
 */
export function placeSettlements(settlements: Settlement[], surveys: Survey[], municipios: FeatureCollection | null): PlacedSettlement[] {
  const byMun = new Map<string, [number, number]>()
  if (municipios) {
    for (const f of municipios.features) {
      const c = featureCenter(f)
      if (c) byMun.set(normalize(String(f.properties.name ?? '')), c)
    }
  }
  return settlements.map((s) => {
    const pts = surveys.filter((x) => x.settlementId === s.id && x.gpsLat != null && x.gpsLng != null)
    const count = surveys.filter((x) => x.settlementId === s.id).length
    if (pts.length > 0) {
      const lat = pts.reduce((a, p) => a + (p.gpsLat as number), 0) / pts.length
      const lng = pts.reduce((a, p) => a + (p.gpsLng as number), 0) / pts.length
      const maxDist = Math.max(...pts.map((p) => haversineKm(lat, lng, p.gpsLat as number, p.gpsLng as number)))
      return { ...s, lat, lng, radiusKm: Math.max(1.2, maxDist * 1.5), count, approxCentroid: false }
    }
    const c = byMun.get(normalize(s.municipality)) ?? [-55.5, -13.0]
    return { ...s, lng: c[0], lat: c[1], radiusKm: 2.5, count, approxCentroid: true }
  })
}

/** Entrevistas sem GPS ficam em anel ao redor do centro do assentamento (marcadas como aproximadas). */
export function placeSurveys(surveys: Survey[], settlements: PlacedSettlement[]): PlacedSurvey[] {
  const byId = new Map(settlements.map((s) => [s.id, s]))
  const ringIndex = new Map<number, number>()
  return surveys.map((s) => {
    if (s.gpsLat != null && s.gpsLng != null) return { ...s, lat: s.gpsLat, lng: s.gpsLng, approx: false }
    const st = byId.get(s.settlementId)
    if (!st) return { ...s, lat: -13, lng: -55.5, approx: true }
    const i = ringIndex.get(st.id) ?? 0
    ringIndex.set(st.id, i + 1)
    const angle = (i * 137.5 * Math.PI) / 180 // espiral áurea: espalha sem sobrepor
    const r = st.radiusKm * (0.35 + 0.08 * (i % 5))
    const dLat = (r / 110.574) * Math.sin(angle)
    const dLng = (r / (111.32 * Math.cos((st.lat * Math.PI) / 180))) * Math.cos(angle)
    return { ...s, lat: st.lat + dLat, lng: st.lng + dLng, approx: true }
  })
}

export function boundsOf(points: { lng: number; lat: number }[]): [[number, number], [number, number]] | null {
  if (points.length === 0) return null
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
  for (const p of points) {
    minX = Math.min(minX, p.lng); maxX = Math.max(maxX, p.lng)
    minY = Math.min(minY, p.lat); maxY = Math.max(maxY, p.lat)
  }
  return [[minX, minY], [maxX, maxY]]
}

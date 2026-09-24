import { useEffect, useRef, useState } from 'react'
import maplibregl, { Map as MlMap, Popup, type StyleSpecification, type GeoJSONSource, type LngLatBoundsLike } from 'maplibre-gl'
import type { PlacedSettlement, PlacedSurvey } from '../lib/types'
import { BIOME_COLORS } from '../lib/types'
import { circlePolygon, type FeatureCollection } from '../lib/geo'
import { matchExpression, type ColorEntry } from '../lib/colors'

export type BasemapId = 'satellite' | 'streets' | 'topo' | 'light' | 'dark'

export const BASEMAPS: Record<BasemapId, { label: string; tiles: string[]; attribution: string; maxzoom: number; dark: boolean }> = {
  satellite: {
    label: 'Satélite',
    tiles: ['https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'],
    attribution: 'Imagens © Esri, Maxar, Earthstar Geographics',
    maxzoom: 19, dark: true,
  },
  streets: {
    label: 'Ruas',
    tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
    attribution: '© OpenStreetMap contributors',
    maxzoom: 19, dark: false,
  },
  topo: {
    label: 'Relevo',
    tiles: ['https://a.tile.opentopomap.org/{z}/{x}/{y}.png', 'https://b.tile.opentopomap.org/{z}/{x}/{y}.png', 'https://c.tile.opentopomap.org/{z}/{x}/{y}.png'],
    attribution: '© OpenTopoMap (CC-BY-SA), © OpenStreetMap',
    maxzoom: 17, dark: false,
  },
  light: {
    label: 'Claro',
    tiles: ['https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}'],
    attribution: 'Esri, HERE, Garmin, © OpenStreetMap contributors',
    maxzoom: 16, dark: false,
  },
  dark: {
    label: 'Escuro',
    tiles: ['https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}'],
    attribution: 'Esri, HERE, Garmin, © OpenStreetMap contributors',
    maxzoom: 16, dark: true,
  },
}

export interface LayerVisibility {
  state: boolean
  municipalities: boolean
  munLabels: boolean
  surveyedMun: boolean
  biomes: boolean
  settlements: boolean
  settlementLabels: boolean
  points: boolean
  clusters: boolean
  heat: boolean
  lotLabels: boolean
}

export const defaultLayers: LayerVisibility = {
  state: true, municipalities: true, munLabels: true, surveyedMun: true, biomes: true,
  settlements: true, settlementLabels: true, points: true, clusters: false, heat: false, lotLabels: true,
}

export type Focus =
  | { kind: 'bounds'; bounds: LngLatBoundsLike; nonce: number }
  | { kind: 'point'; lng: number; lat: number; zoom: number; nonce: number }

interface Props {
  surveys: PlacedSurvey[]
  settlements: PlacedSettlement[]
  colorEntries: ColorEntry[]
  symbolOf: (s: PlacedSurvey) => { value: string | null; label: string }
  basemap: BasemapId
  layers: LayerVisibility
  selectedId: number | null
  onSelect: (id: number | null) => void
  focus: Focus | null
  onCursor?: (info: { lng: number; lat: number; zoom: number }) => void
  onReady?: () => void
}

const EMPTY: FeatureCollection = { type: 'FeatureCollection', features: [] }
const GLYPHS = 'https://fonts.openmaptiles.org/{fontstack}/{range}.pbf'
const MT_BOUNDS: LngLatBoundsLike = [[-61.7, -18.1], [-50.2, -7.3]]

function biomeMatch(prop: string): unknown {
  const expr: unknown[] = ['match', ['get', prop]]
  for (const [b, c] of Object.entries(BIOME_COLORS)) expr.push(b, c)
  expr.push('#6B7280')
  return expr
}

function buildStyle(): StyleSpecification {
  const sources: StyleSpecification['sources'] = {}
  const layers: StyleSpecification['layers'] = []
  for (const [id, bm] of Object.entries(BASEMAPS)) {
    sources[`bm-${id}`] = { type: 'raster', tiles: bm.tiles, tileSize: 256, maxzoom: bm.maxzoom, attribution: bm.attribution }
    layers.push({ id: `bm-${id}`, type: 'raster', source: `bm-${id}`, layout: { visibility: id === 'satellite' ? 'visible' : 'none' } })
  }
  sources['sat-labels'] = {
    type: 'raster', tileSize: 256, maxzoom: 19,
    tiles: ['https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}'],
  }
  layers.push({ id: 'sat-labels', type: 'raster', source: 'sat-labels', paint: { 'raster-opacity': 0.9 } })

  sources['biomes'] = { type: 'geojson', data: '/geo/biomas_mt.geojson' }
  sources['municipios'] = { type: 'geojson', data: '/geo/mt_municipios.geojson', promoteId: 'code' }
  sources['estado'] = { type: 'geojson', data: '/geo/mt_estado.geojson' }
  sources['settle-area'] = { type: 'geojson', data: EMPTY }
  sources['settle-center'] = { type: 'geojson', data: EMPTY }
  sources['surveys'] = { type: 'geojson', data: EMPTY, promoteId: 'id' }
  sources['surveys-cl'] = { type: 'geojson', data: EMPTY, cluster: true, clusterRadius: 45, clusterMaxZoom: 14 }

  layers.push(
    { id: 'biomes-fill', type: 'fill', source: 'biomes', paint: { 'fill-color': biomeMatch('bioma') as string, 'fill-opacity': 0.22 } },
    { id: 'biomes-line', type: 'line', source: 'biomes', paint: { 'line-color': biomeMatch('bioma') as string, 'line-width': 1.2, 'line-opacity': 0.8 } },
    { id: 'mun-surveyed', type: 'fill', source: 'municipios', filter: ['in', ['get', 'name'], ['literal', []]], paint: { 'fill-color': '#22A352', 'fill-opacity': 0.16 } },
    { id: 'mun-hover', type: 'fill', source: 'municipios', paint: { 'fill-color': '#FFFFFF', 'fill-opacity': ['case', ['boolean', ['feature-state', 'hover'], false], 0.18, 0] } },
    { id: 'mun-line', type: 'line', source: 'municipios', paint: { 'line-color': '#FFFFFF', 'line-width': ['interpolate', ['linear'], ['zoom'], 5, 0.4, 9, 1], 'line-opacity': 0.55 } },
    { id: 'state-casing', type: 'line', source: 'estado', paint: { 'line-color': '#000000', 'line-width': 4, 'line-opacity': 0.25 } },
    { id: 'state-line', type: 'line', source: 'estado', paint: { 'line-color': '#F5B301', 'line-width': 2 } },
    { id: 'settle-fill', type: 'fill', source: 'settle-area', paint: { 'fill-color': biomeMatch('biome') as string, 'fill-opacity': 0.18 } },
    { id: 'settle-line', type: 'line', source: 'settle-area', paint: { 'line-color': biomeMatch('biome') as string, 'line-width': 2, 'line-dasharray': [3, 2] } },
    { id: 'settle-center', type: 'circle', source: 'settle-center', maxzoom: 11, paint: { 'circle-radius': 9, 'circle-color': biomeMatch('biome') as string, 'circle-stroke-color': '#FFFFFF', 'circle-stroke-width': 2.5, 'circle-opacity': 0.95 } },
    { id: 'settle-label', type: 'symbol', source: 'settle-center', layout: { 'text-field': ['get', 'name'], 'text-font': ['Open Sans Bold'], 'text-size': 12.5, 'text-offset': [0, 1.3], 'text-anchor': 'top', 'text-allow-overlap': false }, paint: { 'text-color': '#FFFFFF', 'text-halo-color': '#0F3D2E', 'text-halo-width': 1.6 } },
    { id: 'heat', type: 'heatmap', source: 'surveys', layout: { visibility: 'none' }, paint: {
      'heatmap-weight': 1,
      'heatmap-intensity': ['interpolate', ['linear'], ['zoom'], 8, 0.6, 15, 2],
      'heatmap-radius': ['interpolate', ['linear'], ['zoom'], 8, 18, 14, 45],
      'heatmap-opacity': 0.75,
      'heatmap-color': ['interpolate', ['linear'], ['heatmap-density'], 0, 'rgba(34,163,82,0)', 0.2, 'rgba(34,163,82,0.5)', 0.5, 'rgb(250,204,21)', 0.8, 'rgb(249,115,22)', 1, 'rgb(220,38,38)'],
    } },
    { id: 'cl-circles', type: 'circle', source: 'surveys-cl', filter: ['has', 'point_count'], layout: { visibility: 'none' }, paint: {
      'circle-color': '#0F3D2E', 'circle-opacity': 0.9,
      'circle-radius': ['step', ['get', 'point_count'], 16, 5, 20, 10, 26],
      'circle-stroke-color': '#FFFFFF', 'circle-stroke-width': 2.5,
    } },
    { id: 'cl-count', type: 'symbol', source: 'surveys-cl', filter: ['has', 'point_count'], layout: { visibility: 'none', 'text-field': ['get', 'point_count_abbreviated'], 'text-font': ['Open Sans Bold'], 'text-size': 13 }, paint: { 'text-color': '#FFFFFF' } },
    { id: 'cl-points', type: 'circle', source: 'surveys-cl', filter: ['!', ['has', 'point_count']], layout: { visibility: 'none' }, paint: {
      'circle-radius': 7.5, 'circle-color': '#1D8F47',
      'circle-stroke-color': ['case', ['get', 'approx'], '#4B5563', '#FFFFFF'], 'circle-stroke-width': 2.2,
      'circle-opacity': ['case', ['get', 'approx'], 0.6, 0.96],
    } },
    { id: 'pts', type: 'circle', source: 'surveys', paint: {
      'circle-radius': ['interpolate', ['linear'], ['zoom'], 6, 5, 12, 8, 16, 11],
      'circle-color': '#1D8F47',
      'circle-stroke-color': ['case', ['get', 'approx'], '#4B5563', '#FFFFFF'],
      'circle-stroke-width': 2.2,
      'circle-opacity': ['case', ['get', 'approx'], 0.6, 0.96],
    } },
    { id: 'pts-selected', type: 'circle', source: 'surveys', filter: ['==', ['get', 'id'], -1], paint: { 'circle-radius': 15, 'circle-color': '#FFFFFF', 'circle-opacity': 0, 'circle-stroke-color': '#111827', 'circle-stroke-width': 3 } },
    { id: 'pts-lot', type: 'symbol', source: 'surveys', minzoom: 13, layout: { 'text-field': ['concat', 'Lote ', ['get', 'lot']], 'text-font': ['Open Sans Bold'], 'text-size': 11, 'text-offset': [0, 1.25], 'text-anchor': 'top', 'text-optional': true }, paint: { 'text-color': '#FFFFFF', 'text-halo-color': '#111827', 'text-halo-width': 1.4 } },
    { id: 'mun-label', type: 'symbol', source: 'municipios', minzoom: 7.2, layout: { 'text-field': ['get', 'name'], 'text-font': ['Open Sans Regular'], 'text-size': ['interpolate', ['linear'], ['zoom'], 7, 10, 11, 13], 'text-transform': 'uppercase', 'text-letter-spacing': 0.08 }, paint: { 'text-color': '#FFFFFF', 'text-halo-color': 'rgba(0,0,0,0.75)', 'text-halo-width': 1.2, 'text-opacity': 0.9 } },
  )
  return { version: 8, glyphs: GLYPHS, sources, layers }
}

function popupHtml(p: Record<string, unknown>): string {
  const esc = (s: unknown) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c] as string))
  return `<div style="padding:10px 12px;min-width:180px">
    <div style="font-size:11px;font-weight:700;letter-spacing:.06em;color:#1D8F47;text-transform:uppercase">Entrevista #${esc(p.id)} · Lote ${esc(p.lot ?? '—')}</div>
    <div style="font-size:13px;font-weight:600;color:#1B1B1F;margin-top:2px">${esc(p.settlement)}</div>
    <div style="font-size:11.5px;color:#55555C">${esc(p.municipality)} · ${esc(p.biome)}</div>
    ${p.symLabel ? `<div style="font-size:11.5px;color:#1B1B1F;margin-top:6px;padding-top:6px;border-top:1px solid #eee"><span style="display:inline-block;width:9px;height:9px;border-radius:99px;background:${esc(p.symColor)};margin-right:6px;vertical-align:middle"></span>${esc(p.symLabel)}</div>` : ''}
    ${p.approx ? '<div style="font-size:10.5px;color:#9CA3AF;margin-top:4px">Posição aproximada (sem GPS)</div>' : ''}
    <div style="font-size:10.5px;color:#9CA3AF;margin-top:4px">Clique para ver as respostas</div>
  </div>`
}

export default function MapView({ surveys, settlements, colorEntries, symbolOf, basemap, layers, selectedId, onSelect, focus, onCursor, onReady }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<MlMap | null>(null)
  const popupRef = useRef<Popup | null>(null)
  const hoverMun = useRef<string | number | null>(null)
  const [ready, setReady] = useState(false)
  const fitted = useRef(false)
  const onSelectRef = useRef(onSelect)
  onSelectRef.current = onSelect
  const onCursorRef = useRef(onCursor)
  onCursorRef.current = onCursor

  // ── Inicialização ──
  useEffect(() => {
    if (!containerRef.current) return
    const map = new maplibregl.Map({
      container: containerRef.current,
      style: buildStyle(),
      bounds: MT_BOUNDS,
      fitBoundsOptions: { padding: 40 },
      attributionControl: false,
      maxZoom: 19,
      minZoom: 3,
    })
    mapRef.current = map
    map.addControl(new maplibregl.NavigationControl({ visualizePitch: false }), 'bottom-right')
    map.addControl(new maplibregl.FullscreenControl(), 'bottom-right')
    map.addControl(new maplibregl.GeolocateControl({ positionOptions: { enableHighAccuracy: true }, trackUserLocation: false }), 'bottom-right')
    map.addControl(new maplibregl.ScaleControl({ maxWidth: 140, unit: 'metric' }), 'bottom-left')
    map.addControl(new maplibregl.AttributionControl({ compact: true }), 'bottom-left')

    const popup = new maplibregl.Popup({ closeButton: false, closeOnClick: false, offset: 14, maxWidth: '280px' })
    popupRef.current = popup

    const pointLayers = ['pts', 'cl-points']
    map.on('load', () => {
      setReady(true)
      onReady?.()
    })
    for (const layer of pointLayers) {
      map.on('mouseenter', layer, () => { map.getCanvas().style.cursor = 'pointer' })
      map.on('mouseleave', layer, () => { map.getCanvas().style.cursor = ''; popup.remove() })
      map.on('mousemove', layer, (e) => {
        const f = e.features?.[0]
        if (!f) return
        const geom = f.geometry as { coordinates: [number, number] }
        popup.setLngLat(geom.coordinates).setHTML(popupHtml(f.properties as Record<string, unknown>)).addTo(map)
      })
      map.on('click', layer, (e) => {
        const f = e.features?.[0]
        if (f) onSelectRef.current(Number((f.properties as { id: number }).id))
      })
    }
    map.on('mouseenter', 'cl-circles', () => { map.getCanvas().style.cursor = 'pointer' })
    map.on('mouseleave', 'cl-circles', () => { map.getCanvas().style.cursor = '' })
    map.on('click', 'cl-circles', async (e) => {
      const f = e.features?.[0]
      if (!f) return
      const src = map.getSource('surveys-cl') as GeoJSONSource
      const zoom = await src.getClusterExpansionZoom((f.properties as { cluster_id: number }).cluster_id)
      map.easeTo({ center: (f.geometry as { coordinates: [number, number] }).coordinates, zoom: Math.min(zoom + 0.5, 17) })
    })
    map.on('click', 'settle-center', (e) => {
      const f = e.features?.[0]
      if (!f) return
      const p = f.properties as { radiusKm: number }
      const c = (f.geometry as { coordinates: [number, number] }).coordinates
      const d = Math.max(0.02, p.radiusKm / 60)
      map.fitBounds([[c[0] - d, c[1] - d], [c[0] + d, c[1] + d]], { padding: 60, duration: 900 })
    })
    map.on('mouseenter', 'settle-center', () => { map.getCanvas().style.cursor = 'pointer' })
    map.on('mouseleave', 'settle-center', () => { map.getCanvas().style.cursor = '' })
    map.on('click', (e) => {
      const hits = map.queryRenderedFeatures(e.point, { layers: ['pts', 'cl-points', 'cl-circles', 'settle-center'] })
      if (hits.length === 0) onSelectRef.current(null)
    })
    map.on('mousemove', 'mun-hover', (e) => {
      const f = e.features?.[0]
      const id = f?.id ?? null
      if (hoverMun.current !== null && hoverMun.current !== id) map.setFeatureState({ source: 'municipios', id: hoverMun.current }, { hover: false })
      if (id !== null && id !== undefined) map.setFeatureState({ source: 'municipios', id }, { hover: true })
      hoverMun.current = id ?? null
    })
    map.on('mouseleave', 'mun-hover', () => {
      if (hoverMun.current !== null) map.setFeatureState({ source: 'municipios', id: hoverMun.current }, { hover: false })
      hoverMun.current = null
    })
    map.on('mousemove', (e) => {
      onCursorRef.current?.({ lng: e.lngLat.lng, lat: e.lngLat.lat, zoom: map.getZoom() })
    })
    map.on('zoomend', () => {
      const c = map.getCenter()
      onCursorRef.current?.({ lng: c.lng, lat: c.lat, zoom: map.getZoom() })
    })
    return () => {
      popup.remove()
      map.remove()
      mapRef.current = null
      setReady(false)
      fitted.current = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── Dados: assentamentos ──
  useEffect(() => {
    const map = mapRef.current
    if (!map || !ready) return
    const area: FeatureCollection = {
      type: 'FeatureCollection',
      features: settlements.map((s) => ({ type: 'Feature', geometry: circlePolygon(s.lng, s.lat, s.radiusKm), properties: { id: s.id, name: s.name, biome: s.biome } })),
    }
    const center: FeatureCollection = {
      type: 'FeatureCollection',
      features: settlements.map((s) => ({ type: 'Feature', geometry: { type: 'Point', coordinates: [s.lng, s.lat] }, properties: { id: s.id, name: s.name, biome: s.biome, municipality: s.municipality, count: s.count, radiusKm: s.radiusKm } })),
    }
    ;(map.getSource('settle-area') as GeoJSONSource).setData(area as never)
    ;(map.getSource('settle-center') as GeoJSONSource).setData(center as never)
    map.setFilter('mun-surveyed', ['in', ['get', 'name'], ['literal', [...new Set(settlements.map((s) => s.municipality))]]])
    if (!fitted.current && settlements.length > 0) {
      fitted.current = true
      const lngs = settlements.map((s) => s.lng), lats = settlements.map((s) => s.lat)
      const pad = 0.6
      map.fitBounds([[Math.min(...lngs) - pad, Math.min(...lats) - pad], [Math.max(...lngs) + pad, Math.max(...lats) + pad]], { padding: 50, duration: 1400 })
    }
  }, [settlements, ready])

  // ── Dados: entrevistas + simbolização ──
  useEffect(() => {
    const map = mapRef.current
    if (!map || !ready) return
    const colorOf = new Map(colorEntries.map((e) => [e.value, e.color]))
    const fc: FeatureCollection = {
      type: 'FeatureCollection',
      features: surveys.map((s) => {
        const sym = symbolOf(s)
        return {
          type: 'Feature',
          geometry: { type: 'Point', coordinates: [s.lng, s.lat] },
          properties: {
            id: s.id, lot: s.lotNumber ?? '—', settlement: s.settlementName, settlementId: s.settlementId,
            municipality: s.municipality, biome: s.biome, approx: s.approx,
            sym: sym.value ?? '', symLabel: sym.value == null ? '' : sym.label,
            symColor: (sym.value != null ? colorOf.get(sym.value) : undefined) ?? (colorEntries[0]?.value === '*' ? colorEntries[0].color : '#9CA3AF'),
          },
        }
      }),
    }
    ;(map.getSource('surveys') as GeoJSONSource).setData(fc as never)
    ;(map.getSource('surveys-cl') as GeoJSONSource).setData(fc as never)
    const expr = matchExpression(colorEntries)
    map.setPaintProperty('pts', 'circle-color', expr as never)
    map.setPaintProperty('cl-points', 'circle-color', expr as never)
  }, [surveys, colorEntries, symbolOf, ready])

  // ── Mapa base ──
  useEffect(() => {
    const map = mapRef.current
    if (!map || !ready) return
    for (const id of Object.keys(BASEMAPS)) map.setLayoutProperty(`bm-${id}`, 'visibility', id === basemap ? 'visible' : 'none')
    map.setLayoutProperty('sat-labels', 'visibility', basemap === 'satellite' ? 'visible' : 'none')
    const dark = BASEMAPS[basemap].dark
    map.setPaintProperty('mun-line', 'line-color', dark ? '#FFFFFF' : '#374151')
    map.setPaintProperty('mun-label', 'text-color', dark ? '#FFFFFF' : '#1F2937')
    map.setPaintProperty('mun-label', 'text-halo-color', dark ? 'rgba(0,0,0,0.75)' : 'rgba(255,255,255,0.9)')
    map.setPaintProperty('mun-hover', 'fill-color', dark ? '#FFFFFF' : '#0F3D2E')
    map.setPaintProperty('settle-label', 'text-color', dark ? '#FFFFFF' : '#0F3D2E')
    map.setPaintProperty('settle-label', 'text-halo-color', dark ? '#0F3D2E' : '#FFFFFF')
    map.setPaintProperty('state-line', 'line-color', dark ? '#F5B301' : '#B45309')
  }, [basemap, ready])

  // ── Visibilidade das camadas ──
  useEffect(() => {
    const map = mapRef.current
    if (!map || !ready) return
    const vis = (ids: string[], on: boolean) => ids.forEach((id) => map.setLayoutProperty(id, 'visibility', on ? 'visible' : 'none'))
    vis(['state-casing', 'state-line'], layers.state)
    vis(['mun-line', 'mun-hover'], layers.municipalities)
    vis(['mun-label'], layers.municipalities && layers.munLabels)
    vis(['mun-surveyed'], layers.surveyedMun)
    vis(['biomes-fill', 'biomes-line'], layers.biomes)
    vis(['settle-fill', 'settle-line', 'settle-center'], layers.settlements)
    vis(['settle-label'], layers.settlements && layers.settlementLabels)
    vis(['heat'], layers.heat)
    const plain = layers.points && !layers.clusters
    vis(['pts', 'pts-selected'], plain)
    vis(['pts-lot'], plain && layers.lotLabels)
    vis(['cl-circles', 'cl-count', 'cl-points'], layers.points && layers.clusters)
  }, [layers, ready])

  // ── Seleção ──
  useEffect(() => {
    const map = mapRef.current
    if (!map || !ready) return
    map.setFilter('pts-selected', ['==', ['get', 'id'], selectedId ?? -1])
  }, [selectedId, ready])

  // ── Foco (busca / zoom para assentamento) ──
  useEffect(() => {
    const map = mapRef.current
    if (!map || !ready || !focus) return
    if (focus.kind === 'bounds') map.fitBounds(focus.bounds, { padding: 60, duration: 1200, maxZoom: 15 })
    else map.flyTo({ center: [focus.lng, focus.lat], zoom: focus.zoom, duration: 1400 })
  }, [focus, ready])

  // O container do MapLibre fica dentro de um wrapper posicionado: a CSS do
  // MapLibre força `position: relative` no elemento do mapa e anularia o inset.
  return (
    <div className="absolute inset-0 bg-[#0b1b14]">
      <div ref={containerRef} className="h-full w-full" />
    </div>
  )
}

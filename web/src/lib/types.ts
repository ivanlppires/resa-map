export type QuestionType = 'single_choice' | 'multiple_choice' | 'yes_no' | 'scale' | 'text'
export type Section = 'socioeconomic' | 'behavioral' | 'environmental'

export interface QuestionOption { value: string; label: string; hasTextInput?: boolean }

export interface Question {
  key: string
  number: number
  text: string
  type: QuestionType
  section: Section
  options: QuestionOption[] | null
  scaleMin: number | null
  scaleMax: number | null
  conditional: { dependsOn: string; showWhen: string[] } | null
  sortOrder: number
}

export interface Settlement {
  id: number
  name: string
  municipality: string
  biome: string
  geojson: unknown
}

export interface Survey {
  id: number
  settlementId: number
  settlementName: string
  municipality: string
  biome: string
  interviewer: string
  lotNumber: string | null
  gpsLat: number | null
  gpsLng: number | null
  createdAt: string
  completedAt: string | null
  syncedAt: string | null
  answers: Record<string, unknown>
  texts: Record<string, string>
}

export interface Dataset {
  generatedAt: string
  questions: Question[]
  settlements: Settlement[]
  surveys: Survey[]
}

/** Entrevista já posicionada no mapa (GPS real ou posição aproximada). */
export interface PlacedSurvey extends Survey {
  lng: number
  lat: number
  approx: boolean
}

export interface PlacedSettlement extends Settlement {
  lng: number
  lat: number
  radiusKm: number
  count: number
  approxCentroid: boolean
}

export const SECTION_LABELS: Record<Section, string> = {
  socioeconomic: 'Socioeconômico',
  behavioral: 'Comportamental',
  environmental: 'Ambiental',
}
export const SECTION_ORDER: Section[] = ['socioeconomic', 'behavioral', 'environmental']
export const SECTION_COLORS: Record<Section, string> = {
  socioeconomic: '#2E7CE6',
  behavioral: '#D4870A',
  environmental: '#22A352',
}
export const BIOME_COLORS: Record<string, string> = {
  'Amazônia': '#1D8F47',
  'Cerrado': '#D4870A',
  'Pantanal': '#0F766E',
}

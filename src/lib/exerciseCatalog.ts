import type { SectionType, TrainingFocus } from './exerciseLibrary'
import { extendWeightedMovements } from './exerciseLibrary'

export interface CatalogMovement {
  id: string
  name: string
  equipment: string
  category: string
  sections: string[]
  aliases: string[]
  buildUpFor: string[]
  primary: string[]
  secondary: string[]
  regions: string[]
  patterns: string[]
  overloadTags: string[]
  intensity: 'low' | 'medium' | 'high'
}

export interface ExerciseCatalog {
  version: string
  movements: CatalogMovement[]
  taxonomy: Record<string, string[]>
}

// SectionType da UI → nome de seção do catálogo (inclui aliases legados)
const SECTION_MAP: Record<SectionType, string> = {
  warm_up: 'Warm-up',
  mobility: 'Mobility',
  strength: 'Strength',
  skill: 'Skill',
  conditioning: 'Conditioning',
  wod: 'WOD',
  accessories: 'Accessories',
  cool_down: 'Cool Down',
  mobilidade: 'Mobility',
  aquecimento: 'Warm-up',
  forca: 'Strength',
  acessorios: 'Accessories',
  finisher: 'Conditioning',
}

const WEIGHTED_EQUIPMENT = /barbell|\bdb\b|\bkb\b|dumbbell|kettlebell|machine|sandbag|d-ball|slam ball|medicine ball|wall ball|sled|yoke|plate|cable|farmer|reverse hyper/i

let cache: ExerciseCatalog | null = null
let loading: Promise<ExerciseCatalog> | null = null
let primaryRegionIndex: Map<string, Set<string>> | null = null
let nameIndex: Map<string, CatalogMovement> | null = null

export function loadExerciseCatalog(): Promise<ExerciseCatalog> {
  if (cache) return Promise.resolve(cache)
  if (!loading) {
    loading = import('./exerciseCatalog.data.json').then(mod => {
      cache = mod.default as ExerciseCatalog
      buildIndexes(cache)
      extendWeightedMovements(
        cache.movements
          .filter(m => WEIGHTED_EQUIPMENT.test(m.equipment))
          .map(m => m.name)
      )
      return cache
    })
  }
  return loading
}

export function getLoadedCatalog(): ExerciseCatalog | null {
  return cache
}

function buildIndexes(catalog: ExerciseCatalog) {
  // body part → regiões da taxonomia (para o filtro de foco usar primary, não regions cru)
  const partToRegions = new Map<string, Set<string>>()
  for (const [region, parts] of Object.entries(catalog.taxonomy)) {
    for (const part of parts) {
      if (!partToRegions.has(part)) partToRegions.set(part, new Set())
      partToRegions.get(part)!.add(region)
    }
  }
  primaryRegionIndex = new Map()
  nameIndex = new Map()
  for (const m of catalog.movements) {
    const regions = new Set<string>()
    for (const part of m.primary) {
      for (const r of partToRegions.get(part) ?? []) regions.add(r)
    }
    primaryRegionIndex.set(m.id, regions)
    nameIndex.set(m.name.toLowerCase(), m)
    for (const alias of m.aliases) nameIndex.set(alias.toLowerCase(), m)
  }
}

export function resolveMovement(name: string): CatalogMovement | null {
  return nameIndex?.get(name.trim().toLowerCase()) ?? null
}

function primaryRegions(m: CatalogMovement): Set<string> {
  return primaryRegionIndex?.get(m.id) ?? new Set()
}

const STRENGTH_CATEGORIES = /squat|hinge|press|pull|posterior chain|olympic lift|machine|jerk/i
const TECHNIQUE_CATEGORIES = /olympic drill|olympic lift|gymnastics|skill|jerk/i
const FULLBODY_CATEGORIES = /olympic|carry|odd object/i
const CARDIO_CATEGORIES = /mono-structural|conditioning|jump rope/i

export function matchesFocus(m: CatalogMovement, focus: TrainingFocus): boolean {
  const regions = primaryRegions(m)
  switch (focus) {
    case 'inferior':
      return regions.has('lower_body') || regions.has('posterior_chain')
    case 'superior':
      return regions.has('upper_push') || regions.has('upper_pull')
    case 'core':
      return regions.has('core')
    case 'full_body': {
      const anatomical = ['lower_body', 'upper_push', 'upper_pull', 'core', 'posterior_chain']
        .filter(r => regions.has(r))
      return anatomical.length >= 2 || FULLBODY_CATEGORIES.test(m.category)
    }
    case 'cardio':
      return m.regions.includes('Engine') || CARDIO_CATEGORIES.test(m.category)
    case 'mobilidade':
      return m.category.startsWith('Mobility') || m.sections.includes('Mobility') || m.sections.includes('Cool Down')
    case 'forca':
      return STRENGTH_CATEGORIES.test(m.category)
    case 'tecnica':
      return TECHNIQUE_CATEGORIES.test(m.category)
    case 'crossfit':
      return true
  }
}

export interface CatalogSuggestion {
  movement: CatalogMovement
  focusMatch: boolean
}

export function getCatalogSuggestions(
  catalog: ExerciseCatalog,
  section: SectionType,
  focuses: TrainingFocus[],
): CatalogSuggestion[] {
  const catalogSection = SECTION_MAP[section]
  const eligible = catalog.movements.filter(m => m.sections.includes(catalogSection))
  const activeFocuses = focuses.filter(f => f !== 'crossfit')

  const scored = eligible.map(m => ({
    movement: m,
    focusMatch: activeFocuses.length > 0 && activeFocuses.some(f => matchesFocus(m, f)),
  }))

  // ranking: matches do foco primeiro, cada grupo em ordem alfabética; nada é escondido
  scored.sort((a, b) => {
    if (a.focusMatch !== b.focusMatch) return a.focusMatch ? -1 : 1
    return a.movement.name.localeCompare(b.movement.name)
  })
  return scored
}

export function searchMatches(m: CatalogMovement, query: string): boolean {
  const q = query.toLowerCase()
  return m.name.toLowerCase().includes(q) || m.aliases.some(a => a.toLowerCase().includes(q))
}

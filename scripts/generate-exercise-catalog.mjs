// Gera src/lib/exerciseCatalog.data.json (slim) a partir do catálogo fonte.
// Rodar manualmente quando o catálogo mudar:
//   node scripts/generate-exercise-catalog.mjs
import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const SOURCE = join(root, 'scripts/data/gounbroken_exercise_catalog_with_body_parts.json')
const OUT = join(root, 'src/lib/exerciseCatalog.data.json')

const VALID_SECTIONS = new Set([
  'Mobility', 'Warm-up', 'Strength', 'Skill', 'Conditioning', 'WOD', 'Accessories', 'Cool Down',
])
const VALID_INTENSITY = new Set(['low', 'medium', 'high'])
const MAX_LEN = 200

// validação de cadeia de custódia: o fonte é gerado fora do repo
function assertCleanString(value, path) {
  if (typeof value !== 'string') throw new Error(`${path}: expected string`)
  if (value.length > MAX_LEN) throw new Error(`${path}: too long (${value.length})`)
  if (/[<>]/.test(value)) throw new Error(`${path}: contains angle brackets`)
  // eslint-disable-next-line no-control-regex
  if (/[\u0000-\u001f\u007f]/.test(value)) throw new Error(`${path}: control chars`)
  return value
}

function assertStringArray(value, path) {
  if (!Array.isArray(value)) throw new Error(`${path}: expected array`)
  return value.map((v, i) => assertCleanString(v, `${path}[${i}]`))
}

const source = JSON.parse(readFileSync(SOURCE, 'utf8'))
const movements = source.movement_catalog
if (!Array.isArray(movements) || movements.length === 0) throw new Error('movement_catalog missing')

const ids = new Set()
const names = new Set()

const slim = movements.map((m, i) => {
  const p = `movement[${i}]`
  const id = assertCleanString(m.id, `${p}.id`)
  if (!/^[a-z0-9-]+$/.test(id)) throw new Error(`${p}.id: invalid slug "${id}"`)
  if (ids.has(id)) throw new Error(`${p}.id: duplicate "${id}"`)
  ids.add(id)

  const displayName = assertCleanString(m.display_name, `${p}.display_name`)
  const nameKey = displayName.toLowerCase()
  if (names.has(nameKey)) throw new Error(`${p}.display_name: duplicate "${displayName}"`)
  names.add(nameKey)

  const sections = assertStringArray(m.allowed_sections, `${p}.allowed_sections`)
  sections.forEach(s => { if (!VALID_SECTIONS.has(s)) throw new Error(`${p}: unknown section "${s}"`) })

  if (!VALID_INTENSITY.has(m.reporting_intensity_default)) {
    throw new Error(`${p}: invalid reporting_intensity_default "${m.reporting_intensity_default}"`)
  }

  return {
    id,
    name: displayName,
    equipment: assertCleanString(m.equipment, `${p}.equipment`),
    category: assertCleanString(m.category, `${p}.category`),
    sections,
    aliases: assertStringArray(m.aliases ?? [], `${p}.aliases`),
    buildUpFor: assertStringArray(m.useful_as_build_up_for ?? [], `${p}.useful_as_build_up_for`),
    primary: assertStringArray(m.primary_body_parts ?? [], `${p}.primary_body_parts`),
    secondary: assertStringArray(m.secondary_body_parts ?? [], `${p}.secondary_body_parts`),
    regions: assertStringArray(m.body_regions ?? [], `${p}.body_regions`),
    patterns: assertStringArray(m.movement_pattern_tags ?? [], `${p}.movement_pattern_tags`),
    overloadTags: assertStringArray(m.overload_monitoring_tags ?? [], `${p}.overload_monitoring_tags`),
    intensity: m.reporting_intensity_default,
  }
})

const taxonomy = {}
for (const [region, parts] of Object.entries(source.body_part_taxonomy)) {
  taxonomy[assertCleanString(region, 'taxonomy.key')] = assertStringArray(parts, `taxonomy.${region}`)
}

const out = { version: source.version_date, movements: slim, taxonomy }
writeFileSync(OUT, JSON.stringify(out))

const perSection = {}
for (const m of slim) for (const s of m.sections) perSection[s] = (perSection[s] ?? 0) + 1
console.log(`OK — ${slim.length} movements → ${OUT}`)
console.log('per section:', perSection)
console.log(`size: ${(JSON.stringify(out).length / 1024).toFixed(0)} KB`)

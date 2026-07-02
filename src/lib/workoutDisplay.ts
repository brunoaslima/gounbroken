/**
 * Pure display-logic functions extracted from WorkoutCard.
 * Kept here so they can be unit-tested without importing React.
 */

import type { WorkoutExerciseData } from '@/types'

// ── Section format line ────────────────────────────────────────────────

export function buildFormatLine(section: {
  format_type?: string | null
  format_config?: Record<string, unknown> | null
}): string | null {
  const ft = section.format_type
  const fc = (section.format_config ?? {}) as Record<string, number | null>
  if (!ft) return null

  const mins = (k: string) => fc[k] != null ? `${fc[k]}:00` : null
  const secs = (k: string) => fc[k] != null ? `${fc[k]}s` : null

  switch (ft) {
    case 'AMRAP':
      return ['AMRAP', mins('time_minutes')].filter(Boolean).join(' · ')
    case 'FOR_TIME': {
      const parts: string[] = ['FOR TIME']
      if (fc.rounds)           parts.push(`${fc.rounds} ROUNDS`)
      if (fc.time_cap_minutes) parts.push(`CAP ${fc.time_cap_minutes}:00`)
      return parts.join(' · ')
    }
    case 'EMOM':
      return ['EMOM', mins('time_minutes'), fc.interval_seconds ? `EVERY ${fc.interval_seconds}S` : null]
        .filter(Boolean).join(' · ')
    case 'E90S':
      return ['E90S', mins('time_minutes')].filter(Boolean).join(' · ')
    case 'TABATA': {
      const parts: string[] = ['TABATA']
      if (fc.rounds) parts.push(`${fc.rounds} SETS`)
      const ws = secs('work_seconds') ?? '20s'
      const rs = secs('rest_seconds') ?? '10s'
      parts.push(`${ws}/${rs}`)
      return parts.join(' · ')
    }
    case 'ROUNDS': {
      const parts = ['ROUNDS']
      if (fc.rounds) parts.push(`${fc.rounds}×`)
      if (fc.rest_between_rounds_seconds) parts.push(`${fc.rest_between_rounds_seconds}s rest`)
      return parts.join(' · ')
    }
    case 'UNBROKEN':
      return 'UNBROKEN'
    case 'INTERVAL': {
      const parts: string[] = ['INTERVAL']
      if (fc.rounds) parts.push(`${fc.rounds}×`)
      const ws = secs('work_seconds')
      const rs = secs('rest_seconds')
      if (ws && rs) parts.push(`${ws}/${rs}`)
      return parts.join(' · ')
    }
    default: return null
  }
}

// ── Exercise prescription lines ────────────────────────────────────────

// Main line only: sets × reps or duration. Extracted so it can be shown as a
// highlighted prefix in front of the exercise name, separate from load/rest.
// reps_label is the raw text the coach typed (e.g. "60m", "21-15-9") and is
// always preferred over the numeric `reps` column, which only exists for
// volume-calc purposes and may be null for non-numeric input.
export function buildMainLine(ex: WorkoutExerciseData): string | null {
  const main: string[] = []
  const repsText = ex.reps_label?.trim() || (ex.reps != null ? String(ex.reps) : null)
  const isScheme = !!repsText && repsText.includes('-')

  if (isScheme) {
    main.push(repsText!)
    if (ex.sets) main.push(`${ex.sets}`)
  } else if (ex.sets && repsText) main.push(`${ex.sets} × ${repsText}`)
  else if (ex.sets)               main.push(`${ex.sets}`)
  else if (repsText)              main.push(repsText)

  if (ex.duration_seconds) {
    const m = Math.floor(ex.duration_seconds / 60)
    const s = ex.duration_seconds % 60
    main.push(m > 0 && s === 0 ? `${m}:00` : m > 0 ? `${m}:${String(s).padStart(2, '0')}` : `${s}s`)
  }
  return main.length ? main.join(' · ') : null
}

export function buildPrescription(ex: WorkoutExerciseData): string[] {
  const lines: string[] = []

  const main = buildMainLine(ex)
  if (main) lines.push(main)

  // Load line
  const load: string[] = []
  if (ex.load_kg && ex.load_kg_to)            load.push(`@ ${ex.load_kg}–${ex.load_kg_to}KG`)
  else if (ex.load_kg)                        load.push(`@ ${ex.load_kg}KG`)
  if (ex.load_pct_1rm && ex.load_pct_1rm_to) load.push(`@ ${ex.load_pct_1rm}%–${ex.load_pct_1rm_to}% 1RM`)
  else if (ex.load_pct_1rm)                   load.push(`@ ${ex.load_pct_1rm}% 1RM`)
  if (ex.rpe)                                 load.push(`RPE ${ex.rpe}/10`)
  if (load.length) lines.push(load.join(' · '))

  // Rest
  if (ex.rest_seconds) {
    const m = Math.floor(ex.rest_seconds / 60)
    const s = ex.rest_seconds % 60
    const restStr = m > 0 && s === 0 ? `${m}:00` : m > 0 ? `${m}:${String(s).padStart(2, '0')}` : `${s}s`
    lines.push(`*REST ${restStr} BETWEEN SETS`)
  }

  return lines
}

// ── Date helpers ───────────────────────────────────────────────────────

const EN_DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

export function dayLabel(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number)
  return EN_DAYS[new Date(y, m - 1, d).getDay()]
}

export function formatDateBR(s: string): string {
  const [y, m, d] = s.split('-')
  return `${d}/${m}/${y}`
}

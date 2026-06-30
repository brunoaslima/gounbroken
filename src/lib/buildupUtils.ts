// ─── Bar types ────────────────────────────────────────────────────────────────

export const BARS = [
  { kg: 20, color: '#1E3A8A', label: '20 KG' },
  { kg: 15, color: '#CA8A04', label: '15 KG' },
] as const
export type BarKg = 20 | 15

// ─── Plates ───────────────────────────────────────────────────────────────────

export interface Plate { kg: number; color: string; large: boolean }

export const PLATES: Plate[] = [
  { kg: 25,  color: '#DC2626', large: true  },
  { kg: 20,  color: '#1D4ED8', large: true  },
  { kg: 15,  color: '#FBBF24', large: true  },
  { kg: 10,  color: '#15803D', large: true  },
  { kg: 5,   color: '#52525B', large: true  },
  { kg: 2.5, color: '#DC2626', large: false },
  { kg: 2,   color: '#1D4ED8', large: false },
  { kg: 1.5, color: '#CA8A04', large: false },
  { kg: 1,   color: '#15803D', large: false },
  { kg: 0.5, color: '#52525B', large: false },
]

export const PLATE_H: Record<number, number> = {
  25: 52, 20: 46, 15: 40, 10: 32, 5: 22,
  2.5: 18, 2: 16, 1.5: 14, 1: 12, 0.5: 10,
}
export const PLATE_W: Record<number, number> = {
  25: 10, 20: 10, 15: 9, 10: 9, 5: 8,
  2.5: 7, 2: 6, 1.5: 6, 1: 5, 0.5: 5,
}

export function calcPlates(totalKg: number, barKg: number): Plate[] | null {
  if (totalKg === barKg) return []
  const perSide = (totalKg - barKg) / 2
  if (perSide < 0) return null
  let rem = Math.round(perSide * 10)
  const result: Plate[] = []
  for (const p of PLATES) {
    const unit = Math.round(p.kg * 10)
    while (rem >= unit) { result.push(p); rem -= unit }
  }
  return rem === 0 ? result : null
}

export function perSideKg(totalKg: number, barKg: number) {
  return (totalKg - barKg) / 2
}

// ─── Movement categories ──────────────────────────────────────────────────────

export type MovementCategory = 'olympic' | 'squat' | 'hinge' | 'overhead' | 'push' | 'pull' | 'other'

export function getMovementCategory(name: string): MovementCategory {
  const n = name.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
  if (/clean|snatch|jerk|arranco|arremesso/.test(n)) return 'olympic'
  if (/squat|agachamento/.test(n))                   return 'squat'
  if (/deadlift|terra|rdl|romanian|sumo|hinge|good morning/.test(n)) return 'hinge'
  if (/press|push press|shoulder|militar|overhead|ombro/.test(n))    return 'overhead'
  if (/bench|supino/.test(n))                        return 'push'
  if (/row|remada|pull|chin|lat|puxada/.test(n))     return 'pull'
  return 'other'
}

// ─── Build-up calculation ─────────────────────────────────────────────────────

export interface BuildupSet { weight: number; reps: number }

// Fixed percentage progressions per number of series (last is always 100%)
const BASE_PCTS: Record<number, number[]> = {
  1:  [1.00],
  2:  [0.85, 1.00],
  3:  [0.75, 0.88, 1.00],
  4:  [0.70, 0.82, 0.92, 1.00],
  5:  [0.65, 0.77, 0.87, 0.94, 1.00],
  6:  [0.60, 0.72, 0.82, 0.90, 0.96, 1.00],
  7:  [0.55, 0.67, 0.77, 0.85, 0.92, 0.97, 1.00],
  8:  [0.50, 0.62, 0.72, 0.81, 0.88, 0.94, 0.98, 1.00],
  9:  [0.50, 0.60, 0.70, 0.78, 0.85, 0.91, 0.95, 0.98, 1.00],
  10: [0.50, 0.58, 0.66, 0.74, 0.81, 0.87, 0.92, 0.96, 0.98, 1.00],
}

/**
 * Returns [barSet, S1, S2, ..., SN] where SN is always targetKg.
 * nSeries is respected exactly; if the gap is too small to produce
 * N unique integer weights, fewer sets are returned.
 *
 * Percentages are shifted down for high volume (conserve energy) and
 * for technical movements (olympic, overhead). Squat/hinge allows
 * slightly more aggressive loading.
 */
export function calculateBuildup(
  targetKg: number,
  reps: number,
  barKg: number,
  nSeries = 3,
  category: MovementCategory = 'other',
): BuildupSet[] {
  const n = Math.min(10, Math.max(1, nSeries))
  const basePcts = BASE_PCTS[n]

  // Volume modifier: more total reps → shift percentages down
  const vol = nSeries * reps
  const volShift =
    vol >= 60 ? 0.08 :
    vol >= 40 ? 0.05 :
    vol >= 25 ? 0.03 :
    vol >= 15 ? 0.01 : 0

  // Category modifier
  const catShift =
    category === 'olympic'  ? 0.03 :
    category === 'overhead' ? 0.02 :
    (category === 'squat' || category === 'hinge') ? -0.02 : 0

  const shift = volShift + catShift

  // Apply shift to all except last (100%)
  const pcts = basePcts.map((p, i) =>
    i === basePcts.length - 1 ? 1.00 : Math.max(0.30, p - shift)
  )

  // Compute raw weights
  const raw = pcts.map(p => Math.round(targetKg * p))
  raw[raw.length - 1] = targetKg  // lock last to exact target

  // Forward pass: guarantee strictly increasing before target
  for (let i = 1; i < raw.length - 1; i++) {
    if (raw[i] <= raw[i - 1]) raw[i] = raw[i - 1] + 1
  }

  // Build final array: [bar, ...filtered sets]
  const sets: BuildupSet[] = [{ weight: barKg, reps }]
  let prev = barKg

  for (let i = 0; i < raw.length; i++) {
    const w = raw[i]
    if (i === raw.length - 1) {
      sets.push({ weight: targetKg, reps })
    } else if (w > prev && w < targetKg) {
      sets.push({ weight: w, reps })
      prev = w
    }
  }

  return sets
}

/**
 * Returns a warning string when the target weight for the given reps
 * implies a 1RM that exceeds the athlete's best known 1RM by more than 10%.
 * Returns null when no warning is needed or no PRs are available.
 */
export function checkBuildupWarning(
  targetKg: number,
  reps: number,
  prs: Record<number, number>,
): string | null {
  const entries = Object.entries(prs)
    .map(([r, w]) => ({ reps: Number(r), weight: w }))
    .filter(e => e.weight > 0)
  if (entries.length === 0) return null

  const best1rm = Math.max(...entries.map(e => e.weight * (1 + e.reps / 30)))
  const implied1rm = targetKg * (1 + reps / 30)

  if (implied1rm > best1rm * 1.10) {
    return `Your estimated 1RM for this movement is ${Math.round(best1rm)} kg. The target weight of ${targetKg} kg for ${reps} reps may be above realistic — review before continuing.`
  }
  return null
}

// ─── PR-based target suggestion ───────────────────────────────────────────────

/**
 * Estimate a sensible working weight for `workingReps` reps using the best
 * available PR via the Epley 1RM formula.
 * Returns null when no PRs exist.
 */
export function suggestTarget(prs: Record<number, number>, workingReps: number): number | null {
  const entries = Object.entries(prs)
    .map(([r, w]) => ({ reps: Number(r), weight: w }))
    .filter(e => e.weight > 0)
  if (entries.length === 0) return null

  // Direct match
  if (prs[workingReps] > 0) return prs[workingReps]

  // Estimate via best available Epley 1RM
  const best1rm = Math.max(...entries.map(e => e.weight * (1 + e.reps / 30)))
  const suggested = best1rm / (1 + workingReps / 30)
  const rounded = Math.round(suggested / 5) * 5
  return rounded > 0 ? rounded : null
}

/** Short label for the most relevant available PR given target reps. */
export function bestPRLabel(prs: Record<number, number>, workingReps: number): string | null {
  const entries = Object.entries(prs)
    .map(([r, w]) => ({ reps: Number(r), weight: w }))
    .filter(e => e.weight > 0)
  if (entries.length === 0) return null

  // Prefer exact match, otherwise closest RM
  const exact = entries.find(e => e.reps === workingReps)
  if (exact) return `${workingReps}RM available: ${exact.weight} kg`

  const sorted = [...entries].sort((a, b) => Math.abs(a.reps - workingReps) - Math.abs(b.reps - workingReps))
  const closest = sorted[0]
  return `Base: ${closest.reps}RM · ${closest.weight} kg`
}

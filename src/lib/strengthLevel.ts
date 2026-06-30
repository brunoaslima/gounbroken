/**
 * Overall Strength Level — methodology
 *
 * This module calculates a single "Strength Level" for an athlete from their
 * recorded PRs across multiple movement categories.
 *
 * ## How individual movement scores are calculated
 *   1. The best recorded weight for the lowest rep count available is used.
 *   2. If the best rep count is not 1, the Epley formula is applied to estimate
 *      the 1RM equivalent: weight × (1 + reps / 30), rounded to 0.5 kg.
 *   3. The estimated (or actual) 1RM is passed to `analyzeStrength()` from
 *      strengthStandards.ts, which compares the lift against sex- and
 *      bodyweight-specific interpolated tables.
 *   4. The result is a 0–100 score derived from those tables.
 *
 * ## How category scores are calculated
 *   Movements are grouped into 5 categories:
 *     - Força de Agachamento  (Squat)
 *     - Força de Quadril      (Hinge / Pull)
 *     - Levantamento Olímpico (Olympic Weightlifting)
 *     - Força de Ombros       (Overhead / Press)
 *     - Força Acessória       (Bench, Thruster, Pull-up)
 *
 *   Category score = arithmetic mean of the individual movement scores in
 *   that category. Only movements with recorded PRs and available standards
 *   contribute to the average.
 *
 * ## How the final Strength Level is calculated
 *   Overall score = arithmetic mean of all active category scores (each
 *   category weighted equally regardless of how many movements it contains).
 *
 *   Score → level mapping:
 *     0–20   → Sem Base
 *     21–40  → Novato
 *     41–60  → Intermediário
 *     61–80  → Avançado
 *     81–94  → Elite
 *     95–100 → Classe Mundial
 *
 * ## How confidence is calculated
 *   Based on the total number of valid PRs and the number of distinct
 *   categories covered:
 *     < 2 PRs                          → Insufficient (card hidden)
 *     ≥ 2 PRs, 1 category              → Baixa
 *     ≥ 3 PRs, ≥ 2 categories          → Média
 *     ≥ 5 PRs, ≥ 3 categories          → Alta
 *     ≥ 8 PRs, ≥ 4 categories          → Muito Alta
 *
 * ## Scientific / methodological sources
 *   - Epley (1985) 1RM prediction formula
 *   - Bodyweight-relative strength standards from crossfit_strength_scoring_config_v1
 *   - CrossFit movement taxonomy for category grouping
 */

import { analyzeStrength, normalizeMovement, MOVEMENT_MAP } from '@/lib/strengthStandards'
import { epley1RM } from '@/lib/scoreUtils'
import type { Movement } from '@/types'

// ── Category definitions ───────────────────────────────────────────────────────

export const STRENGTH_CATEGORIES = {
  squat:     { label: 'Squat Strength' },
  hinge:     { label: 'Hip Hinge Strength' },
  olympic:   { label: 'Olympic Lifting' },
  overhead:  { label: 'Overhead Strength' },
  accessory: { label: 'Accessory Strength' },
} as const

// Maps MOVEMENT_MAP base keys → which display category they belong to.
// Thruster and Overhead Squat are intentionally in overhead/olympic respectively
// (not accessory/squat) to better reflect their force profile in CrossFit.
const BASE_TO_CATEGORY: Record<string, StrengthCategory> = {
  back_squat:       'squat',
  front_squat:      'squat',
  overhead_squat:   'olympic',
  deadlift:         'hinge',
  snatch_deadlift:  'hinge',
  shoulder_press:   'overhead',
  push_press:       'overhead',
  push_jerk:        'overhead',
  split_jerk:       'overhead',
  thruster:         'overhead',
  clean:            'olympic',
  power_clean:      'olympic',
  snatch:           'olympic',
  power_snatch:     'olympic',
  clean_and_jerk:   'olympic',
  dumbbell_snatch:  'olympic',
  bench_press:      'accessory',
  weighted_pull_up: 'accessory',
}

export type StrengthCategory = keyof typeof STRENGTH_CATEGORIES

// ── Overall level ──────────────────────────────────────────────────────────────

export type OverallLevel =
  | 'untrained' | 'novice' | 'intermediate'
  | 'advanced'  | 'elite'  | 'world_class'

export const OVERALL_LEVEL_LABELS: Record<OverallLevel, string> = {
  untrained:   'Untrained',
  novice:      'Novice',
  intermediate:'Intermediate',
  advanced:    'Advanced',
  elite:       'Elite',
  world_class: 'World Class',
}

export const OVERALL_LEVEL_COLORS: Record<OverallLevel, string> = {
  untrained:   '#3D3D3B',
  novice:      '#A8A8A4',
  intermediate:'#4DA3FF',
  advanced:    '#D4FF3A',
  elite:       '#FF8A00',
  world_class: '#FF4444',
}

// ── Confidence ─────────────────────────────────────────────────────────────────

export type ConfidenceLevel = 'insufficient' | 'low' | 'medium' | 'high' | 'very_high'

export const CONFIDENCE_LABELS: Record<ConfidenceLevel, string> = {
  insufficient: 'Insufficient',
  low:          'Low',
  medium:       'Medium',
  high:         'High',
  very_high:    'Very High',
}

export const CONFIDENCE_COLORS: Record<ConfidenceLevel, string> = {
  insufficient: '#3D3D3B',
  low:          '#6B6B68',
  medium:       '#A8A8A4',
  high:         '#D4FF3A',
  very_high:    '#D4FF3A',
}

// ── Result types ───────────────────────────────────────────────────────────────

export interface CategoryScore {
  category:      StrengthCategory
  label:         string
  level:         OverallLevel
  score:         number
  movementCount: number
}

export interface StrengthLevelResult {
  score:              number
  level:              OverallLevel
  confidence:         ConfidenceLevel
  totalPRs:           number
  categoriesUsed:     number
  categoryScores:     CategoryScore[]
  strongestCategory:  string | null
  weakestCategory:    string | null
  missingCategories:  string[]
  guidance:           string
}

// ── Internal helpers ───────────────────────────────────────────────────────────

export function scoreToOverallLevel(score: number): OverallLevel {
  if (score >= 95) return 'world_class'
  if (score >= 81) return 'elite'
  if (score >= 61) return 'advanced'
  if (score >= 41) return 'intermediate'
  if (score >= 21) return 'novice'
  return 'untrained'
}

export function calcConfidence(totalPRs: number, categoriesUsed: number): ConfidenceLevel {
  if (totalPRs < 2)                                  return 'insufficient'
  if (totalPRs >= 8 && categoriesUsed >= 4)          return 'very_high'
  if (totalPRs >= 5 && categoriesUsed >= 3)          return 'high'
  if (totalPRs >= 3 && categoriesUsed >= 2)          return 'medium'
  return 'low'
}

// ── Public API ─────────────────────────────────────────────────────────────────

/**
 * Calculates an overall strength level from the user's PRs.
 * Returns null when there is insufficient data (< 2 scoreable PRs).
 */
export function calculateStrengthLevel(
  movements:           Movement[],
  getPRsForMovement:   (movementId: string) => Record<number, number>,
  bodyWeightKg:        number,
  gender:              'male' | 'female' | 'other',
): StrengthLevelResult | null {
  if (!bodyWeightKg || !gender) return null

  // Accumulate scores per category using normalised name → MOVEMENT_MAP → BASE_TO_CATEGORY.
  // This avoids the old exact-string-match bug where 'Shoulder Press' failed to match
  // the category list entry 'Shoulder Press (Strict)'.
  const catScoreMap = new Map<StrengthCategory, number[]>()

  for (const movement of movements) {
    const normalized = normalizeMovement(movement.name)
    const entry = MOVEMENT_MAP[normalized]
    if (!entry) continue

    const category = BASE_TO_CATEGORY[entry.base]
    if (!category) continue

    const prs       = getPRsForMovement(movement.id)
    const repCounts = Object.keys(prs).map(Number).sort((a, b) => a - b)
    if (repCounts.length === 0) continue

    // Use lowest rep count — closest to 1RM
    const bestRm     = repCounts[0]
    const bestWeight = prs[bestRm]

    // Estimate 1RM via Epley when needed
    const weight1rm = bestRm === 1
      ? bestWeight
      : (epley1RM(bestWeight, bestRm) ?? null)

    if (!weight1rm) continue

    const analysis = analyzeStrength(movement.name, weight1rm, bodyWeightKg, gender)
    if (!analysis) continue

    if (!catScoreMap.has(category)) catScoreMap.set(category, [])
    catScoreMap.get(category)!.push(analysis.score)
  }

  const categoryScores: CategoryScore[] = []
  let totalPRs = 0

  for (const [catKey, scores] of catScoreMap) {
    totalPRs += scores.length
    const avg = scores.reduce((a, b) => a + b, 0) / scores.length
    categoryScores.push({
      category:      catKey,
      label:         STRENGTH_CATEGORIES[catKey].label,
      level:         scoreToOverallLevel(Math.round(avg)),
      score:         Math.round(avg),
      movementCount: scores.length,
    })
  }

  const categoriesUsed = categoryScores.length
  const confidence     = calcConfidence(totalPRs, categoriesUsed)

  if (confidence === 'insufficient') return null

  // Overall = average of category averages (equal category weight)
  const overallScore = Math.round(
    categoryScores.reduce((sum, c) => sum + c.score, 0) / categoryScores.length
  )

  const sorted    = [...categoryScores].sort((a, b) => b.score - a.score)
  const strongest = sorted[0]?.label ?? null
  const weakest   = sorted[sorted.length - 1]?.label ?? null

  const usedKeys          = new Set(categoryScores.map(c => c.category))
  const missingCategories = Object.entries(STRENGTH_CATEGORIES)
    .filter(([key]) => !usedKeys.has(key as StrengthCategory))
    .map(([, def]) => def.label)

  let guidance: string
  if (confidence === 'low') {
    guidance = 'Add PRs in more categories to improve accuracy.'
  } else if (missingCategories.length > 0) {
    guidance = `Add a PR in ${missingCategories[0]} to complete your profile.`
  } else if (weakest && weakest !== strongest) {
    guidance = `${weakest} is your weakest area — focus on it to level up.`
  } else {
    guidance = 'Balanced profile. Keep progressing across all categories.'
  }

  return {
    score:             overallScore,
    level:             scoreToOverallLevel(overallScore),
    confidence,
    totalPRs,
    categoriesUsed,
    categoryScores,
    strongestCategory: strongest,
    weakestCategory:   weakest,
    missingCategories,
    guidance,
  }
}

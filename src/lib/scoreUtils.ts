/**
 * Pure score-calculation utilities.
 * Extracted from AddScore so they can be unit-tested independently.
 */

/**
 * Epley formula for estimating 1RM from a multi-rep set.
 * Returns the raw value rounded to nearest 0.5kg.
 */
export function epley1RM(weight: number, reps: number): number | null {
  if (reps === 1) return weight
  if (reps <= 0 || weight <= 0) return null
  return Math.round(weight * (1 + reps / 30) * 2) / 2
}

/**
 * Returns true when the new weight is a PR for the given rep count.
 */
export function isNewPR(newWeight: number, currentPR: number | null): boolean {
  return currentPR === null || newWeight > currentPR
}

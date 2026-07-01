export type WodScoreType = 'time' | 'reps' | 'weight' | 'rounds_plus_reps'

export interface ScoreFields {
  type: WodScoreType
  // time
  minutes?: number
  seconds?: number
  // reps
  reps?: number
  // weight
  kg?: number
  // rounds_plus_reps
  rounds?: number
  partialReps?: number
}

export interface EncodedScore {
  score_numeric: number
  raw_result: string
}

// rounds * 10000 + reps — gives correct DESC ordering and survives up to 9999 reps/round
const ROUNDS_MULTIPLIER = 10000

export function encodeScore(fields: ScoreFields): EncodedScore | null {
  switch (fields.type) {
    case 'time': {
      const mm = fields.minutes ?? 0
      const ss = fields.seconds ?? 0
      if (mm < 0 || ss < 0 || ss > 59) return null
      const total = mm * 60 + ss
      if (total <= 0 || total > 3600) return null
      const raw = `${String(mm).padStart(2, '0')}:${String(ss).padStart(2, '0')}`
      return { score_numeric: total, raw_result: raw }
    }
    case 'reps': {
      const r = fields.reps ?? 0
      if (r <= 0 || r > 99999) return null
      return { score_numeric: r, raw_result: String(r) }
    }
    case 'weight': {
      const kg = fields.kg ?? 0
      if (kg <= 0 || kg > 9999) return null
      return { score_numeric: kg, raw_result: `${kg} kg` }
    }
    case 'rounds_plus_reps': {
      const rounds = fields.rounds ?? 0
      const reps = fields.partialReps ?? 0
      if (rounds < 0 || reps < 0 || reps >= ROUNDS_MULTIPLIER) return null
      if (rounds === 0 && reps === 0) return null
      const numeric = rounds * ROUNDS_MULTIPLIER + reps
      const raw = reps > 0 ? `${rounds} rounds + ${reps} reps` : `${rounds} rounds`
      return { score_numeric: numeric, raw_result: raw }
    }
  }
}

export function decodeScore(type: WodScoreType, score_numeric: number): string {
  switch (type) {
    case 'time': {
      const total = Math.round(score_numeric)
      const mm = Math.floor(total / 60)
      const ss = total % 60
      return `${String(mm).padStart(2, '0')}:${String(ss).padStart(2, '0')}`
    }
    case 'reps':
      return String(score_numeric)
    case 'weight':
      return `${score_numeric} kg`
    case 'rounds_plus_reps': {
      const rounds = Math.floor(score_numeric / ROUNDS_MULTIPLIER)
      const reps = Math.round(score_numeric % ROUNDS_MULTIPLIER)
      return reps > 0 ? `${rounds} + ${reps}` : `${rounds} rounds`
    }
  }
}

export function validateScoreFields(fields: ScoreFields): string | null {
  switch (fields.type) {
    case 'time': {
      const ss = fields.seconds ?? 0
      if (ss > 59) return 'Segundos deve ser 0–59'
      const total = (fields.minutes ?? 0) * 60 + ss
      if (total <= 0) return 'Tempo deve ser maior que zero'
      if (total > 3600) return 'Tempo máximo: 60:00'
      return null
    }
    case 'reps':
      if (!fields.reps || fields.reps <= 0) return 'Reps deve ser maior que zero'
      return null
    case 'weight':
      if (!fields.kg || fields.kg <= 0) return 'Peso deve ser maior que zero'
      return null
    case 'rounds_plus_reps': {
      const rounds = fields.rounds ?? 0
      const reps = fields.partialReps ?? 0
      if (rounds === 0 && reps === 0) return 'Resultado deve ser maior que zero'
      if (reps >= ROUNDS_MULTIPLIER) return 'Reps parciais deve ser menor que 10000'
      return null
    }
  }
}

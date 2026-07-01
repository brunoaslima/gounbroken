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

// Parse cap string like "8 MIN", "15min", "1:30" → seconds. Returns null if unparseable.
export function parseDisplayScore(type: WodScoreType, display: string): number | null {
  const s = display.trim()
  switch (type) {
    case 'time': {
      const m = s.match(/^(\d+):(\d{2})$/)
      if (!m) return null
      const total = parseInt(m[1]) * 60 + parseInt(m[2])
      return total > 0 && total <= 3600 ? total : null
    }
    case 'reps': {
      const n = parseInt(s)
      return n > 0 ? n : null
    }
    case 'weight': {
      const n = parseFloat(s.replace(',', '.'))
      return n > 0 ? n : null
    }
    case 'rounds_plus_reps': {
      const full = s.match(/^(\d+)\s+rounds?\s*\+\s*(\d+)\s+reps?$/)
      if (full) return parseInt(full[1]) * ROUNDS_MULTIPLIER + parseInt(full[2])
      const rounds = s.match(/^(\d+)\s+rounds?$/)
      if (rounds) return parseInt(rounds[1]) * ROUNDS_MULTIPLIER
      return null
    }
  }
}

export function parseCapSeconds(cap: string | null | undefined): number | null {
  if (!cap) return null
  const mmss = cap.trim().match(/^(\d+):(\d+)$/)
  if (mmss) return parseInt(mmss[1]) * 60 + parseInt(mmss[2])
  const mins = cap.trim().match(/^(\d+)/)
  if (mins) return parseInt(mins[1]) * 60
  return null
}

export function validateScoreFields(fields: ScoreFields, capSeconds?: number | null): string | null {
  switch (fields.type) {
    case 'time': {
      const ss = fields.seconds ?? 0
      if (ss > 59) return 'Segundos deve ser 0–59'
      const total = (fields.minutes ?? 0) * 60 + ss
      if (total <= 0) return 'Tempo deve ser maior que zero'
      if (total > 3600) return 'Tempo máximo: 60:00'
      if (capSeconds != null && total > capSeconds) {
        const capMM = Math.floor(capSeconds / 60)
        const capSS = capSeconds % 60
        return `Tempo excede o limite da prova (${String(capMM).padStart(2, '0')}:${String(capSS).padStart(2, '0')})`
      }
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
      if (rounds < 0) return 'Rounds não pode ser negativo'
      if (reps < 0) return 'Reps não pode ser negativo'
      if (rounds === 0 && reps === 0) return 'Resultado deve ser maior que zero'
      if (reps >= ROUNDS_MULTIPLIER) return 'Reps parciais deve ser menor que 10000'
      return null
    }
  }
}

export function parseScore(type: string, val: string): { raw: string; numeric: number } | null {
  switch (type) {
    case 'time': {
      const m = val.match(/^(\d{1,2}):(\d{2})$/)
      if (!m) return null
      const secs = parseInt(m[2], 10)
      if (secs >= 60) return null
      const total = parseInt(m[1], 10) * 60 + secs
      return { raw: val, numeric: total }
    }
    case 'reps': {
      const n = parseInt(val, 10)
      if (isNaN(n) || n < 0) return null
      return { raw: val, numeric: n }
    }
    case 'weight': {
      const n = parseFloat(val.replace(',', '.'))
      if (isNaN(n) || n <= 0) return null
      return { raw: `${val} kg`, numeric: n }
    }
    case 'rounds_plus_reps': {
      const m = val.match(/^(\d+)\s*\+\s*(\d+)$/)
      if (!m) return null
      return { raw: val, numeric: parseInt(m[1], 10) * 1000 + parseInt(m[2], 10) }
    }
    default:
      return null
  }
}

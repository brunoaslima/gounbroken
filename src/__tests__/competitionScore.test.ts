import { describe, it, expect } from 'vitest'
import {
  encodeScore,
  decodeScore,
  validateScoreFields,
  parseCapSeconds,
} from '@/lib/competitionScore'

// ─── parseCapSeconds ──────────────────────────────────────────────────────────

describe('parseCapSeconds', () => {
  it('parses "8 MIN"', () => expect(parseCapSeconds('8 MIN')).toBe(480))
  it('parses "15 MIN"', () => expect(parseCapSeconds('15 MIN')).toBe(900))
  it('parses "1:30" as MM:SS', () => expect(parseCapSeconds('1:30')).toBe(90))
  it('parses bare number as minutes', () => expect(parseCapSeconds('10')).toBe(600))
  it('returns null for null', () => expect(parseCapSeconds(null)).toBeNull())
  it('returns null for empty string', () => expect(parseCapSeconds('')).toBeNull())
})

// ─── encodeScore — time ───────────────────────────────────────────────────────

describe('encodeScore — time', () => {
  it('encodes 3min 45sec correctly', () => {
    const r = encodeScore({ type: 'time', minutes: 3, seconds: 45 })
    expect(r?.score_numeric).toBe(225)
    expect(r?.raw_result).toBe('03:45')
  })

  it('encodes 0min 30sec correctly', () => {
    const r = encodeScore({ type: 'time', minutes: 0, seconds: 30 })
    expect(r?.score_numeric).toBe(30)
    expect(r?.raw_result).toBe('00:30')
  })

  it('encodes 60min 0sec correctly', () => {
    const r = encodeScore({ type: 'time', minutes: 60, seconds: 0 })
    expect(r?.score_numeric).toBe(3600)
  })

  it('returns null for zero time', () => {
    expect(encodeScore({ type: 'time', minutes: 0, seconds: 0 })).toBeNull()
  })

  it('returns null for seconds > 59', () => {
    expect(encodeScore({ type: 'time', minutes: 1, seconds: 60 })).toBeNull()
  })

  it('returns null for time > 3600 seconds', () => {
    expect(encodeScore({ type: 'time', minutes: 61, seconds: 0 })).toBeNull()
  })
})

// ─── encodeScore — reps ───────────────────────────────────────────────────────

describe('encodeScore — reps', () => {
  it('encodes reps correctly', () => {
    const r = encodeScore({ type: 'reps', reps: 147 })
    expect(r?.score_numeric).toBe(147)
    expect(r?.raw_result).toBe('147')
  })

  it('returns null for zero reps', () => {
    expect(encodeScore({ type: 'reps', reps: 0 })).toBeNull()
  })
})

// ─── encodeScore — weight ─────────────────────────────────────────────────────

describe('encodeScore — weight', () => {
  it('encodes kg correctly', () => {
    const r = encodeScore({ type: 'weight', kg: 102.5 })
    expect(r?.score_numeric).toBe(102.5)
    expect(r?.raw_result).toBe('102.5 kg')
  })

  it('returns null for zero kg', () => {
    expect(encodeScore({ type: 'weight', kg: 0 })).toBeNull()
  })
})

// ─── encodeScore — rounds_plus_reps ──────────────────────────────────────────

describe('encodeScore — rounds_plus_reps', () => {
  it('encodes 5 rounds + 87 reps correctly', () => {
    const r = encodeScore({ type: 'rounds_plus_reps', rounds: 5, partialReps: 87 })
    expect(r?.score_numeric).toBe(50087)
    expect(r?.raw_result).toBe('5 rounds + 87 reps')
  })

  it('encodes 3 rounds + 0 reps correctly', () => {
    const r = encodeScore({ type: 'rounds_plus_reps', rounds: 3, partialReps: 0 })
    expect(r?.score_numeric).toBe(30000)
    expect(r?.raw_result).toBe('3 rounds')
  })

  it('returns null for zero rounds and zero reps', () => {
    expect(encodeScore({ type: 'rounds_plus_reps', rounds: 0, partialReps: 0 })).toBeNull()
  })

  it('returns null when reps >= 10000', () => {
    expect(encodeScore({ type: 'rounds_plus_reps', rounds: 1, partialReps: 10000 })).toBeNull()
  })

  it('6 rounds + 1 rep ranks higher than 5 rounds + 9999 reps', () => {
    const a = encodeScore({ type: 'rounds_plus_reps', rounds: 6, partialReps: 1 })!
    const b = encodeScore({ type: 'rounds_plus_reps', rounds: 5, partialReps: 9999 })!
    expect(a.score_numeric).toBeGreaterThan(b.score_numeric)
  })
})

// ─── decodeScore ─────────────────────────────────────────────────────────────

describe('decodeScore — time', () => {
  it('decodes 225 seconds to 03:45', () => expect(decodeScore('time', 225)).toBe('03:45'))
  it('decodes 3600 seconds to 60:00', () => expect(decodeScore('time', 3600)).toBe('60:00'))
  it('decodes 30 seconds to 00:30', () => expect(decodeScore('time', 30)).toBe('00:30'))
})

describe('decodeScore — reps', () => {
  it('returns string of reps', () => expect(decodeScore('reps', 147)).toBe('147'))
})

describe('decodeScore — weight', () => {
  it('appends kg', () => expect(decodeScore('weight', 102.5)).toBe('102.5 kg'))
})

describe('decodeScore — rounds_plus_reps', () => {
  it('decodes 50087 to 5 + 87', () => expect(decodeScore('rounds_plus_reps', 50087)).toBe('5 + 87'))
  it('decodes 30000 to 3 rounds', () => expect(decodeScore('rounds_plus_reps', 30000)).toBe('3 rounds'))
})

// ─── encode → decode roundtrip ────────────────────────────────────────────────

describe('encode → decode roundtrip', () => {
  it('time: 3min 45sec', () => {
    const encoded = encodeScore({ type: 'time', minutes: 3, seconds: 45 })!
    expect(decodeScore('time', encoded.score_numeric)).toBe('03:45')
  })

  it('rounds_plus_reps: 12 + 45', () => {
    const encoded = encodeScore({ type: 'rounds_plus_reps', rounds: 12, partialReps: 45 })!
    const decoded = decodeScore('rounds_plus_reps', encoded.score_numeric)
    expect(decoded).toBe('12 + 45')
  })
})

// ─── validateScoreFields ─────────────────────────────────────────────────────

describe('validateScoreFields — time', () => {
  it('passes valid time', () => {
    expect(validateScoreFields({ type: 'time', minutes: 3, seconds: 45 })).toBeNull()
  })

  it('fails zero time', () => {
    expect(validateScoreFields({ type: 'time', minutes: 0, seconds: 0 })).not.toBeNull()
  })

  it('fails seconds > 59', () => {
    expect(validateScoreFields({ type: 'time', minutes: 0, seconds: 60 })).not.toBeNull()
  })

  it('fails when exceeds cap', () => {
    const err = validateScoreFields({ type: 'time', minutes: 10, seconds: 0 }, 480) // cap 8min
    expect(err).not.toBeNull()
    expect(err).toContain('limite')
  })

  it('passes when equal to cap', () => {
    expect(validateScoreFields({ type: 'time', minutes: 8, seconds: 0 }, 480)).toBeNull()
  })

  it('passes when below cap', () => {
    expect(validateScoreFields({ type: 'time', minutes: 7, seconds: 59 }, 480)).toBeNull()
  })

  it('ignores cap for non-time types', () => {
    expect(validateScoreFields({ type: 'reps', reps: 200 }, 480)).toBeNull()
  })
})

describe('validateScoreFields — reps', () => {
  it('passes valid reps', () => expect(validateScoreFields({ type: 'reps', reps: 100 })).toBeNull())
  it('fails zero reps', () => expect(validateScoreFields({ type: 'reps', reps: 0 })).not.toBeNull())
})

describe('validateScoreFields — weight', () => {
  it('passes valid kg', () => expect(validateScoreFields({ type: 'weight', kg: 100 })).toBeNull())
  it('fails zero kg', () => expect(validateScoreFields({ type: 'weight', kg: 0 })).not.toBeNull())
})

describe('validateScoreFields — rounds_plus_reps', () => {
  it('passes valid result', () => {
    expect(validateScoreFields({ type: 'rounds_plus_reps', rounds: 5, partialReps: 87 })).toBeNull()
  })
  it('fails when both zero', () => {
    expect(validateScoreFields({ type: 'rounds_plus_reps', rounds: 0, partialReps: 0 })).not.toBeNull()
  })
  it('fails when reps >= 10000', () => {
    expect(validateScoreFields({ type: 'rounds_plus_reps', rounds: 1, partialReps: 10000 })).not.toBeNull()
  })
})

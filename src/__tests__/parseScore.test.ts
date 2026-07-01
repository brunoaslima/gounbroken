import { describe, it, expect, vi } from 'vitest'

vi.mock('../lib/supabase', () => ({ supabase: {} }))

import { parseScore } from '../lib/competitionScore'

describe('parseScore', () => {
  describe('time', () => {
    const valid: [string, number][] = [
      ['5:00',  300],
      ['0:00',    0],
      ['0:59',   59],
      ['10:30', 630],
      ['99:00', 5940],
    ]
    it.each(valid)('parseScore(time, %s) → %i seconds', (val, expected) => {
      expect(parseScore('time', val)?.numeric).toBe(expected)
    })

    const invalid = ['5:60', '5:99', 'abc', '', '5:', ':30', '5:0', '-1:00', '5:000']
    it.each(invalid)('parseScore(time, %s) → null', (val) => {
      expect(parseScore('time', val)).toBeNull()
    })

    it('raw field preserves the original input', () => {
      expect(parseScore('time', '5:42')?.raw).toBe('5:42')
    })

    it('regression: time is stored as positive seconds — not negative (inverted ranking bug)', () => {
      const result = parseScore('time', '2:32')
      expect(result?.numeric).toBe(152)
      expect(result?.numeric).toBeGreaterThan(0)
    })

    it('invariant: faster time has lower score_numeric (asc ranking → faster = rank 1)', () => {
      const fast = parseScore('time', '5:00')!
      const slow = parseScore('time', '8:00')!
      expect(fast.numeric).toBeLessThan(slow.numeric)
    })
  })

  describe('reps', () => {
    const valid: [string, number][] = [
      ['0',   0],
      ['1',   1],
      ['47', 47],
      ['999', 999],
    ]
    it.each(valid)('parseScore(reps, %s) → %i', (val, expected) => {
      expect(parseScore('reps', val)?.numeric).toBe(expected)
    })

    const invalid = ['-1', 'abc', '']
    it.each(invalid)('parseScore(reps, %s) → null', (val) => {
      expect(parseScore('reps', val)).toBeNull()
    })

    it('invariant: more reps has higher score_numeric (desc ranking → more = rank 1)', () => {
      const more  = parseScore('reps', '50')!
      const fewer = parseScore('reps', '30')!
      expect(more.numeric).toBeGreaterThan(fewer.numeric)
    })
  })

  describe('weight', () => {
    const valid: [string, number][] = [
      ['85.5',  85.5],
      ['85,5',  85.5],  // comma decimal separator
      ['100',   100],
      ['0.5',   0.5],
    ]
    it.each(valid)('parseScore(weight, %s) → %f kg', (val, expected) => {
      expect(parseScore('weight', val)?.numeric).toBe(expected)
    })

    const invalid = ['0', '-10', 'abc', '']
    it.each(invalid)('parseScore(weight, %s) → null', (val) => {
      expect(parseScore('weight', val)).toBeNull()
    })

    it('raw field appends kg suffix', () => {
      expect(parseScore('weight', '85.5')?.raw).toBe('85.5 kg')
    })
  })

  describe('rounds_plus_reps', () => {
    const valid: [string, number][] = [
      ['5+12',   5012],
      ['5 + 12', 5012],  // spaces around +
      ['0+0',       0],
      ['10+0',  10000],
      ['3+999',  3999],
    ]
    it.each(valid)('parseScore(rounds_plus_reps, %s) → %i', (val, expected) => {
      expect(parseScore('rounds_plus_reps', val)?.numeric).toBe(expected)
    })

    const invalid = ['5-12', 'abc', '', '5', '+12']
    it.each(invalid)('parseScore(rounds_plus_reps, %s) → null', (val) => {
      expect(parseScore('rounds_plus_reps', val)).toBeNull()
    })

    it('regression: encoding is rounds*1000+reps (decodeable)', () => {
      const result = parseScore('rounds_plus_reps', '5+12')!
      expect(result.numeric).toBe(5012)
      expect(Math.floor(result.numeric / 1000)).toBe(5)   // rounds
      expect(result.numeric % 1000).toBe(12)              // reps
    })
  })

  describe('unknown type', () => {
    it('returns null for unknown score type', () => {
      expect(parseScore('unknown', '42')).toBeNull()
      expect(parseScore('', '42')).toBeNull()
    })
  })
})

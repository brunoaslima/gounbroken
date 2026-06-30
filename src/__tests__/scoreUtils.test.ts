import { describe, it, expect } from 'vitest'
import { epley1RM, isNewPR } from '@/lib/scoreUtils'

describe('epley1RM', () => {
  it('retorna o próprio peso para 1 rep', () => {
    expect(epley1RM(100, 1)).toBe(100)
    expect(epley1RM(142.5, 1)).toBe(142.5)
  })

  it('calcula 1RM estimado corretamente (Epley)', () => {
    // 80kg × 5 reps → 80 * (1 + 5/30) = 80 * 1.1667 ≈ 93.5
    expect(epley1RM(80, 5)).toBe(93.5)
  })

  it('arredonda para 0.5kg mais próximo', () => {
    // Qualquer resultado deve ser múltiplo de 0.5
    const result = epley1RM(75, 3)
    expect(result! % 0.5).toBe(0)
  })

  it('retorna null para reps <= 0', () => {
    expect(epley1RM(100, 0)).toBeNull()
    expect(epley1RM(100, -1)).toBeNull()
  })

  it('retorna null para peso <= 0', () => {
    expect(epley1RM(0, 5)).toBeNull()
    expect(epley1RM(-10, 5)).toBeNull()
  })

  it('1RM estimado é sempre >= peso original', () => {
    for (const reps of [2, 3, 5, 8, 10]) {
      const result = epley1RM(100, reps)
      expect(result!).toBeGreaterThanOrEqual(100)
    }
  })
})

describe('isNewPR', () => {
  it('retorna true quando não há PR anterior', () => {
    expect(isNewPR(100, null)).toBe(true)
  })

  it('retorna true quando o novo peso supera o PR atual', () => {
    expect(isNewPR(105, 100)).toBe(true)
  })

  it('retorna false quando o novo peso é igual ao PR', () => {
    expect(isNewPR(100, 100)).toBe(false)
  })

  it('retorna false quando o novo peso é menor que o PR', () => {
    expect(isNewPR(95, 100)).toBe(false)
  })
})

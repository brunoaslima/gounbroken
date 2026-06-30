import { describe, it, expect } from 'vitest'
import { analyzeStrength, hasStrengthStandard, TIER_LABELS, TIER_COLORS } from '@/lib/strengthStandards'

describe('analyzeStrength', () => {
  it('retorna null para movimento sem padrão cadastrado', () => {
    expect(analyzeStrength('Exercício Desconhecido', 100, 80, 'male')).toBeNull()
  })

  it('retorna análise para Back Squat masculino', () => {
    const result = analyzeStrength('Back Squat', 120, 80, 'male')
    expect(result).not.toBeNull()
    expect(result!.weightKg).toBe(120)
    expect(result!.level).toBeDefined()
    expect(result!.score).toBeGreaterThanOrEqual(0)
    expect(result!.score).toBeLessThanOrEqual(100)
  })

  it('score aumenta conforme o peso aumenta', () => {
    const light  = analyzeStrength('Back Squat', 60, 80, 'male')
    const heavy  = analyzeStrength('Back Squat', 160, 80, 'male')
    expect(light).not.toBeNull()
    expect(heavy).not.toBeNull()
    expect(heavy!.score).toBeGreaterThan(light!.score)
  })

  it('level é um dos valores válidos', () => {
    const valid = ['below_beginner', 'beginner', 'novice', 'intermediate', 'advanced', 'elite']
    const result = analyzeStrength('Deadlift', 150, 80, 'male')
    if (result) expect(valid).toContain(result.level)
  })

  it('kgToNextLevel é null no nível elite', () => {
    // Peso absurdo para atingir elite
    const result = analyzeStrength('Back Squat', 500, 80, 'male')
    if (result && result.level === 'elite') {
      expect(result.kgToNextLevel).toBeNull()
    }
  })

  it('bodyWeightRatio é calculado corretamente', () => {
    const result = analyzeStrength('Back Squat', 160, 80, 'male')
    expect(result!.bodyWeightRatio).toBeCloseTo(160 / 80, 2)
  })
})

// ── Regressão: movimentos com parênteses ou hifens ─────────────────────────────
// Bug: normalizeMovement não removia parênteses nem convertia hifens → esses
// movimentos retornavam null em analyzeStrength e sumiam do dashboard.

describe('hasStrengthStandard — normalização de nomes com parênteses e hifens', () => {
  it('Shoulder Press (Strict) — parênteses com qualificador', () => {
    expect(hasStrengthStandard('Shoulder Press (Strict)')).toBe(true)
  })

  it('Split Jerk (Behind the Neck) — parênteses com qualificador', () => {
    expect(hasStrengthStandard('Split Jerk (Behind the Neck)')).toBe(true)
  })

  it('Shoulder-to-overhead — hifens no nome', () => {
    expect(hasStrengthStandard('Shoulder-to-overhead')).toBe(true)
  })

  it('Ground-to-overhead — hifens no nome', () => {
    expect(hasStrengthStandard('Ground-to-overhead')).toBe(true)
  })

  it('Weighted Pull-up — hifen no nome', () => {
    expect(hasStrengthStandard('Weighted Pull-up')).toBe(true)
  })

  it('Dumbbell Box Step-up — hifen no nome', () => {
    expect(hasStrengthStandard('Dumbbell Box Step-up')).toBe(true)
  })
})

describe('analyzeStrength — movimentos com parênteses retornam resultado válido', () => {
  it('Shoulder Press (Strict) retorna análise não-nula', () => {
    const result = analyzeStrength('Shoulder Press (Strict)', 80, 80, 'male')
    expect(result).not.toBeNull()
    expect(result!.score).toBeGreaterThanOrEqual(0)
  })

  it('Split Jerk (Behind the Neck) retorna análise não-nula', () => {
    const result = analyzeStrength('Split Jerk (Behind the Neck)', 100, 80, 'male')
    expect(result).not.toBeNull()
  })

  it('Shoulder-to-overhead retorna análise não-nula', () => {
    const result = analyzeStrength('Shoulder-to-overhead', 80, 80, 'male')
    expect(result).not.toBeNull()
  })

  it('Ground-to-overhead retorna análise não-nula', () => {
    const result = analyzeStrength('Ground-to-overhead', 100, 80, 'male')
    expect(result).not.toBeNull()
  })
})

describe('TIER_LABELS', () => {
  it('todos os tiers têm label', () => {
    const tiers = ['below_beginner', 'beginner', 'novice', 'intermediate', 'advanced', 'elite'] as const
    for (const t of tiers) {
      expect(TIER_LABELS[t]).toBeTruthy()
    }
  })
})

describe('TIER_COLORS', () => {
  it('todos os tiers têm cor hex válida', () => {
    const tiers = ['below_beginner', 'beginner', 'novice', 'intermediate', 'advanced', 'elite'] as const
    for (const t of tiers) {
      expect(TIER_COLORS[t]).toMatch(/^#[0-9A-Fa-f]{6}$/)
    }
  })
})

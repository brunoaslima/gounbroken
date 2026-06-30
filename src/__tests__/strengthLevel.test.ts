import { describe, it, expect } from 'vitest'
import {
  calculateStrengthLevel,
  calcConfidence,
  scoreToOverallLevel,
  OVERALL_LEVEL_LABELS,
  OVERALL_LEVEL_COLORS,
  CONFIDENCE_LABELS,
} from '@/lib/strengthLevel'
import type { Movement } from '@/types'

// ── Fixtures ───────────────────────────────────────────────────────────────────

function makeMovement(id: string, name: string): Movement {
  return { id, name, user_id: 'u1', created_at: '' }
}

// 80kg male, solid numbers across categories
const MOVEMENTS: Movement[] = [
  makeMovement('bs',  'Back Squat'),
  makeMovement('fs',  'Front Squat'),
  makeMovement('dl',  'Deadlift'),
  makeMovement('sp',  'Shoulder Press (Strict)'),
  makeMovement('pp',  'Push Press'),
  makeMovement('sn',  'Snatch'),
  makeMovement('cl',  'Clean'),
  makeMovement('bp',  'Bench Press'),
  makeMovement('thr', 'Thruster'),
  makeMovement('xx',  'Exercício Sem Padrão'),  // movement without scoring standard
]

// PRs keyed by movementId → { repCount: weight }
type PRMap = Record<string, Record<number, number>>

function makePRFn(prs: PRMap) {
  return (id: string): Record<number, number> => prs[id] ?? {}
}

// A "strong" intermediate male 80kg
const STRONG_PRS: PRMap = {
  bs:  { 1: 140 },  // squat
  fs:  { 1: 115 },  // squat
  dl:  { 1: 180 },  // hinge
  sp:  { 1:  80 },  // overhead
  pp:  { 1: 100 },  // overhead
  sn:  { 1:  90 },  // olympic
  cl:  { 1: 110 },  // olympic
  bp:  { 1: 110 },  // accessory
  thr: { 1:  80 },  // overhead
  xx:  { 1:  50 },  // no standard — should be ignored
}

// ── scoreToOverallLevel ────────────────────────────────────────────────────────

describe('scoreToOverallLevel', () => {
  it('0 → untrained', () => expect(scoreToOverallLevel(0)).toBe('untrained'))
  it('20 → untrained', () => expect(scoreToOverallLevel(20)).toBe('untrained'))
  it('21 → novice',    () => expect(scoreToOverallLevel(21)).toBe('novice'))
  it('40 → novice',    () => expect(scoreToOverallLevel(40)).toBe('novice'))
  it('41 → intermediate', () => expect(scoreToOverallLevel(41)).toBe('intermediate'))
  it('60 → intermediate', () => expect(scoreToOverallLevel(60)).toBe('intermediate'))
  it('61 → advanced',  () => expect(scoreToOverallLevel(61)).toBe('advanced'))
  it('80 → advanced',  () => expect(scoreToOverallLevel(80)).toBe('advanced'))
  it('81 → elite',     () => expect(scoreToOverallLevel(81)).toBe('elite'))
  it('94 → elite',     () => expect(scoreToOverallLevel(94)).toBe('elite'))
  it('95 → world_class', () => expect(scoreToOverallLevel(95)).toBe('world_class'))
  it('100 → world_class', () => expect(scoreToOverallLevel(100)).toBe('world_class'))
})

// ── calcConfidence ─────────────────────────────────────────────────────────────

describe('calcConfidence', () => {
  it('0 PRs → insufficient', () => expect(calcConfidence(0, 0)).toBe('insufficient'))
  it('1 PR → insufficient',  () => expect(calcConfidence(1, 1)).toBe('insufficient'))
  it('2 PRs, 1 cat → low',   () => expect(calcConfidence(2, 1)).toBe('low'))
  it('3 PRs, 2 cats → medium', () => expect(calcConfidence(3, 2)).toBe('medium'))
  it('5 PRs, 3 cats → high', () => expect(calcConfidence(5, 3)).toBe('high'))
  it('8 PRs, 4 cats → very_high', () => expect(calcConfidence(8, 4)).toBe('very_high'))
  it('10 PRs, 5 cats → very_high', () => expect(calcConfidence(10, 5)).toBe('very_high'))
})

// ── OVERALL_LEVEL_LABELS / OVERALL_LEVEL_COLORS ────────────────────────────────

describe('OVERALL_LEVEL_LABELS', () => {
  it('todos os níveis têm label', () => {
    const levels = ['untrained', 'novice', 'intermediate', 'advanced', 'elite', 'world_class'] as const
    for (const l of levels) expect(OVERALL_LEVEL_LABELS[l]).toBeTruthy()
  })
})

describe('OVERALL_LEVEL_COLORS', () => {
  it('todos os níveis têm cor hex válida', () => {
    const levels = ['untrained', 'novice', 'intermediate', 'advanced', 'elite', 'world_class'] as const
    for (const l of levels) expect(OVERALL_LEVEL_COLORS[l]).toMatch(/^#[0-9A-Fa-f]{6}$/)
  })
})

describe('CONFIDENCE_LABELS', () => {
  it('todos os níveis de confiança têm label', () => {
    const confs = ['insufficient', 'low', 'medium', 'high', 'very_high'] as const
    for (const c of confs) expect(CONFIDENCE_LABELS[c]).toBeTruthy()
  })
})

// ── calculateStrengthLevel ─────────────────────────────────────────────────────

describe('calculateStrengthLevel — dados insuficientes', () => {
  it('retorna null quando não há PRs', () => {
    const result = calculateStrengthLevel(MOVEMENTS, makePRFn({}), 80, 'male')
    expect(result).toBeNull()
  })

  it('retorna null quando só há 1 PR com padrão', () => {
    const result = calculateStrengthLevel(MOVEMENTS, makePRFn({ bs: { 1: 140 } }), 80, 'male')
    expect(result).toBeNull()
  })

  it('retorna null quando perfil está incompleto (sem bodyweight)', () => {
    const result = calculateStrengthLevel(MOVEMENTS, makePRFn(STRONG_PRS), 0, 'male')
    expect(result).toBeNull()
  })

  it('retorna null quando movimento não tem padrão de força', () => {
    // "Exercício Sem Padrão" não está no MOVEMENT_MAP → não contribui
    const result = calculateStrengthLevel(MOVEMENTS, makePRFn({ xx: { 1: 50 } }), 80, 'male')
    expect(result).toBeNull()
  })
})

describe('calculateStrengthLevel — resultado válido', () => {
  it('retorna resultado com múltiplos PRs entre categorias', () => {
    const result = calculateStrengthLevel(MOVEMENTS, makePRFn(STRONG_PRS), 80, 'male')
    expect(result).not.toBeNull()
    expect(result!.totalPRs).toBeGreaterThanOrEqual(5)
    expect(result!.categoriesUsed).toBeGreaterThanOrEqual(3)
  })

  it('score está entre 0 e 100', () => {
    const result = calculateStrengthLevel(MOVEMENTS, makePRFn(STRONG_PRS), 80, 'male')
    expect(result!.score).toBeGreaterThanOrEqual(0)
    expect(result!.score).toBeLessThanOrEqual(100)
  })

  it('level é um valor válido', () => {
    const valid = ['untrained', 'novice', 'intermediate', 'advanced', 'elite', 'world_class']
    const result = calculateStrengthLevel(MOVEMENTS, makePRFn(STRONG_PRS), 80, 'male')
    expect(valid).toContain(result!.level)
  })

  it('confiança alta com ≥5 PRs em ≥3 categorias', () => {
    const result = calculateStrengthLevel(MOVEMENTS, makePRFn(STRONG_PRS), 80, 'male')
    expect(['high', 'very_high']).toContain(result!.confidence)
  })

  it('categoryScores tem uma entrada por categoria com dados', () => {
    const result = calculateStrengthLevel(MOVEMENTS, makePRFn(STRONG_PRS), 80, 'male')
    expect(result!.categoryScores.length).toBeGreaterThanOrEqual(3)
    for (const cat of result!.categoryScores) {
      expect(cat.score).toBeGreaterThanOrEqual(0)
      expect(cat.score).toBeLessThanOrEqual(100)
      expect(cat.movementCount).toBeGreaterThan(0)
    }
  })

  it('guidance é uma string não vazia', () => {
    const result = calculateStrengthLevel(MOVEMENTS, makePRFn(STRONG_PRS), 80, 'male')
    expect(typeof result!.guidance).toBe('string')
    expect(result!.guidance.length).toBeGreaterThan(0)
  })
})

describe('calculateStrengthLevel — Epley para PRs não-1RM', () => {
  it('PR de 2RM é convertido via Epley e gera análise válida', () => {
    // Back Squat 2RM 135kg → E1RM ~140kg
    const prs: PRMap = {
      bs: { 2: 135 },
      dl: { 1: 180 },
      sp: { 1: 80 },
    }
    const result = calculateStrengthLevel(MOVEMENTS, makePRFn(prs), 80, 'male')
    expect(result).not.toBeNull()
    // Score deve ser semelhante ao de 1RM direto com peso ligeiramente menor
    const directResult = calculateStrengthLevel(
      MOVEMENTS, makePRFn({ bs: { 1: 140 }, dl: { 1: 180 }, sp: { 1: 80 } }), 80, 'male'
    )
    // Epley 2RM 135 → ~140.5 → score deve estar próximo do direto
    expect(Math.abs(result!.score - directResult!.score)).toBeLessThanOrEqual(5)
  })

  it('PR de 5RM também é convertido corretamente', () => {
    const prs: PRMap = {
      bs: { 5: 120 },  // Epley → ~120*(1+5/30) = ~140kg
      dl: { 1: 180 },
      sp: { 1: 80 },
    }
    const result = calculateStrengthLevel(MOVEMENTS, makePRFn(prs), 80, 'male')
    expect(result).not.toBeNull()
    expect(result!.categoryScores.find(c => c.category === 'squat')).toBeDefined()
  })
})

describe('calculateStrengthLevel — movimento sem padrão não quebra o cálculo', () => {
  it('movimento desconhecido é ignorado sem afetar o resultado', () => {
    const prs: PRMap = {
      bs: { 1: 140 },
      dl: { 1: 180 },
      sp: { 1: 80 },
      xx: { 1: 50 },  // sem padrão — deve ser ignorado
    }
    const withUnknown    = calculateStrengthLevel(MOVEMENTS, makePRFn(prs), 80, 'male')
    const withoutUnknown = calculateStrengthLevel(
      MOVEMENTS,
      makePRFn({ bs: { 1: 140 }, dl: { 1: 180 }, sp: { 1: 80 } }),
      80, 'male'
    )
    // Resultado idêntico — o desconhecido não contamina o cálculo
    expect(withUnknown!.score).toBe(withoutUnknown!.score)
  })
})

describe('calculateStrengthLevel — confidência baixa com 1 categoria', () => {
  it('confiança low com 2 PRs na mesma categoria', () => {
    const prs: PRMap = {
      bs: { 1: 140 },
      fs: { 1: 115 },
    }
    const result = calculateStrengthLevel(MOVEMENTS, makePRFn(prs), 80, 'male')
    expect(result).not.toBeNull()
    expect(result!.confidence).toBe('low')
    expect(result!.categoriesUsed).toBe(1)
  })

  it('guidance menciona adicionar mais categorias quando confiança é low', () => {
    const prs: PRMap = { bs: { 1: 140 }, fs: { 1: 115 } }
    const result = calculateStrengthLevel(MOVEMENTS, makePRFn(prs), 80, 'male')
    expect(result!.guidance.toLowerCase()).toContain('categor')
  })
})

// ── Regressão: normalização de nome ────────────────────────────────────────────

describe('calculateStrengthLevel — regressão: normalização de nome', () => {
  it('"Shoulder Press" sem qualificador conta na categoria overhead', () => {
    // Bug: byName.get('Shoulder Press (Strict)') falha para movimento criado como 'Shoulder Press'
    const sp = makeMovement('sp_plain', 'Shoulder Press')
    const dl = makeMovement('dl_r',    'Deadlift')
    const result = calculateStrengthLevel(
      [sp, dl],
      makePRFn({ sp_plain: { 1: 80 }, dl_r: { 1: 180 } }),
      80, 'male'
    )
    expect(result).not.toBeNull()
    expect(result!.categoryScores.find(c => c.category === 'overhead')).toBeDefined()
  })

  it('"Thruster" conta na categoria overhead (não accessory)', () => {
    const thr = makeMovement('thr_r', 'Thruster')
    const dl  = makeMovement('dl_r2', 'Deadlift')
    const result = calculateStrengthLevel(
      [thr, dl],
      makePRFn({ thr_r: { 1: 80 }, dl_r2: { 1: 180 } }),
      80, 'male'
    )
    expect(result).not.toBeNull()
    expect(result!.categoryScores.find(c => c.category === 'overhead')).toBeDefined()
    expect(result!.categoryScores.find(c => c.category === 'accessory')).toBeUndefined()
  })

  it('"Overhead Squat" conta na categoria olympic (não squat)', () => {
    const ohs = makeMovement('ohs_r', 'Overhead Squat')
    const dl  = makeMovement('dl_r3', 'Deadlift')
    const result = calculateStrengthLevel(
      [ohs, dl],
      makePRFn({ ohs_r: { 1: 70 }, dl_r3: { 1: 180 } }),
      80, 'male'
    )
    expect(result).not.toBeNull()
    expect(result!.categoryScores.find(c => c.category === 'olympic')).toBeDefined()
    expect(result!.categoryScores.find(c => c.category === 'squat')).toBeUndefined()
  })
})

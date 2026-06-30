import { describe, it, expect } from 'vitest'
import { buildFormatLine, buildPrescription, dayLabel, formatDateBR } from '@/lib/workoutDisplay'
import type { WorkoutExerciseData } from '@/types'

// ── buildFormatLine ────────────────────────────────────────────────────

describe('buildFormatLine', () => {
  it('retorna null sem format_type', () => {
    expect(buildFormatLine({ format_type: null })).toBeNull()
    expect(buildFormatLine({})).toBeNull()
  })

  it('AMRAP sem tempo', () => {
    expect(buildFormatLine({ format_type: 'AMRAP' })).toBe('AMRAP')
  })

  it('AMRAP com tempo', () => {
    expect(buildFormatLine({
      format_type: 'AMRAP',
      format_config: { time_minutes: 12 },
    })).toBe('AMRAP · 12:00')
  })

  it('FOR_TIME simples', () => {
    expect(buildFormatLine({ format_type: 'FOR_TIME' })).toBe('FOR TIME')
  })

  it('FOR_TIME com rounds e time cap', () => {
    expect(buildFormatLine({
      format_type: 'FOR_TIME',
      format_config: { rounds: 3, time_cap_minutes: 20 },
    })).toBe('FOR TIME · 3 ROUNDS · CAP 20:00')
  })

  it('EMOM com tempo', () => {
    expect(buildFormatLine({
      format_type: 'EMOM',
      format_config: { time_minutes: 10 },
    })).toBe('EMOM · 10:00')
  })

  it('TABATA com defaults 20s/10s', () => {
    const result = buildFormatLine({ format_type: 'TABATA' })
    expect(result).toContain('TABATA')
    expect(result).toContain('20s/10s')
  })

  it('TABATA com rounds personalizados', () => {
    expect(buildFormatLine({
      format_type: 'TABATA',
      format_config: { rounds: 8, work_seconds: 20, rest_seconds: 10 },
    })).toBe('TABATA · 8 SÉRIES · 20s/10s')
  })

  it('UNBROKEN', () => {
    expect(buildFormatLine({ format_type: 'UNBROKEN' })).toBe('UNBROKEN')
  })

  it('ROUNDS com rounds e descanso', () => {
    expect(buildFormatLine({
      format_type: 'ROUNDS',
      format_config: { rounds: 5, rest_between_rounds_seconds: 90 },
    })).toBe('ROUNDS · 5× · 90s descanso')
  })

  it('retorna null para format_type desconhecido', () => {
    expect(buildFormatLine({ format_type: 'UNKNOWN_TYPE' })).toBeNull()
  })
})

// ── buildPrescription ──────────────────────────────────────────────────

function makeEx(overrides: Partial<WorkoutExerciseData> = {}): WorkoutExerciseData {
  return {
    id: '1', movement_name: 'Back Squat', sets: null, reps: null,
    duration_seconds: null, load_kg: null, load_kg_to: null,
    load_pct_1rm: null, load_pct_1rm_to: null,
    rpe: null, rest_seconds: null, notes: null, position: 0,
    ...overrides,
  }
}

describe('buildPrescription', () => {
  it('sem dados retorna array vazio', () => {
    expect(buildPrescription(makeEx())).toEqual([])
  })

  it('sets × reps', () => {
    const lines = buildPrescription(makeEx({ sets: 4, reps: 6 }))
    expect(lines[0]).toBe('4 × 6 REPS')
  })

  it('só sets (sem reps)', () => {
    const lines = buildPrescription(makeEx({ sets: 3 }))
    expect(lines[0]).toBe('3 SÉRIES')
  })

  it('só reps (sem sets)', () => {
    const lines = buildPrescription(makeEx({ reps: 10 }))
    expect(lines[0]).toBe('10 REPS')
  })

  it('duração em segundos (< 60)', () => {
    const lines = buildPrescription(makeEx({ duration_seconds: 45 }))
    expect(lines[0]).toContain('45s')
  })

  it('duração exata em minutos', () => {
    const lines = buildPrescription(makeEx({ duration_seconds: 120 }))
    expect(lines[0]).toContain('2:00')
  })

  it('carga simples em kg', () => {
    const lines = buildPrescription(makeEx({ sets: 3, reps: 5, load_kg: 100 }))
    expect(lines[1]).toBe('@ 100KG')
  })

  it('carga em range kg', () => {
    const lines = buildPrescription(makeEx({ sets: 3, reps: 5, load_kg: 80, load_kg_to: 100 }))
    expect(lines[1]).toBe('@ 80–100KG')
  })

  it('carga em % do 1RM', () => {
    const lines = buildPrescription(makeEx({ sets: 3, reps: 5, load_pct_1rm: 75 }))
    expect(lines[1]).toBe('@ 75% DO 1RM')
  })

  it('carga em range % do 1RM', () => {
    const lines = buildPrescription(makeEx({ sets: 3, reps: 5, load_pct_1rm: 70, load_pct_1rm_to: 80 }))
    expect(lines[1]).toBe('@ 70%–80% DO 1RM')
  })

  it('RPE', () => {
    const lines = buildPrescription(makeEx({ sets: 3, reps: 5, rpe: 8 }))
    expect(lines[1]).toContain('RPE 8/10')
  })

  it('descanso em segundos', () => {
    const lines = buildPrescription(makeEx({ sets: 3, reps: 5, rest_seconds: 90 }))
    const restLine = lines.find(l => l.startsWith('*DESCANSO'))
    expect(restLine).toBe('*DESCANSO 1:30 ENTRE SÉRIES')
  })

  it('descanso < 60s', () => {
    const lines = buildPrescription(makeEx({ sets: 3, reps: 5, rest_seconds: 45 }))
    const restLine = lines.find(l => l.startsWith('*DESCANSO'))
    expect(restLine).toBe('*DESCANSO 45s ENTRE SÉRIES')
  })
})

// ── dayLabel / formatDateBR ────────────────────────────────────────────

describe('dayLabel', () => {
  it('retorna dia da semana correto em pt-BR', () => {
    // 2024-01-01 foi Segunda-feira
    expect(dayLabel('2024-01-01')).toBe('Segunda')
    // 2024-01-07 foi Domingo
    expect(dayLabel('2024-01-07')).toBe('Domingo')
    // 2024-01-06 foi Sábado
    expect(dayLabel('2024-01-06')).toBe('Sábado')
  })
})

describe('formatDateBR', () => {
  it('formata YYYY-MM-DD para DD/MM/YYYY', () => {
    expect(formatDateBR('2024-03-15')).toBe('15/03/2024')
    expect(formatDateBR('2000-01-01')).toBe('01/01/2000')
  })
})

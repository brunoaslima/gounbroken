import { describe, it, expect } from 'vitest'
import { classifyWorkoutLine, FORMAT_HIGHLIGHT_RE, EXERCISE_HIGHLIGHT_RE, EXERCISE_PREFIX_RE } from '@/lib/workoutLineParser'

// Helper
const c = (line: string) => classifyWorkoutLine(line)

describe('classifyWorkoutLine — titles', () => {
  it('recognises known section headers', () => {
    expect(c('Warm-up')).toBe('title')
    expect(c('WOD')).toBe('title')
    expect(c('Strength')).toBe('title')
    expect(c('Mobility:')).toBe('title')
    expect(c('Cool Down')).toBe('title')
  })
  it('treats short all-caps non-digit lines as titles', () => {
    expect(c('METCON')).toBe('title')
    expect(c('STRENGTH B')).toBe('title')
  })
  it('does NOT classify abbreviations as titles', () => {
    expect(c('DU')).toBe('exercise')
    expect(c('GHD')).toBe('exercise')
    expect(c('MU')).toBe('exercise')
    expect(c('BMU')).toBe('exercise')
    expect(c('HSPU')).toBe('exercise')
  })
})

describe('classifyWorkoutLine — format modalities', () => {
  it('AMRAP / EMOM / For Time / For Load', () => {
    expect(c('AMRAP 20')).toBe('format')
    expect(c("AMRAP 20'")).toBe('format')
    expect(c('EMOM 12 min')).toBe('format')
    expect(c('For Time')).toBe('format')
    expect(c('For Load')).toBe('format')
    expect(c('For Quality')).toBe('format')
    expect(c('NFT')).toBe('format')
    expect(c('AFAP')).toBe('format')
  })
  it('EMOM variants', () => {
    expect(c('E2MOM x 10')).toBe('format')
    expect(c('E3MOM')).toBe('format')
    expect(c('E90S')).toBe('format')
    expect(c('Every 90s x 5')).toBe('format')
    expect(c('Every 2 min x 8')).toBe('format')
    expect(c('OTM 10')).toBe('format')
  })
  it('Death By', () => {
    expect(c('Death by Pull-ups')).toBe('format')
    expect(c('DEATH BY Thrusters')).toBe('format')
  })
  it('Buy-in / Buy-out', () => {
    expect(c('Buy-in: 1000m Row')).toBe('format')
    expect(c('Buy-out: 50 cal Bike')).toBe('format')
  })
  it('Partner formats', () => {
    expect(c('Partner WOD')).toBe('format')
    expect(c('I Go You Go')).toBe('format')
    expect(c('In teams of 2')).toBe('format')
    expect(c('Alternating')).toBe('format')
  })
  it('round / set counts', () => {
    expect(c('3 Rounds')).toBe('format')
    expect(c('5 Rounds of:')).toBe('format')
    expect(c('4 Rounds For Time')).toBe('format')
    expect(c('3 Sets')).toBe('format')
    expect(c('5x Sets')).toBe('format')
  })
  it('rep schemes (whole line only)', () => {
    expect(c('21-15-9')).toBe('format')
    expect(c('12 - 10 - 8')).toBe('format')
    expect(c('1-1-1-1-1')).toBe('format')
    expect(c('12 - 10 - 8 of:')).toBe('format')
    expect(c('8-10 reps')).toBe('format')
  })
  it('strength labels', () => {
    expect(c('Build to a heavy single')).toBe('format')
    expect(c('Find your 1RM')).toBe('format')
    expect(c('Work up to a heavy 3')).toBe('format')
    expect(c('Time Cap: 20 min')).toBe('format')
  })
  it('EMOM interval labels', () => {
    expect(c('Min 1: Power Cleans')).toBe('format')
    expect(c('Min 2: Toes-to-Bar')).toBe('format')
  })
  it('standalone percentage line (load prescription)', () => {
    expect(c('@75%')).toBe('format')
    expect(c('@ 80% 1RM')).toBe('format')
  })
  it('Tabata / Chipper / Ladder', () => {
    expect(c('Tabata')).toBe('format')
    expect(c('Chipper')).toBe('format')
    expect(c('Ladder')).toBe('format')
  })
})

describe('classifyWorkoutLine — exercises', () => {
  it('rep × load patterns', () => {
    expect(c('5 x 3 Back Squat')).toBe('exercise')
    expect(c('3×10 Dumbbell Press')).toBe('exercise')
    expect(c('21 Pull-ups')).toBe('exercise')
    expect(c('60 kg Deadlift')).toBe('exercise')
    expect(c('60kg Deadlift')).toBe('exercise')
    expect(c('135lb Barbell')).toBe('exercise')
  })
  it('calorie / distance / time', () => {
    expect(c('30/24 Cal Row')).toBe('exercise')
    expect(c('400m Run')).toBe('exercise')
    expect(c('50 ft Handstand Walk')).toBe('exercise')
    expect(c('1000m SkiErg')).toBe('exercise')
  })
  it('full movement names', () => {
    expect(c('Thruster')).toBe('exercise')
    expect(c('Kang Squat')).toBe('exercise')
    expect(c('Wall Ball')).toBe('exercise')
    expect(c('Toes-to-Bar')).toBe('exercise')
    expect(c('Farmer Carry')).toBe('exercise')
    expect(c('Devil Press')).toBe('exercise')
    expect(c('Bear Complex')).toBe('exercise')
    expect(c('Assault Bike')).toBe('exercise')
    expect(c('SkiErg')).toBe('exercise')
    expect(c('Sandbag Clean')).toBe('exercise')
    expect(c('Inchworm')).toBe('exercise')
    expect(c('Step-up')).toBe('exercise')
    expect(c('Ring Dip')).toBe('exercise')
    expect(c('Double Under')).toBe('exercise')
    expect(c('Single Under')).toBe('exercise')
  })
  it('abbreviations', () => {
    expect(c('20 HSPUs')).toBe('exercise')
    expect(c('30 T2B')).toBe('exercise')
    expect(c('15 C2B Pull-ups')).toBe('exercise')
    expect(c('20 GHD Sit-ups')).toBe('exercise')
    expect(c('OHS')).toBe('exercise')
    expect(c('10 BMU')).toBe('exercise')
    expect(c('60 DUs')).toBe('exercise')
    expect(c('5 MU')).toBe('exercise')
    expect(c('DB Snatch')).toBe('exercise')
    expect(c('KB Swing')).toBe('exercise')
  })
  it('catch-all: number + word', () => {
    expect(c('50 Jumping Jacks')).toBe('exercise')
    expect(c('30 Air Squats')).toBe('exercise')
  })
  it('rep range + movement name is exercise, NOT format', () => {
    expect(c('8-10 BARBELL Z-PRESS @RPE7-8')).toBe('exercise')
    expect(c('6-8 Romanian Deadlift @RPE8')).toBe('exercise')
    expect(c('3-5 Muscle-ups')).toBe('exercise')
  })
})

describe('classifyWorkoutLine — notes', () => {
  it('rest lines', () => {
    expect(c("3' rest")).toBe('note')
    expect(c('Rest 90s')).toBe('note')
  })
  it('scale / RX markers', () => {
    expect(c('RX')).toBe('note')
    expect(c('Scaled')).toBe('note')
    expect(c('Scale: use lighter weight')).toBe('note')
  })
  it('coaching annotations', () => {
    expect(c('Stimulus: moderate pace')).toBe('note')
    expect(c('Target: 4-5 rounds')).toBe('note')
    expect(c('Coach: keep elbows high')).toBe('note')
    expect(c('Modifications: band-assisted')).toBe('note')
    expect(c('Score: total reps')).toBe('note')
    expect(c('Score = rounds + reps')).toBe('note')
    expect(c('Tie-break: time at last round')).toBe('note')
  })
  it('obs marker (internal ImportSheet round-trip)', () => {
    expect(c('obs: light day')).toBe('note')
  })
})

describe('classifyWorkoutLine — edge cases', () => {
  it('empty / whitespace', () => {
    expect(c('')).toBe('empty')
    expect(c('   ')).toBe('empty')
  })
  it('plain lines fall through', () => {
    expect(c('good form throughout')).toBe('plain')
  })
})

describe('EXERCISE_PREFIX_RE', () => {
  it('matches x/× as prefix separators, not just slash/dash', () => {
    expect('3x10 Back Squat').toMatch(EXERCISE_PREFIX_RE)
    expect('3×10 Back Squat'.match(EXERCISE_PREFIX_RE)?.[1]).toBe('3×10')
    expect('3x10 Back Squat'.match(EXERCISE_PREFIX_RE)?.[1]).toBe('3x10')
  })
  it('still matches slash/dash separated prefixes', () => {
    expect('30/24 Cal Row'.match(EXERCISE_PREFIX_RE)?.[1]).toBe('30/24 Cal')
  })
  it('matches a bare leading number', () => {
    expect('15 Pull-ups'.match(EXERCISE_PREFIX_RE)?.[1]).toBe('15')
  })
})

describe('FORMAT_HIGHLIGHT_RE', () => {
  it('matches known format keywords', () => {
    expect('AMRAP 20'.match(FORMAT_HIGHLIGHT_RE)?.[0]).toBe('AMRAP')
    expect('For Time'.match(FORMAT_HIGHLIGHT_RE)?.[0]).toBe('For Time')
  })
  it('matches rep-scheme number sequences', () => {
    expect('21-15-9'.match(FORMAT_HIGHLIGHT_RE)?.[0]).toBe('21-15-9')
  })
})

describe('EXERCISE_HIGHLIGHT_RE', () => {
  it('matches load and rep quantities', () => {
    expect('60kg Deadlift'.match(EXERCISE_HIGHLIGHT_RE)?.[0]).toBe('60kg')
    expect('21 Pull-ups'.match(EXERCISE_HIGHLIGHT_RE)?.[0]).toBe('21')
  })
})

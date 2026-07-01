export type TimerMode = 'for_time' | 'amrap' | 'emom' | 'tabata' | 'interval' | 'stopwatch'
export type TimerPhase = 'work' | 'rest'
export type TimerStatus = 'idle' | 'countdown' | 'running' | 'paused' | 'done'

export interface TimerConfig {
  mode: TimerMode
  capSeconds: number      // for_time / amrap: cap; emom: ignored; stopwatch: ignored
  rounds: number          // emom: total minutes; tabata / interval: rounds
  workSeconds: number     // tabata: 20; interval: custom
  restSeconds: number     // tabata: 10; interval: custom
}

export const DEFAULT_CONFIG: TimerConfig = {
  mode: 'for_time',
  capSeconds: 600,
  rounds: 8,
  workSeconds: 20,
  restSeconds: 10,
}

export const MODE_LABELS: Record<TimerMode, string> = {
  for_time:  'FOR TIME',
  amrap:     'AMRAP',
  emom:      'EMOM',
  tabata:    'TABATA',
  interval:  'INTERVAL',
  stopwatch: 'STOPWATCH',
}

export const MODE_DESCRIPTIONS: Record<TimerMode, string> = {
  for_time:  'Countdown with cap',
  amrap:     'As many rounds as possible',
  emom:      'Every minute on the minute',
  tabata:    '20s on / 10s off × rounds',
  interval:  'Custom work + rest cycles',
  stopwatch: 'Count up, no limit',
}

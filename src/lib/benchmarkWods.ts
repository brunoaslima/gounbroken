export interface BenchmarkWod {
  description: string
  movements: { reps: string; name: string }[]
  scoreType: 'time' | 'rounds' | 'max_reps'
}

// ── GIRLS ────────────────────────────────────────────────────────────────────

export const BENCHMARK_WODS: Record<string, BenchmarkWod> = {
  // ── A ──
  'Amanda': {
    description: '9-7-5, for time',
    scoreType: 'time',
    movements: [
      { reps: '9-7-5', name: 'Muscle-ups' },
      { reps: '9-7-5', name: 'Snatches 61/43 kg' },
    ],
  },
  'Angie': {
    description: 'Em ordem, for time',
    scoreType: 'time',
    movements: [
      { reps: '100', name: 'Pull-ups' },
      { reps: '100', name: 'Push-ups' },
      { reps: '100', name: 'Sit-ups' },
      { reps: '100', name: 'Squats' },
    ],
  },
  'Annie': {
    description: '50-40-30-20-10, for time',
    scoreType: 'time',
    movements: [
      { reps: '50-40-30-20-10', name: 'Double-unders' },
      { reps: '50-40-30-20-10', name: 'Sit-ups' },
    ],
  },

  // ── B ──
  'Barbara': {
    description: '5 rounds for time · 3 min rest entre rounds',
    scoreType: 'time',
    movements: [
      { reps: '20', name: 'Pull-ups' },
      { reps: '30', name: 'Push-ups' },
      { reps: '40', name: 'Sit-ups' },
      { reps: '50', name: 'Squats' },
    ],
  },

  // ── C ──
  'Chelsea': {
    description: 'EMOM 30 min — completar ou falhar',
    scoreType: 'rounds',
    movements: [
      { reps: '5',  name: 'Pull-ups' },
      { reps: '10', name: 'Push-ups' },
      { reps: '15', name: 'Squats' },
    ],
  },
  'Christine': {
    description: '3 rounds for time',
    scoreType: 'time',
    movements: [
      { reps: '500m', name: 'Row' },
      { reps: '12',   name: 'Deadlifts (peso corporal)' },
      { reps: '21',   name: 'Box Jumps 50 cm' },
    ],
  },
  'Cindy': {
    description: 'AMRAP 20 min',
    scoreType: 'rounds',
    movements: [
      { reps: '5',  name: 'Pull-ups' },
      { reps: '10', name: 'Push-ups' },
      { reps: '15', name: 'Squats' },
    ],
  },

  // ── D ──
  'Diane': {
    description: '21-15-9, for time',
    scoreType: 'time',
    movements: [
      { reps: '21-15-9', name: 'Deadlifts 102/70 kg' },
      { reps: '21-15-9', name: 'HSPU' },
    ],
  },

  // ── E ──
  'Elizabeth': {
    description: '21-15-9, for time',
    scoreType: 'time',
    movements: [
      { reps: '21-15-9', name: 'Cleans 61/43 kg' },
      { reps: '21-15-9', name: 'Ring Dips' },
    ],
  },
  'Eva': {
    description: '5 rounds, for time',
    scoreType: 'time',
    movements: [
      { reps: '800m', name: 'Run' },
      { reps: '30',   name: 'KB Swings 32/24 kg' },
      { reps: '30',   name: 'Pull-ups' },
    ],
  },

  // ── F ──
  'Fran': {
    description: '21-15-9, for time',
    scoreType: 'time',
    movements: [
      { reps: '21-15-9', name: 'Thrusters 43/30 kg' },
      { reps: '21-15-9', name: 'Pull-ups' },
    ],
  },

  // ── G ──
  'Grace': {
    description: '30 reps, for time',
    scoreType: 'time',
    movements: [
      { reps: '30', name: 'Clean & Jerks 61/43 kg' },
    ],
  },
  'Grettel': {
    description: '10 rounds, for time',
    scoreType: 'time',
    movements: [
      { reps: '3', name: 'Clean & Jerks 61/43 kg' },
      { reps: '3', name: 'Burpees over bar' },
    ],
  },

  // ── H ──
  'Helen': {
    description: '3 rounds, for time',
    scoreType: 'time',
    movements: [
      { reps: '400m', name: 'Run' },
      { reps: '21',   name: 'KB Swings 24/16 kg' },
      { reps: '12',   name: 'Pull-ups' },
    ],
  },

  // ── I ──
  'Ingrid': {
    description: '10 rounds, for time',
    scoreType: 'time',
    movements: [
      { reps: '3', name: 'Snatches 61/43 kg' },
      { reps: '3', name: 'Burpees over bar' },
    ],
  },
  'Isabel': {
    description: '30 reps, for time',
    scoreType: 'time',
    movements: [
      { reps: '30', name: 'Snatches 61/43 kg' },
    ],
  },

  // ── J ──
  'Jackie': {
    description: 'For time',
    scoreType: 'time',
    movements: [
      { reps: '1000m', name: 'Row' },
      { reps: '50',    name: 'Thrusters 20/15 kg' },
      { reps: '30',    name: 'Pull-ups' },
    ],
  },

  // ── K ──
  'Karen': {
    description: '150 reps, for time',
    scoreType: 'time',
    movements: [
      { reps: '150', name: 'Wall Ball Shots 9/6 kg' },
    ],
  },
  'Kelly': {
    description: '5 rounds, for time',
    scoreType: 'time',
    movements: [
      { reps: '400m', name: 'Run' },
      { reps: '30',   name: 'Box Jumps 60/50 cm' },
      { reps: '30',   name: 'Wall Balls 9/6 kg' },
    ],
  },

  // ── L ──
  'Linda': {
    description: '10-9-8-7-6-5-4-3-2-1, for time',
    scoreType: 'time',
    movements: [
      { reps: '10→1', name: 'Deadlift (1,5× peso corporal)' },
      { reps: '10→1', name: 'Bench Press (1× peso corporal)' },
      { reps: '10→1', name: 'Clean (0,75× peso corporal)' },
    ],
  },
  'Lynne': {
    description: '5 rounds, max reps',
    scoreType: 'max_reps',
    movements: [
      { reps: 'max', name: 'Bench Press (peso corporal)' },
      { reps: 'max', name: 'Pull-ups' },
    ],
  },

  // ── M ──
  'Mary': {
    description: 'AMRAP 20 min',
    scoreType: 'rounds',
    movements: [
      { reps: '5',  name: 'HSPU' },
      { reps: '10', name: 'Pistols alternando' },
      { reps: '15', name: 'Pull-ups' },
    ],
  },

  // ── N ──
  'Nancy': {
    description: '5 rounds, for time',
    scoreType: 'time',
    movements: [
      { reps: '400m', name: 'Run' },
      { reps: '15',   name: 'OHS 43/30 kg' },
    ],
  },
  'Nasty Girls': {
    description: '3 rounds, for time',
    scoreType: 'time',
    movements: [
      { reps: '50', name: 'Air Squats' },
      { reps: '7',  name: 'Muscle-ups' },
      { reps: '10', name: 'Hang Power Cleans 61/43 kg' },
    ],
  },
  'Nicole': {
    description: 'AMRAP 20 min — anotar pull-ups por round',
    scoreType: 'rounds',
    movements: [
      { reps: '400m', name: 'Run' },
      { reps: 'max',  name: 'Pull-ups' },
    ],
  },

  // ── HEROES ───────────────────────────────────────────────────────────────────

  // ── B ──
  'Badger': {
    description: '3 rounds, for time',
    scoreType: 'time',
    movements: [
      { reps: '30',   name: 'Squat Cleans 43/30 kg' },
      { reps: '30',   name: 'Pull-ups' },
      { reps: '800m', name: 'Run' },
    ],
  },

  // ── D ──
  'Daniel': {
    description: 'For time',
    scoreType: 'time',
    movements: [
      { reps: '50',   name: 'Pull-ups' },
      { reps: '400m', name: 'Run' },
      { reps: '21',   name: 'Thrusters 43/30 kg' },
      { reps: '800m', name: 'Run' },
      { reps: '21',   name: 'Thrusters 43/30 kg' },
      { reps: '400m', name: 'Run' },
      { reps: '50',   name: 'Pull-ups' },
    ],
  },
  'DT': {
    description: '5 rounds, for time',
    scoreType: 'time',
    movements: [
      { reps: '12', name: 'Deadlifts 70/47.5 kg' },
      { reps: '9',  name: 'Hang Power Cleans 70/47.5 kg' },
      { reps: '6',  name: 'Push Jerks 70/47.5 kg' },
    ],
  },

  // ── G ──
  'Griff': {
    description: 'For time',
    scoreType: 'time',
    movements: [
      { reps: '800m', name: 'Run' },
      { reps: '400m', name: 'Run de costas' },
      { reps: '800m', name: 'Run' },
      { reps: '400m', name: 'Run de costas' },
    ],
  },

  // ── H ──
  'Holleyman': {
    description: '30 rounds, for time',
    scoreType: 'time',
    movements: [
      { reps: '5', name: 'Wall Balls 9/6 kg' },
      { reps: '3', name: 'HSPU' },
      { reps: '1', name: 'Power Clean 102/70 kg' },
    ],
  },

  // ── J ──
  'Jason': {
    description: 'For time',
    scoreType: 'time',
    movements: [
      { reps: '100', name: 'Squats' },
      { reps: '5',   name: 'Muscle-ups' },
      { reps: '75',  name: 'Squats' },
      { reps: '10',  name: 'Muscle-ups' },
      { reps: '50',  name: 'Squats' },
      { reps: '15',  name: 'Muscle-ups' },
      { reps: '25',  name: 'Squats' },
      { reps: '20',  name: 'Muscle-ups' },
    ],
  },
  'Josh': {
    description: '21-15-9, for time',
    scoreType: 'time',
    movements: [
      { reps: '21-15-9', name: 'OHS 43/30 kg' },
      { reps: '21-15-9', name: 'Pull-ups' },
    ],
  },
  'JT': {
    description: '21-15-9, for time',
    scoreType: 'time',
    movements: [
      { reps: '21-15-9', name: 'HSPU' },
      { reps: '21-15-9', name: 'Ring Dips' },
      { reps: '21-15-9', name: 'Push-ups' },
    ],
  },

  // ── M ──
  'Manion': {
    description: '7 rounds, for time',
    scoreType: 'time',
    movements: [
      { reps: '400m', name: 'Run' },
      { reps: '29',   name: 'Back Squats 61/43 kg' },
    ],
  },
  'Michael': {
    description: '3 rounds, for time',
    scoreType: 'time',
    movements: [
      { reps: '800m', name: 'Run' },
      { reps: '50',   name: 'Back Extensions' },
      { reps: '50',   name: 'Sit-ups' },
    ],
  },
  'Murph': {
    description: 'For time · colete 9/6 kg',
    scoreType: 'time',
    movements: [
      { reps: '1600m', name: 'Run' },
      { reps: '100',   name: 'Pull-ups' },
      { reps: '200',   name: 'Push-ups' },
      { reps: '300',   name: 'Squats' },
      { reps: '1600m', name: 'Run' },
    ],
  },

  // ── N ──
  'Nate': {
    description: 'AMRAP 20 min',
    scoreType: 'rounds',
    movements: [
      { reps: '2', name: 'Muscle-ups' },
      { reps: '4', name: 'HSPU' },
      { reps: '8', name: 'KB Swings 32/24 kg' },
    ],
  },

  // ── O ──
  'Omar': {
    description: 'For time',
    scoreType: 'time',
    movements: [
      { reps: '10', name: 'Thrusters 43/30 kg' },
      { reps: '15', name: 'Burpees over bar' },
      { reps: '20', name: 'Thrusters 43/30 kg' },
      { reps: '25', name: 'Burpees over bar' },
      { reps: '30', name: 'Thrusters 43/30 kg' },
      { reps: '35', name: 'Burpees over bar' },
    ],
  },

  // ── R ──
  'Randy': {
    description: '75 reps, for time',
    scoreType: 'time',
    movements: [
      { reps: '75', name: 'Power Snatches 34/25 kg' },
    ],
  },
  'Ryan': {
    description: '5 rounds, for time',
    scoreType: 'time',
    movements: [
      { reps: '7',  name: 'Muscle-ups' },
      { reps: '21', name: 'Burpees' },
    ],
  },

  // ── T ──
  'Tommy V': {
    description: '21-15-9, for time',
    scoreType: 'time',
    movements: [
      { reps: '21-15-9', name: 'Thrusters 52/36 kg' },
      { reps: '21-15-9', name: 'Rope Climbs 4.5 m' },
    ],
  },

  // ── W ──
  'Whitten': {
    description: '5 rounds, for time',
    scoreType: 'time',
    movements: [
      { reps: '22',   name: 'KB Swings 24/16 kg' },
      { reps: '22',   name: 'Box Jumps 60/50 cm' },
      { reps: '400m', name: 'Run' },
      { reps: '22',   name: 'Burpees' },
    ],
  },
}

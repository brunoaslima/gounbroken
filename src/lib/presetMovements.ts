import type { MovementCategory } from '@/types'

export const GYMNASTICS_MOVEMENTS = [
  'Pull-up',
  'Chest-to-bar Pull-up',
  'Muscle-up (Ring)',
  'Bar Muscle-up',
  'Toes-to-Bar',
  'Handstand Push-up',
  'Ring Dip',
  'Pistol Squat',
  'Double-Under',
  'Box Jump',
  'Burpee',
  'Rope Climb',
]

export const MONOSTRUCTURAL_MOVEMENTS = [
  'Row 500m',
  'Row 1000m',
  'Row 2000m',
  'Assault Bike',
  'Echo Bike',
  'Ski Erg 1000m',
  'Run 400m',
  'Run 1600m',
]

export const GIRLS_MOVEMENTS = [
  'Amanda',
  'Angie',
  'Annie',
  'Barbara',
  'Chelsea',
  'Christine',
  'Cindy',
  'Diane',
  'Elizabeth',
  'Eva',
  'Fran',
  'Grace',
  'Grettel',
  'Helen',
  'Ingrid',
  'Isabel',
  'Jackie',
  'Karen',
  'Kelly',
  'Linda',
  'Lynne',
  'Mary',
  'Nancy',
  'Nasty Girls',
  'Nicole',
]

export const HEROES_MOVEMENTS = [
  'Badger',
  'Daniel',
  'DT',
  'Griff',
  'Holleyman',
  'Jason',
  'Josh',
  'JT',
  'Manion',
  'Michael',
  'Murph',
  'Nate',
  'Omar',
  'Randy',
  'Ryan',
  'Tommy V',
  'Whitten',
]

export const PRESET_MOVEMENTS_BY_CATEGORY: Record<MovementCategory, string[]> = {
  weightlifting: [],      // filled below from MOVEMENT_GROUPS
  gymnastics: GYMNASTICS_MOVEMENTS,
  monostructural: MONOSTRUCTURAL_MOVEMENTS,
  girls: GIRLS_MOVEMENTS,
  heroes: HEROES_MOVEMENTS,
}

export const MOVEMENT_GROUPS = [
  {
    category: 'Squat',
    movements: ['Back Squat', 'Front Squat', 'Overhead Squat'],
  },
  {
    category: 'Snatch',
    movements: [
      'Snatch',
      'Power Snatch',
      'Hang Power Snatch',
      'Hang Squat Snatch',
      'Squat Snatch',
      'Muscle Snatch',
      'Snatch Balance',
      'Split Snatch',
      'Dumbbell Power Snatch',
    ],
  },
  {
    category: 'Clean',
    movements: [
      'Clean',
      'Power Clean',
      'Hang Power Clean',
      'Hang Squat Clean',
      'Squat Clean',
      'Bear Complex',
    ],
  },
  {
    category: 'Jerk',
    movements: [
      'Clean and Jerk',
      'Push Jerk',
      'Split Jerk',
      'Split Jerk (Behind the Neck)',
      'Dumbbell Hang Clean and Jerk',
    ],
  },
  {
    category: 'Deadlift',
    movements: [
      'Deadlift',
      'Sumo Deadlift',
      'Sumo Deadlift High Pull',
      'Snatch Grip Deadlift',
    ],
  },
  {
    category: 'Press',
    movements: [
      'Shoulder Press (Strict)',
      'Push Press',
      'Bench Press',
      'Shoulder-to-overhead',
      'Ground-to-overhead',
      'Barbell Thruster',
    ],
  },
  {
    category: 'Complexos',
    movements: [
      'Thruster',
      'Weightlifting total',
      'Turkish Get Up',
      'Weighted Pull-up',
      'Dumbbell Front Squat',
      'Dumbbell Box Step-up',
      'Dumbbell Overhead Lunge',
    ],
  },
]

export const PRESET_MOVEMENTS = MOVEMENT_GROUPS.flatMap(g => g.movements)

// Fill weightlifting category
PRESET_MOVEMENTS_BY_CATEGORY.weightlifting = PRESET_MOVEMENTS

export function getMovementCategory(name: string): string | null {
  for (const group of MOVEMENT_GROUPS) {
    if (group.movements.includes(name)) return group.category
  }
  return null
}

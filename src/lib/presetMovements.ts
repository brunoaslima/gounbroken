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

export function getMovementCategory(name: string): string | null {
  for (const group of MOVEMENT_GROUPS) {
    if (group.movements.includes(name)) return group.category
  }
  return null
}

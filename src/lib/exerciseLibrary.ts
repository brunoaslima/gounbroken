export type SectionType =
  | 'warm_up'
  | 'mobility'
  | 'strength'
  | 'skill'
  | 'conditioning'
  | 'wod'
  | 'accessories'
  | 'cool_down'
  // legacy
  | 'mobilidade'
  | 'aquecimento'
  | 'forca'
  | 'acessorios'
  | 'finisher'

export type TrainingFocus =
  | 'superior'
  | 'inferior'
  | 'full_body'
  | 'core'
  | 'cardio'
  | 'mobilidade'
  | 'forca'
  | 'tecnica'
  | 'crossfit'

export const SECTION_LABELS: Record<SectionType, string> = {
  warm_up:     'Warm-up',
  mobility:    'Mobility',
  strength:    'Strength',
  skill:       'Skill',
  conditioning:'Conditioning',
  wod:         'WOD',
  accessories: 'Accessories',
  cool_down:   'Cool Down',
  // legacy
  mobilidade:  'Mobility',
  aquecimento: 'Warm-up',
  forca:       'Strength',
  acessorios:  'Accessories',
  finisher:    'Conditioning',
}

export const FOCUS_LABELS: Record<TrainingFocus, string> = {
  superior:  'Upper Body',
  inferior:  'Lower Body',
  full_body: 'Full Body',
  core:      'Core',
  cardio:    'Cardio',
  mobilidade:'Mobility',
  forca:     'Strength',
  tecnica:   'Technique',
  crossfit:  'CrossFit',
}

// Movements that use external load (for PR lookup)
export const WEIGHTED_MOVEMENTS = new Set([
  'back squat', 'front squat', 'overhead squat', 'box squat',
  'deadlift', 'romanian deadlift', 'sumo deadlift', 'deficit deadlift',
  'strict press', 'push press', 'push jerk', 'split jerk',
  'bench press', 'floor press', 'incline bench press',
  'clean', 'power clean', 'hang power clean', 'hang clean',
  'snatch', 'power snatch', 'hang power snatch', 'hang snatch',
  'thruster', 'cluster', 'clean & jerk',
  'weighted pull-up', 'weighted dip', 'weighted ring dip',
  'bulgarian split squat', 'goblet squat', 'barbell hip thrust',
  'dumbbell press', 'dumbbell row', 'dumbbell snatch', 'dumbbell single-arm row',
  'kettlebell swing', 'kettlebell press', 'kettlebell clean',
  'farmer carry', 'suitcase carry', 'sandbag carry',
  'turkish get-up', 'leg press', 'leg curl (lying)', 'nordic curl',
  'hip thrust', 'goodmorning', 'seal row', 'cable row',
])

export function isWeighted(name: string): boolean {
  return WEIGHTED_MOVEMENTS.has(name.toLowerCase())
}

type FocusKey = TrainingFocus | 'default'
type SuggestionMap = Partial<Record<FocusKey, string[]>>

const SUGGESTIONS: Record<SectionType, SuggestionMap> = {
  warm_up: {
    inferior: [
      'Row (easy)', 'Bike (easy)', 'Air Squat', 'Lunge', 'Reverse Lunge',
      'Good Morning', 'Leg Swing (front-back)', 'Leg Swing (lateral)', 'Hip Circle',
      'Glute Bridge', 'Single-Leg Glute Bridge', 'Banded Clamshell', 'Fire Hydrant',
      'Monster Walk', 'Lateral Band Walk', 'Box Step-up', 'Inchworm',
      'Jumping Jacks', 'High Knees', 'Butt Kicks', 'Jump Rope (easy)',
      'Prisoner Squat', 'Hip Opener', 'Banded Squat',
    ],
    superior: [
      'Row (easy)', 'Bike (easy)', 'PVC Pass Through', 'Scapular Pull-up',
      'Ring Row', 'Push-up', 'Band Pull-Apart', 'Arm Circle', 'Shoulder CARs',
      'Y-T-W', 'Face Pull (light)', 'Banded External Rotation',
      'Jumping Jacks', 'Inchworm', 'Dead Hang', 'Scapular Push-up',
      'Neck Roll', 'Wall Slide', 'Wrist Circle',
    ],
    crossfit: [
      'Row (easy)', 'Bike (easy)', 'Air Squat', 'PVC Pass Through',
      'Scapular Pull-up', 'Inchworm', 'Jumping Jacks', 'High Knees',
      'Jump Rope (easy)', 'Box Step-up', 'Push-up', 'Ring Row',
      'Hip Circle', 'Glute Bridge', 'Burpee (easy)', 'Band Pull-Apart',
    ],
    cardio: [
      'Row (easy)', 'Bike (easy)', 'SkiErg (easy)', 'Jump Rope (easy)',
      'Jumping Jacks', 'High Knees', 'Butt Kicks', 'Skip',
      'Air Squat', 'Mountain Climber (slow)', 'Easy Run',
    ],
    core: [
      'Dead Bug', 'Bird Dog', 'Hollow Body Rock', 'Plank',
      'Side Plank', 'Glute Bridge', 'Cat-Cow', 'Hip Circle',
      'Jumping Jacks', 'Inchworm', 'Mountain Climber (slow)',
    ],
    full_body: [
      'Row (easy)', 'Bike (easy)', 'Inchworm', 'Air Squat', 'Lunge',
      'Push-up', 'Ring Row', 'PVC Pass Through', 'Hip Circle',
      'Jumping Jacks', 'Glute Bridge', 'Dead Bug', 'Jump Rope (easy)',
    ],
    default: [
      'Row (easy)', 'Bike (easy)', 'Air Squat', 'Inchworm',
      'PVC Pass Through', 'Scapular Pull-up', 'Jumping Jacks',
      'Hip Circle', 'Leg Swing (front-back)', 'Glute Bridge',
      'Jump Rope (easy)', 'High Knees', 'Band Pull-Apart', 'Dead Bug',
    ],
  },

  mobility: {
    inferior: [
      'Ankle Mobility', 'Banded Ankle Distraction', 'Hip Opener',
      'Couch Stretch', '90/90 Hip Switch', 'Pigeon Pose', 'Cossack Squat',
      'Deep Squat Hold', 'Hamstring Stretch', 'Hamstring Floss',
      "World's Greatest Stretch", 'Frog Stretch', 'Hip Flexor Stretch',
      'Kneeling Hip Flexor Stretch', 'Lateral Lunge Hold', 'Split Squat Hold',
      'IT Band Stretch', 'Calf Stretch', 'Hip CARs', 'Standing Figure-4',
      'Banded Hip Distraction', 'Pancake Stretch', 'Adductor Stretch',
    ],
    superior: [
      'Banded Shoulder Stretch', 'Thoracic Rotation', 'PVC Pass Through',
      'Lat Stretch', 'Wrist Mobility', 'Thread the Needle',
      'Wall Slide', 'Shoulder CARs', 'Neck Roll',
      'Sleeper Stretch', 'Cross-body Shoulder Stretch',
      'Doorway Pec Stretch', 'Overhead Distraction (banded)',
      'Y-T-W', 'Scapular Pull-up', 'Dead Hang',
      'Banded External Rotation', 'Face Pull (light)',
      'Tricep Stretch', 'Neck Side Stretch',
    ],
    core: [
      'Cat-Cow', 'Jefferson Curl', 'Spine Rotation', "Child's Pose",
      'Dead Bug', 'Bird Dog', 'Hollow Body Hold', 'Supine Twist',
      'Seated Thoracic Rotation', 'Thoracic Extension (foam roller)',
      'McGill Curl-up', 'Cobra Stretch', 'Downward Dog',
    ],
    full_body: [
      "World's Greatest Stretch", 'Inchworm', 'Hip Opener', 'Couch Stretch',
      'PVC Pass Through', 'Thoracic Rotation', 'Ankle Mobility',
      "Child's Pose", 'Downward Dog', 'Hip CARs', 'Shoulder CARs',
      '90/90 Hip Switch', 'Frog Stretch', 'Pigeon Pose',
    ],
    default: [
      'Hip Opener', 'Ankle Mobility', 'Couch Stretch',
      'Thoracic Rotation', 'PVC Pass Through', "World's Greatest Stretch",
      'Pigeon Pose', "Child's Pose", 'Hamstring Stretch',
      '90/90 Hip Switch', 'Shoulder CARs', 'Downward Dog',
    ],
  },

  strength: {
    inferior: [
      'Back Squat', 'Front Squat', 'Overhead Squat', 'Box Squat',
      'Deadlift', 'Romanian Deadlift', 'Sumo Deadlift', 'Deficit Deadlift',
      'Bulgarian Split Squat', 'Goblet Squat',
      'Barbell Hip Thrust', 'Good Morning', 'Leg Press',
    ],
    superior: [
      'Strict Press', 'Push Press', 'Push Jerk', 'Split Jerk', 'Bench Press',
      'Incline Bench Press', 'Floor Press', 'Weighted Pull-up',
      'Weighted Ring Dip', 'Dumbbell Press', 'Seal Row',
    ],
    full_body: [
      'Clean', 'Power Clean', 'Hang Power Clean', 'Thruster', 'Cluster',
      'Clean & Jerk', 'Deadlift', 'Back Squat', 'Front Squat', 'Farmer Carry',
    ],
    tecnica: [
      'Snatch', 'Power Snatch', 'Hang Power Snatch', 'Hang Snatch',
      'Clean & Jerk', 'Clean Pull', 'Snatch Pull', 'Muscle Snatch',
      'Snatch Balance', 'Overhead Squat', 'Hang Power Clean',
    ],
    core: [
      'Strict Press', 'Weighted Pull-up', 'GHD Sit-up',
      'L-Sit', 'Ab Wheel', 'Goodmorning',
    ],
    default: [
      'Back Squat', 'Deadlift', 'Strict Press', 'Push Press',
      'Bench Press', 'Front Squat', 'Romanian Deadlift',
    ],
  },

  skill: {
    tecnica: [
      'Handstand Walk', 'Handstand Hold', 'Wall Walk', 'Freestanding Handstand',
      'Bar Muscle-up', 'Ring Muscle-up', 'Muscle-up Transition',
      'Rope Climb', 'Legless Rope Climb', 'L-Sit',
      'Pistol Squat', 'Double Unders', 'Triple Unders',
      'Kipping Pull-up drill', 'Kipping HSPU drill',
    ],
    crossfit: [
      'Double Unders', 'Toes-to-Bar', 'Kipping Pull-up',
      'Bar Muscle-up', 'Ring Muscle-up', 'Handstand Push-up (kipping)',
      'Wall Walk', 'Rope Climb', 'Handstand Walk', 'Pistol Squat',
      'Box Jump', 'Chest-to-Bar Pull-up',
    ],
    superior: [
      'Strict Muscle-up', 'Ring Dip', 'Strict Handstand Push-up',
      'Strict Pull-up', 'L-Sit', 'Front Lever',
      'Weighted Ring Dip', 'False Grip Ring Row',
    ],
    default: [
      'Double Unders', 'Toes-to-Bar', 'Kipping Pull-up',
      'Handstand Hold', 'Wall Walk', 'Bar Muscle-up', 'Rope Climb',
    ],
  },

  conditioning: {
    crossfit: [
      'Burpee', 'Burpee Box Jump', 'Box Jump', 'Box Jump Over',
      'Double Unders', 'Toes-to-Bar', 'Knees-to-Chest',
      'Pull-up', 'Chest-to-Bar Pull-up', 'Muscle-up',
      'Handstand Push-up', 'Wall Ball', 'Kettlebell Swing',
      'Row (cal)', 'Bike (cal)', 'SkiErg (cal)', 'Run',
      'Thruster', 'Power Clean', 'Push Press', 'Box Step-over',
      'Deadlift', 'Front Squat', 'Sandbag Carry', 'Dumbbell Snatch',
      'Single-Arm Dumbbell Thruster', 'Devil Press',
    ],
    cardio: [
      'Row (cal)', 'Bike (cal)', 'SkiErg (cal)', 'Run',
      'Jump Rope', 'Double Unders', 'Burpee', 'Air Squat',
      'Mountain Climber', 'Jumping Jacks', 'Assault Bike (cal)',
    ],
    forca: [
      'Deadlift', 'Back Squat', 'Strict Press', 'Push Press',
      'Thruster', 'Power Clean', 'Front Squat', 'Push Jerk',
    ],
    full_body: [
      'Thruster', 'Burpee', 'Kettlebell Swing', 'Power Clean',
      'Box Jump', 'Pull-up', 'Push-up', 'Wall Ball', 'Dumbbell Snatch',
      'Devil Press', 'Man Maker',
    ],
    superior: [
      'Pull-up', 'Chest-to-Bar Pull-up', 'Push-up', 'Ring Dip',
      'Handstand Push-up', 'Muscle-up', 'Strict Press',
      'Strict Pull-up', 'Bar Muscle-up',
    ],
    inferior: [
      'Air Squat', 'Box Jump', 'Deadlift', 'Kettlebell Swing',
      'Wall Ball', 'Box Step-up', 'Lunge', 'Step-over',
    ],
    default: [
      'Burpee', 'Box Jump', 'Kettlebell Swing', 'Row (cal)',
      'Thruster', 'Pull-up', 'Toes-to-Bar', 'Double Unders', 'Wall Ball',
    ],
  },

  wod: {
    crossfit: [
      'Burpee', 'Burpee Box Jump', 'Box Jump', 'Box Jump Over',
      'Double Unders', 'Toes-to-Bar', 'Knees-to-Chest',
      'Pull-up', 'Chest-to-Bar Pull-up', 'Muscle-up', 'Bar Muscle-up',
      'Handstand Push-up', 'Wall Ball', 'Kettlebell Swing',
      'Row (cal)', 'Bike (cal)', 'SkiErg (cal)', 'Run',
      'Thruster', 'Power Clean', 'Push Press', 'Box Step-over',
      'Deadlift', 'Front Squat', 'Sandbag Carry', 'Dumbbell Snatch',
      'Single-Arm Dumbbell Thruster', 'Devil Press', 'Wall Walk',
      'Rope Climb', 'Assault Bike (cal)',
    ],
    cardio: [
      'Row (cal)', 'Bike (cal)', 'SkiErg (cal)', 'Run',
      'Double Unders', 'Burpee', 'Jump Rope', 'Assault Bike (cal)',
    ],
    forca: [
      'Deadlift', 'Back Squat', 'Thruster', 'Power Clean',
      'Front Squat', 'Push Press', 'Strict Press', 'Clean & Jerk',
    ],
    full_body: [
      'Thruster', 'Burpee', 'Kettlebell Swing', 'Power Clean',
      'Box Jump', 'Pull-up', 'Push-up', 'Wall Ball', 'Dumbbell Snatch',
    ],
    default: [
      'Burpee', 'Box Jump', 'Thruster', 'Pull-up',
      'Toes-to-Bar', 'Kettlebell Swing', 'Row (cal)',
      'Double Unders', 'Wall Ball', 'Power Clean', 'Deadlift',
    ],
  },

  accessories: {
    inferior: [
      'Bulgarian Split Squat', 'Single-Leg Deadlift', 'Nordic Curl',
      'Hip Thrust', 'Barbell Hip Thrust', 'Box Step-up', 'Goblet Squat',
      'Pistol Squat', 'Farmer Carry', 'Suitcase Carry', 'Sandbag Carry',
      'Leg Press', 'Leg Curl (lying)', 'Leg Extension',
      'Calf Raise', 'Reverse Hyper', 'Back Extension',
      'Lateral Band Walk', 'Monster Walk', 'Banded Clamshell',
      'Glute-Ham Raise', 'Single-Leg Press', 'Split Squat',
      'Romanian Deadlift', 'Good Morning',
    ],
    superior: [
      'Dumbbell Row', 'Dumbbell Single-Arm Row', 'Strict Pull-up', 'Ring Row',
      'Ring Dip', 'Dumbbell Press', 'Dumbbell Lateral Raise',
      'Dumbbell Front Raise', 'Face Pull', 'Band Pull-Apart',
      'Banded External Rotation', 'Farmer Carry', 'Chest Fly',
      'Seal Row', 'Lat Pulldown', 'Cable Row',
      'Tricep Extension', 'Bicep Curl', 'Hammer Curl',
      'Y-T-W', 'Rear Delt Fly', 'Incline Dumbbell Press',
      'Scapular Pull-up', 'Dead Hang',
    ],
    core: [
      'Hollow Hold', 'Hollow Rock', 'GHD Sit-up', 'Toes-to-Bar',
      'L-Sit', 'Ab Wheel', 'Copenhagen Plank', 'Pallof Press',
      'Dead Bug', 'Bird Dog', 'McGill Curl-up', 'Cable Crunch',
      'Hanging Knee Raise', 'Hanging Leg Raise', 'V-up',
      'Plank', 'Side Plank', 'Dragon Flag', 'Jefferson Curl',
    ],
    full_body: [
      'Turkish Get-up', 'Farmer Carry', 'Suitcase Carry',
      'Single-Leg Deadlift', 'Dumbbell Row', 'Ring Row',
      'Kettlebell Windmill', 'Bottoms-up KB Press',
    ],
    default: [
      'Hollow Hold', 'GHD Sit-up', 'Farmer Carry', 'Strict Pull-up',
      'Dumbbell Row', 'Ring Row', 'Turkish Get-up', 'Nordic Curl',
      'Hip Thrust', 'Face Pull', 'Band Pull-Apart', 'Dead Bug', 'Bird Dog',
    ],
  },

  cool_down: {
    inferior: [
      'Pigeon Pose', 'Couch Stretch', 'Hamstring Stretch',
      'Hip Flexor Stretch', 'Calf Stretch', 'IT Band Stretch',
      'Seated Butterfly', 'Standing Figure-4',
      'Foam Roll (Quads)', 'Foam Roll (Hamstrings)',
      'Foam Roll (IT Band)', 'Foam Roll (Glutes)',
      'Easy Bike', '90/90 Hip Switch', 'Adductor Stretch',
    ],
    superior: [
      'Doorway Pec Stretch', 'Cross-body Shoulder Stretch',
      'Sleeper Stretch', 'Lat Stretch', 'Tricep Stretch',
      'Bicep Stretch', 'Neck Stretch', 'Thread the Needle',
      'Foam Roll (Lats)', 'Foam Roll (Thoracic)',
      'Easy Row', 'Child\'s Pose', 'Thoracic Extension (foam roller)',
    ],
    cardio: [
      'Easy Bike', 'Easy Row', 'Walk', 'SkiErg (easy)',
      'Box Breathing', 'Hip Flexor Stretch', 'Calf Stretch',
      'Hamstring Stretch', 'Quad Stretch',
    ],
    full_body: [
      'Easy Bike', 'Easy Row', 'Box Breathing',
      "Child's Pose", 'Downward Dog', 'Pigeon Pose',
      'Couch Stretch', 'Hamstring Stretch', 'Foam Roll (Quads)',
      'Foam Roll (Lats)', 'Seated Thoracic Rotation',
      'Shoulder Stretch', 'Calf Stretch', 'Thread the Needle',
    ],
    default: [
      'Easy Bike', 'Easy Row', 'Box Breathing',
      'Hip Flexor Stretch', 'Hamstring Stretch', 'Pigeon Pose',
      'Couch Stretch', "Child's Pose", 'Seated Thoracic Rotation',
      'Foam Roll (Quads)', 'Foam Roll (Lats)', 'Downward Dog',
      'Shoulder Stretch', 'Calf Stretch', 'Neck Stretch',
    ],
  },

  // ── Legacy mappings ──────────────────────────────────────────────────
  mobilidade: {
    default: [
      'Hip Opener', 'Ankle Mobility', 'Couch Stretch',
      'Thoracic Rotation', "World's Greatest Stretch",
    ],
  },
  aquecimento: {
    default: [
      'Row (easy)', 'Air Squat', 'Inchworm', 'PVC Pass Through', 'Jumping Jacks',
    ],
  },
  forca: {
    default: ['Back Squat', 'Deadlift', 'Strict Press', 'Push Press'],
  },
  acessorios: {
    default: ['Hollow Hold', 'GHD Sit-up', 'Farmer Carry', 'Strict Pull-up'],
  },
  finisher: {
    default: ['Row (cal)', 'Bike (cal)', 'Burpee', 'Double Unders'],
  },
}

export function getSuggestions(section: SectionType, focuses: TrainingFocus[]): string[] {
  const map = SUGGESTIONS[section]
  if (!map) return []
  if (!focuses.length) return map.default ?? []

  const seen = new Set<string>()
  const result: string[] = []

  for (const f of focuses) {
    for (const ex of map[f] ?? map.default ?? []) {
      if (!seen.has(ex)) { seen.add(ex); result.push(ex) }
    }
  }

  // Always append default suggestions not yet included
  for (const ex of map.default ?? []) {
    if (!seen.has(ex)) { seen.add(ex); result.push(ex) }
  }

  return result
}

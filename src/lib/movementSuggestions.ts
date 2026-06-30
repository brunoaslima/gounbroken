export interface Suggestion {
  icon: string
  title: string
  detail: string
}

export interface MovementSuggestions {
  muscles: Suggestion[]
  mobility: Suggestion[]
  variations: Suggestion[]
  programming: Suggestion[]
}

// Evidence basis: NSCA Essentials of Strength Training & Conditioning (4th ed.),
// Zatsiorsky & Kraemer "Science and Practice of Strength Training",
// Weightlifting coaching literature (USA Weightlifting / IWF technical manuals),
// Haff & Triplett programming recommendations.

const SUGGESTIONS: Record<string, MovementSuggestions> = {

  'Back Squat': {
    muscles: [
      {
        icon: '🦵',
        title: 'Quadriceps',
        detail: 'Full-range leg press and hack squat strengthen the quadriceps at the most demanding angle (bottom of squat), the point of least mechanical advantage.',
      },
      {
        icon: '🍑',
        title: 'Glutes and hip extensors',
        detail: 'Good mornings and Romanian Deadlift recruit the glutes and hamstrings that generate drive out of the hole — responsible for up to 60% of total squat force.',
      },
      {
        icon: '🧱',
        title: 'Core and thoracic spine',
        detail: 'RKC plank (full-tension), Zercher squat, and Good Morning strengthen the erectors and isometric core, reducing forward lean under heavy loads.',
      },
    ],
    mobility: [
      {
        icon: '🦶',
        title: 'Ankle dorsiflexion',
        detail: 'Ankle restriction is the most common limiter of deep squat. Wall knee-to-wall drills for 2–3 min/day produce measurable improvement in 4–6 weeks.',
      },
      {
        icon: '🔄',
        title: 'Hip mobility',
        detail: 'Active hip flexor mobilization (90/90 hip stretch, pigeon pose) held 90 s per position improves depth without compromising force production.',
      },
      {
        icon: '📐',
        title: 'Thoracic extension',
        detail: 'A stiff thoracic spine causes excessive trunk lean. Thoracic foam rolling + shoulder dislocations with a PVC pipe before training improve bar position.',
      },
    ],
    variations: [
      {
        icon: '⏸️',
        title: 'Pause Squat',
        detail: '2–3 s at the bottom eliminates the myotatic reflex and forces pure force production. Use 70–80% of 1RM. Improves the initial sticking point and knee tracking.',
      },
      {
        icon: '🐢',
        title: 'Tempo Squat',
        detail: '4–5 s descent increases time under tension and eccentric control. NSCA research shows controlled eccentric work improves 1RM more than isolated concentric.',
      },
      {
        icon: '🎯',
        title: 'Front Squat',
        detail: 'More vertical torso in the front squat drives the quadriceps harder and corrects back squat compensations. Athletes who add front squats typically gain 5–10% on their back squat.',
      },
    ],
    programming: [
      {
        icon: '📊',
        title: '2–3×/week frequency',
        detail: 'Meta-analyses show high frequency (≥2×/week) produces 70% greater strength gains than 1×/week for the squat, provided weekly volume is distributed across sessions.',
      },
      {
        icon: '📈',
        title: 'Daily undulating periodization (DUP)',
        detail: 'Alternating heavy days (4–6 RM, ~85%) with moderate days (8–10 RM, ~70%) in the same week outperforms linear progression after the first 3–6 months of training.',
      },
      {
        icon: '🔢',
        title: '10–20 weekly sets',
        detail: 'Ralston et al. (2017) identified ≥10 sets/week as the threshold for maximal strength gain in trained athletes; more than 20 sets increases overreaching risk.',
      },
    ],
  },

  'Front Squat': {
    muscles: [
      {
        icon: '🦵',
        title: 'Quadriceps dominant',
        detail: 'Front squat has the highest quadriceps activation among barbell squats. High-foot-position leg press is the most direct complement.',
      },
      {
        icon: '🔝',
        title: 'Lats and mid-trapezius',
        detail: 'The rack position demands that lats and mid-traps hold the bar in the front rack. Pronated rowing and face pulls are direct accessories for the correct position.',
      },
      {
        icon: '🧱',
        title: 'Anti-flexion core',
        detail: 'Weight in front increases core demand to prevent lumbar rounding. Ab wheel rollouts and hollow holds specifically train the required resistance.',
      },
    ],
    mobility: [
      {
        icon: '💪',
        title: 'Wrist/elbow flexibility',
        detail: 'The main front rack limiter is wrist and elbow extensor flexibility. Passive wrist mobilization (30–60 s) daily improves position in 2–4 weeks.',
      },
      {
        icon: '🦶',
        title: 'Ankle dorsiflexion',
        detail: 'Front squat requires greater dorsiflexion than back squat due to the more vertical torso. Knee-to-wall against a wall is the most validated drill for gaining mobility.',
      },
    ],
    variations: [
      {
        icon: '🧟',
        title: 'Zombie Front Squat',
        detail: 'Arms extended forward forces correct posture without wrist support. Using 50–60% of 1RM develops postural awareness and trunk strength in the movement.',
      },
      {
        icon: '⏸️',
        title: 'Pause Front Squat',
        detail: '2 s at the bottom without bounce develops clean starting strength. It is the primary WL auxiliary exercise for building strength in the clean.',
      },
    ],
    programming: [
      {
        icon: '📐',
        title: '80–85% of Back Squat as benchmark',
        detail: 'For technical athletes, front squat typically is 80–85% of back squat. A lower ratio indicates a position or core limitation; a higher ratio may point to postural weakness in the back squat.',
      },
      {
        icon: '📊',
        title: '2–3 sets of 3–5 reps',
        detail: 'For maximal strength, sets of 3–5 reps at 80–90% are most effective. High volume (8–10 reps) is appropriate for technical development with lighter loads.',
      },
    ],
  },

  'Overhead Squat': {
    muscles: [
      {
        icon: '🔝',
        title: 'Shoulder stability (external rotators)',
        detail: 'Infraspinatus and teres minor are the primary stabilizers. Face pulls, band pull-aparts, and Y-T-W with a band should be included as warm-up and accessory work.',
      },
      {
        icon: '💪',
        title: 'Lats (latissimus dorsi)',
        detail: 'Wide-grip lat pull-down and pull-ups train the lats that "press" the bar up and back in the OHS position, preventing forward collapse.',
      },
      {
        icon: '🧱',
        title: 'Stabilizing core (anti-rotation)',
        detail: 'Pallof press and overhead carry train the rotational resistance the OHS demands under load.',
      },
    ],
    mobility: [
      {
        icon: '🔄',
        title: 'Shoulder external rotation',
        detail: 'External rotation restriction is the most common OHS limiter. Passive banded mobilization + active warm-up (dislocations) before training.',
      },
      {
        icon: '📐',
        title: 'Thoracic extension',
        detail: 'The thoracic spine provides ~50% of the extension needed to keep the bar above the ear line. Thoracic foam rolling + thoracic extension over a chair are essential.',
      },
      {
        icon: '🦶',
        title: 'Ankle and hip combined',
        detail: 'OHS combines the ankle demands of the front squat with the hip demands of the snatch. Work both before progressing load.',
      },
    ],
    variations: [
      {
        icon: '⚖️',
        title: 'Snatch Balance',
        detail: 'Snatch balance trains overhead positioning while developing drop speed. It is the primary strength exercise for OHS in the context of weightlifting.',
      },
      {
        icon: '🛡️',
        title: 'Overhead Hold / Carry',
        detail: 'Holding a bar/kettlebell overhead for 20–30 s trains shoulder complex and core endurance in the specific position.',
      },
    ],
    programming: [
      {
        icon: '⚠️',
        title: 'Prioritize technique over load',
        detail: 'OHS is one of the most mobility- and technique-limited movements. Adding load before resolving structural limitations increases shoulder and wrist injury risk.',
      },
      {
        icon: '📊',
        title: '65–75% of Snatch as benchmark',
        detail: 'OHS max is generally 65–75% of Snatch in WL athletes. In CrossFit athletes without WL background, this ratio may be lower — indicating a priority area.',
      },
    ],
  },

  'Deadlift': {
    muscles: [
      {
        icon: '🍑',
        title: 'Glutes and hamstrings',
        detail: 'Romanian Deadlift (RDL) isolates the posterior chain without overloading the lower back. 3–4 sets of 6–8 reps is the primary complement for increasing the conventional deadlift.',
      },
      {
        icon: '🔝',
        title: 'Trapezius and scapular retractors',
        detail: 'Poor bar path and "loose" scapulae are a frequent cause of lower back pain in the DL. Heavy shrugs, rowing, and face pulls build the needed pulling foundation.',
      },
      {
        icon: '✋',
        title: 'Grip strength',
        detail: 'Grip failure before prime movers is a limiter at loads ≥90% 1RM. Farmer carry, dead hang, and progressive hook grip training are the most effective methods.',
      },
    ],
    mobility: [
      {
        icon: '🔄',
        title: 'Conscious hip hinge',
        detail: 'Kettlebell deadlift and Romanian deadlift with a dowel rod along the spine teach the hip hinge pattern with a neutral spine — the technical foundation of the entire movement.',
      },
      {
        icon: '🦵',
        title: 'Hamstring length',
        detail: 'Short hamstrings cause posterior pelvic tilt in the start position. Active stretching (leg swings, light RDL) is preferable to static stretching before training.',
      },
    ],
    variations: [
      {
        icon: '📉',
        title: 'Deficit Deadlift',
        detail: 'A 5–10 cm platform increases the initial range — the hardest point of the DL. Improves "off the floor" strength that limits intermediate athletes.',
      },
      {
        icon: '🏗️',
        title: 'Rack Pull',
        detail: 'Bar at knee height allows working with 110–120% of 1RM, developing lock-out strength and acclimating the nervous system to supramaximal loads.',
      },
      {
        icon: '⏸️',
        title: 'Pause Deadlift (below the knee)',
        detail: '2 s pause below the knee trains posture maintenance under fatigue and reveals technical weaknesses not visible in continuous reps.',
      },
    ],
    programming: [
      {
        icon: '🔋',
        title: 'Lower frequency than squat (1–2×/week)',
        detail: 'Deadlift has higher CNS and recovery demand. Research shows more than 2×/week produces no additional gains for most athletes and increases overreaching risk.',
      },
      {
        icon: '📊',
        title: '3–5 sets of 1–5 reps for maximal strength',
        detail: 'Zatsiorsky recommends maximal-intensity work (85–95%) for DL with low volume (10–15 total reps). Sets of 8+ reps have lower transfer to 1RM.',
      },
    ],
  },

  'Sumo Deadlift': {
    muscles: [
      {
        icon: '🦵',
        title: 'Hip adductors',
        detail: 'Sumo DL recruits adductors 30–40% more than conventional. Copenhagen plank and side-lying adduction are specific exercises for this frequently neglected group.',
      },
      {
        icon: '🍑',
        title: 'Glutes in abduction',
        detail: 'Banded clamshells, wide-stance hip thrusts, and lateral band walks prepare the glutes for the wide-knee force pattern.',
      },
    ],
    mobility: [
      {
        icon: '🔄',
        title: 'Hip external rotation',
        detail: 'Hip external rotation mobility is a critical limiter of sumo. Pigeon pose, 90/90, and frog stretch with gradual progression 2–3×/week.',
      },
      {
        icon: '📐',
        title: 'Groin (adductor) opening',
        detail: 'Wider stance requires more adductor flexibility. Gradually widen foot position without forcing beyond available mobility.',
      },
    ],
    variations: [
      {
        icon: '🔄',
        title: 'Conventional as complement',
        detail: 'Sumo athletes benefit from training conventional as an accessory to strengthen the posterior chain, which is often less developed with a wide stance.',
      },
    ],
    programming: [
      {
        icon: '⚙️',
        title: 'Same guidelines as conventional Deadlift',
        detail: '1–2×/week with intensity variation. Sumo and conventional can alternate in 4–6 week blocks for complete bilateral development.',
      },
    ],
  },

  'Bench Press': {
    muscles: [
      {
        icon: '💪',
        title: 'Triceps',
        detail: 'Triceps is the most common lock-out limiter in the bench. Close-grip bench press (shoulder-width grip) and skull crushers are the accessories with the highest transfer.',
      },
      {
        icon: '🔝',
        title: 'Anterior deltoid and pectoral',
        detail: 'Incline dumbbell press and dumbbell flye work the pectoral through greater range with less triceps recruitment, balancing development.',
      },
      {
        icon: '🛡️',
        title: 'Serratus anterior and scapular retractors',
        detail: 'Active scapular retraction and a strong serratus are the safety foundation of the bench. Horizontal rowing (3:1 row-to-press ratio) is the NSCA standard recommendation.',
      },
    ],
    mobility: [
      {
        icon: '🔄',
        title: 'Thoracic mobility for arch',
        detail: 'Thoracic extension for a safe "arch" in the bench protects the shoulder. Thoracic foam rolling in extension before training — never force excessive lumbar arch.',
      },
      {
        icon: '💪',
        title: 'Shoulder internal/external rotation',
        detail: 'Bar descending to chest with elbows at 45–75° (not 90°) reduces rotator cuff stress. Safest position validated by EMG and biomechanical studies.',
      },
    ],
    variations: [
      {
        icon: '🏋️',
        title: 'Close-Grip Bench Press',
        detail: 'Grip at ~60% of normal width increases triceps activation by 20–30%. Useful for strengthening the lock-out and as a lower-shoulder-stress variation.',
      },
      {
        icon: '⏸️',
        title: 'Pause Bench Press',
        detail: '1–2 s with bar on chest (no bounce) trains starting strength. Used extensively in powerlifting programs to overcome sticking points.',
      },
      {
        icon: '🔼',
        title: 'Board/Block Press',
        detail: '2–3 boards on the chest allows partial-range work with supramaximal loads (105–115% 1RM), developing lock-out strength and neural adaptation.',
      },
    ],
    programming: [
      {
        icon: '📊',
        title: '2–4×/week with grip variation',
        detail: 'Ralston et al. (2017) meta-analysis: ≥3×/week with position variation produces significantly greater gains than 1–2×/week for intermediate lifters.',
      },
      {
        icon: '⚖️',
        title: 'Push:pull balance of 1:1.5',
        detail: 'NSCA recommends 1 pressing set for every 1.5 pulling sets for shoulder health. Excess bench without equivalent rowing is a frequent cause of rotator cuff injury.',
      },
    ],
  },

  'Shoulder Press (Strict)': {
    muscles: [
      {
        icon: '🔝',
        title: 'Lateral and anterior deltoid',
        detail: 'Lateral raises (3–4 sets of 12–15 reps) and Y-T-W with a band develop the deltoid heads that determine the initial drive of the overhead press.',
      },
      {
        icon: '💪',
        title: 'Long head triceps',
        detail: 'Overhead tricep extension recruits the long head of the triceps at full length — the most relevant head for the strict press lock-out. 2–3 sets of 10–12 reps.',
      },
      {
        icon: '🛡️',
        title: 'Rotator cuff (stabilization)',
        detail: 'External rotation drills with a band (90° of abduction) are essential pre-activation. A weak rotator cuff is the primary injury factor in the overhead press.',
      },
    ],
    mobility: [
      {
        icon: '📐',
        title: 'Thoracic extension',
        detail: 'Without adequate thoracic extension, the trunk leans back to compensate, increasing lumbar stress. Foam rolling + PVC mobilization before training.',
      },
      {
        icon: '🔄',
        title: 'External rotation + lats',
        detail: 'Short lats block full shoulder elevation. Lat stretch on a bar and "sleeper stretch" improve range for a safe overhead position.',
      },
    ],
    variations: [
      {
        icon: '🏋️',
        title: 'Push Press as overload',
        detail: 'Push press allows working at 110–130% of strict press, developing the lock-out with supramaximal loads. It is the primary exercise for "accustoming" weight overhead.',
      },
      {
        icon: '🎯',
        title: 'Dumbbell Overhead Press',
        detail: 'Dumbbells force each side to work independently, balancing asymmetries. The natural arc of motion reduces rotator cuff stress compared to the barbell.',
      },
      {
        icon: '⏸️',
        title: 'Pause Press (at rack position)',
        detail: '1 s pause at the rack position with reduced load eliminates quad bounce and trains the pure concentric phase, most relevant for heavy strict press.',
      },
    ],
    programming: [
      {
        icon: '📊',
        title: '2–3×/week, 3–5 sets of 3–6 reps',
        detail: 'Strict press responds well to high frequency. Program as the main movement 1× and as a complement 1–2× per week, varying rep range and intensity.',
      },
      {
        icon: '⚖️',
        title: 'Benchmark: ~60–65% of bench press',
        detail: 'A healthy press/bench ratio indicates balanced development. A significantly lower ratio may indicate deltoid limitation or deficient leg-drive technique.',
      },
    ],
  },

  'Push Press': {
    muscles: [
      {
        icon: '🦵',
        title: 'Leg drive (quads/glutes)',
        detail: 'Push press power comes from the dip-drive: rapid knee and hip extension. Explosiveness from jump squats transfers directly to the dip-drive.',
      },
      {
        icon: '🔝',
        title: 'Deltoids and triceps',
        detail: 'The overhead phase is identical to the strict press. Training strict press as an accessory develops the musculature that completes the movement after the drive.',
      },
    ],
    mobility: [
      {
        icon: '📐',
        title: 'Thoracic extension for lockout position',
        detail: 'The "bar over the ear" lock-out position requires thoracic extension. The same mobilizations used for strict press apply here.',
      },
    ],
    variations: [
      {
        icon: '💪',
        title: 'Strict Press as foundation',
        detail: 'Athletes with a strong strict press have a more efficient push press — better drive transmission. Never neglect strict press when training push press.',
      },
      {
        icon: '⚡',
        title: 'Push Jerk for timing development',
        detail: 'Push jerk adds a re-dip under the bar, training timing precision and a more demanding overhead position.',
      },
    ],
    programming: [
      {
        icon: '📊',
        title: '10–20% heavier than strict press',
        detail: 'Typical push press is 10–20% heavier than strict press for the same athlete. A lower ratio indicates a technical limitation in the dip-drive; a higher ratio indicates good leg power.',
      },
    ],
  },

  'Clean': {
    muscles: [
      {
        icon: '⚡',
        title: 'Triple extension (ankle/knee/hip)',
        detail: 'Clean power comes from violent simultaneous ankle, knee, and hip extension. Power clean, hang clean, and jump shrugs develop this pattern in isolation.',
      },
      {
        icon: '🔝',
        title: 'Trapezius and scapular elevators',
        detail: '"High pull" with barbell and snatch grip high pull strengthen the final pull that elevates the bar to the catch. They are the most direct accessories for increasing the clean.',
      },
      {
        icon: '💪',
        title: 'Front rack: lats and rhomboids',
        detail: 'A weak front rack is the most common cause of dropping elbows in the clean. Face pulls and horizontal rowing develop the safest catch position.',
      },
    ],
    mobility: [
      {
        icon: '💪',
        title: 'Front rack position',
        detail: 'Wrist (passive extension), elbow, and shoulder mobilization for the front rack. Use a PVC pipe to train position before adding weight.',
      },
      {
        icon: '🦶',
        title: 'Dorsiflexion for catch',
        detail: 'Heavy clean requires deep squat at catch. Specific ankle mobilization before WL training.',
      },
    ],
    variations: [
      {
        icon: '📍',
        title: 'Hang Clean (below/above knee)',
        detail: 'Eliminates the first pull and isolates the second pull — the most explosive phase. Allows more technical volume with reduced load.',
      },
      {
        icon: '⏸️',
        title: 'Clean with pause at the knee',
        detail: '1 s pause as the bar passes the knee reinforces first-pull posture, a technical phase frequently neglected as athletes rapidly increase load.',
      },
      {
        icon: '💪',
        title: 'Power Clean',
        detail: 'Receiving in a higher position demands more complete extension. Used by advanced athletes to develop pull speed; it is not a regression of the squat clean.',
      },
    ],
    programming: [
      {
        icon: '🧠',
        title: 'Technique before load',
        detail: 'USAW and IWF recommend solidifying mechanics at 70–80% before attempting maxes. Skipping this stage increases the risk of a faulty motor pattern that is hard to correct later.',
      },
      {
        icon: '📊',
        title: '3–5 sets of 1–3 reps for heavy work',
        detail: 'Olympic lifts lose technical quality above 3–4 reps per set. High volume should be done at ≤75% with a focus on speed, not fatigue.',
      },
    ],
  },

  'Power Clean': {
    muscles: [
      {
        icon: '⚡',
        title: 'Explosive hip extension',
        detail: 'Power clean requires faster hip extension than squat clean because there is no re-dip. Box jumps, broad jumps, and kettlebell swings develop this pattern.',
      },
      {
        icon: '🔝',
        title: 'High pull and trapezius',
        detail: 'Receiving in a higher position demands a higher pull. Hang power clean + high pull are the most specific accessories.',
      },
    ],
    mobility: [
      {
        icon: '🔄',
        title: 'Front rack for partial catch',
        detail: 'Even receiving above parallel, the front rack must be solid for joint safety. Same mobilizations as the full clean.',
      },
    ],
    variations: [
      {
        icon: '🎯',
        title: 'Hang Power Clean',
        detail: 'Eliminates the first pull and completely isolates the explosive second pull. The primary exercise for developing hip extension speed.',
      },
      {
        icon: '📉',
        title: 'Progression to Squat Clean',
        detail: 'Power clean is often used as a progression to squat clean. Mastering the power clean first ensures correct pull technique before adding the squat.',
      },
    ],
    programming: [
      {
        icon: '📊',
        title: '80–85% of Clean as benchmark',
        detail: 'A healthy power clean sits at 80–85% of the full clean. A higher ratio indicates a late catch; a lower ratio may indicate an extension limitation.',
      },
    ],
  },

  'Clean and Jerk': {
    muscles: [
      {
        icon: '⚡',
        title: 'All clean groups + overhead',
        detail: 'C&J is the most complete lift — it works nearly every muscle group. Weakness in the clean or the jerk becomes the bottleneck; identify and address the limiter.',
      },
      {
        icon: '🦵',
        title: 'Quads and glutes for the jerk dip',
        detail: 'The jerk dip-drive requires explosive extension similar to push press. Front squat and split squat develop leg strength at the specific jerk angle.',
      },
    ],
    mobility: [
      {
        icon: '🏃',
        title: 'Split position (for split jerk)',
        detail: 'Hip flexor and rear-ankle mobility limit the split. Lunge stretch, couch stretch, and gradual split depth progression.',
      },
      {
        icon: '📐',
        title: 'Overhead for jerk catch',
        detail: 'The jerk overhead position is more demanding than the snatch because it is received after the clean. Same shoulder/thoracic mobilizations as the strict press.',
      },
    ],
    variations: [
      {
        icon: '💪',
        title: 'Jerk from blocks/rack',
        detail: 'Jerking directly from the rack allows greater volume without clean fatigue. Essential for isolating the jerk when the clean is the limiter.',
      },
      {
        icon: '⏸️',
        title: 'Clean with pause in front rack',
        detail: '2–3 s pause in the front rack before the jerk trains position and proper breathing between the two movements. Develops consistency.',
      },
    ],
    programming: [
      {
        icon: '📊',
        title: 'C&J is generally 80–85% of Snatch in % BW',
        detail: 'In elite WL athletes, C&J is greater than snatch in absolute kg but lower as a % of theoretical BW. CrossFit athletes frequently have a disproportionately higher C&J than snatch.',
      },
      {
        icon: '🧠',
        title: 'Separate clean and jerk training',
        detail: 'To resolve specific weaknesses, training clean separately from jerk in different sessions is more effective than always combining them — allows technical focus and adequate volume in each.',
      },
    ],
  },

  'Snatch': {
    muscles: [
      {
        icon: '⚡',
        title: 'Triple extension + shoulders',
        detail: 'Snatch combines the triple extension of the clean with additional shoulder and lat demand. Overhead squat and snatch balance develop the receiving position.',
      },
      {
        icon: '💪',
        title: 'Lats for bar "sweep"',
        detail: 'Wide-grip lat pulldown and wide-grip pull-ups train the lats that keep the bar close to the body during the pull — a critical efficiency factor in the snatch.',
      },
      {
        icon: '🔝',
        title: 'Trapezius and rhomboids for the pull',
        detail: 'Snatch grip high pull and snatch pull isolate the upper pull. They are the most specific strength exercises for increasing the snatch.',
      },
    ],
    mobility: [
      {
        icon: '🔄',
        title: 'Shoulder external rotation',
        detail: 'The snatch overhead position demands more external rotation than any other lift. Banded stretching + shoulder dislocations are prerequisites before progressing load.',
      },
      {
        icon: '📐',
        title: 'Thoracic extension for overhead',
        detail: 'Thoracic kyphosis is the primary structural barrier to safe overhead in the snatch. Daily mobilization is more effective than sporadic long sessions.',
      },
      {
        icon: '🦶',
        title: 'Ankle for the catch',
        detail: 'The snatch catch demands the most dorsiflexion of any position. 5–10 min ankle mobilization protocol before training for athletes with restrictions.',
      },
    ],
    variations: [
      {
        icon: '⚖️',
        title: 'Snatch Balance',
        detail: 'The primary overhead strength exercise for the snatch — trains drop speed and receiving position with loads at or above max snatch.',
      },
      {
        icon: '💪',
        title: 'Muscle Snatch',
        detail: 'No dip under the bar — forces the pull to be high and complete. Limits load but reveals pull problems early. Used in warm-up and as a technical diagnostic.',
      },
      {
        icon: '📍',
        title: 'Hang Snatch (below the knee)',
        detail: 'Position of least mechanical advantage — demands maximum extension. More effective for developing second-pull power than hang above the knee.',
      },
    ],
    programming: [
      {
        icon: '🧠',
        title: 'Snatch is the most technical lift',
        detail: 'IWF coaching manuals recommend years of technical work before prioritizing maximal load. Movement quality should be the primary criterion, not PR.',
      },
      {
        icon: '📊',
        title: '80% of Clean & Jerk as benchmark',
        detail: 'In WL athletes, snatch is approximately 80% of C&J. A lower ratio indicates technical or overhead weakness; a higher ratio is rare and may indicate clean weakness.',
      },
    ],
  },

  'Power Snatch': {
    muscles: [
      {
        icon: '⚡',
        title: 'Hip extension explosiveness',
        detail: 'Power snatch requires more violent hip extension than squat snatch because there is no re-dip. Focus on maximum pull speed, not load.',
      },
      {
        icon: '🔝',
        title: 'High pull and shoulders',
        detail: 'Receiving above parallel requires a higher pull. Muscle snatch and snatch high pull develop the required pull phase.',
      },
    ],
    mobility: [
      {
        icon: '🔄',
        title: 'Shoulder for partial position',
        detail: 'Even receiving higher, the overhead position must be solid. Same mobilizations as the full snatch, with special attention to shoulder stability.',
      },
    ],
    variations: [
      {
        icon: '🎯',
        title: 'Hang Power Snatch',
        detail: 'Isolates the second pull from the most efficient position. The most specific exercise for developing power snatch speed and timing.',
      },
    ],
    programming: [
      {
        icon: '📊',
        title: '80–85% of full Snatch',
        detail: 'A healthy power snatch is 80–85% of squat snatch. A higher ratio indicates the athlete avoids the squat due to mobility limitations — an area to develop.',
      },
    ],
  },
}

// Fallback generic suggestions for movements without specific data
const GENERIC_SUGGESTIONS: MovementSuggestions = {
  muscles: [
    {
      icon: '💪',
      title: 'Identify primary muscles',
      detail: 'Understanding which muscle groups are primary and secondary in the movement allows selecting accessory exercises with greater specificity.',
    },
    {
      icon: '⚖️',
      title: 'Agonist/antagonist balance',
      detail: 'NSCA recommends a 1:1 ratio between opposing groups for joint health (e.g. quads/hamstrings, push/pull). Imbalances are a frequent cause of injury.',
    },
  ],
  mobility: [
    {
      icon: '🔄',
      title: 'Full range of motion',
      detail: 'Training through full ROM produces greater strength and flexibility gains than partial-range training, according to McMahon et al. research.',
    },
    {
      icon: '⏰',
      title: 'Specific pre-training mobilization',
      detail: 'Active and dynamic mobilization (not static) before training increases performance without reducing force production, unlike prolonged static stretching.',
    },
  ],
  variations: [
    {
      icon: '⏸️',
      title: 'Pause reps',
      detail: 'Adding a 1–2 s pause at the point of least mechanical advantage trains strength without the myotatic reflex. Applicable to virtually any lift.',
    },
    {
      icon: '🐢',
      title: 'Tempo reps (controlled eccentric)',
      detail: 'A 3–5 s eccentric phase increases controlled muscle damage and time under tension. Research shows superior strength gains over isolated concentric work.',
    },
  ],
  programming: [
    {
      icon: '📊',
      title: 'Progressive overload principle',
      detail: 'Gradual load increases (2.5–5 kg/week on fundamental exercises) is the most validated principle for strength gain. Abrupt increases raise injury risk.',
    },
    {
      icon: '😴',
      title: 'Adequate recovery',
      detail: 'Strength gains occur during recovery, not during training. Athletes with ≥7h of sleep perform 20–25% better on strength tests than sleep-deprived athletes.',
    },
  ],
}

export function getMovementSuggestions(movementName: string): MovementSuggestions {
  return SUGGESTIONS[movementName] ?? GENERIC_SUGGESTIONS
}

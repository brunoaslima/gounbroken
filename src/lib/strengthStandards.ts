// Auto-generated from crossfit_strength_scoring_config_v1.json
// Standards interpolated by bodyweight — níveis: Em Formação/Iniciante/Novato/Intermediário/Avançado/Elite

export type StrengthTier = 'below_beginner' | 'beginner' | 'novice' | 'intermediate' | 'advanced' | 'elite'

export interface StrengthAnalysis {
  weightKg:       number
  bodyWeightRatio: number
  level:          StrengthTier
  levelLabel:     string
  levelColor:     string
  score:          number
  nextLevel:      StrengthTier | null
  nextLevelKg:    number | null
  kgToNextLevel:  number | null
  confidence:     string
}

export const TIER_LABELS: Record<StrengthTier, string> = {
  below_beginner: 'Untrained',
  beginner:       'Beginner',
  novice:         'Novice',
  intermediate:   'Intermediate',
  advanced:       'Advanced',
  elite:          'Elite',
}

export const TIER_COLORS: Record<StrengthTier, string> = {
  below_beginner: '#6B6B68',
  beginner:       '#6B6B68',
  novice:         '#A8A8A4',
  intermediate:   '#4DA3FF',
  advanced:       '#D4FF3A',
  elite:          '#FF8A00',
}

export const TIER_ORDER: StrengthTier[] = ['beginner', 'novice', 'intermediate', 'advanced', 'elite']

const SCORE_ANCHORS: Record<string, [number, number]> = {
  below_beginner: [0, 0],
  beginner:       [0, 20],
  novice:         [20, 40],
  intermediate:   [40, 60],
  advanced:       [60, 80],
  elite:          [80, 95],
}

// ── Standards tables (bodyweight-based, kg) ─────────────────────────────────

const STD_BENCH_PRESS_MALE = [
  { bw: 50, b: 24, n: 38, i: 57, a: 79, e: 103 },
  { bw: 55, b: 29, n: 45, i: 64, a: 87, e: 113 },
  { bw: 60, b: 34, n: 51, i: 72, a: 96, e: 123 },
  { bw: 65, b: 39, n: 57, i: 79, a: 104, e: 132 },
  { bw: 70, b: 44, n: 62, i: 85, a: 112, e: 141 },
  { bw: 75, b: 49, n: 68, i: 92, a: 119, e: 149 },
  { bw: 80, b: 53, n: 74, i: 98, a: 127, e: 157 },
  { bw: 85, b: 58, n: 79, i: 105, a: 134, e: 165 },
  { bw: 90, b: 62, n: 84, i: 111, a: 141, e: 172 },
  { bw: 95, b: 67, n: 89, i: 116, a: 147, e: 180 },
  { bw: 100, b: 71, n: 94, i: 122, a: 153, e: 187 },
  { bw: 105, b: 75, n: 99, i: 128, a: 160, e: 194 },
  { bw: 110, b: 80, n: 104, i: 133, a: 166, e: 200 },
  { bw: 115, b: 84, n: 109, i: 138, a: 172, e: 207 },
  { bw: 120, b: 88, n: 113, i: 143, a: 177, e: 213 },
  { bw: 125, b: 92, n: 118, i: 148, a: 183, e: 219 },
  { bw: 130, b: 95, n: 122, i: 153, a: 188, e: 225 },
  { bw: 135, b: 99, n: 126, i: 158, a: 194, e: 231 },
  { bw: 140, b: 103, n: 130, i: 163, a: 199, e: 236 },
] as const
const STD_BENCH_PRESS_FEMALE = [
  { bw: 40, b: 8, n: 18, i: 32, a: 50, e: 70 },
  { bw: 45, b: 10, n: 21, i: 36, a: 55, e: 76 },
  { bw: 50, b: 12, n: 24, i: 40, a: 59, e: 82 },
  { bw: 55, b: 15, n: 27, i: 43, a: 64, e: 87 },
  { bw: 60, b: 17, n: 29, i: 47, a: 68, e: 92 },
  { bw: 65, b: 19, n: 32, i: 50, a: 72, e: 96 },
  { bw: 70, b: 20, n: 34, i: 53, a: 75, e: 101 },
  { bw: 75, b: 22, n: 37, i: 56, a: 79, e: 105 },
  { bw: 80, b: 24, n: 39, i: 59, a: 82, e: 109 },
  { bw: 85, b: 26, n: 41, i: 62, a: 86, e: 112 },
  { bw: 90, b: 28, n: 44, i: 64, a: 89, e: 116 },
  { bw: 95, b: 29, n: 46, i: 67, a: 92, e: 119 },
  { bw: 100, b: 31, n: 48, i: 69, a: 95, e: 123 },
  { bw: 105, b: 33, n: 50, i: 72, a: 98, e: 126 },
  { bw: 110, b: 34, n: 52, i: 74, a: 100, e: 129 },
  { bw: 115, b: 36, n: 54, i: 76, a: 103, e: 132 },
  { bw: 120, b: 37, n: 56, i: 79, a: 106, e: 135 },
] as const

const STD_BACK_SQUAT_MALE = [
  { bw: 50, b: 33, n: 52, i: 76, a: 104, e: 136 },
  { bw: 55, b: 40, n: 60, i: 86, a: 116, e: 149 },
  { bw: 60, b: 47, n: 68, i: 95, a: 127, e: 161 },
  { bw: 65, b: 53, n: 76, i: 104, a: 137, e: 173 },
  { bw: 70, b: 59, n: 83, i: 113, a: 147, e: 184 },
  { bw: 75, b: 66, n: 91, i: 122, a: 157, e: 195 },
  { bw: 80, b: 72, n: 98, i: 130, a: 166, e: 205 },
  { bw: 85, b: 78, n: 105, i: 138, a: 175, e: 215 },
  { bw: 90, b: 83, n: 112, i: 146, a: 184, e: 225 },
  { bw: 95, b: 89, n: 118, i: 153, a: 192, e: 234 },
  { bw: 100, b: 95, n: 125, i: 160, a: 201, e: 243 },
  { bw: 105, b: 100, n: 131, i: 168, a: 209, e: 252 },
  { bw: 110, b: 106, n: 137, i: 174, a: 216, e: 260 },
  { bw: 115, b: 111, n: 143, i: 181, a: 224, e: 269 },
  { bw: 120, b: 116, n: 149, i: 188, a: 231, e: 277 },
  { bw: 125, b: 121, n: 155, i: 194, a: 238, e: 284 },
  { bw: 130, b: 126, n: 160, i: 201, a: 245, e: 292 },
  { bw: 135, b: 131, n: 166, i: 207, a: 252, e: 299 },
  { bw: 140, b: 136, n: 171, i: 213, a: 259, e: 307 },
] as const
const STD_BACK_SQUAT_FEMALE = [
  { bw: 40, b: 17, n: 31, i: 51, a: 75, e: 101 },
  { bw: 45, b: 20, n: 36, i: 56, a: 81, e: 109 },
  { bw: 50, b: 23, n: 39, i: 61, a: 87, e: 115 },
  { bw: 55, b: 26, n: 43, i: 65, a: 92, e: 122 },
  { bw: 60, b: 29, n: 47, i: 70, a: 97, e: 128 },
  { bw: 65, b: 32, n: 50, i: 74, a: 102, e: 133 },
  { bw: 70, b: 34, n: 53, i: 78, a: 106, e: 138 },
  { bw: 75, b: 37, n: 56, i: 81, a: 111, e: 143 },
  { bw: 80, b: 39, n: 59, i: 85, a: 115, e: 148 },
  { bw: 85, b: 41, n: 62, i: 88, a: 119, e: 152 },
  { bw: 90, b: 44, n: 65, i: 91, a: 123, e: 157 },
  { bw: 95, b: 46, n: 68, i: 95, a: 126, e: 161 },
  { bw: 100, b: 48, n: 70, i: 98, a: 130, e: 165 },
  { bw: 105, b: 50, n: 73, i: 101, a: 133, e: 169 },
  { bw: 110, b: 52, n: 75, i: 103, a: 136, e: 172 },
  { bw: 115, b: 54, n: 77, i: 106, a: 140, e: 176 },
  { bw: 120, b: 56, n: 80, i: 109, a: 143, e: 179 },
] as const

const STD_FRONT_SQUAT_MALE = [
  { bw: 50, b: 31, n: 46, i: 65, a: 88, e: 113 },
  { bw: 55, b: 35, n: 52, i: 73, a: 97, e: 123 },
  { bw: 60, b: 40, n: 58, i: 79, a: 104, e: 132 },
  { bw: 65, b: 45, n: 63, i: 86, a: 112, e: 140 },
  { bw: 70, b: 50, n: 69, i: 92, a: 119, e: 148 },
  { bw: 75, b: 54, n: 74, i: 98, a: 126, e: 156 },
  { bw: 80, b: 59, n: 79, i: 104, a: 133, e: 163 },
  { bw: 85, b: 63, n: 84, i: 110, a: 139, e: 170 },
  { bw: 90, b: 67, n: 89, i: 115, a: 145, e: 177 },
  { bw: 95, b: 71, n: 94, i: 121, a: 151, e: 184 },
  { bw: 100, b: 75, n: 98, i: 126, a: 157, e: 190 },
  { bw: 105, b: 79, n: 103, i: 131, a: 163, e: 196 },
  { bw: 110, b: 83, n: 107, i: 136, a: 168, e: 202 },
  { bw: 115, b: 86, n: 111, i: 141, a: 173, e: 208 },
  { bw: 120, b: 90, n: 115, i: 145, a: 178, e: 213 },
  { bw: 125, b: 94, n: 119, i: 150, a: 183, e: 219 },
  { bw: 130, b: 97, n: 123, i: 154, a: 188, e: 224 },
  { bw: 135, b: 100, n: 127, i: 158, a: 193, e: 229 },
  { bw: 140, b: 104, n: 131, i: 162, a: 198, e: 234 },
] as const
const STD_FRONT_SQUAT_FEMALE = [
  { bw: 40, b: 21, n: 32, i: 47, a: 64, e: 83 },
  { bw: 45, b: 23, n: 35, i: 50, a: 68, e: 88 },
  { bw: 50, b: 25, n: 38, i: 54, a: 72, e: 92 },
  { bw: 55, b: 28, n: 41, i: 57, a: 76, e: 96 },
  { bw: 60, b: 30, n: 43, i: 60, a: 79, e: 100 },
  { bw: 65, b: 32, n: 45, i: 62, a: 82, e: 103 },
  { bw: 70, b: 34, n: 48, i: 65, a: 85, e: 107 },
  { bw: 75, b: 35, n: 50, i: 67, a: 88, e: 110 },
  { bw: 80, b: 37, n: 52, i: 70, a: 91, e: 113 },
  { bw: 85, b: 39, n: 54, i: 72, a: 93, e: 116 },
  { bw: 90, b: 40, n: 56, i: 74, a: 96, e: 118 },
  { bw: 95, b: 42, n: 57, i: 76, a: 98, e: 121 },
  { bw: 100, b: 43, n: 59, i: 78, a: 100, e: 124 },
  { bw: 105, b: 45, n: 61, i: 80, a: 102, e: 126 },
  { bw: 110, b: 46, n: 62, i: 82, a: 104, e: 128 },
  { bw: 115, b: 47, n: 64, i: 84, a: 106, e: 130 },
  { bw: 120, b: 49, n: 65, i: 85, a: 108, e: 133 },
] as const

const STD_OVERHEAD_SQUAT_MALE = [
  { bw: 50, b: 12, n: 26, i: 48, a: 77, e: 110 },
  { bw: 55, b: 15, n: 31, i: 54, a: 84, e: 119 },
  { bw: 60, b: 18, n: 35, i: 60, a: 91, e: 127 },
  { bw: 65, b: 21, n: 39, i: 66, a: 98, e: 136 },
  { bw: 70, b: 24, n: 44, i: 71, a: 105, e: 143 },
  { bw: 75, b: 27, n: 48, i: 76, a: 111, e: 151 },
  { bw: 80, b: 30, n: 52, i: 81, a: 117, e: 158 },
  { bw: 85, b: 33, n: 56, i: 86, a: 123, e: 164 },
  { bw: 90, b: 36, n: 59, i: 91, a: 129, e: 171 },
  { bw: 95, b: 39, n: 63, i: 95, a: 134, e: 177 },
  { bw: 100, b: 42, n: 67, i: 100, a: 139, e: 183 },
  { bw: 105, b: 44, n: 70, i: 104, a: 144, e: 189 },
  { bw: 110, b: 47, n: 74, i: 108, a: 149, e: 195 },
  { bw: 115, b: 50, n: 77, i: 112, a: 154, e: 200 },
  { bw: 120, b: 52, n: 81, i: 116, a: 159, e: 206 },
  { bw: 125, b: 55, n: 84, i: 120, a: 163, e: 211 },
  { bw: 130, b: 58, n: 87, i: 124, a: 168, e: 216 },
  { bw: 135, b: 60, n: 90, i: 128, a: 172, e: 221 },
  { bw: 140, b: 63, n: 93, i: 132, a: 176, e: 225 },
] as const
const STD_OVERHEAD_SQUAT_FEMALE = [
  { bw: 40, b: 12, n: 22, i: 35, a: 51, e: 69 },
  { bw: 45, b: 14, n: 24, i: 37, a: 54, e: 72 },
  { bw: 50, b: 15, n: 26, i: 40, a: 57, e: 75 },
  { bw: 55, b: 17, n: 28, i: 42, a: 59, e: 78 },
  { bw: 60, b: 18, n: 29, i: 44, a: 62, e: 81 },
  { bw: 65, b: 19, n: 31, i: 46, a: 64, e: 84 },
  { bw: 70, b: 21, n: 32, i: 48, a: 66, e: 86 },
  { bw: 75, b: 22, n: 34, i: 50, a: 68, e: 89 },
  { bw: 80, b: 23, n: 35, i: 51, a: 70, e: 91 },
  { bw: 85, b: 24, n: 37, i: 53, a: 72, e: 93 },
  { bw: 90, b: 25, n: 38, i: 54, a: 74, e: 95 },
  { bw: 95, b: 26, n: 39, i: 56, a: 75, e: 97 },
  { bw: 100, b: 27, n: 40, i: 57, a: 77, e: 99 },
  { bw: 105, b: 28, n: 41, i: 58, a: 79, e: 100 },
  { bw: 110, b: 29, n: 42, i: 60, a: 80, e: 102 },
  { bw: 115, b: 30, n: 43, i: 61, a: 81, e: 104 },
  { bw: 120, b: 30, n: 44, i: 62, a: 83, e: 105 },
] as const

const STD_DEADLIFT_MALE = [
  { bw: 50, b: 44, n: 65, i: 93, a: 125, e: 160 },
  { bw: 55, b: 51, n: 74, i: 103, a: 137, e: 174 },
  { bw: 60, b: 58, n: 83, i: 114, a: 149, e: 187 },
  { bw: 65, b: 66, n: 92, i: 124, a: 160, e: 200 },
  { bw: 70, b: 73, n: 100, i: 133, a: 171, e: 212 },
  { bw: 75, b: 79, n: 108, i: 142, a: 182, e: 224 },
  { bw: 80, b: 86, n: 116, i: 151, a: 192, e: 235 },
  { bw: 85, b: 93, n: 123, i: 160, a: 201, e: 245 },
  { bw: 90, b: 99, n: 131, i: 168, a: 211, e: 256 },
  { bw: 95, b: 105, n: 138, i: 176, a: 220, e: 266 },
  { bw: 100, b: 111, n: 145, i: 184, a: 228, e: 275 },
  { bw: 105, b: 117, n: 151, i: 192, a: 237, e: 284 },
  { bw: 110, b: 123, n: 158, i: 199, a: 245, e: 293 },
  { bw: 115, b: 129, n: 164, i: 206, a: 253, e: 302 },
  { bw: 120, b: 134, n: 171, i: 213, a: 261, e: 311 },
  { bw: 125, b: 140, n: 177, i: 220, a: 268, e: 319 },
  { bw: 130, b: 145, n: 183, i: 227, a: 276, e: 327 },
  { bw: 135, b: 150, n: 188, i: 233, a: 283, e: 335 },
  { bw: 140, b: 155, n: 194, i: 240, a: 290, e: 342 },
] as const
const STD_DEADLIFT_FEMALE = [
  { bw: 40, b: 24, n: 40, i: 62, a: 89, e: 118 },
  { bw: 45, b: 27, n: 45, i: 68, a: 95, e: 126 },
  { bw: 50, b: 31, n: 49, i: 73, a: 102, e: 133 },
  { bw: 55, b: 34, n: 53, i: 78, a: 107, e: 140 },
  { bw: 60, b: 37, n: 57, i: 83, a: 113, e: 146 },
  { bw: 65, b: 40, n: 61, i: 87, a: 118, e: 152 },
  { bw: 70, b: 43, n: 64, i: 91, a: 123, e: 157 },
  { bw: 75, b: 45, n: 67, i: 95, a: 127, e: 163 },
  { bw: 80, b: 48, n: 71, i: 99, a: 132, e: 168 },
  { bw: 85, b: 51, n: 74, i: 102, a: 136, e: 172 },
  { bw: 90, b: 53, n: 77, i: 106, a: 140, e: 177 },
  { bw: 95, b: 55, n: 79, i: 109, a: 144, e: 181 },
  { bw: 100, b: 58, n: 82, i: 112, a: 147, e: 185 },
  { bw: 105, b: 60, n: 85, i: 116, a: 151, e: 189 },
  { bw: 110, b: 62, n: 87, i: 119, a: 154, e: 193 },
  { bw: 115, b: 64, n: 90, i: 121, a: 158, e: 197 },
  { bw: 120, b: 66, n: 92, i: 124, a: 161, e: 200 },
] as const

const STD_SNATCH_DEADLIFT_MALE = [
  { bw: 50, b: 34, n: 53, i: 79, a: 108, e: 141 },
  { bw: 55, b: 41, n: 62, i: 89, a: 121, e: 156 },
  { bw: 60, b: 48, n: 71, i: 100, a: 133, e: 169 },
  { bw: 65, b: 55, n: 80, i: 110, a: 145, e: 182 },
  { bw: 70, b: 62, n: 88, i: 120, a: 156, e: 195 },
  { bw: 75, b: 69, n: 96, i: 129, a: 167, e: 207 },
  { bw: 80, b: 76, n: 104, i: 138, a: 177, e: 219 },
  { bw: 85, b: 83, n: 112, i: 147, a: 187, e: 230 },
  { bw: 90, b: 89, n: 120, i: 156, a: 197, e: 241 },
  { bw: 95, b: 96, n: 127, i: 164, a: 206, e: 251 },
  { bw: 100, b: 102, n: 134, i: 172, a: 216, e: 261 },
  { bw: 105, b: 108, n: 141, i: 180, a: 224, e: 271 },
  { bw: 110, b: 114, n: 148, i: 188, a: 233, e: 280 },
  { bw: 115, b: 120, n: 155, i: 196, a: 242, e: 290 },
  { bw: 120, b: 126, n: 161, i: 203, a: 250, e: 299 },
  { bw: 125, b: 132, n: 168, i: 210, a: 258, e: 307 },
  { bw: 130, b: 137, n: 174, i: 218, a: 266, e: 316 },
  { bw: 135, b: 143, n: 180, i: 224, a: 273, e: 324 },
  { bw: 140, b: 148, n: 186, i: 231, a: 281, e: 332 },
] as const
const STD_SNATCH_DEADLIFT_FEMALE = [
  { bw: 40, b: 19, n: 31, i: 47, a: 66, e: 87 },
  { bw: 45, b: 21, n: 34, i: 50, a: 70, e: 92 },
  { bw: 50, b: 24, n: 37, i: 54, a: 74, e: 97 },
  { bw: 55, b: 26, n: 39, i: 57, a: 78, e: 101 },
  { bw: 60, b: 28, n: 42, i: 60, a: 81, e: 105 },
  { bw: 65, b: 30, n: 44, i: 63, a: 85, e: 108 },
  { bw: 70, b: 31, n: 47, i: 66, a: 88, e: 112 },
  { bw: 75, b: 33, n: 49, i: 68, a: 91, e: 115 },
  { bw: 80, b: 35, n: 51, i: 70, a: 93, e: 118 },
  { bw: 85, b: 37, n: 53, i: 73, a: 96, e: 121 },
  { bw: 90, b: 38, n: 55, i: 75, a: 99, e: 124 },
  { bw: 95, b: 40, n: 56, i: 77, a: 101, e: 127 },
  { bw: 100, b: 41, n: 58, i: 79, a: 103, e: 130 },
  { bw: 105, b: 42, n: 60, i: 81, a: 106, e: 132 },
  { bw: 110, b: 44, n: 61, i: 83, a: 108, e: 134 },
  { bw: 115, b: 45, n: 63, i: 85, a: 110, e: 137 },
  { bw: 120, b: 46, n: 65, i: 87, a: 112, e: 139 },
] as const

const STD_SHOULDER_PRESS_MALE = [
  { bw: 50, b: 15, n: 25, i: 38, a: 53, e: 71 },
  { bw: 55, b: 18, n: 29, i: 42, a: 59, e: 77 },
  { bw: 60, b: 21, n: 32, i: 47, a: 64, e: 84 },
  { bw: 65, b: 24, n: 36, i: 52, a: 70, e: 90 },
  { bw: 70, b: 27, n: 40, i: 56, a: 75, e: 95 },
  { bw: 75, b: 30, n: 43, i: 60, a: 80, e: 101 },
  { bw: 80, b: 33, n: 47, i: 64, a: 84, e: 106 },
  { bw: 85, b: 36, n: 50, i: 68, a: 89, e: 111 },
  { bw: 90, b: 39, n: 54, i: 72, a: 93, e: 116 },
  { bw: 95, b: 41, n: 57, i: 76, a: 97, e: 121 },
  { bw: 100, b: 44, n: 60, i: 79, a: 102, e: 125 },
  { bw: 105, b: 47, n: 63, i: 83, a: 106, e: 130 },
  { bw: 110, b: 49, n: 66, i: 86, a: 109, e: 134 },
  { bw: 115, b: 52, n: 69, i: 90, a: 113, e: 138 },
  { bw: 120, b: 54, n: 72, i: 93, a: 117, e: 142 },
  { bw: 125, b: 57, n: 75, i: 96, a: 120, e: 146 },
  { bw: 130, b: 59, n: 77, i: 99, a: 124, e: 150 },
  { bw: 135, b: 61, n: 80, i: 102, a: 127, e: 154 },
  { bw: 140, b: 64, n: 83, i: 105, a: 131, e: 157 },
] as const
const STD_SHOULDER_PRESS_FEMALE = [
  { bw: 40, b: 7, n: 14, i: 23, a: 35, e: 48 },
  { bw: 45, b: 8, n: 16, i: 25, a: 38, e: 52 },
  { bw: 50, b: 10, n: 17, i: 28, a: 40, e: 55 },
  { bw: 55, b: 11, n: 19, i: 30, a: 43, e: 58 },
  { bw: 60, b: 12, n: 21, i: 32, a: 45, e: 60 },
  { bw: 65, b: 13, n: 22, i: 34, a: 48, e: 63 },
  { bw: 70, b: 15, n: 24, i: 35, a: 50, e: 65 },
  { bw: 75, b: 16, n: 25, i: 37, a: 52, e: 68 },
  { bw: 80, b: 17, n: 26, i: 39, a: 54, e: 70 },
  { bw: 85, b: 18, n: 28, i: 40, a: 55, e: 72 },
  { bw: 90, b: 19, n: 29, i: 42, a: 57, e: 74 },
  { bw: 95, b: 20, n: 30, i: 43, a: 59, e: 76 },
  { bw: 100, b: 21, n: 31, i: 45, a: 61, e: 78 },
  { bw: 105, b: 22, n: 32, i: 46, a: 62, e: 80 },
  { bw: 110, b: 23, n: 34, i: 47, a: 64, e: 81 },
  { bw: 115, b: 23, n: 35, i: 49, a: 65, e: 83 },
  { bw: 120, b: 24, n: 36, i: 50, a: 66, e: 85 },
] as const

const STD_PUSH_PRESS_MALE = [
  { bw: 50, b: 18, n: 31, i: 49, a: 70, e: 94 },
  { bw: 55, b: 22, n: 36, i: 55, a: 77, e: 102 },
  { bw: 60, b: 26, n: 41, i: 60, a: 84, e: 110 },
  { bw: 65, b: 29, n: 45, i: 66, a: 90, e: 117 },
  { bw: 70, b: 33, n: 50, i: 71, a: 96, e: 124 },
  { bw: 75, b: 36, n: 54, i: 76, a: 102, e: 130 },
  { bw: 80, b: 39, n: 58, i: 81, a: 108, e: 137 },
  { bw: 85, b: 43, n: 62, i: 85, a: 113, e: 143 },
  { bw: 90, b: 46, n: 66, i: 90, a: 118, e: 149 },
  { bw: 95, b: 49, n: 69, i: 94, a: 123, e: 154 },
  { bw: 100, b: 52, n: 73, i: 99, a: 128, e: 160 },
  { bw: 105, b: 55, n: 77, i: 103, a: 133, e: 165 },
  { bw: 110, b: 58, n: 80, i: 107, a: 137, e: 170 },
  { bw: 115, b: 61, n: 84, i: 111, a: 142, e: 175 },
  { bw: 120, b: 64, n: 87, i: 115, a: 146, e: 180 },
  { bw: 125, b: 67, n: 90, i: 118, a: 150, e: 185 },
  { bw: 130, b: 70, n: 93, i: 122, a: 155, e: 189 },
  { bw: 135, b: 72, n: 97, i: 126, a: 159, e: 194 },
  { bw: 140, b: 75, n: 100, i: 129, a: 163, e: 198 },
] as const
const STD_PUSH_PRESS_FEMALE = [
  { bw: 40, b: 16, n: 25, i: 36, a: 50, e: 65 },
  { bw: 45, b: 17, n: 26, i: 38, a: 52, e: 68 },
  { bw: 50, b: 19, n: 28, i: 40, a: 55, e: 71 },
  { bw: 55, b: 20, n: 30, i: 42, a: 57, e: 73 },
  { bw: 60, b: 21, n: 31, i: 44, a: 59, e: 76 },
  { bw: 65, b: 23, n: 33, i: 46, a: 61, e: 78 },
  { bw: 70, b: 24, n: 34, i: 48, a: 63, e: 80 },
  { bw: 75, b: 25, n: 36, i: 49, a: 65, e: 82 },
  { bw: 80, b: 26, n: 37, i: 51, a: 67, e: 84 },
  { bw: 85, b: 27, n: 38, i: 52, a: 68, e: 86 },
  { bw: 90, b: 28, n: 39, i: 53, a: 70, e: 87 },
  { bw: 95, b: 29, n: 40, i: 55, a: 71, e: 89 },
  { bw: 100, b: 30, n: 41, i: 56, a: 73, e: 91 },
  { bw: 105, b: 30, n: 42, i: 57, a: 74, e: 92 },
  { bw: 110, b: 31, n: 43, i: 58, a: 75, e: 94 },
  { bw: 115, b: 32, n: 44, i: 59, a: 77, e: 95 },
  { bw: 120, b: 33, n: 45, i: 61, a: 78, e: 96 },
] as const

const STD_PUSH_JERK_MALE = [
  { bw: 50, b: 22, n: 36, i: 54, a: 76, e: 100 },
  { bw: 55, b: 26, n: 41, i: 61, a: 83, e: 109 },
  { bw: 60, b: 30, n: 46, i: 67, a: 90, e: 117 },
  { bw: 65, b: 34, n: 51, i: 72, a: 97, e: 124 },
  { bw: 70, b: 38, n: 56, i: 78, a: 104, e: 132 },
  { bw: 75, b: 42, n: 60, i: 83, a: 110, e: 139 },
  { bw: 80, b: 46, n: 65, i: 89, a: 116, e: 145 },
  { bw: 85, b: 49, n: 69, i: 94, a: 122, e: 152 },
  { bw: 90, b: 53, n: 73, i: 98, a: 127, e: 158 },
  { bw: 95, b: 56, n: 77, i: 103, a: 132, e: 164 },
  { bw: 100, b: 60, n: 81, i: 108, a: 138, e: 169 },
  { bw: 105, b: 63, n: 85, i: 112, a: 143, e: 175 },
  { bw: 110, b: 66, n: 89, i: 116, a: 147, e: 180 },
  { bw: 115, b: 70, n: 93, i: 121, a: 152, e: 186 },
  { bw: 120, b: 73, n: 96, i: 125, a: 157, e: 191 },
  { bw: 125, b: 76, n: 100, i: 129, a: 161, e: 196 },
  { bw: 130, b: 79, n: 103, i: 133, a: 166, e: 200 },
  { bw: 135, b: 82, n: 107, i: 136, a: 170, e: 205 },
  { bw: 140, b: 85, n: 110, i: 140, a: 174, e: 210 },
] as const
const STD_PUSH_JERK_FEMALE = [
  { bw: 40, b: 20, n: 28, i: 39, a: 52, e: 66 },
  { bw: 45, b: 22, n: 31, i: 42, a: 55, e: 70 },
  { bw: 50, b: 24, n: 33, i: 45, a: 59, e: 73 },
  { bw: 55, b: 26, n: 36, i: 48, a: 61, e: 76 },
  { bw: 60, b: 27, n: 38, i: 50, a: 64, e: 79 },
  { bw: 65, b: 29, n: 40, i: 52, a: 67, e: 82 },
  { bw: 70, b: 31, n: 41, i: 54, a: 69, e: 85 },
  { bw: 75, b: 32, n: 43, i: 56, a: 71, e: 87 },
  { bw: 80, b: 34, n: 45, i: 58, a: 74, e: 90 },
  { bw: 85, b: 35, n: 46, i: 60, a: 76, e: 92 },
  { bw: 90, b: 36, n: 48, i: 62, a: 78, e: 94 },
  { bw: 95, b: 38, n: 49, i: 64, a: 79, e: 96 },
  { bw: 100, b: 39, n: 51, i: 65, a: 81, e: 98 },
  { bw: 105, b: 40, n: 52, i: 67, a: 83, e: 100 },
  { bw: 110, b: 41, n: 54, i: 68, a: 85, e: 102 },
  { bw: 115, b: 42, n: 55, i: 70, a: 86, e: 104 },
  { bw: 120, b: 43, n: 56, i: 71, a: 88, e: 105 },
] as const

const STD_SPLIT_JERK_MALE = [
  { bw: 50, b: 28, n: 42, i: 59, a: 80, e: 102 },
  { bw: 55, b: 32, n: 47, i: 65, a: 87, e: 110 },
  { bw: 60, b: 37, n: 52, i: 71, a: 94, e: 118 },
  { bw: 65, b: 41, n: 57, i: 77, a: 100, e: 125 },
  { bw: 70, b: 45, n: 62, i: 82, a: 106, e: 132 },
  { bw: 75, b: 49, n: 66, i: 88, a: 112, e: 138 },
  { bw: 80, b: 52, n: 71, i: 93, a: 118, e: 145 },
  { bw: 85, b: 56, n: 75, i: 98, a: 123, e: 151 },
  { bw: 90, b: 60, n: 79, i: 102, a: 129, e: 156 },
  { bw: 95, b: 63, n: 83, i: 107, a: 134, e: 162 },
  { bw: 100, b: 66, n: 87, i: 111, a: 139, e: 167 },
  { bw: 105, b: 70, n: 91, i: 115, a: 143, e: 173 },
  { bw: 110, b: 73, n: 94, i: 120, a: 148, e: 178 },
  { bw: 115, b: 76, n: 98, i: 124, a: 152, e: 183 },
  { bw: 120, b: 79, n: 101, i: 128, a: 157, e: 187 },
  { bw: 125, b: 82, n: 105, i: 131, a: 161, e: 192 },
  { bw: 130, b: 85, n: 108, i: 135, a: 165, e: 196 },
  { bw: 135, b: 88, n: 111, i: 139, a: 169, e: 201 },
  { bw: 140, b: 91, n: 115, i: 142, a: 173, e: 205 },
] as const
const STD_SPLIT_JERK_FEMALE = [
  { bw: 40, b: 23, n: 32, i: 44, a: 58, e: 73 },
  { bw: 45, b: 25, n: 35, i: 47, a: 61, e: 77 },
  { bw: 50, b: 27, n: 37, i: 50, a: 65, e: 80 },
  { bw: 55, b: 29, n: 40, i: 53, a: 67, e: 83 },
  { bw: 60, b: 31, n: 42, i: 55, a: 70, e: 86 },
  { bw: 65, b: 32, n: 44, i: 57, a: 73, e: 89 },
  { bw: 70, b: 34, n: 46, i: 59, a: 75, e: 92 },
  { bw: 75, b: 36, n: 47, i: 61, a: 77, e: 94 },
  { bw: 80, b: 37, n: 49, i: 63, a: 80, e: 97 },
  { bw: 85, b: 38, n: 51, i: 65, a: 82, e: 99 },
  { bw: 90, b: 40, n: 52, i: 67, a: 84, e: 101 },
  { bw: 95, b: 41, n: 54, i: 69, a: 86, e: 103 },
  { bw: 100, b: 42, n: 55, i: 70, a: 87, e: 105 },
  { bw: 105, b: 44, n: 57, i: 72, a: 89, e: 107 },
  { bw: 110, b: 45, n: 58, i: 73, a: 91, e: 109 },
  { bw: 115, b: 46, n: 59, i: 75, a: 92, e: 111 },
  { bw: 120, b: 47, n: 60, i: 76, a: 94, e: 113 },
] as const

const STD_CLEAN_MALE = [
  { bw: 50, b: 31, n: 45, i: 62, a: 82, e: 103 },
  { bw: 55, b: 35, n: 50, i: 68, a: 89, e: 111 },
  { bw: 60, b: 39, n: 55, i: 74, a: 95, e: 118 },
  { bw: 65, b: 44, n: 60, i: 79, a: 101, e: 125 },
  { bw: 70, b: 47, n: 64, i: 84, a: 107, e: 132 },
  { bw: 75, b: 51, n: 69, i: 89, a: 113, e: 138 },
  { bw: 80, b: 55, n: 73, i: 94, a: 119, e: 144 },
  { bw: 85, b: 59, n: 77, i: 99, a: 124, e: 150 },
  { bw: 90, b: 62, n: 81, i: 104, a: 129, e: 156 },
  { bw: 95, b: 66, n: 85, i: 108, a: 134, e: 161 },
  { bw: 100, b: 69, n: 89, i: 112, a: 138, e: 166 },
  { bw: 105, b: 72, n: 92, i: 116, a: 143, e: 171 },
  { bw: 110, b: 75, n: 96, i: 120, a: 147, e: 176 },
  { bw: 115, b: 78, n: 99, i: 124, a: 152, e: 181 },
  { bw: 120, b: 81, n: 103, i: 128, a: 156, e: 185 },
  { bw: 125, b: 84, n: 106, i: 132, a: 160, e: 190 },
  { bw: 130, b: 87, n: 109, i: 135, a: 164, e: 194 },
  { bw: 135, b: 90, n: 112, i: 139, a: 168, e: 198 },
  { bw: 140, b: 93, n: 115, i: 142, a: 171, e: 202 },
] as const
const STD_CLEAN_FEMALE = [
  { bw: 40, b: 23, n: 32, i: 44, a: 57, e: 72 },
  { bw: 45, b: 25, n: 35, i: 47, a: 61, e: 76 },
  { bw: 50, b: 27, n: 37, i: 50, a: 64, e: 79 },
  { bw: 55, b: 29, n: 39, i: 52, a: 67, e: 82 },
  { bw: 60, b: 31, n: 41, i: 54, a: 69, e: 85 },
  { bw: 65, b: 32, n: 43, i: 57, a: 72, e: 88 },
  { bw: 70, b: 34, n: 45, i: 59, a: 74, e: 90 },
  { bw: 75, b: 35, n: 47, i: 61, a: 76, e: 93 },
  { bw: 80, b: 37, n: 48, i: 62, a: 78, e: 95 },
  { bw: 85, b: 38, n: 50, i: 64, a: 80, e: 97 },
  { bw: 90, b: 39, n: 51, i: 66, a: 82, e: 99 },
  { bw: 95, b: 41, n: 53, i: 68, a: 84, e: 101 },
  { bw: 100, b: 42, n: 54, i: 69, a: 86, e: 103 },
  { bw: 105, b: 43, n: 56, i: 71, a: 87, e: 105 },
  { bw: 110, b: 44, n: 57, i: 72, a: 89, e: 107 },
  { bw: 115, b: 45, n: 58, i: 73, a: 91, e: 109 },
  { bw: 120, b: 46, n: 59, i: 75, a: 92, e: 110 },
] as const

const STD_POWER_CLEAN_MALE = [
  { bw: 50, b: 28, n: 42, i: 60, a: 81, e: 104 },
  { bw: 55, b: 32, n: 47, i: 66, a: 88, e: 112 },
  { bw: 60, b: 36, n: 52, i: 71, a: 94, e: 119 },
  { bw: 65, b: 40, n: 56, i: 77, a: 101, e: 126 },
  { bw: 70, b: 43, n: 61, i: 82, a: 107, e: 133 },
  { bw: 75, b: 47, n: 65, i: 87, a: 112, e: 139 },
  { bw: 80, b: 50, n: 69, i: 92, a: 118, e: 145 },
  { bw: 85, b: 54, n: 73, i: 96, a: 123, e: 151 },
  { bw: 90, b: 57, n: 77, i: 101, a: 128, e: 157 },
  { bw: 95, b: 60, n: 81, i: 105, a: 133, e: 162 },
  { bw: 100, b: 64, n: 84, i: 109, a: 137, e: 167 },
  { bw: 105, b: 67, n: 88, i: 113, a: 142, e: 172 },
  { bw: 110, b: 70, n: 91, i: 117, a: 146, e: 177 },
  { bw: 115, b: 73, n: 95, i: 121, a: 151, e: 182 },
  { bw: 120, b: 76, n: 98, i: 125, a: 155, e: 186 },
  { bw: 125, b: 78, n: 101, i: 128, a: 159, e: 191 },
  { bw: 130, b: 81, n: 104, i: 132, a: 163, e: 195 },
  { bw: 135, b: 84, n: 107, i: 135, a: 166, e: 199 },
  { bw: 140, b: 86, n: 110, i: 139, a: 170, e: 203 },
] as const
const STD_POWER_CLEAN_FEMALE = [
  { bw: 40, b: 19, n: 28, i: 40, a: 54, e: 70 },
  { bw: 45, b: 21, n: 31, i: 43, a: 58, e: 74 },
  { bw: 50, b: 23, n: 33, i: 46, a: 61, e: 78 },
  { bw: 55, b: 25, n: 35, i: 49, a: 64, e: 81 },
  { bw: 60, b: 26, n: 38, i: 51, a: 67, e: 85 },
  { bw: 65, b: 28, n: 40, i: 54, a: 70, e: 88 },
  { bw: 70, b: 30, n: 42, i: 56, a: 73, e: 91 },
  { bw: 75, b: 31, n: 43, i: 58, a: 75, e: 93 },
  { bw: 80, b: 33, n: 45, i: 60, a: 77, e: 96 },
  { bw: 85, b: 34, n: 47, i: 62, a: 80, e: 98 },
  { bw: 90, b: 36, n: 49, i: 64, a: 82, e: 101 },
  { bw: 95, b: 37, n: 50, i: 66, a: 84, e: 103 },
  { bw: 100, b: 38, n: 52, i: 68, a: 86, e: 105 },
  { bw: 105, b: 40, n: 53, i: 69, a: 88, e: 107 },
  { bw: 110, b: 41, n: 55, i: 71, a: 89, e: 109 },
  { bw: 115, b: 42, n: 56, i: 72, a: 91, e: 111 },
  { bw: 120, b: 43, n: 57, i: 74, a: 93, e: 113 },
] as const

const STD_SNATCH_MALE = [
  { bw: 50, b: 20, n: 33, i: 50, a: 71, e: 94 },
  { bw: 55, b: 23, n: 37, i: 55, a: 77, e: 101 },
  { bw: 60, b: 26, n: 40, i: 59, a: 82, e: 107 },
  { bw: 65, b: 29, n: 44, i: 64, a: 87, e: 113 },
  { bw: 70, b: 31, n: 47, i: 68, a: 92, e: 118 },
  { bw: 75, b: 34, n: 51, i: 72, a: 97, e: 124 },
  { bw: 80, b: 37, n: 54, i: 76, a: 101, e: 129 },
  { bw: 85, b: 39, n: 57, i: 79, a: 105, e: 133 },
  { bw: 90, b: 42, n: 60, i: 83, a: 109, e: 138 },
  { bw: 95, b: 44, n: 63, i: 86, a: 113, e: 142 },
  { bw: 100, b: 47, n: 66, i: 90, a: 117, e: 147 },
  { bw: 105, b: 49, n: 69, i: 93, a: 121, e: 151 },
  { bw: 110, b: 51, n: 71, i: 96, a: 124, e: 155 },
  { bw: 115, b: 53, n: 74, i: 99, a: 128, e: 158 },
  { bw: 120, b: 56, n: 76, i: 102, a: 131, e: 162 },
  { bw: 125, b: 58, n: 79, i: 105, a: 134, e: 166 },
  { bw: 130, b: 60, n: 81, i: 108, a: 137, e: 169 },
  { bw: 135, b: 62, n: 84, i: 110, a: 140, e: 173 },
  { bw: 140, b: 64, n: 86, i: 113, a: 143, e: 176 },
] as const
const STD_SNATCH_FEMALE = [
  { bw: 40, b: 14, n: 23, i: 34, a: 47, e: 61 },
  { bw: 45, b: 16, n: 24, i: 36, a: 49, e: 64 },
  { bw: 50, b: 17, n: 26, i: 38, a: 52, e: 67 },
  { bw: 55, b: 18, n: 28, i: 40, a: 54, e: 69 },
  { bw: 60, b: 19, n: 29, i: 41, a: 56, e: 72 },
  { bw: 65, b: 21, n: 31, i: 43, a: 58, e: 74 },
  { bw: 70, b: 22, n: 32, i: 45, a: 60, e: 76 },
  { bw: 75, b: 23, n: 33, i: 46, a: 61, e: 78 },
  { bw: 80, b: 24, n: 34, i: 47, a: 63, e: 80 },
  { bw: 85, b: 25, n: 35, i: 49, a: 64, e: 81 },
  { bw: 90, b: 25, n: 36, i: 50, a: 66, e: 83 },
  { bw: 95, b: 26, n: 37, i: 51, a: 67, e: 84 },
  { bw: 100, b: 27, n: 38, i: 52, a: 69, e: 86 },
  { bw: 105, b: 28, n: 39, i: 54, a: 70, e: 87 },
  { bw: 110, b: 29, n: 40, i: 55, a: 71, e: 89 },
  { bw: 115, b: 29, n: 41, i: 56, a: 72, e: 90 },
  { bw: 120, b: 30, n: 42, i: 57, a: 73, e: 91 },
] as const

const STD_POWER_SNATCH_MALE = [
  { bw: 50, b: 17, n: 29, i: 45, a: 65, e: 87 },
  { bw: 55, b: 20, n: 33, i: 50, a: 71, e: 94 },
  { bw: 60, b: 23, n: 37, i: 55, a: 77, e: 100 },
  { bw: 65, b: 26, n: 41, i: 59, a: 82, e: 106 },
  { bw: 70, b: 29, n: 44, i: 64, a: 87, e: 112 },
  { bw: 75, b: 32, n: 48, i: 68, a: 92, e: 118 },
  { bw: 80, b: 35, n: 51, i: 72, a: 96, e: 123 },
  { bw: 85, b: 37, n: 54, i: 76, a: 101, e: 128 },
  { bw: 90, b: 40, n: 57, i: 79, a: 105, e: 133 },
  { bw: 95, b: 42, n: 61, i: 83, a: 109, e: 137 },
  { bw: 100, b: 45, n: 64, i: 87, a: 113, e: 142 },
  { bw: 105, b: 47, n: 66, i: 90, a: 117, e: 146 },
  { bw: 110, b: 50, n: 69, i: 93, a: 121, e: 150 },
  { bw: 115, b: 52, n: 72, i: 96, a: 124, e: 154 },
  { bw: 120, b: 54, n: 75, i: 100, a: 128, e: 158 },
  { bw: 125, b: 57, n: 77, i: 103, a: 131, e: 162 },
  { bw: 130, b: 59, n: 80, i: 106, a: 135, e: 166 },
  { bw: 135, b: 61, n: 82, i: 108, a: 138, e: 169 },
  { bw: 140, b: 63, n: 85, i: 111, a: 141, e: 173 },
] as const
const STD_POWER_SNATCH_FEMALE = [
  { bw: 40, b: 14, n: 22, i: 32, a: 45, e: 59 },
  { bw: 45, b: 15, n: 24, i: 34, a: 47, e: 61 },
  { bw: 50, b: 17, n: 25, i: 36, a: 49, e: 64 },
  { bw: 55, b: 18, n: 27, i: 38, a: 52, e: 66 },
  { bw: 60, b: 19, n: 28, i: 40, a: 53, e: 68 },
  { bw: 65, b: 20, n: 29, i: 41, a: 55, e: 70 },
  { bw: 70, b: 21, n: 31, i: 43, a: 57, e: 72 },
  { bw: 75, b: 22, n: 32, i: 44, a: 58, e: 74 },
  { bw: 80, b: 23, n: 33, i: 45, a: 60, e: 76 },
  { bw: 85, b: 24, n: 34, i: 47, a: 61, e: 77 },
  { bw: 90, b: 25, n: 35, i: 48, a: 63, e: 79 },
  { bw: 95, b: 25, n: 36, i: 49, a: 64, e: 80 },
  { bw: 100, b: 26, n: 37, i: 50, a: 65, e: 82 },
  { bw: 105, b: 27, n: 38, i: 51, a: 67, e: 83 },
  { bw: 110, b: 28, n: 39, i: 52, a: 68, e: 84 },
  { bw: 115, b: 28, n: 40, i: 53, a: 69, e: 86 },
  { bw: 120, b: 29, n: 40, i: 54, a: 70, e: 87 },
] as const

const STD_CLEAN_AND_JERK_MALE = [
  { bw: 50, b: 25, n: 41, i: 60, a: 84, e: 110 },
  { bw: 55, b: 29, n: 45, i: 66, a: 91, e: 118 },
  { bw: 60, b: 33, n: 50, i: 72, a: 98, e: 126 },
  { bw: 65, b: 37, n: 55, i: 77, a: 104, e: 133 },
  { bw: 70, b: 40, n: 59, i: 83, a: 110, e: 140 },
  { bw: 75, b: 44, n: 63, i: 88, a: 116, e: 146 },
  { bw: 80, b: 47, n: 67, i: 92, a: 121, e: 152 },
  { bw: 85, b: 51, n: 71, i: 97, a: 126, e: 158 },
  { bw: 90, b: 54, n: 75, i: 101, a: 132, e: 164 },
  { bw: 95, b: 57, n: 79, i: 106, a: 136, e: 169 },
  { bw: 100, b: 60, n: 83, i: 110, a: 141, e: 175 },
  { bw: 105, b: 63, n: 86, i: 114, a: 146, e: 180 },
  { bw: 110, b: 66, n: 90, i: 118, a: 150, e: 185 },
  { bw: 115, b: 69, n: 93, i: 122, a: 155, e: 190 },
  { bw: 120, b: 72, n: 96, i: 126, a: 159, e: 194 },
  { bw: 125, b: 75, n: 99, i: 129, a: 163, e: 199 },
  { bw: 130, b: 77, n: 102, i: 133, a: 167, e: 203 },
  { bw: 135, b: 80, n: 105, i: 136, a: 171, e: 207 },
  { bw: 140, b: 82, n: 108, i: 139, a: 174, e: 211 },
] as const
const STD_CLEAN_AND_JERK_FEMALE = [
  { bw: 40, b: 20, n: 31, i: 44, a: 59, e: 75 },
  { bw: 45, b: 22, n: 33, i: 46, a: 62, e: 79 },
  { bw: 50, b: 24, n: 35, i: 49, a: 65, e: 82 },
  { bw: 55, b: 25, n: 37, i: 51, a: 67, e: 85 },
  { bw: 60, b: 27, n: 39, i: 53, a: 69, e: 87 },
  { bw: 65, b: 28, n: 40, i: 55, a: 72, e: 90 },
  { bw: 70, b: 30, n: 42, i: 57, a: 74, e: 92 },
  { bw: 75, b: 31, n: 43, i: 58, a: 76, e: 94 },
  { bw: 80, b: 32, n: 45, i: 60, a: 78, e: 96 },
  { bw: 85, b: 33, n: 46, i: 61, a: 79, e: 98 },
  { bw: 90, b: 34, n: 47, i: 63, a: 81, e: 100 },
  { bw: 95, b: 35, n: 48, i: 64, a: 83, e: 102 },
  { bw: 100, b: 36, n: 50, i: 66, a: 84, e: 104 },
  { bw: 105, b: 37, n: 51, i: 67, a: 86, e: 105 },
  { bw: 110, b: 38, n: 52, i: 68, a: 87, e: 107 },
  { bw: 115, b: 39, n: 53, i: 70, a: 88, e: 108 },
  { bw: 120, b: 40, n: 54, i: 71, a: 90, e: 110 },
] as const

const STD_THRUSTER_MALE = [
  { bw: 50, b: 15, n: 30, i: 50, a: 75, e: 104 },
  { bw: 55, b: 18, n: 33, i: 55, a: 81, e: 111 },
  { bw: 60, b: 21, n: 37, i: 59, a: 87, e: 118 },
  { bw: 65, b: 23, n: 41, i: 64, a: 92, e: 124 },
  { bw: 70, b: 26, n: 44, i: 68, a: 98, e: 130 },
  { bw: 75, b: 29, n: 47, i: 72, a: 103, e: 136 },
  { bw: 80, b: 31, n: 51, i: 76, a: 107, e: 142 },
  { bw: 85, b: 34, n: 54, i: 80, a: 112, e: 147 },
  { bw: 90, b: 36, n: 57, i: 84, a: 116, e: 152 },
  { bw: 95, b: 38, n: 60, i: 88, a: 120, e: 157 },
  { bw: 100, b: 41, n: 63, i: 91, a: 125, e: 161 },
  { bw: 105, b: 43, n: 66, i: 94, a: 128, e: 166 },
  { bw: 110, b: 45, n: 68, i: 98, a: 132, e: 170 },
  { bw: 115, b: 47, n: 71, i: 101, a: 136, e: 174 },
  { bw: 120, b: 50, n: 74, i: 104, a: 140, e: 178 },
  { bw: 125, b: 52, n: 76, i: 107, a: 143, e: 182 },
  { bw: 130, b: 54, n: 79, i: 110, a: 146, e: 186 },
  { bw: 135, b: 56, n: 81, i: 113, a: 150, e: 190 },
  { bw: 140, b: 58, n: 83, i: 116, a: 153, e: 194 },
] as const
const STD_THRUSTER_FEMALE = [
  { bw: 40, b: 15, n: 24, i: 37, a: 52, e: 69 },
  { bw: 45, b: 16, n: 26, i: 39, a: 54, e: 71 },
  { bw: 50, b: 17, n: 27, i: 40, a: 56, e: 74 },
  { bw: 55, b: 18, n: 29, i: 42, a: 58, e: 76 },
  { bw: 60, b: 19, n: 30, i: 44, a: 60, e: 78 },
  { bw: 65, b: 20, n: 31, i: 45, a: 62, e: 80 },
  { bw: 70, b: 21, n: 32, i: 47, a: 64, e: 82 },
  { bw: 75, b: 22, n: 34, i: 48, a: 65, e: 84 },
  { bw: 80, b: 23, n: 35, i: 49, a: 67, e: 86 },
  { bw: 85, b: 24, n: 36, i: 51, a: 68, e: 87 },
  { bw: 90, b: 25, n: 37, i: 52, a: 69, e: 89 },
  { bw: 95, b: 25, n: 38, i: 53, a: 71, e: 90 },
  { bw: 100, b: 26, n: 38, i: 54, a: 72, e: 92 },
  { bw: 105, b: 27, n: 39, i: 55, a: 73, e: 93 },
  { bw: 110, b: 27, n: 40, i: 56, a: 74, e: 94 },
  { bw: 115, b: 28, n: 41, i: 57, a: 75, e: 95 },
  { bw: 120, b: 29, n: 42, i: 58, a: 76, e: 97 },
] as const

const STD_DUMBBELL_SNATCH_MALE = [
  { bw: 50, b: 4, n: 10, i: 19, a: 31, e: 45 },
  { bw: 55, b: 5, n: 12, i: 21, a: 34, e: 49 },
  { bw: 60, b: 6, n: 13, i: 24, a: 37, e: 53 },
  { bw: 65, b: 8, n: 15, i: 27, a: 41, e: 57 },
  { bw: 70, b: 9, n: 17, i: 29, a: 44, e: 60 },
  { bw: 75, b: 10, n: 19, i: 31, a: 47, e: 64 },
  { bw: 80, b: 12, n: 21, i: 34, a: 49, e: 67 },
  { bw: 85, b: 13, n: 23, i: 36, a: 52, e: 70 },
  { bw: 90, b: 14, n: 25, i: 38, a: 55, e: 74 },
  { bw: 95, b: 16, n: 26, i: 40, a: 57, e: 76 },
  { bw: 100, b: 17, n: 28, i: 42, a: 60, e: 79 },
  { bw: 105, b: 18, n: 30, i: 44, a: 62, e: 82 },
  { bw: 110, b: 20, n: 31, i: 46, a: 65, e: 85 },
  { bw: 115, b: 21, n: 33, i: 48, a: 67, e: 87 },
  { bw: 120, b: 22, n: 34, i: 50, a: 69, e: 90 },
  { bw: 125, b: 23, n: 36, i: 52, a: 71, e: 92 },
  { bw: 130, b: 25, n: 37, i: 54, a: 73, e: 95 },
  { bw: 135, b: 26, n: 39, i: 56, a: 76, e: 97 },
  { bw: 140, b: 27, n: 40, i: 57, a: 78, e: 99 },
] as const
const STD_DUMBBELL_SNATCH_FEMALE = [
  { bw: 40, b: 4, n: 10, i: 17, a: 27, e: 38 },
  { bw: 45, b: 5, n: 10, i: 18, a: 28, e: 39 },
  { bw: 50, b: 5, n: 10, i: 18, a: 28, e: 40 },
  { bw: 55, b: 5, n: 11, i: 19, a: 29, e: 41 },
  { bw: 60, b: 5, n: 11, i: 19, a: 29, e: 41 },
  { bw: 65, b: 6, n: 11, i: 20, a: 30, e: 42 },
  { bw: 70, b: 6, n: 12, i: 20, a: 30, e: 42 },
  { bw: 75, b: 6, n: 12, i: 20, a: 31, e: 43 },
  { bw: 80, b: 6, n: 12, i: 21, a: 31, e: 43 },
  { bw: 85, b: 6, n: 13, i: 21, a: 32, e: 44 },
  { bw: 90, b: 7, n: 13, i: 21, a: 32, e: 44 },
  { bw: 95, b: 7, n: 13, i: 22, a: 32, e: 45 },
  { bw: 100, b: 7, n: 13, i: 22, a: 33, e: 45 },
  { bw: 105, b: 7, n: 13, i: 22, a: 33, e: 46 },
  { bw: 110, b: 7, n: 14, i: 22, a: 33, e: 46 },
  { bw: 115, b: 7, n: 14, i: 23, a: 34, e: 46 },
  { bw: 120, b: 8, n: 14, i: 23, a: 34, e: 47 },
] as const

// ── Movement map ─────────────────────────────────────────────────────────────

export interface MovementEntry { base: string; factor: number; confidence: string }

export const MOVEMENT_MAP: Record<string, MovementEntry> = {
  'squat': { base: 'back_squat', factor: 1.0, confidence: 'direct_or_alias' },
  'back squat': { base: 'back_squat', factor: 1.0, confidence: 'direct' },
  'front squat': { base: 'front_squat', factor: 1.0, confidence: 'direct' },
  'overhead squat': { base: 'overhead_squat', factor: 1.0, confidence: 'direct' },
  'dumbbell front squat': { base: 'front_squat', factor: 0.55, confidence: 'derived_low' },
  'dumbbell box step up': { base: 'front_squat', factor: 0.35, confidence: 'derived_low' },
  'dumbbell overhead lunge': { base: 'overhead_squat', factor: 0.4, confidence: 'derived_low' },
  'deadlift': { base: 'deadlift', factor: 1.0, confidence: 'direct' },
  'sumo deadlift': { base: 'deadlift', factor: 1.0, confidence: 'direct_or_alias' },
  'snatch grip deadlift': { base: 'snatch_deadlift', factor: 1.0, confidence: 'direct' },
  'sumo deadlift high pull': { base: 'deadlift', factor: 0.45, confidence: 'derived_low' },
  'bench press': { base: 'bench_press', factor: 1.0, confidence: 'direct' },
  'strict press': { base: 'shoulder_press', factor: 1.0, confidence: 'direct' },
  'shoulder press': { base: 'shoulder_press', factor: 1.0, confidence: 'direct' },
  'shoulder press strict': { base: 'shoulder_press', factor: 1.0, confidence: 'direct' },
  'push press': { base: 'push_press', factor: 1.0, confidence: 'direct' },
  'push jerk': { base: 'push_jerk', factor: 1.0, confidence: 'direct' },
  'split jerk': { base: 'split_jerk', factor: 1.0, confidence: 'direct' },
  'split jerk behind the neck': { base: 'split_jerk', factor: 1.03, confidence: 'derived_medium' },
  'shoulder to overhead': { base: 'push_jerk', factor: 1.0, confidence: 'proxy_medium' },
  'ground to overhead': { base: 'clean_and_jerk', factor: 1.0, confidence: 'proxy_medium' },
  'clean': { base: 'clean', factor: 1.0, confidence: 'direct' },
  'squat clean': { base: 'clean', factor: 1.0, confidence: 'direct_or_alias' },
  'hang squat clean': { base: 'clean', factor: 0.95, confidence: 'derived_medium' },
  'hang clean': { base: 'clean', factor: 0.95, confidence: 'derived_medium' },
  'power clean': { base: 'power_clean', factor: 1.0, confidence: 'direct' },
  'hang power clean': { base: 'power_clean', factor: 0.95, confidence: 'derived_medium' },
  'dumbbell hang clean and jerk': { base: 'dumbbell_snatch', factor: 0.9, confidence: 'proxy_low' },
  'snatch': { base: 'snatch', factor: 1.0, confidence: 'direct' },
  'squat snatch': { base: 'snatch', factor: 1.0, confidence: 'direct_or_alias' },
  'power snatch': { base: 'power_snatch', factor: 1.0, confidence: 'direct' },
  'hang power snatch': { base: 'power_snatch', factor: 0.95, confidence: 'derived_medium' },
  'hang squat snatch': { base: 'snatch', factor: 0.95, confidence: 'derived_medium' },
  'hanging squat snatch': { base: 'snatch', factor: 0.95, confidence: 'derived_medium' },
  'muscle snatch': { base: 'snatch', factor: 0.65, confidence: 'derived_medium' },
  'split snatch': { base: 'snatch', factor: 0.95, confidence: 'derived_low' },
  'dumbbell power snatch': { base: 'dumbbell_snatch', factor: 1.0, confidence: 'direct_or_alias' },
  'dumbbell snatch': { base: 'dumbbell_snatch', factor: 1.0, confidence: 'direct' },
  'clean and jerk': { base: 'clean_and_jerk', factor: 1.0, confidence: 'direct' },
  'clean & jerk': { base: 'clean_and_jerk', factor: 1.0, confidence: 'direct' },
  'clean n jerk': { base: 'clean_and_jerk', factor: 1.0, confidence: 'direct' },
  'thruster': { base: 'thruster', factor: 1.0, confidence: 'direct' },
  'barbell thruster': { base: 'thruster', factor: 1.0, confidence: 'direct' },
  'bear complex': { base: 'thruster', factor: 0.75, confidence: 'derived_low' },
  'bar complex': { base: 'thruster', factor: 0.75, confidence: 'derived_low' },
  'weightlifting total': { base: 'custom_total', factor: 1.0, confidence: 'computed' },
  'turkish get up': { base: 'dumbbell_snatch', factor: 0.7, confidence: 'derived_low' },
  'touch get up': { base: 'dumbbell_snatch', factor: 0.7, confidence: 'derived_low' },
  'weighted pull up': { base: 'weighted_pull_up', factor: 1.0, confidence: 'custom' },
}

const WEIGHTED_PULLUP_RATIOS = {
  male:   { beginner: 0.05, novice: 0.15, intermediate: 0.35, advanced: 0.6, elite: 0.9 },
  female: { beginner: 0.0, novice: 0.05, intermediate: 0.2, advanced: 0.4, elite: 0.65 },
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const STANDARDS_TABLE: Record<string, { male: readonly any[]; female: readonly any[] }> = {
  bench_press: { male: STD_BENCH_PRESS_MALE, female: STD_BENCH_PRESS_FEMALE },
  back_squat: { male: STD_BACK_SQUAT_MALE, female: STD_BACK_SQUAT_FEMALE },
  front_squat: { male: STD_FRONT_SQUAT_MALE, female: STD_FRONT_SQUAT_FEMALE },
  overhead_squat: { male: STD_OVERHEAD_SQUAT_MALE, female: STD_OVERHEAD_SQUAT_FEMALE },
  deadlift: { male: STD_DEADLIFT_MALE, female: STD_DEADLIFT_FEMALE },
  snatch_deadlift: { male: STD_SNATCH_DEADLIFT_MALE, female: STD_SNATCH_DEADLIFT_FEMALE },
  shoulder_press: { male: STD_SHOULDER_PRESS_MALE, female: STD_SHOULDER_PRESS_FEMALE },
  push_press: { male: STD_PUSH_PRESS_MALE, female: STD_PUSH_PRESS_FEMALE },
  push_jerk: { male: STD_PUSH_JERK_MALE, female: STD_PUSH_JERK_FEMALE },
  split_jerk: { male: STD_SPLIT_JERK_MALE, female: STD_SPLIT_JERK_FEMALE },
  clean: { male: STD_CLEAN_MALE, female: STD_CLEAN_FEMALE },
  power_clean: { male: STD_POWER_CLEAN_MALE, female: STD_POWER_CLEAN_FEMALE },
  snatch: { male: STD_SNATCH_MALE, female: STD_SNATCH_FEMALE },
  power_snatch: { male: STD_POWER_SNATCH_MALE, female: STD_POWER_SNATCH_FEMALE },
  clean_and_jerk: { male: STD_CLEAN_AND_JERK_MALE, female: STD_CLEAN_AND_JERK_FEMALE },
  thruster: { male: STD_THRUSTER_MALE, female: STD_THRUSTER_FEMALE },
  dumbbell_snatch: { male: STD_DUMBBELL_SNATCH_MALE, female: STD_DUMBBELL_SNATCH_FEMALE },
}


// ── Core scoring functions ────────────────────────────────────────────────────

type Row = { bw: number; b: number; n: number; i: number; a: number; e: number }

interface Thresholds {
  beginner: number; novice: number; intermediate: number; advanced: number; elite: number
}

function interpolate(rows: readonly Row[], bwKg: number): Thresholds {
  const sorted = [...rows].sort((a, b) => a.bw - b.bw)
  if (bwKg <= sorted[0].bw) return { beginner: sorted[0].b, novice: sorted[0].n, intermediate: sorted[0].i, advanced: sorted[0].a, elite: sorted[0].e }
  const last = sorted[sorted.length - 1]
  if (bwKg >= last.bw) return { beginner: last.b, novice: last.n, intermediate: last.i, advanced: last.a, elite: last.e }

  let lo = sorted[0], hi = sorted[sorted.length - 1]
  for (let i = 0; i < sorted.length - 1; i++) {
    if (bwKg >= sorted[i].bw && bwKg <= sorted[i + 1].bw) { lo = sorted[i]; hi = sorted[i + 1]; break }
  }
  const r = (bwKg - lo.bw) / (hi.bw - lo.bw)
  return {
    beginner:     lo.b + (hi.b - lo.b) * r,
    novice:       lo.n + (hi.n - lo.n) * r,
    intermediate: lo.i + (hi.i - lo.i) * r,
    advanced:     lo.a + (hi.a - lo.a) * r,
    elite:        lo.e + (hi.e - lo.e) * r,
  }
}

function classifyTier(liftKg: number, t: Thresholds): StrengthTier {
  if (liftKg >= t.elite)        return 'elite'
  if (liftKg >= t.advanced)     return 'advanced'
  if (liftKg >= t.intermediate) return 'intermediate'
  if (liftKg >= t.novice)       return 'novice'
  if (liftKg >= t.beginner)     return 'beginner'
  return 'below_beginner'
}

function calcScore(liftKg: number, t: Thresholds): number {
  if (liftKg <= 0) return 0
  if (liftKg < t.beginner) return Math.max(0, Math.round((liftKg / t.beginner) * 20))

  const bands: [number, number, number][] = [
    [t.beginner, t.novice, 20],
    [t.novice, t.intermediate, 40],
    [t.intermediate, t.advanced, 60],
    [t.advanced, t.elite, 80],
  ]
  for (const [lo, hi, base] of bands) {
    if (liftKg < hi) return Math.round(base + ((liftKg - lo) / (hi - lo)) * 20)
  }
  return Math.min(100, Math.round(95 + ((liftKg - t.elite) / t.elite) * 20))
}

export function normalizeMovement(name: string): string {
  return name
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/\(.*?\)/g, '')  // strip parenthetical qualifiers: (Strict), (Behind the Neck)
    .replace(/-/g, ' ')        // hyphens → spaces: Shoulder-to-overhead, Weighted Pull-up
    .replace(/\s+/g, ' ')
    .trim()
}

function nextTierInfo(tier: StrengthTier, t: Thresholds, _liftKg: number): { next: StrengthTier | null; kg: number | null } {
  const order: StrengthTier[] = ['below_beginner', 'beginner', 'novice', 'intermediate', 'advanced', 'elite']
  const idx = order.indexOf(tier)
  if (idx >= order.length - 1 || tier === 'elite') return { next: null, kg: null }
  const nextTier = order[idx + 1] as StrengthTier
  const thresholdMap: Partial<Record<StrengthTier, number>> = {
    beginner: t.beginner, novice: t.novice, intermediate: t.intermediate, advanced: t.advanced, elite: t.elite,
  }
  const nextKg = thresholdMap[nextTier] ?? null
  return { next: nextTier, kg: nextKg }
}

// ── Public API ────────────────────────────────────────────────────────────────

export function analyzeStrength(
  movementName: string,
  weightKg: number,
  bodyWeightKg: number,
  gender: 'male' | 'female' | 'other',
): StrengthAnalysis | null {
  if (!bodyWeightKg || bodyWeightKg <= 0) return null

  const sex = gender === 'female' ? 'female' : 'male'
  const normalized = normalizeMovement(movementName)
  const entry = MOVEMENT_MAP[normalized]
  if (!entry) return null

  let thresholds: Thresholds

  if (entry.base === 'weighted_pull_up') {
    const ratios = WEIGHTED_PULLUP_RATIOS[sex]
    thresholds = {
      beginner:     ratios.beginner     * bodyWeightKg,
      novice:       ratios.novice       * bodyWeightKg,
      intermediate: ratios.intermediate * bodyWeightKg,
      advanced:     ratios.advanced     * bodyWeightKg,
      elite:        ratios.elite        * bodyWeightKg,
    }
  } else {
    const table = STANDARDS_TABLE[entry.base]
    if (!table) return null
    const rows = table[sex]
    const base = interpolate(rows, bodyWeightKg)
    thresholds = {
      beginner:     base.beginner     * entry.factor,
      novice:       base.novice       * entry.factor,
      intermediate: base.intermediate * entry.factor,
      advanced:     base.advanced     * entry.factor,
      elite:        base.elite        * entry.factor,
    }
  }

  const tier = classifyTier(weightKg, thresholds)
  const score = calcScore(weightKg, thresholds)
  const { next, kg: nextKg } = nextTierInfo(tier, thresholds, weightKg)

  return {
    weightKg,
    bodyWeightRatio: Math.round((weightKg / bodyWeightKg) * 100) / 100,
    level:          tier,
    levelLabel:     TIER_LABELS[tier],
    levelColor:     TIER_COLORS[tier],
    score,
    nextLevel:      next,
    nextLevelKg:    nextKg !== null ? Math.ceil(nextKg * 2) / 2 : null,
    kgToNextLevel:  nextKg !== null ? Math.max(0, Math.ceil((nextKg - weightKg) * 2) / 2) : null,
    confidence:     entry.confidence,
  }
}

// Kept for backward compat — maps old StrengthLevel to StrengthTier
export type StrengthLevel = StrengthTier

export function hasStrengthStandard(movementName: string): boolean {
  return normalizeMovement(movementName) in MOVEMENT_MAP
}

export function getLevelProgress(level: StrengthTier): number {
  const map: Record<StrengthTier, number> = {
    below_beginner: 5, beginner: 18, novice: 36, intermediate: 54, advanced: 72, elite: 90,
  }
  return map[level] ?? 5
}

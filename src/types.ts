export interface Movement {
  id: string
  user_id: string
  name: string
  created_at: string
}

export interface Score {
  id: string
  user_id: string
  movement_id: string
  reps: number
  weight_kg: number
  recorded_at: string
  notes: string | null
  created_at: string
}

export interface ScoreWithPR extends Score {
  is_pr: boolean
}

export interface MovementWithStats extends Movement {
  prs: Record<number, number>       // reps → max weight
  last_recorded_at: string | null   // date of most recent score
}

export interface Profile {
  id: string
  user_id: string
  name: string | null
  username: string | null
  roles: string[]
  date_of_birth: string
  body_weight_kg: number
  height_cm: number
  gender: 'male' | 'female' | 'other'
  experience_level: string | null
  training_frequency: number | null
  main_goals: string[] | null
  body_fat_pct: number | null
  is_active: boolean
  onboarding_completed: boolean
  created_at?: string
  updated_at?: string
}

export interface WorkoutExerciseData {
  id: string
  movement_name: string
  sets: number | null
  reps: number | null
  duration_seconds: number | null
  load_kg: number | null
  load_kg_to: number | null
  load_pct_1rm: number | null
  load_pct_1rm_to: number | null
  rpe: number | null
  rest_seconds: number | null
  notes: string | null
  position: number
}

export interface WorkoutSectionData {
  id: string
  section_type: string
  label: string
  position: number
  notes: string | null
  format_type: string | null
  format_config: Record<string, number | string[] | null> | null
  modality_tags?: string[]
  exercises: WorkoutExerciseData[]
}

export interface WorkoutFeedback {
  id?: string
  workout_id: string
  student_id?: string
  status: 'completed' | 'partially_completed' | 'skipped'
  enjoyment?: 'liked' | 'neutral' | 'disliked' | null
  perceived_difficulty?: 'easy' | 'appropriate' | 'too_hard' | null
  student_comment?: string | null
  completed_at?: string | null
  created_at?: string
  updated_at?: string
}

export interface PrescribedWorkoutData {
  id: string
  workout_date: string
  focus: string[] | null
  notes: string | null
  student_note?: string | null
  trainer_name?: string | null
  source: 'personal' | 'ai'
  created_at: string
  sections: WorkoutSectionData[]
  feedback?: WorkoutFeedback | null
}

export interface AthleteSummary {
  user_id: string
  name: string | null
  username: string | null
  date_of_birth: string | null
  body_weight_kg: number | null
  gender: string | null
  experience_level: string | null
  training_frequency: number | null
  workout_count: number
  last_workout_date: string | null
  next_workout_date: string | null
}

export interface WeightEntry {
  id: string
  user_id: string
  weight_kg: number
  recorded_at: string
  created_at: string
}

// ─── COMPETITIONS ────────────────────────────────────────────────────────────

export type CompetitionStatus = 'draft' | 'open' | 'closed' | 'in_progress' | 'finished' | 'cancelled'
export type ScoreType = 'time' | 'reps' | 'weight' | 'rounds_plus_reps'
export type ScoreOrder = 'asc' | 'desc'
export type TeamStatus = 'pending_members' | 'pending_payment' | 'pending_approval' | 'approved' | 'rejected' | 'cancelled'
export type PaymentStatus = 'not_required' | 'pending' | 'paid' | 'failed' | 'refunded' | 'manually_confirmed'

export interface Competition {
  id: string
  name: string
  description: string | null
  venue: string | null
  start_date: string
  registration_deadline: string
  team_min_size: number
  team_max_size: number
  status: CompetitionStatus
  created_by: string | null
  public_slug: string | null
  created_at: string
  updated_at: string
}

export interface CompetitionWod {
  id: string
  competition_id: string
  name: string
  description: string | null
  order_index: number
  score_type: ScoreType
  score_order: ScoreOrder
  cap: string | null
  status: 'draft' | 'submitted' | 'published'
  created_at: string
}

export interface CompetitionTeam {
  id: string
  competition_id: string
  name: string
  captain_user_id: string
  box: string | null
  status: TeamStatus
  payment_status: PaymentStatus
  checked_in: boolean
  rejection_reason: string | null
  approved_at: string | null
  rejected_at: string | null
  created_at: string
  updated_at: string
}

export interface CompetitionTeamMember {
  id: string
  team_id: string
  user_id: string | null
  team_role: 'captain' | 'athlete'
  status: 'invited' | 'accepted' | 'rejected' | 'removed'
  payment_status: PaymentStatus
  invited_email: string | null
  invited_by: string | null
  created_at: string
}

export interface CompetitionRole {
  id: string
  competition_id: string
  user_id: string
  role: 'head_judge' | 'judge' | 'athlete'
  assigned_wod_ids: string[] | null
  created_at: string
}

export interface CompetitionJudgeInvite {
  id: string
  competition_id: string
  invited_user_id: string | null
  invited_email: string | null
  invited_by: string
  status: 'pending' | 'accepted' | 'declined' | 'expired'
  expires_at: string
  accepted_at: string | null
  created_at: string
}

export interface CompetitionResult {
  id: string
  competition_id: string
  wod_id: string
  team_id: string
  submitted_by: string | null
  raw_result: string
  score_numeric: number | null
  score_type: ScoreType | null
  notes: string | null
  status: 'submitted' | 'reviewed' | 'published'
  submitted_at: string | null
  reviewed_at: string | null
  published_at: string | null
}

export interface CompetitionAuditLog {
  id: string
  competition_id: string
  changed_by: string
  action: string
  target_type: string | null
  target_id: string | null
  target_label: string | null
  from_value: string | null
  to_value: string | null
  reason: string | null
  created_at: string
}

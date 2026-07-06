import { createClient } from '@supabase/supabase-js'
import ws from 'ws'

const wsOptions = { realtime: { transport: ws } }

const SUPABASE_URL = process.env.VITE_SUPABASE_URL!
const SERVICE_KEY  = process.env.TEST_SERVICE_ROLE_KEY!
const QA_USER_ID   = process.env.TEST_QA_USER_ID!

// Far-future dates so these never collide with real usage or fall out of
// the "Upcoming" bucket regardless of when the suite runs.
export const SELF_WORKOUT_DATE  = '2035-06-15'
export const COACH_WORKOUT_DATE = '2035-06-16'

const SELF_NOTES  = '[TEST] self-logged workout'
const COACH_NOTES = '[TEST] coach-prescribed workout'
export const SELF_SECTION_LABEL = 'WOD'
export const SELF_SECTION_CONTENT = '[TEST] 21-15-9 thrusters + pull-ups'

function db() {
  return createClient(SUPABASE_URL, SERVICE_KEY, wsOptions)
}

export async function cleanQAWorkouts() {
  const client = db()

  // workout_section_notes isn't FK'd to prescribed_workouts (keyed by
  // athlete_id + workout_date instead, see workout-section-notes.sql) so it
  // needs its own cleanup rather than relying on cascade
  await client
    .from('workout_section_notes')
    .delete()
    .eq('athlete_id', QA_USER_ID)
    .in('workout_date', [SELF_WORKOUT_DATE, COACH_WORKOUT_DATE])

  const { data: rows } = await client
    .from('prescribed_workouts')
    .select('id')
    .eq('athlete_id', QA_USER_ID)
    .in('notes', [SELF_NOTES, COACH_NOTES])

  if (!rows || rows.length === 0) return
  const ids = rows.map(r => r.id)
  const { data: sections } = await client.from('workout_sections').select('id').in('workout_id', ids)
  const sectionIds = sections?.map(s => s.id) ?? []
  if (sectionIds.length > 0) await client.from('workout_exercises').delete().in('section_id', sectionIds)
  await client.from('workout_sections').delete().in('workout_id', ids)
  await client.from('prescribed_workouts').delete().in('id', ids)
}

/** Self-logged workout — trainer_id = athlete_id = the QA user. Should be
 * editable/deletable from MyWorkouts. */
export async function seedSelfWorkout(): Promise<string> {
  const client = db()
  const { data, error } = await client
    .from('prescribed_workouts')
    .insert({ trainer_id: QA_USER_ID, athlete_id: QA_USER_ID, workout_date: SELF_WORKOUT_DATE, notes: SELF_NOTES, focus: [] })
    .select('id')
    .single()
  if (error || !data) throw new Error(`seedSelfWorkout: ${error?.message}`)

  const { error: sectionErr } = await client
    .from('workout_sections')
    .insert({ workout_id: data.id, section_type: 'wod', label: SELF_SECTION_LABEL, position: 0, notes: SELF_SECTION_CONTENT, format_type: 'LIVRE' })
  if (sectionErr) throw new Error(`seedSelfWorkout section: ${sectionErr.message}`)

  return data.id
}

const TODAY_NOTES = '[TEST] today workout for section notes'
export const TODAY_SECTION_LABEL = 'WOD'

function todayISO(): string {
  return new Date().toISOString().slice(0, 10)
}

/** Self-logged workout dated today — feedback/section-notes only show for
 * today's or past workouts (see WorkoutCard.tsx canFeedback), so the
 * far-future SELF_WORKOUT_DATE above can't be used for those flows. */
export async function seedTodayWorkout(): Promise<{ workoutId: string; workoutDate: string }> {
  const client = db()
  const workoutDate = todayISO()

  await client.from('prescribed_workouts').delete()
    .eq('athlete_id', QA_USER_ID).eq('notes', TODAY_NOTES)

  const { data, error } = await client
    .from('prescribed_workouts')
    .insert({ trainer_id: QA_USER_ID, athlete_id: QA_USER_ID, workout_date: workoutDate, notes: TODAY_NOTES, focus: [] })
    .select('id')
    .single()
  if (error || !data) throw new Error(`seedTodayWorkout: ${error?.message}`)

  const { error: sectionErr } = await client
    .from('workout_sections')
    .insert({ workout_id: data.id, section_type: 'wod', label: TODAY_SECTION_LABEL, position: 0, notes: '[TEST] 5 rounds for time', format_type: 'LIVRE' })
  if (sectionErr) throw new Error(`seedTodayWorkout section: ${sectionErr.message}`)

  return { workoutId: data.id, workoutDate }
}

export async function cleanQATodayWorkout() {
  const client = db()
  await client.from('workout_section_notes').delete().eq('athlete_id', QA_USER_ID).eq('workout_date', todayISO())
  const { data: rows } = await client.from('prescribed_workouts').select('id').eq('athlete_id', QA_USER_ID).eq('notes', TODAY_NOTES)
  if (!rows || rows.length === 0) return
  const ids = rows.map(r => r.id)
  await client.from('workout_sections').delete().in('workout_id', ids)
  await client.from('prescribed_workouts').delete().in('id', ids)
}

/** Workout prescribed by someone else (any other real account acting as
 * "coach"). Should NOT be editable/deletable from MyWorkouts. */
export async function seedCoachWorkout(): Promise<string> {
  const client = db()
  const { data: other, error: otherErr } = await client
    .from('profiles')
    .select('user_id')
    .neq('user_id', QA_USER_ID)
    .limit(1)
    .single()
  if (otherErr || !other) throw new Error(`seedCoachWorkout: no other user found to act as coach: ${otherErr?.message}`)

  const { data, error } = await client
    .from('prescribed_workouts')
    .insert({ trainer_id: other.user_id, athlete_id: QA_USER_ID, workout_date: COACH_WORKOUT_DATE, notes: COACH_NOTES, focus: [] })
    .select('id')
    .single()
  if (error || !data) throw new Error(`seedCoachWorkout: ${error?.message}`)
  return data.id
}

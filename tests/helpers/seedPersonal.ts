import { createClient } from '@supabase/supabase-js'
import ws from 'ws'

const wsOptions = { realtime: { transport: ws } }

const SUPABASE_URL = process.env.VITE_SUPABASE_URL!
const SERVICE_KEY  = process.env.TEST_SERVICE_ROLE_KEY!
const QA_USER_ID   = process.env.TEST_QA_USER_ID!

function db() {
  return createClient(SUPABASE_URL, SERVICE_KEY, wsOptions)
}

export interface TestAthlete { id: string; name: string }

/** Grants the QA account the 'personal' role if it doesn't already have
 * it — RequireRole redirects to /athlete instead of rendering the page's
 * own "Restricted access" message, so without this every Personal Trainer
 * route is unreachable. Returns whether the role was actually added, so
 * the caller can revert it in afterAll and not leave the QA account in a
 * different state than before the run. */
export async function ensurePersonalRole(): Promise<boolean> {
  const client = db()
  const { data, error } = await client.from('profiles').select('roles').eq('user_id', QA_USER_ID).single()
  if (error || !data) throw new Error(`ensurePersonalRole: could not read QA profile: ${error?.message}`)
  const roles: string[] = data.roles ?? []
  if (roles.includes('personal')) return false

  const { error: updErr } = await client
    .from('profiles')
    .update({ roles: [...roles, 'personal'] })
    .eq('user_id', QA_USER_ID)
  if (updErr) throw new Error(`ensurePersonalRole: ${updErr.message}`)
  return true
}

export async function revertPersonalRole() {
  const client = db()
  const { data, error } = await client.from('profiles').select('roles').eq('user_id', QA_USER_ID).single()
  if (error || !data) return
  const roles: string[] = data.roles ?? []
  await client.from('profiles').update({ roles: roles.filter(r => r !== 'personal') }).eq('user_id', QA_USER_ID)
}

/** Links a real, pre-existing profile (never the QA trainer itself) as a
 * student under the QA account, so /athlete/personal has someone to test
 * against. Only touches the trainer_athletes relationship — never the
 * athlete's own data — and is removed again in unlinkTestAthlete. */
export async function linkTestAthlete(): Promise<TestAthlete> {
  const client = db()
  const { data: other, error } = await client
    .from('profiles')
    .select('user_id, name, username')
    .neq('user_id', QA_USER_ID)
    .limit(1)
    .single()
  if (error || !other) throw new Error(`linkTestAthlete: no other user found: ${error?.message}`)

  const { error: linkErr } = await client
    .from('trainer_athletes')
    .upsert({ trainer_id: QA_USER_ID, athlete_id: other.user_id }, { onConflict: 'trainer_id,athlete_id' })
  if (linkErr) throw new Error(`linkTestAthlete: ${linkErr.message}`)

  return { id: other.user_id, name: other.name ?? other.username ?? 'Athlete' }
}

export async function unlinkTestAthlete(athleteId: string) {
  const client = db()
  await client.from('trainer_athletes').delete().eq('trainer_id', QA_USER_ID).eq('athlete_id', athleteId)
}

/** Removes any workout the QA trainer prescribed to this athlete during a
 * test run — matched by movement name prefix, not a fixed id, since these
 * specs create the workout through the real UI rather than seeding it. */
export async function cleanCoachTestWorkouts(athleteId: string) {
  const client = db()
  const { data: rows } = await client
    .from('prescribed_workouts')
    .select('id')
    .eq('trainer_id', QA_USER_ID)
    .eq('athlete_id', athleteId)
  if (!rows || rows.length === 0) return

  const ids = rows.map(r => r.id)
  const { data: sections } = await client.from('workout_sections').select('id, workout_id').in('workout_id', ids)
  const testSectionWorkoutIds = new Set<string>()
  const sectionIds: string[] = []
  if (sections) {
    const { data: exercises } = await client
      .from('workout_exercises')
      .select('id, section_id, movement_name')
      .in('section_id', sections.map(s => s.id))
      .like('movement_name', '[TEST]%')
    for (const ex of exercises ?? []) {
      const section = sections.find(s => s.id === ex.section_id)
      if (section) testSectionWorkoutIds.add(section.workout_id)
    }
  }

  const testWorkoutIds = [...testSectionWorkoutIds]
  if (testWorkoutIds.length === 0) return
  const testSectionIds = (sections ?? []).filter(s => testWorkoutIds.includes(s.workout_id)).map(s => s.id)
  sectionIds.push(...testSectionIds)

  if (sectionIds.length > 0) await client.from('workout_exercises').delete().in('section_id', sectionIds)
  await client.from('workout_sections').delete().in('workout_id', testWorkoutIds)
  await client.from('prescribed_workouts').delete().in('id', testWorkoutIds)
}

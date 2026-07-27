import { createClient } from '@supabase/supabase-js'
import ws from 'ws'

const wsOptions = { realtime: { transport: ws } }

const SUPABASE_URL = process.env.VITE_SUPABASE_URL!
const SERVICE_KEY  = process.env.TEST_SERVICE_ROLE_KEY!
const QA_USER_ID   = process.env.TEST_QA_USER_ID!

function db() {
  return createClient(SUPABASE_URL, SERVICE_KEY, wsOptions)
}

/** Reads the QA account's current roles so tests can restore them afterward. */
export async function getQARoles(): Promise<string[]> {
  const client = db()
  const { data, error } = await client.from('profiles').select('roles').eq('user_id', QA_USER_ID).single()
  if (error) throw new Error(`getQARoles: ${error.message}`)
  return data?.roles ?? []
}

export async function setQARoles(roles: string[]) {
  const client = db()
  const { error } = await client.from('profiles').update({ roles }).eq('user_id', QA_USER_ID)
  if (error) throw new Error(`setQARoles: ${error.message}`)
}

/** Deletes prescribed_workouts rows created by the QA account for a given date (test cleanup). */
export async function deleteQAWorkoutsForDate(date: string) {
  const client = db()
  await client.from('prescribed_workouts').delete().eq('athlete_id', QA_USER_ID).eq('workout_date', date)
}

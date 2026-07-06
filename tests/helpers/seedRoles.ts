import { createClient } from '@supabase/supabase-js'
import ws from 'ws'

const wsOptions = { realtime: { transport: ws } }

const SUPABASE_URL = process.env.VITE_SUPABASE_URL!
const SERVICE_KEY  = process.env.TEST_SERVICE_ROLE_KEY!
const QA_USER_ID   = process.env.TEST_QA_USER_ID!

function db() {
  return createClient(SUPABASE_URL, SERVICE_KEY, wsOptions)
}

/** Grants the QA account a role if it doesn't already have it — RequireRole
 * redirects to /athlete instead of rendering the page's own restricted-access
 * message, so without this routes gated by role are unreachable. Returns
 * whether the role was actually added, so the caller can revert it in
 * afterAll and not leave the QA account in a different state than before
 * the run. */
export async function ensureRole(role: string): Promise<boolean> {
  const client = db()
  const { data, error } = await client.from('profiles').select('roles').eq('user_id', QA_USER_ID).single()
  if (error || !data) throw new Error(`ensureRole(${role}): could not read QA profile: ${error?.message}`)
  const roles: string[] = data.roles ?? []
  if (roles.includes(role)) return false

  const { error: updErr } = await client
    .from('profiles')
    .update({ roles: [...roles, role] })
    .eq('user_id', QA_USER_ID)
  if (updErr) throw new Error(`ensureRole(${role}): ${updErr.message}`)
  return true
}

export async function revertRole(role: string) {
  const client = db()
  const { data, error } = await client.from('profiles').select('roles').eq('user_id', QA_USER_ID).single()
  if (error || !data) return
  const roles: string[] = data.roles ?? []
  await client.from('profiles').update({ roles: roles.filter(r => r !== role) }).eq('user_id', QA_USER_ID)
}

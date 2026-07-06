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
 * the run. Uses atomic DB-side operation to avoid race conditions. */
export async function ensureRole(role: string): Promise<boolean> {
  const client = db()
  const { data, error } = await client.rpc('test_ensure_role', {
    p_user_id: QA_USER_ID,
    p_role: role,
  })
  if (error) throw new Error(`ensureRole(${role}): ${error.message}`)
  return data as boolean
}

export async function revertRole(role: string) {
  const client = db()
  const { error } = await client.rpc('test_revert_role', {
    p_user_id: QA_USER_ID,
    p_role: role,
  })
  if (error) throw new Error(`revertRole(${role}): ${error.message}`)
}

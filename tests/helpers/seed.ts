import { createClient } from '@supabase/supabase-js'
import ws from 'ws'

const wsOptions = { realtime: { transport: ws } }

const SUPABASE_URL  = process.env.VITE_SUPABASE_URL!
const SERVICE_KEY   = process.env.TEST_SERVICE_ROLE_KEY!
const ADMIN_EMAIL   = process.env.TEST_ADMIN_EMAIL!
const ADMIN_PASS    = process.env.TEST_ADMIN_PASSWORD!

// Prefixo que identifica dados de teste — nunca toca em dados reais
const TEST_PREFIX = '[TEST]'

// ─── Admin-authenticated client (para chamar RPCs que exigem auth) ────────────
async function getAdminClient() {
  const anon = createClient(SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY!, wsOptions)
  const { data, error } = await anon.auth.signInWithPassword({ email: ADMIN_EMAIL, password: ADMIN_PASS })
  if (error || !data.session) throw new Error(`seed login failed: ${error?.message}`)
  return createClient(SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY!, {
    ...wsOptions,
    global: { headers: { Authorization: `Bearer ${data.session.access_token}` } },
  })
}

// ─── Service-role client (para DELETE direto, bypassa RLS) ────────────────────
function getServiceClient() {
  return createClient(SUPABASE_URL, SERVICE_KEY, wsOptions)
}

// ─── Limpa todas as competições de teste ──────────────────────────────────────
export async function cleanTestCompetitions() {
  const db = getServiceClient()
  const { error } = await db
    .from('competitions')
    .delete()
    .like('name', `${TEST_PREFIX}%`)
  if (error) throw new Error(`cleanTestCompetitions: ${error.message}`)
}

// ─── Cria 2 competições de teste e retorna os IDs ─────────────────────────────
// Usa service_role diretamente — seed não testa o RPC, só prepara dados
export async function seedTestCompetitions(): Promise<{ compA: string; compB: string }> {
  const db = getServiceClient()

  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  const nextWeek = new Date()
  nextWeek.setDate(nextWeek.getDate() + 7)

  const base = {
    venue:                 'CF Test Box',
    start_date:            nextWeek.toISOString().split('T')[0],
    registration_deadline: tomorrow.toISOString(),
    team_min_size:         2,
    team_max_size:         4,
    created_by:            process.env.TEST_QA_USER_ID!,
  }

  const { data: rowA, error: errA } = await db
    .from('competitions')
    .insert({ ...base, name: `${TEST_PREFIX} Alpha`, description: 'Competição de teste A — rascunho', status: 'draft' })
    .select('id')
    .single()
  if (errA) throw new Error(`seed compA: ${errA.message}`)

  const { data: rowB, error: errB } = await db
    .from('competitions')
    .insert({ ...base, name: `${TEST_PREFIX} Beta`, description: 'Competição de teste B — aberta', status: 'open' })
    .select('id')
    .single()
  if (errB) throw new Error(`seed compB: ${errB.message}`)

  // Registra QA user como head_judge nas duas competições
  const { error: roleErr } = await db.from('competition_roles').insert([
    { competition_id: rowA.id, user_id: process.env.TEST_QA_USER_ID!, role: 'head_judge' },
    { competition_id: rowB.id, user_id: process.env.TEST_QA_USER_ID!, role: 'head_judge' },
  ])
  if (roleErr) throw new Error(`seed roles: ${roleErr.message}`)

  return { compA: rowA.id as string, compB: rowB.id as string }
}

// ─── Cria uma divisão + WOD + time aprovado, prontos pro judge lançar score ────
// Times/WODs/divisões são apagados em cascata quando a competição é removida
// por cleanTestCompetitions — não precisa de limpeza própria.
export async function seedApprovedTeamWithWod(
  competitionId: string
): Promise<{ teamId: string; teamName: string; wodId: string }> {
  const db = getServiceClient()

  const { data: division, error: divErr } = await db
    .from('competition_divisions')
    .insert({ competition_id: competitionId, format: 'individual', composition: 'male', category: 'RX' })
    .select('id')
    .single()
  if (divErr || !division) throw new Error(`seedApprovedTeamWithWod division: ${divErr?.message}`)

  const teamName = `${TEST_PREFIX} Team ${Date.now()}`
  const { data: team, error: teamErr } = await db
    .from('competition_teams')
    .insert({
      competition_id: competitionId,
      name: teamName,
      captain_user_id: process.env.TEST_QA_USER_ID!,
      division_id: division.id,
      status: 'approved',
    })
    .select('id')
    .single()
  if (teamErr || !team) throw new Error(`seedApprovedTeamWithWod team: ${teamErr?.message}`)

  const { data: wod, error: wodErr } = await db
    .from('competition_wods')
    .insert({
      competition_id: competitionId,
      name: `${TEST_PREFIX} WOD`,
      score_type: 'time',
      score_order: 'asc',
      status: 'draft',
      order_index: 0,
    })
    .select('id')
    .single()
  if (wodErr || !wod) throw new Error(`seedApprovedTeamWithWod wod: ${wodErr?.message}`)

  return { teamId: team.id as string, teamName, wodId: wod.id as string }
}

// ─── Cria divisão + time aprovado + WOD publicado + resultado — pronto pro
// leaderboard exibir uma posição. get_competition_leaderboard só pontua
// resultados de WODs com status='published' e times com status='approved'.
export async function seedLeaderboardEntry(
  competitionId: string
): Promise<{ teamName: string }> {
  const db = getServiceClient()
  const { teamId, teamName, wodId } = await seedApprovedTeamWithWod(competitionId)

  const { error: wodErr } = await db
    .from('competition_wods')
    .update({ status: 'published' })
    .eq('id', wodId)
  if (wodErr) throw new Error(`seedLeaderboardEntry publish wod: ${wodErr.message}`)

  const { error: resultErr } = await db
    .from('competition_results')
    .insert({
      competition_id: competitionId,
      wod_id: wodId,
      team_id: teamId,
      raw_result: '12:34',
      score_numeric: 754,
      score_type: 'time',
      status: 'published',
    })
  if (resultErr) throw new Error(`seedLeaderboardEntry result: ${resultErr.message}`)

  return { teamName }
}

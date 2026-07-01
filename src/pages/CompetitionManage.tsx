import { useEffect, useState, useCallback } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { useProfile } from '@/hooks/useProfile'
import {
  encodeScore,
  decodeScore,
  validateScoreFields,
  parseCapSeconds,
  parseDisplayScore,
  type WodScoreType,
  type ScoreFields,
} from '@/lib/competitionScore'
import type {
  Competition,
  CompetitionDivision,
  CompetitionWod,
  CompetitionTeam,
  CompetitionTeamMember,
  CompetitionRole,
  CompetitionJudgeInvite,
  CompetitionResult,
  CompetitionAuditLog,
} from '@/types'

const FORMAT_SIZE: Record<string, number> = { individual: 1, pair: 2, team3: 3, team4: 4 }
const FORMAT_LABEL: Record<string, string> = { individual: 'IND', pair: 'PAIR', team3: 'TEAM 3', team4: 'TEAM 4' }

function divisionLabel(d: CompetitionDivision) {
  return `${FORMAT_LABEL[d.format]} · ${d.composition.toUpperCase()} · ${d.category.toUpperCase()}`
}

// ─── CF Games points scale ────────────────────────────────────────────────────
const CF_POINTS = [100,95,92,89,86,83,80,78,76,74,72,70,68,66,64,62,60,58,56,54,52,50,48,46,44,42,40,38,36,34,32,30,28,26,24,22,20,18,16,14,12,10,8,6,4,2,1,0]

// ─── StatusPill ───────────────────────────────────────────────────────────────
const STATUS_CFG: Record<string, { dot: string; text: string; label: string }> = {
  open:               { dot: '#D4FF3A', text: '#D4FF3A', label: 'OPEN REGISTRATIONS' },
  in_progress:        { dot: '#4DA3FF', text: '#4DA3FF', label: 'LIVE' },
  draft:              { dot: '#6B6B68', text: '#6B6B68', label: 'DRAFT' },
  closed:             { dot: '#FFB800', text: '#FFB800', label: 'CLOSED' },
  finished:           { dot: '#6B6B68', text: '#6B6B68', label: 'FINISHED' },
  cancelled:          { dot: '#FF3B30', text: '#FF3B30', label: 'CANCELLED' },
  submitted:          { dot: '#FFB800', text: '#FFB800', label: 'UNDER REVIEW' },
  published:          { dot: '#D4FF3A', text: '#D4FF3A', label: 'PUBLISHED' },
  approved:           { dot: '#D4FF3A', text: '#D4FF3A', label: 'APPROVED' },
  pending_payment:    { dot: '#FFB800', text: '#FFB800', label: 'PEND. PAYMENT' },
  pending_approval:   { dot: '#4DA3FF', text: '#4DA3FF', label: 'PEND. APPROVAL' },
  pending_members:    { dot: '#6B6B68', text: '#6B6B68', label: 'INCOMPLETE' },
  rejected:           { dot: '#FF3B30', text: '#FF3B30', label: 'REJECTED' },
  not_required:       { dot: '#6B6B68', text: '#6B6B68', label: 'N/A' },
  paid:               { dot: '#D4FF3A', text: '#D4FF3A', label: 'PAID' },
  pending:            { dot: '#FFB800', text: '#FFB800', label: 'PENDING' },
  manually_confirmed: { dot: '#D4FF3A', text: '#D4FF3A', label: 'CONFIRMED' },
  accepted:           { dot: '#D4FF3A', text: '#D4FF3A', label: 'ACCEPTED' },
  declined:           { dot: '#FF3B30', text: '#FF3B30', label: 'DECLINED' },
  reviewed:           { dot: '#4DA3FF', text: '#4DA3FF', label: 'REVIEWED' },
  failed:             { dot: '#FF3B30', text: '#FF3B30', label: 'FAILED' },
  refunded:           { dot: '#6B6B68', text: '#6B6B68', label: 'REFUNDED' },
  expired:            { dot: '#6B6B68', text: '#6B6B68', label: 'EXPIRED' },
}

function StatusPill({ status }: { status: string }) {
  const cfg = STATUS_CFG[status] ?? { dot: '#6B6B68', text: '#6B6B68', label: status.toUpperCase() }
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        fontFamily: 'JetBrains Mono, monospace',
        fontWeight: 900,
        textTransform: 'uppercase',
        fontSize: 9,
        letterSpacing: '0.16em',
        padding: '4px 7px',
        border: `1px solid ${cfg.dot}33`,
        color: cfg.text,
      }}
    >
      <span style={{ width: 6, height: 6, backgroundColor: cfg.dot, flexShrink: 0 }} />
      {cfg.label}
    </span>
  )
}

// ─── Profile map type ─────────────────────────────────────────────────────────
interface PublicProfile {
  user_id: string
  name: string      // normalizado de full_name no load
  username: string
  roles: string[]
}

// ─── Action humanization ──────────────────────────────────────────────────────
const ACTION_LABELS: Record<string, string> = {
  team_approved:          'Equipe aprovada',
  team_rejected:          'Equipe rejeitada',
  team_payment_confirmed: 'Pagto confirmado',
  team_checked_in:        'Check-in realizado',
  team_cancelled:         'Equipe cancelada',
  wod_published:          'WOD publicado',
  result_overridden:      'Resultado corrigido',
  judge_invited:          'Judge convidado',
}

function humanizeAction(action: string) {
  return ACTION_LABELS[action] ?? action
}

function formatDate(iso: string) {
  const d = new Date(iso)
  const months = ['JAN','FEV','MAR','ABR','MAI','JUN','JUL','AGO','SET','OUT','NOV','DEZ']
  const day = String(d.getDate()).padStart(2, '0')
  const mon = months[d.getMonth()]
  const hh = String(d.getHours()).padStart(2, '0')
  const mm = String(d.getMinutes()).padStart(2, '0')
  return `${day} ${mon} · ${hh}:${mm}`
}

function pad2(n: number) {
  return String(n + 1).padStart(2, '0')
}

// ─── Tabs ─────────────────────────────────────────────────────────────────────
const TABS = ['OVERVIEW', 'TEAMS', 'WODS', 'JUDGES', 'RESULTS', 'AUDIT LOG'] as const
type Tab = typeof TABS[number]

// ─── Team filter chips ────────────────────────────────────────────────────────
const TEAM_FILTERS = [
  { key: 'all',              label: 'TODAS' },
  { key: 'pending_approval', label: 'APROV. PENDENTE' },
  { key: 'pending_payment',  label: 'PAGTO' },
  { key: 'pending_members',  label: 'INCOMPLETAS' },
  { key: 'approved',         label: 'OFICIAIS' },
  { key: 'rejected',         label: 'REJEITADAS' },
] as const
type TeamFilter = typeof TEAM_FILTERS[number]['key']

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function CompetitionManage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()
  const { profile } = useProfile(user?.id)

  const [searchParams, setSearchParams] = useSearchParams()
  const rawTab = searchParams.get('tab') ?? ''
  const activeTab: Tab = (TABS as readonly string[]).includes(rawTab) ? rawTab as Tab : 'OVERVIEW'
  function setActiveTab(tab: Tab) {
    setSearchParams(prev => { prev.set('tab', tab); return prev }, { replace: true })
  }
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // ── Data state ──
  const [comp, setComp] = useState<Competition | null>(null)
  const [wods, setWods] = useState<CompetitionWod[]>([])
  const [teams, setTeams] = useState<CompetitionTeam[]>([])
  const [membersByTeam, setMembersByTeam] = useState<Record<string, CompetitionTeamMember[]>>({})
  const [roles, setRoles] = useState<CompetitionRole[]>([])
  const [invites, setInvites] = useState<CompetitionJudgeInvite[]>([])
  const [results, setResults] = useState<CompetitionResult[]>([])
  const [auditLog, setAuditLog] = useState<CompetitionAuditLog[]>([])
  const [profiles, setProfiles] = useState<Record<string, PublicProfile>>({})
  const [divisions, setDivisions] = useState<CompetitionDivision[]>([])
  const [myRole, setMyRole] = useState<string | null>(null)

  // ── Teams tab state ──
  const [teamFilter, setTeamFilter] = useState<TeamFilter>('all')
  const [divisionFilter, setDivisionFilter] = useState<string>('all')
  const [teamSearch, setTeamSearch] = useState('')
  const [rejectTeamId, setRejectTeamId] = useState<string | null>(null)
  const [rejectReason, setRejectReason] = useState('')
  const [cancelTeamId, setCancelTeamId] = useState<string | null>(null)
  const [expandedTeamId, setExpandedTeamId] = useState<string | null>(null)
  const [mutating, setMutating] = useState(false)
  const [mutateError, setMutateError] = useState<string | null>(null)

  // ── Judges tab state ──
  const [showInviteForm, setShowInviteForm] = useState(false)
  const [inviteUsername, setInviteUsername] = useState('')
  const [inviteLoading, setInviteLoading] = useState(false)
  const [inviteMsg, setInviteMsg] = useState<{ ok: boolean; text: string } | null>(null)

  // ── WOD form state ──
  const [showWodForm, setShowWodForm] = useState(false)
  const [wodName, setWodName] = useState('')
  const [wodDesc, setWodDesc] = useState('')
  const [wodScoreType, setWodScoreType] = useState<'time' | 'reps' | 'weight' | 'rounds_plus_reps'>('time')
  const [wodCap, setWodCap] = useState('')
  const [wodSaving, setWodSaving] = useState(false)

  // ── WOD edit state ──
  const [editingWodId, setEditingWodId] = useState<string | null>(null)
  const [editWodName, setEditWodName] = useState('')
  const [editWodDesc, setEditWodDesc] = useState('')
  const [editWodScoreType, setEditWodScoreType] = useState<'time' | 'reps' | 'weight' | 'rounds_plus_reps'>('time')
  const [editWodCap, setEditWodCap] = useState('')
  const [editWodStatus, setEditWodStatus] = useState<'draft' | 'submitted' | 'published'>('draft')
  const [editWodSaving, setEditWodSaving] = useState(false)

  // ── Results tab state ──
  const [selectedWodId, setSelectedWodId] = useState<string | null>(null)
  const [overrideResultId, setOverrideResultId] = useState<string | null>(null)
  const [overrideDisplay, setOverrideDisplay] = useState('')
  const [overrideReason, setOverrideReason] = useState('')
  const [enterTeamId, setEnterTeamId] = useState<string | null>(null)
  const [enterFields, setEnterFields] = useState<ScoreFields>({ type: 'time' })
  const [enterError, setEnterError] = useState<string | null>(null)
  const [savedMsg, setSavedMsg] = useState<string | null>(null)
  const [resultDivisionFilter, setResultDivisionFilter] = useState<string>('all')

  // ── Status change ──
  const [statusChanging, setStatusChanging] = useState(false)
  const [cancelConfirming, setCancelConfirming] = useState(false)
  const [finishConfirming, setFinishConfirming] = useState(false)
  const [despublicarConfirmId, setDespublicarConfirmId] = useState<string | null>(null)

  // ─── Load ────────────────────────────────────────────────────────────────────
  const load = useCallback(async () => {
    if (!id) return
    setLoading(true)
    setError(null)
    try {
      const [compRes, wodsRes, teamsRes, rolesRes, invitesRes, auditRes, divsRes] = await Promise.all([
        supabase.from('competitions').select('*').eq('id', id).single(),
        supabase.from('competition_wods').select('*').eq('competition_id', id).order('order_index'),
        supabase.from('competition_teams').select('*').eq('competition_id', id),
        supabase.from('competition_roles').select('*').eq('competition_id', id),
        supabase.from('competition_judge_invites').select('*').eq('competition_id', id),
        supabase.from('competition_audit_log').select('*').eq('competition_id', id).order('created_at', { ascending: false }).limit(50),
        supabase.from('competition_divisions').select('*').eq('competition_id', id).order('format').order('composition').order('category'),
      ])

      if (compRes.error) throw new Error(compRes.error.message)
      if (wodsRes.error) throw new Error(wodsRes.error.message)
      if (teamsRes.error) throw new Error(teamsRes.error.message)
      if (rolesRes.error) throw new Error(rolesRes.error.message)
      if (auditRes.error) throw new Error(`audit_log: ${auditRes.error.message}`)
      if (divsRes.error) throw new Error(`competition_divisions: ${divsRes.error.message}`)

      const compData = compRes.data as Competition
      const wodsData = (wodsRes.data ?? []) as CompetitionWod[]
      const teamsData = (teamsRes.data ?? []) as CompetitionTeam[]
      const rolesData = (rolesRes.data ?? []) as CompetitionRole[]
      const invitesData = (invitesRes.data ?? []) as CompetitionJudgeInvite[]
      const auditData = (auditRes.data ?? []) as CompetitionAuditLog[]
      const divsData = (divsRes.data ?? []) as CompetitionDivision[]
      setDivisions(divsData)

      setComp(compData)
      setWods(wodsData)
      setTeams(teamsData)
      setRoles(rolesData)
      setInvites(invitesData)
      setAuditLog(auditData)

      // My role
      const myRoleRow = rolesData.find(r => r.user_id === user?.id)
      setMyRole(myRoleRow?.role ?? null)

      // Members — usa RPC SECURITY DEFINER para o head judge conseguir ler sem ser membro
      let allMembers: CompetitionTeamMember[] = []
      if (teamsData.length > 0) {
        const { data: membersData } = await supabase
          .rpc('get_competition_team_members', { p_competition_id: id })
        allMembers = (membersData ?? []) as CompetitionTeamMember[]
        const grouped: Record<string, CompetitionTeamMember[]> = {}
        for (const m of allMembers) {
          if (!grouped[m.team_id]) grouped[m.team_id] = []
          grouped[m.team_id].push(m)
        }
        setMembersByTeam(grouped)
      } else {
        setMembersByTeam({})
      }

      // Results for all wods
      if (wodsData.length > 0) {
        const wodIds = wodsData.map(w => w.id)
        const { data: resultsData } = await supabase
          .from('competition_results')
          .select('*')
          .in('wod_id', wodIds)
        setResults((resultsData ?? []) as CompetitionResult[])
      } else {
        setResults([])
      }

      // Batch profile lookup — inclui membros de equipes para exibição
      const userIds = new Set<string>()
      teamsData.forEach(t => userIds.add(t.captain_user_id))
      rolesData.forEach(r => userIds.add(r.user_id))
      invitesData.forEach(i => { if (i.invited_user_id) userIds.add(i.invited_user_id) })
      auditData.forEach(a => { if (a.changed_by) userIds.add(a.changed_by) })
      allMembers.forEach(m => { if (m.user_id) userIds.add(m.user_id) })

      const ids = Array.from(userIds).filter(Boolean)
      if (ids.length > 0) {
        const { data: profilesData } = await supabase.rpc('get_profiles_public', { p_user_ids: ids })
        const map: Record<string, PublicProfile> = {}
        for (const p of (profilesData ?? []) as { user_id: string; full_name: string; username: string; roles: string[] }[]) {
          map[p.user_id] = { user_id: p.user_id, name: p.full_name, username: p.username, roles: p.roles ?? [] }
        }
        setProfiles(map)
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao carregar dados')
    } finally {
      setLoading(false)
    }
  }, [id, user?.id])

  useEffect(() => { load() }, [load])

  // ─── Guards ───────────────────────────────────────────────────────────────────
  const isAdmin = profile?.roles?.includes('admin') ?? false
  const isHeadJudge = myRole === 'head_judge'
  const canManage = isAdmin || isHeadJudge

  // ─── Team mutations ───────────────────────────────────────────────────────────
  async function teamAction(teamId: string, action: string, reason?: string) {
    setMutating(true)
    setMutateError(null)
    try {
      const { error } = await supabase.rpc('manage_team', {
        p_team_id: teamId,
        p_action: action,
        ...(reason ? { p_reason: reason } : {}),
      })
      if (error) throw new Error(error.message)
      await load()
    } catch (e) {
      setMutateError(e instanceof Error ? e.message : 'Erro')
    } finally {
      setMutating(false)
    }
  }

  async function handleReject(teamId: string) {
    if (!rejectReason.trim()) return
    await teamAction(teamId, 'reject', rejectReason.trim())
    setRejectTeamId(null)
    setRejectReason('')
  }

  // ─── WOD publish ─────────────────────────────────────────────────────────────
  async function publishWod(wodId: string) {
    setMutating(true)
    setMutateError(null)
    try {
      const { error } = await supabase.rpc('update_wod_status', { p_wod_id: wodId, p_status: 'published' })
      if (error) throw new Error(error.message)
      await load()
    } catch (e) {
      setMutateError(e instanceof Error ? e.message : 'Erro')
    } finally {
      setMutating(false)
    }
  }

  // ─── Invite judge ─────────────────────────────────────────────────────────────
  async function handleInviteJudge() {
    if (!id || !inviteUsername.trim()) return
    setInviteLoading(true)
    setInviteMsg(null)
    try {
      const username = inviteUsername.trim().replace(/^@/, '')
      const { error } = await supabase.rpc('invite_judge_by_username', {
        p_competition_id: id,
        p_username: username,
      })
      if (error) throw new Error(error.message)
      setInviteMsg({ ok: true, text: `Convite enviado para @${username}` })
      setInviteUsername('')
      await load()
    } catch (e) {
      setInviteMsg({ ok: false, text: e instanceof Error ? e.message : 'Erro ao convidar' })
    } finally {
      setInviteLoading(false)
    }
  }

  // ─── Override result ─────────────────────────────────────────────────────────
  async function handleOverride(resultId: string) {
    if (!overrideDisplay.trim() || !overrideReason.trim() || !selectedWod) return
    const scoreNumeric = parseDisplayScore(selectedWod.score_type as WodScoreType, overrideDisplay)
    if (scoreNumeric === null) { setMutateError('Formato inválido para este tipo de score'); return }
    setMutating(true)
    setMutateError(null)
    try {
      const { error } = await supabase.rpc('override_competition_result', {
        p_result_id: resultId,
        p_raw_result: overrideDisplay.trim(),
        p_value: scoreNumeric,
        p_reason: overrideReason.trim(),
      })
      if (error) throw new Error(error.message)
      setOverrideResultId(null)
      setOverrideDisplay('')
      setOverrideReason('')
      await load()
    } catch (e) {
      setMutateError(e instanceof Error ? e.message : 'Erro')
    } finally {
      setMutating(false)
    }
  }

  // ─── Submit new result for a team ────────────────────────────────────────────
  async function handleSubmitResult(teamId: string, teamName: string) {
    if (!selectedWod) return
    const capSecs = parseCapSeconds(selectedWod.cap)
    const validationError = validateScoreFields(enterFields, capSecs)
    if (validationError) { setEnterError(validationError); return }
    const encoded = encodeScore(enterFields)
    if (!encoded) { setEnterError('Resultado inválido'); return }
    setMutating(true)
    setMutateError(null)
    setEnterError(null)
    try {
      const { error } = await supabase.rpc('submit_competition_result', {
        p_wod_id: selectedWod.id,
        p_team_id: teamId,
        p_raw_result: encoded.raw_result,
        p_score_type: selectedWod.score_type,
        p_score_numeric: encoded.score_numeric,
      })
      if (error) throw new Error(error.message)
      setEnterTeamId(null)
      setEnterFields({ type: selectedWod.score_type as WodScoreType })
      setSavedMsg(`RESULTADO SALVO — ${teamName} · ${encoded.raw_result}`)
      setTimeout(() => setSavedMsg(null), 4000)
      await load()
    } catch (e) {
      setMutateError(e instanceof Error ? e.message : 'Erro')
    } finally {
      setMutating(false)
    }
  }

  async function handleStatusChange(newStatus: string) {
    if (!id || statusChanging) return
    setStatusChanging(true)
    setMutateError(null)
    const { error } = await supabase.rpc('update_competition_status', {
      p_competition_id: id,
      p_new_status: newStatus,
    })
    if (error) {
      setMutateError(`Status: ${error.message}`)
    } else {
      await load()
    }
    setStatusChanging(false)
  }

  async function handleCreateWod() {
    if (!id || !wodName.trim() || wodSaving) return
    setWodSaving(true)
    setMutateError(null)
    const scoreOrder = wodScoreType === 'time' ? 'asc' : 'desc'
    const { error } = await supabase.rpc('create_competition_wod', {
      p_competition_id: id,
      p_name: wodName.trim(),
      p_description: wodDesc.trim(),
      p_score_type: wodScoreType,
      p_score_order: scoreOrder,
      p_cap: wodCap.trim(),
    })
    if (error) {
      setMutateError(error.message)
    } else {
      setShowWodForm(false)
      setWodName('')
      setWodDesc('')
      setWodScoreType('time')
      setWodCap('')
      await load()
    }
    setWodSaving(false)
  }

  function openEditWod(wod: CompetitionWod) {
    setEditingWodId(wod.id)
    setEditWodName(wod.name)
    setEditWodDesc(wod.description ?? '')
    setEditWodScoreType(wod.score_type as 'time' | 'reps' | 'weight' | 'rounds_plus_reps')
    setEditWodCap(wod.cap ?? '')
    setEditWodStatus(wod.status as 'draft' | 'submitted' | 'published')
  }

  function cancelEditWod() {
    setEditingWodId(null)
    setEditWodName('')
    setEditWodDesc('')
    setEditWodScoreType('time')
    setEditWodCap('')
    setEditWodStatus('draft')
  }

  async function handleEditWod() {
    if (!editingWodId || !editWodName.trim() || editWodSaving) return
    setEditWodSaving(true)
    setMutateError(null)
    const scoreOrder = editWodScoreType === 'time' ? 'asc' : 'desc'
    const { error } = await supabase.rpc('update_competition_wod', {
      p_wod_id: editingWodId,
      p_name: editWodName.trim(),
      p_description: editWodDesc.trim(),
      p_score_type: editWodScoreType,
      p_score_order: scoreOrder,
      p_cap: editWodCap.trim(),
    })
    if (error) {
      setMutateError(error.message)
      setEditWodSaving(false)
      return
    }
    const currentWod = wods.find(w => w.id === editingWodId)
    if (currentWod && currentWod.status !== editWodStatus) {
      const { error: statusError } = await supabase.rpc('update_wod_status', {
        p_wod_id: editingWodId,
        p_status: editWodStatus,
      })
      if (statusError) {
        setMutateError(statusError.message)
        setEditWodSaving(false)
        return
      }
    }
    {
      cancelEditWod()
      await load()
    }
    setEditWodSaving(false)
  }

  // ─── Derived values ───────────────────────────────────────────────────────────
  const approvedTeams = teams.filter(t => t.status === 'approved')
  const pendingApprovalTeams = teams.filter(t => t.status === 'pending_approval')
  const pendingPaymentTeams = teams.filter(t => t.status === 'pending_payment')
  const publishedWods = wods.filter(w => w.status === 'published')

  const divisionById = Object.fromEntries(divisions.map(d => [d.id, d]))

  const filteredTeams = teams
    .filter(t => {
      if (teamFilter !== 'all' && t.status !== teamFilter) return false
      if (divisionFilter !== 'all' && t.division_id !== divisionFilter) return false
      if (teamSearch && !t.name.toLowerCase().includes(teamSearch.toLowerCase())) return false
      return true
    })

  const judgeRoles = roles.filter(r => r.role === 'head_judge' || r.role === 'judge')
  const pendingInvites = invites.filter(i => i.status === 'pending')

  const selectedWod = wods.find(w => w.id === selectedWodId) ?? null
  const wodResults = selectedWod
    ? results.filter(r => r.wod_id === selectedWod.id)
    : []

  const resultFilteredApproved = resultDivisionFilter === 'all'
    ? approvedTeams
    : approvedTeams.filter(t => t.division_id === resultDivisionFilter)

  // Sort results by score_numeric respecting score_order
  const sortedWodResults = selectedWod
    ? [...wodResults]
        .filter(r => resultFilteredApproved.some(t => t.id === r.team_id))
        .sort((a, b) => {
          const av = a.score_numeric ?? 0
          const bv = b.score_numeric ?? 0
          return selectedWod.score_order === 'asc' ? av - bv : bv - av
        })
    : []

  const teamsWithoutResult = selectedWod
    ? resultFilteredApproved
        .filter(t => !wodResults.find(r => r.team_id === t.id))
        .sort((a, b) => a.name.localeCompare(b.name))
    : []

  // ─── Render ───────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: '#0A0A0A', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ fontFamily: 'JetBrains Mono, monospace', fontWeight: 700, fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#6B6B68' }}>
          CARREGANDO...
        </span>
      </div>
    )
  }

  if (error || !comp) {
    return (
      <div style={{ minHeight: '100vh', background: '#0A0A0A', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ fontFamily: 'JetBrains Mono, monospace', fontWeight: 700, fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#FF3B30' }}>
          {error ?? 'Competition not found'}
        </span>
      </div>
    )
  }

  if (!canManage) {
    return (
      <div style={{ minHeight: '100vh', background: '#0A0A0A', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ fontFamily: 'JetBrains Mono, monospace', fontWeight: 700, fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#FF3B30' }}>
          ACESSO NEGADO
        </span>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: '#0A0A0A', color: '#F5F5F0', fontFamily: 'Space Grotesk, sans-serif', display: 'flex', flexDirection: 'column' }}>

      {/* ── Topbar ──────────────────────────────────────────────────────────────── */}
      <div style={{ background: '#111111', borderBottom: '1px solid #2A2A2A', padding: '0 16px', height: 52, display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
        <button
          onClick={() => navigate(-1)}
          style={{ background: 'none', border: 'none', color: '#6B6B68', cursor: 'pointer', padding: '4px 8px 4px 0', display: 'flex', alignItems: 'center', gap: 6, fontFamily: 'JetBrains Mono, monospace', fontSize: 11, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase' }}
        >
          <span style={{ fontSize: 16, lineHeight: 1 }}>&#8592;</span>
        </button>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, overflow: 'hidden' }}>
          <span style={{ fontFamily: 'JetBrains Mono, monospace', fontWeight: 700, fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#6B6B68', flexShrink: 0 }}>
            MANAGE ·
          </span>
          <span style={{ fontWeight: 700, fontSize: 14, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {comp.name}
          </span>
        </div>
        <StatusPill status={comp.status} />
      </div>

      {/* ── Tab bar ─────────────────────────────────────────────────────────────── */}
      <div style={{ background: '#111111', borderBottom: '1px solid #2A2A2A', display: 'flex', overflowX: 'auto', flexShrink: 0 }}>
        {TABS.map(tab => {
          let label: string = tab
          if (tab === 'TEAMS') label = `TEAMS (${teams.length})`
          if (tab === 'WODS') label = `WODS (${wods.length})`
          if (tab === 'JUDGES') label = `JUDGES (${judgeRoles.length + pendingInvites.length})`
          const active = activeTab === tab
          return (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                background: 'none',
                border: 'none',
                borderBottom: active ? '2px solid #D4FF3A' : '2px solid transparent',
                color: active ? '#F5F5F0' : '#6B6B68',
                cursor: 'pointer',
                fontFamily: 'JetBrains Mono, monospace',
                fontWeight: 700,
                fontSize: 10,
                letterSpacing: '0.14em',
                textTransform: 'uppercase',
                padding: '14px 16px 12px',
                whiteSpace: 'nowrap',
                transition: 'color 0.15s',
              }}
            >
              {label}
            </button>
          )
        })}
      </div>

      {/* ── Mutate error ─────────────────────────────────────────────────────────── */}
      {mutateError && (
        <div style={{ padding: '8px 16px', background: '#FF3B3018', borderBottom: '1px solid #FF3B3033' }}>
          <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, fontWeight: 700, color: '#FF3B30', textTransform: 'uppercase', letterSpacing: '0.14em' }}>
            {mutateError}
          </span>
        </div>
      )}

      {/* ── Content ──────────────────────────────────────────────────────────────── */}
      <div style={{ flex: 1, overflowY: 'auto' }}>

        {/* ════════ TAB 1: VISÃO GERAL ════════ */}
        {activeTab === 'OVERVIEW' && (
          <div style={{ padding: 16, maxWidth: 1024, margin: '0 auto' }}>

            {/* Status block */}
            {comp && (() => {
              const STATUS_TRANSITIONS: Record<string, { next: string; label: string; color: string }[]> = {
                draft:       [{ next: 'open',     label: 'OPEN REGISTRATIONS', color: '#D4FF3A' }],
                open:        [],   // automático via cron quando registration_deadline passar
                closed:      [],   // automático via cron quando start_date chegar
                in_progress: [{ next: 'finished', label: 'CLOSE',               color: '#FF3B30' }],
                finished:    [],
                cancelled:   [],
              }
              const transitions = STATUS_TRANSITIONS[comp.status] ?? []
              const canCancel = !['finished', 'cancelled'].includes(comp.status)

              // Chip informativo para transições automáticas
              const autoInfo: { label: string; date: string } | null =
                comp.status === 'open' && comp.registration_deadline
                  ? { label: 'REGISTRATIONS CLOSE ON', date: formatDate(comp.registration_deadline) }
                  : comp.status === 'closed' && comp.start_date
                  ? { label: 'EVENT STARTS ON', date: formatDate(comp.start_date) }
                  : null

              return (
                <div style={{ background: '#111111', border: '1px solid #2A2A2A', padding: '16px', marginBottom: 24, display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
                    <div>
                      <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 9, fontWeight: 700, letterSpacing: '0.16em', textTransform: 'uppercase', color: '#6B6B68', marginBottom: 8 }}>
                        COMPETITION STATUS
                      </div>
                      <StatusPill status={comp.status} />
                    </div>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                      {transitions.map(t => t.next === 'finished' ? (
                        finishConfirming ? (
                          <div key={t.next} style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                            <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 9, fontWeight: 700, color: '#FF3B30', letterSpacing: '0.12em', textTransform: 'uppercase' }}>
                              CLOSE COMPETITION? THIS ACTION CANNOT BE UNDONE.
                            </span>
                            <div style={{ display: 'flex', gap: 6 }}>
                              <button
                                disabled={statusChanging}
                                onClick={async () => { await handleStatusChange('finished'); setFinishConfirming(false) }}
                                style={{ background: '#FF3B30', border: 'none', padding: '7px 14px', fontFamily: 'JetBrains Mono, monospace', fontSize: 9, fontWeight: 900, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#0A0A0A', cursor: 'pointer' }}
                              >
                                YES, CLOSE
                              </button>
                              <button
                                onClick={() => setFinishConfirming(false)}
                                style={{ background: 'none', border: '1px solid #2A2A2A', padding: '7px 14px', fontFamily: 'JetBrains Mono, monospace', fontSize: 9, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#6B6B68', cursor: 'pointer' }}
                              >
                                BACK
                              </button>
                            </div>
                          </div>
                        ) : (
                          <button
                            key={t.next}
                            disabled={statusChanging}
                            onClick={() => setFinishConfirming(true)}
                            style={{ background: statusChanging ? '#1A1A1A' : t.color, border: 'none', padding: '10px 16px', fontFamily: 'JetBrains Mono, monospace', fontSize: 10, fontWeight: 900, letterSpacing: '0.16em', textTransform: 'uppercase', color: statusChanging ? '#3D3D3B' : '#0A0A0A', cursor: statusChanging ? 'not-allowed' : 'pointer' }}
                          >
                            {t.label}
                          </button>
                        )
                      ) : (
                        <button
                          key={t.next}
                          disabled={statusChanging}
                          onClick={() => handleStatusChange(t.next)}
                          style={{
                            background: statusChanging ? '#1A1A1A' : t.color,
                            border: 'none',
                            padding: '10px 16px',
                            fontFamily: 'JetBrains Mono, monospace',
                            fontSize: 10,
                            fontWeight: 900,
                            letterSpacing: '0.16em',
                            textTransform: 'uppercase',
                            color: statusChanging ? '#3D3D3B' : '#0A0A0A',
                            cursor: statusChanging ? 'not-allowed' : 'pointer',
                          }}
                        >
                          {statusChanging ? '...' : t.label}
                        </button>
                      ))}
                      {autoInfo && (
                        <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 9, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#6B6B68', padding: '6px 10px', border: '1px solid #2A2A2A' }}>
                          {autoInfo.label} · {autoInfo.date}
                        </span>
                      )}
                      {!autoInfo && transitions.length === 0 && (
                        <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 9, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#3D3D3B' }}>
                          {comp.status === 'cancelled' ? 'COMPETITION CANCELLED' : 'EVENT CLOSED'}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Cancelar competição */}
                  {canCancel && (
                    <div style={{ borderTop: '1px solid #1A1A1A', paddingTop: 12 }}>
                      {cancelConfirming ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                          <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 9, fontWeight: 700, color: '#FF3B30', letterSpacing: '0.12em', textTransform: 'uppercase' }}>
                            CANCEL COMPETITION? THIS ACTION CANNOT BE UNDONE.
                          </span>
                          <div style={{ display: 'flex', gap: 6 }}>
                            <button
                              disabled={statusChanging}
                              onClick={async () => { await handleStatusChange('cancelled'); setCancelConfirming(false) }}
                              style={{ background: '#FF3B30', border: 'none', padding: '7px 14px', fontFamily: 'JetBrains Mono, monospace', fontSize: 9, fontWeight: 900, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#0A0A0A', cursor: 'pointer' }}
                            >
                              YES, CANCEL
                            </button>
                            <button
                              onClick={() => setCancelConfirming(false)}
                              style={{ background: 'none', border: '1px solid #2A2A2A', padding: '7px 14px', fontFamily: 'JetBrains Mono, monospace', fontSize: 9, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#6B6B68', cursor: 'pointer' }}
                            >
                              VOLTAR
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button
                          onClick={() => setCancelConfirming(true)}
                          style={{ background: 'none', border: 'none', padding: 0, fontFamily: 'JetBrains Mono, monospace', fontSize: 9, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#3D3D3B', cursor: 'pointer' }}
                        >
                          CANCEL COMPETITION
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )
            })()}

            {/* KPI grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 1, marginBottom: 24 }}>
              {[
                {
                  label: 'OFFICIAL TEAMS',
                  value: `${approvedTeams.length} / ${teams.length}`,
                  color: '#D4FF3A',
                },
                {
                  label: 'PEND. APPROVAL',
                  value: String(pendingApprovalTeams.length),
                  color: '#FFB800',
                },
                {
                  label: 'PAGTO PENDENTE',
                  value: String(pendingPaymentTeams.length),
                  color: '#FFB800',
                },
                {
                  label: 'WODS PUBLICADOS',
                  value: `${publishedWods.length} / ${wods.length}`,
                  color: '#4DA3FF',
                },
              ].map(kpi => (
                <div key={kpi.label} style={{ background: '#111111', border: '1px solid #2A2A2A', padding: '20px 16px' }}>
                  <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 9, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#6B6B68', marginBottom: 8 }}>
                    {kpi.label}
                  </div>
                  <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 28, fontWeight: 900, color: kpi.color, lineHeight: 1 }}>
                    {kpi.value}
                  </div>
                </div>
              ))}
            </div>

            {/* Pending actions */}
            <div style={{ marginBottom: 24 }}>
              <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#6B6B68', marginBottom: 12 }}>
                ACOES PENDENTES
              </div>
              <div style={{ background: '#111111', border: '1px solid #2A2A2A' }}>
                {pendingApprovalTeams.length === 0 && pendingPaymentTeams.length === 0 && publishedWods.length === wods.length ? (
                  <div style={{ padding: '16px', color: '#3D3D3B', fontFamily: 'JetBrains Mono, monospace', fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase' }}>
                    Sem acoes pendentes
                  </div>
                ) : (
                  <>
                    {pendingApprovalTeams.length > 0 && (
                      <ActionItem
                        color='#4DA3FF'
                        text={`${pendingApprovalTeams.length} team(s) awaiting approval`}
                        onClick={() => setActiveTab('TEAMS')}
                        cta='VIEW TEAMS'
                      />
                    )}
                    {pendingPaymentTeams.length > 0 && (
                      <ActionItem
                        color='#FFB800'
                        text={`${pendingPaymentTeams.length} team(s) with pending payment`}
                        onClick={() => setActiveTab('TEAMS')}
                        cta='VIEW TEAMS'
                      />
                    )}
                    {wods.filter(w => w.status !== 'published').length > 0 && (
                      <ActionItem
                        color='#6B6B68'
                        text={`${wods.filter(w => w.status !== 'published').length} WOD(s) not published`}
                        onClick={() => setActiveTab('WODS')}
                        cta='VIEW WODS'
                      />
                    )}
                  </>
                )}
              </div>
            </div>

            {/* Recent activity */}
            <div>
              <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#6B6B68', marginBottom: 12 }}>
                ATIVIDADE RECENTE
              </div>
              <div style={{ background: '#111111', border: '1px solid #2A2A2A' }}>
                {auditLog.slice(0, 4).length === 0 ? (
                  <div style={{ padding: '16px', color: '#3D3D3B', fontFamily: 'JetBrains Mono, monospace', fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase' }}>
                    Sem atividade registrada
                  </div>
                ) : (
                  auditLog.slice(0, 4).map(entry => (
                    <AuditRow key={entry.id} entry={entry} profiles={profiles} roles={roles} />
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* ════════ TAB 2: EQUIPES ════════ */}
        {activeTab === 'TEAMS' && (
          <div style={{ padding: 16, maxWidth: 1200, margin: '0 auto' }}>

            {/* Division filter chips */}
            {divisions.length > 0 && (
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 8, alignItems: 'center' }}>
                <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 9, fontWeight: 700, letterSpacing: '0.14em', color: '#3D3D3B', textTransform: 'uppercase', marginRight: 2 }}>DIV</span>
                {[{ id: 'all', label: 'TODAS' }, ...divisions.map(d => ({ id: d.id, label: divisionLabel(d) }))].map(d => (
                  <button
                    key={d.id}
                    onClick={() => setDivisionFilter(d.id)}
                    style={{
                      background: divisionFilter === d.id ? '#D4FF3A' : '#111111',
                      color: divisionFilter === d.id ? '#0A0A0A' : '#6B6B68',
                      border: `1px solid ${divisionFilter === d.id ? '#D4FF3A' : '#2A2A2A'}`,
                      fontFamily: 'JetBrains Mono, monospace',
                      fontWeight: 700,
                      fontSize: 9,
                      letterSpacing: '0.12em',
                      textTransform: 'uppercase',
                      padding: '5px 10px',
                      cursor: 'pointer',
                    }}
                  >
                    {d.label}
                  </button>
                ))}
              </div>
            )}

            {/* Filter chips + search */}
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12, alignItems: 'center' }}>
              {TEAM_FILTERS.map(f => (
                <button
                  key={f.key}
                  onClick={() => setTeamFilter(f.key)}
                  style={{
                    background: teamFilter === f.key ? '#D4FF3A' : '#111111',
                    color: teamFilter === f.key ? '#0A0A0A' : '#6B6B68',
                    border: `1px solid ${teamFilter === f.key ? '#D4FF3A' : '#2A2A2A'}`,
                    fontFamily: 'JetBrains Mono, monospace',
                    fontWeight: 700,
                    fontSize: 9,
                    letterSpacing: '0.14em',
                    textTransform: 'uppercase',
                    padding: '5px 10px',
                    cursor: 'pointer',
                  }}
                >
                  {f.label}
                </button>
              ))}
              <input
                type='text'
                placeholder='BUSCAR EQUIPE...'
                value={teamSearch}
                onChange={e => setTeamSearch(e.target.value)}
                style={{
                  background: '#111111',
                  border: '1px solid #2A2A2A',
                  color: '#F5F5F0',
                  fontFamily: 'JetBrains Mono, monospace',
                  fontSize: 10,
                  letterSpacing: '0.12em',
                  textTransform: 'uppercase',
                  padding: '5px 10px',
                  outline: 'none',
                  width: 180,
                }}
              />
            </div>

            {/* Table */}
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 720 }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #2A2A2A' }}>
                    {['#','EQUIPE + BOX','DIVISÃO','ATLETAS','STATUS','PAGTO','ACOES'].map(h => (
                      <th key={h} style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 9, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#6B6B68', padding: '8px 12px', textAlign: 'left', background: '#0D0D0D' }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredTeams.map((team, idx) => {
                    const members = membersByTeam[team.id] ?? []
                    const memberCount = members.filter(m => m.user_id || m.invited_email).length
                    const captain = profiles[team.captain_user_id]
                    const isRejecting = rejectTeamId === team.id
                    const isExpanded = expandedTeamId === team.id
                    return (
                      <>
                      <tr
                        key={team.id}
                        onClick={() => setExpandedTeamId(isExpanded ? null : team.id)}
                        style={{ borderBottom: isExpanded ? 'none' : '1px solid #1A1A1A', cursor: 'pointer', background: isExpanded ? '#111111' : 'transparent' }}
                      >
                        <td style={{ padding: '12px', fontFamily: 'JetBrains Mono, monospace', fontWeight: 700, fontSize: 11, color: '#3D3D3B' }}>
                          {pad2(idx)}
                        </td>
                        <td style={{ padding: '12px' }}>
                          <div style={{ fontWeight: 700, fontSize: 14 }}>{team.name}</div>
                          {team.box && (
                            <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 9, color: '#6B6B68', letterSpacing: '0.12em', textTransform: 'uppercase', marginTop: 2 }}>
                              {team.box}
                            </div>
                          )}
                        </td>
                        <td style={{ padding: '12px' }}>
                          {team.division_id && divisionById[team.division_id] ? (
                            <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 9, fontWeight: 700, letterSpacing: '0.12em', color: '#D4FF3A', textTransform: 'uppercase' }}>
                              {divisionLabel(divisionById[team.division_id])}
                            </span>
                          ) : (
                            <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 9, color: '#3D3D3B' }}>—</span>
                          )}
                        </td>
                        <td style={{ padding: '12px', fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: '#6B6B68' }}>
                          {memberCount} / {team.division_id && divisionById[team.division_id] ? FORMAT_SIZE[divisionById[team.division_id].format] ?? '?' : '?'}
                        </td>
                        <td style={{ padding: '12px' }}>
                          <StatusPill status={team.status} />
                        </td>
                        <td style={{ padding: '12px' }}>
                          <StatusPill status={team.payment_status} />
                        </td>
                        <td style={{ padding: '12px' }} onClick={e => e.stopPropagation()}>
                          {(() => {
                            const pendingInviteCount = members.filter(m => m.status === 'invited').length
                            const canApprove = pendingInviteCount === 0
                            if (!canApprove && team.status === 'pending_approval') {
                              return (
                                <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 9, fontWeight: 700, color: '#FFB800', letterSpacing: '0.12em', textTransform: 'uppercase' }}>
                                  {pendingInviteCount} CONVITE{pendingInviteCount > 1 ? 'S' : ''} PENDENTE{pendingInviteCount > 1 ? 'S' : ''}
                                </span>
                              )
                            }
                            return null
                          })()}
                          {isRejecting ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                              <input
                                autoFocus
                                type='text'
                                placeholder='Motivo da rejeicao...'
                                value={rejectReason}
                                onChange={e => setRejectReason(e.target.value)}
                                style={{ background: '#0D0D0D', border: '1px solid #FF3B30', color: '#F5F5F0', fontFamily: 'JetBrains Mono, monospace', fontSize: 10, padding: '4px 8px', outline: 'none', width: 180 }}
                              />
                              <div style={{ display: 'flex', gap: 4 }}>
                                <Btn color='#FF3B30' disabled={!rejectReason.trim() || mutating} onClick={() => handleReject(team.id)}>
                                  CONFIRMAR
                                </Btn>
                                <Btn color='#6B6B68' onClick={() => { setRejectTeamId(null); setRejectReason('') }}>
                                  CANCELAR
                                </Btn>
                              </div>
                            </div>
                          ) : (
                            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                              {team.status === 'pending_approval' && (
                                <>
                                  <Btn color='#D4FF3A' disabled={mutating || members.some(m => m.status === 'invited')} onClick={() => teamAction(team.id, 'approve')}>
                                    APROVAR
                                  </Btn>
                                  <Btn color='#FF3B30' disabled={mutating} onClick={() => { setRejectTeamId(team.id); setRejectReason('') }}>
                                    REJEITAR
                                  </Btn>
                                </>
                              )}
                              {team.status === 'pending_payment' && (
                                <Btn color='#6B6B68' disabled={mutating} onClick={() => teamAction(team.id, 'confirm_payment')}>
                                  CONFIRMAR PAGTO
                                </Btn>
                              )}
                              {team.status === 'approved' && (
                                <>
                                  {!team.checked_in && (
                                    <Btn color='#4DA3FF' disabled={mutating} onClick={() => teamAction(team.id, 'check_in')}>
                                      CHECK-IN
                                    </Btn>
                                  )}
                                  {cancelTeamId === team.id ? (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                      <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 9, fontWeight: 700, color: '#FFB800', letterSpacing: '0.12em', textTransform: 'uppercase' }}>
                                        CONFIRMAR CANCELAMENTO?
                                      </span>
                                      <div style={{ display: 'flex', gap: 4 }}>
                                        <Btn color='#FF3B30' disabled={mutating} onClick={async () => { await teamAction(team.id, 'cancel'); setCancelTeamId(null) }}>
                                          YES, CANCEL
                                        </Btn>
                                        <Btn color='#6B6B68' onClick={() => setCancelTeamId(null)}>
                                          BACK
                                        </Btn>
                                      </div>
                                    </div>
                                  ) : (
                                    <Btn color='#6B6B68' disabled={mutating} onClick={() => setCancelTeamId(team.id)}>
                                      CANCELAR
                                    </Btn>
                                  )}
                                </>
                              )}
                              {team.status === 'rejected' && (
                                <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 9, color: '#3D3D3B', letterSpacing: '0.12em', textTransform: 'uppercase' }}>
                                  rejeitada
                                </span>
                              )}
                            </div>
                          )}
                        </td>
                      </tr>
                      {isExpanded && (
                        <tr key={`${team.id}-members`} style={{ borderBottom: '1px solid #1A1A1A', background: '#0D0D0D' }}>
                          <td colSpan={7} style={{ padding: '10px 16px 16px 48px' }}>
                            <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 9, fontWeight: 700, letterSpacing: '0.14em', color: '#6B6B68', textTransform: 'uppercase', marginBottom: 8 }}>
                              ATLETAS
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                              {members.filter(m => m.user_id || m.invited_email).map(m => {
                                const p = m.user_id ? profiles[m.user_id] : null
                                const name = p?.name ?? m.invited_email ?? 'Aguardando'
                                const handle = p?.username ? `@${p.username}` : null
                                const isCap = m.user_id === team.captain_user_id
                                return (
                                  <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                    <span style={{ fontSize: 13, color: '#F5F5F0', fontWeight: isCap ? 700 : 400, minWidth: 160 }}>
                                      {name}
                                    </span>
                                    {handle && (
                                      <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 9, color: '#6B6B68', letterSpacing: '0.1em' }}>
                                        {handle}
                                      </span>
                                    )}
                                    {isCap && (
                                      <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 9, fontWeight: 700, color: '#D4FF3A', letterSpacing: '0.14em', textTransform: 'uppercase' }}>
                                        CAPITAO
                                      </span>
                                    )}
                                    <StatusPill status={m.status} />
                                  </div>
                                )
                              })}
                              {members.filter(m => m.user_id || m.invited_email).length === 0 && (
                                <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 9, color: '#3D3D3B', letterSpacing: '0.12em', textTransform: 'uppercase' }}>
                                  NENHUM ATLETA
                                </span>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                      </>
                    )
                  })}
                  {filteredTeams.length === 0 && (
                    <tr>
                      <td colSpan={7} style={{ padding: '24px 12px', textAlign: 'center', color: '#3D3D3B', fontFamily: 'JetBrains Mono, monospace', fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase' }}>
                        NENHUMA EQUIPE ENCONTRADA
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            <div style={{ marginTop: 12, fontFamily: 'JetBrains Mono, monospace', fontSize: 9, color: '#3D3D3B', letterSpacing: '0.12em', textTransform: 'uppercase' }}>
              MOSTRANDO {filteredTeams.length} DE {teams.length}
            </div>
          </div>
        )}

        {/* ════════ TAB 3: WODS ════════ */}
        {activeTab === 'WODS' && (
          <div style={{ padding: 16, maxWidth: 900, margin: '0 auto' }}>
            <div style={{ marginBottom: 16 }}>
              {!showWodForm ? (
                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <Btn color='#D4FF3A' onClick={() => setShowWodForm(true)}>+ CRIAR WOD</Btn>
                </div>
              ) : (
                <div style={{ background: '#111111', border: '1px solid #2A2A2A', padding: 20, marginBottom: 8 }}>
                  <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 9, fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#D4FF3A', marginBottom: 16 }}>
                    NOVO WOD
                  </div>

                  {/* Nome */}
                  <div style={{ marginBottom: 12 }}>
                    <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 9, fontWeight: 700, letterSpacing: '0.16em', textTransform: 'uppercase', color: '#6B6B68', marginBottom: 6 }}>
                      NOME <span style={{ color: '#D4FF3A' }}>*</span>
                    </div>
                    <input
                      value={wodName}
                      onChange={e => setWodName(e.target.value)}
                      placeholder="Ex: TRIPLET · FOR TIME"
                      maxLength={60}
                      style={{ width: '100%', background: '#0A0A0A', border: '1px solid #2A2A2A', color: '#F5F5F0', fontFamily: 'inherit', fontSize: 14, padding: '8px 12px', outline: 'none', boxSizing: 'border-box' }}
                    />
                  </div>

                  {/* Descrição */}
                  <div style={{ marginBottom: 12 }}>
                    <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 9, fontWeight: 700, letterSpacing: '0.16em', textTransform: 'uppercase', color: '#6B6B68', marginBottom: 6 }}>DESCRIPTION</div>
                    <textarea
                      value={wodDesc}
                      onChange={e => setWodDesc(e.target.value)}
                      placeholder="21-15-9 · Thrusters · Bar Muscle-ups..."
                      rows={2}
                      style={{ width: '100%', background: '#0A0A0A', border: '1px solid #2A2A2A', color: '#F5F5F0', fontFamily: 'inherit', fontSize: 13, padding: '8px 12px', outline: 'none', resize: 'none', boxSizing: 'border-box' }}
                    />
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
                    {/* Score type */}
                    <div>
                      <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 9, fontWeight: 700, letterSpacing: '0.16em', textTransform: 'uppercase', color: '#6B6B68', marginBottom: 6 }}>TIPO DE SCORE</div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                        {([
                          { v: 'time', l: 'FOR TIME' },
                          { v: 'reps', l: 'AMRAP · REPS' },
                          { v: 'weight', l: 'MAX LOAD · KG' },
                          { v: 'rounds_plus_reps', l: 'ROUNDS + REPS' },
                        ] as const).map(opt => (
                          <button
                            key={opt.v}
                            type="button"
                            onClick={() => setWodScoreType(opt.v)}
                            style={{
                              background: wodScoreType === opt.v ? '#D4FF3A' : '#0A0A0A',
                              border: `1px solid ${wodScoreType === opt.v ? '#D4FF3A' : '#2A2A2A'}`,
                              color: wodScoreType === opt.v ? '#0A0A0A' : '#6B6B68',
                              fontFamily: 'JetBrains Mono, monospace',
                              fontSize: 9, fontWeight: 700,
                              letterSpacing: '0.14em', textTransform: 'uppercase',
                              padding: '6px 10px', cursor: 'pointer', textAlign: 'left',
                            }}
                          >
                            {opt.l}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* CAP */}
                    <div>
                      <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 9, fontWeight: 700, letterSpacing: '0.16em', textTransform: 'uppercase', color: '#6B6B68', marginBottom: 6 }}>TIME CAP</div>
                      <input
                        value={wodCap}
                        onChange={e => setWodCap(e.target.value)}
                        placeholder="Ex: 15 MIN"
                        maxLength={20}
                        style={{ width: '100%', background: '#0A0A0A', border: '1px solid #2A2A2A', color: '#F5F5F0', fontFamily: 'inherit', fontSize: 13, padding: '8px 12px', outline: 'none', boxSizing: 'border-box' }}
                      />
                      <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 9, color: '#3D3D3B', marginTop: 6 }}>
                        SCORE ORDER: {wodScoreType === 'time' ? 'MENOR TEMPO = 1º' : 'MAIOR VALOR = 1º'}
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: 8 }}>
                    <button
                      onClick={handleCreateWod}
                      disabled={!wodName.trim() || wodSaving}
                      style={{
                        background: wodName.trim() ? '#D4FF3A' : '#1A1A1A',
                        border: 'none', padding: '10px 20px',
                        fontFamily: 'JetBrains Mono, monospace', fontSize: 10, fontWeight: 900,
                        letterSpacing: '0.16em', textTransform: 'uppercase',
                        color: wodName.trim() ? '#0A0A0A' : '#3D3D3B',
                        cursor: wodName.trim() ? 'pointer' : 'not-allowed',
                      }}
                    >
                      {wodSaving ? 'SALVANDO...' : 'CRIAR WOD'}
                    </button>
                    <button
                      onClick={() => { setShowWodForm(false); setWodName(''); setWodDesc(''); setWodCap('') }}
                      style={{ background: 'none', border: '1px solid #2A2A2A', padding: '10px 16px', fontFamily: 'JetBrains Mono, monospace', fontSize: 10, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#6B6B68', cursor: 'pointer' }}
                    >
                      CANCELAR
                    </button>
                  </div>
                </div>
              )}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              {wods.map((wod, idx) => {
                const wodResultCount = results.filter(r => r.wod_id === wod.id).length
                const progress = approvedTeams.length > 0 ? (wodResultCount / approvedTeams.length) * 100 : 0
                const canPublish = wod.status === 'submitted' || wod.status === 'draft'
                const meta = [wod.score_type, wod.cap ? `CAP ${wod.cap}` : null, wod.description].filter(Boolean).join(' · ')
                const isEditing = editingWodId === wod.id
                return (
                  <div key={wod.id} style={{ background: '#111111', border: `1px solid ${isEditing ? '#D4FF3A33' : '#2A2A2A'}` }}>
                    {/* Row */}
                    <div style={{ padding: '16px', display: 'grid', gridTemplateColumns: '36px 1fr 200px auto', gap: 16, alignItems: 'center' }}>
                      <div style={{ fontFamily: 'JetBrains Mono, monospace', fontWeight: 900, fontSize: 24, color: '#3D3D3B', lineHeight: 1 }}>
                        {String(idx + 1).padStart(2, '0')}
                      </div>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: 18 }}>{wod.name}</div>
                        <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: '#6B6B68', letterSpacing: '0.12em', textTransform: 'uppercase', marginTop: 4 }}>
                          {meta}
                        </div>
                      </div>
                      <div>
                        <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 9, fontWeight: 700, color: '#6B6B68', letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: 6 }}>
                          RESULTS · {wodResultCount} / {approvedTeams.length}
                        </div>
                        <div style={{ height: 6, background: '#1A1A1A', width: '100%' }}>
                          <div style={{ height: '100%', width: `${Math.min(100, progress)}%`, background: '#D4FF3A' }} />
                        </div>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'flex-end' }}>
                        <StatusPill status={wod.status} />
                        {canPublish && (
                          <Btn color='#D4FF3A' disabled={mutating || isEditing} onClick={() => publishWod(wod.id)}>
                            PUBLICAR
                          </Btn>
                        )}
                        {wod.status === 'published' && (
                          despublicarConfirmId === wod.id ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'flex-end' }}>
                              <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 8, fontWeight: 700, color: '#FF3B30', letterSpacing: '0.12em', textTransform: 'uppercase', textAlign: 'right' }}>
                                DESPUBLICAR?
                              </span>
                              <div style={{ display: 'flex', gap: 4 }}>
                                <Btn color='#FF3B30' disabled={mutating} onClick={() => { supabase.rpc('update_wod_status', { p_wod_id: wod.id, p_status: 'draft' }).then(() => { setDespublicarConfirmId(null); load() }) }}>
                                  SIM
                                </Btn>
                                <Btn color='#6B6B68' onClick={() => setDespublicarConfirmId(null)}>
                                  NO
                                </Btn>
                              </div>
                            </div>
                          ) : (
                            <Btn color='#6B6B68' disabled={mutating || isEditing} onClick={() => setDespublicarConfirmId(wod.id)}>
                              DESPUBLICAR
                            </Btn>
                          )
                        )}
                        <Btn
                          color={isEditing ? '#FFB800' : '#4DA3FF'}
                          disabled={mutating}
                          onClick={() => isEditing ? cancelEditWod() : openEditWod(wod)}
                        >
                          {isEditing ? 'CANCELAR' : 'EDITAR'}
                        </Btn>
                      </div>
                    </div>

                    {/* Inline edit form */}
                    {isEditing && (
                      <div style={{ borderTop: '1px solid #2A2A2A', padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
                        <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 9, fontWeight: 700, letterSpacing: '0.16em', textTransform: 'uppercase', color: '#D4FF3A' }}>
                          EDITANDO WOD {String(idx + 1).padStart(2, '0')}
                        </div>

                        <div>
                          <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 9, fontWeight: 700, letterSpacing: '0.16em', textTransform: 'uppercase', color: '#6B6B68', marginBottom: 6 }}>NOME</div>
                          <input
                            value={editWodName}
                            onChange={e => setEditWodName(e.target.value)}
                            maxLength={60}
                            style={{ width: '100%', background: '#0A0A0A', border: '1px solid #2A2A2A', color: '#F5F5F0', fontFamily: 'inherit', fontSize: 14, padding: '8px 12px', outline: 'none', boxSizing: 'border-box' }}
                          />
                        </div>

                        <div>
                          <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 9, fontWeight: 700, letterSpacing: '0.16em', textTransform: 'uppercase', color: '#6B6B68', marginBottom: 6 }}>DESCRIPTION</div>
                          <textarea
                            value={editWodDesc}
                            onChange={e => setEditWodDesc(e.target.value)}
                            rows={2}
                            style={{ width: '100%', background: '#0A0A0A', border: '1px solid #2A2A2A', color: '#F5F5F0', fontFamily: 'inherit', fontSize: 13, padding: '8px 12px', outline: 'none', resize: 'none', boxSizing: 'border-box' }}
                          />
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                          <div>
                            <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 9, fontWeight: 700, letterSpacing: '0.16em', textTransform: 'uppercase', color: '#6B6B68', marginBottom: 6 }}>TIPO DE SCORE</div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                              {([
                                { v: 'time', l: 'FOR TIME' },
                                { v: 'reps', l: 'AMRAP · REPS' },
                                { v: 'weight', l: 'MAX LOAD · KG' },
                                { v: 'rounds_plus_reps', l: 'ROUNDS + REPS' },
                              ] as const).map(opt => (
                                <button
                                  key={opt.v}
                                  type="button"
                                  onClick={() => setEditWodScoreType(opt.v)}
                                  style={{
                                    background: editWodScoreType === opt.v ? '#D4FF3A' : '#0A0A0A',
                                    border: `1px solid ${editWodScoreType === opt.v ? '#D4FF3A' : '#2A2A2A'}`,
                                    color: editWodScoreType === opt.v ? '#0A0A0A' : '#6B6B68',
                                    fontFamily: 'JetBrains Mono, monospace',
                                    fontSize: 9, fontWeight: 700,
                                    letterSpacing: '0.14em', textTransform: 'uppercase',
                                    padding: '6px 10px', cursor: 'pointer', textAlign: 'left',
                                  }}
                                >
                                  {opt.l}
                                </button>
                              ))}
                            </div>
                          </div>
                          <div>
                            <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 9, fontWeight: 700, letterSpacing: '0.16em', textTransform: 'uppercase', color: '#6B6B68', marginBottom: 6 }}>TIME CAP</div>
                            <input
                              value={editWodCap}
                              onChange={e => setEditWodCap(e.target.value)}
                              placeholder="Ex: 15 MIN"
                              maxLength={20}
                              style={{ width: '100%', background: '#0A0A0A', border: '1px solid #2A2A2A', color: '#F5F5F0', fontFamily: 'inherit', fontSize: 13, padding: '8px 12px', outline: 'none', boxSizing: 'border-box' }}
                            />
                            <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 9, color: '#3D3D3B', marginTop: 6 }}>
                              SCORE ORDER: {editWodScoreType === 'time' ? 'MENOR TEMPO = 1º' : 'MAIOR VALOR = 1º'}
                            </div>

                            <div style={{ marginTop: 16 }}>
                              <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 9, fontWeight: 700, letterSpacing: '0.16em', textTransform: 'uppercase', color: '#6B6B68', marginBottom: 6 }}>STATUS</div>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                {(['draft', 'submitted', 'published'] as const).map(s => (
                                  <button
                                    key={s}
                                    type="button"
                                    onClick={() => setEditWodStatus(s)}
                                    style={{
                                      background: editWodStatus === s ? '#1A1A1A' : '#0A0A0A',
                                      border: `1px solid ${editWodStatus === s ? '#D4FF3A' : '#2A2A2A'}`,
                                      color: editWodStatus === s ? '#D4FF3A' : '#6B6B68',
                                      fontFamily: 'JetBrains Mono, monospace',
                                      fontSize: 9, fontWeight: 700,
                                      letterSpacing: '0.14em', textTransform: 'uppercase',
                                      padding: '6px 10px', cursor: 'pointer', textAlign: 'left',
                                    }}
                                  >
                                    {s === 'draft' ? 'DRAFT' : s === 'submitted' ? 'UNDER REVIEW' : 'PUBLISHED'}
                                    {editWodStatus === s ? ' ←' : ''}
                                  </button>
                                ))}
                              </div>
                            </div>
                          </div>
                        </div>

                        <div style={{ display: 'flex', gap: 8 }}>
                          <button
                            onClick={handleEditWod}
                            disabled={!editWodName.trim() || editWodSaving}
                            style={{
                              background: editWodName.trim() ? '#D4FF3A' : '#1A1A1A',
                              border: 'none', padding: '10px 20px',
                              fontFamily: 'JetBrains Mono, monospace', fontSize: 10, fontWeight: 900,
                              letterSpacing: '0.16em', textTransform: 'uppercase',
                              color: editWodName.trim() ? '#0A0A0A' : '#3D3D3B',
                              cursor: editWodName.trim() ? 'pointer' : 'not-allowed',
                            }}
                          >
                            {editWodSaving ? 'SALVANDO...' : 'SALVAR'}
                          </button>
                          <button
                            onClick={cancelEditWod}
                            style={{ background: 'none', border: '1px solid #2A2A2A', padding: '10px 16px', fontFamily: 'JetBrains Mono, monospace', fontSize: 10, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#6B6B68', cursor: 'pointer' }}
                          >
                            CANCELAR
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
              {wods.length === 0 && (
                <div style={{ padding: 32, textAlign: 'center', color: '#3D3D3B', fontFamily: 'JetBrains Mono, monospace', fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase' }}>
                  NENHUM WOD CADASTRADO
                </div>
              )}
            </div>
          </div>
        )}

        {/* ════════ TAB 4: JUDGES ════════ */}
        {activeTab === 'JUDGES' && (
          <div style={{ padding: 16, maxWidth: 900, margin: '0 auto' }}>

            {/* Invite header */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
              {!showInviteForm && (
                <Btn color='#D4FF3A' onClick={() => { setShowInviteForm(true); setInviteMsg(null) }}>
                  CONVIDAR JUDGE
                </Btn>
              )}
            </div>

            {/* Invite form */}
            {showInviteForm && (
              <div style={{ background: '#111111', border: '1px solid #2A2A2A', padding: 16, marginBottom: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#6B6B68' }}>
                  CONVIDAR POR USERNAME
                </div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                  <input
                    type='text'
                    placeholder='@username'
                    value={inviteUsername}
                    onChange={e => setInviteUsername(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleInviteJudge()}
                    style={{ background: '#0D0D0D', border: '1px solid #2A2A2A', color: '#F5F5F0', fontFamily: 'JetBrains Mono, monospace', fontSize: 11, padding: '6px 10px', outline: 'none', width: 220 }}
                  />
                  <Btn color='#D4FF3A' disabled={!inviteUsername.trim() || inviteLoading} onClick={handleInviteJudge}>
                    {inviteLoading ? 'ENVIANDO...' : 'ENVIAR CONVITE'}
                  </Btn>
                  <Btn color='#6B6B68' onClick={() => { setShowInviteForm(false); setInviteUsername(''); setInviteMsg(null) }}>
                    CANCELAR
                  </Btn>
                </div>
                {inviteMsg && (
                  <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: inviteMsg.ok ? '#D4FF3A' : '#FF3B30' }}>
                    {inviteMsg.text}
                  </span>
                )}
              </div>
            )}

            {/* Judges list */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              {judgeRoles.map(r => {
                const p = profiles[r.user_id]
                const initials = p?.name ? p.name.split(' ').slice(0, 2).map(s => s[0]).join('').toUpperCase() : '?'
                const isHead = r.role === 'head_judge'
                const assignedWods = (r.assigned_wod_ids ?? [])
                  .map(wid => wods.findIndex(w => w.id === wid))
                  .filter(i => i >= 0)
                  .map(i => String(i + 1).padStart(2, '0'))
                const submitted = results.filter(res => results.findIndex(x => x.id === res.id) >= 0).length

                return (
                  <div key={r.id} style={{ background: '#111111', border: '1px solid #2A2A2A', padding: '12px 16px', display: 'grid', gridTemplateColumns: '32px 1fr auto auto auto', gap: 12, alignItems: 'center' }}>
                    <div style={{ width: 32, height: 32, background: isHead ? '#D4FF3A' : '#1A1A1A', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'JetBrains Mono, monospace', fontWeight: 900, fontSize: 11, color: isHead ? '#0A0A0A' : '#6B6B68' }}>
                      {initials}
                    </div>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 13 }}>{p?.name ?? r.user_id}</div>
                      {p?.username && (
                        <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 9, color: '#6B6B68', letterSpacing: '0.12em' }}>
                          @{p.username}
                        </div>
                      )}
                    </div>
                    <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 9, color: '#6B6B68', letterSpacing: '0.12em', textTransform: 'uppercase' }}>
                      {assignedWods.length > 0 ? `WODS ${assignedWods.join(' · ')}` : '—'}
                    </div>
                    <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 9, color: '#6B6B68', letterSpacing: '0.12em', textTransform: 'uppercase' }}>
                      {submitted} SUBMIT.
                    </div>
                    <div>
                      {isHead ? (
                        <span style={{ fontFamily: 'JetBrains Mono, monospace', fontWeight: 900, fontSize: 9, letterSpacing: '0.16em', textTransform: 'uppercase', color: '#D4FF3A', padding: '4px 7px', border: '1px solid #D4FF3A33' }}>
                          HEAD JUDGE
                        </span>
                      ) : (
                        <StatusPill status='accepted' />
                      )}
                    </div>
                  </div>
                )
              })}

              {/* Pending invites */}
              {pendingInvites.map(inv => {
                const p = inv.invited_user_id ? profiles[inv.invited_user_id] : null
                const display = p?.name ?? inv.invited_email ?? inv.invited_user_id ?? '—'
                const handle = p?.username ? `@${p.username}` : inv.invited_email ?? null
                return (
                  <div key={inv.id} style={{ background: '#0D0D0D', border: '1px solid #1A1A1A', padding: '12px 16px', display: 'grid', gridTemplateColumns: '32px 1fr auto auto auto', gap: 12, alignItems: 'center' }}>
                    <div style={{ width: 32, height: 32, background: '#1A1A1A', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'JetBrains Mono, monospace', fontWeight: 900, fontSize: 11, color: '#3D3D3B' }}>
                      ?
                    </div>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 13, color: '#6B6B68' }}>{display}</div>
                      {handle && (
                        <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 9, color: '#3D3D3B', letterSpacing: '0.12em' }}>
                          {handle}
                        </div>
                      )}
                    </div>
                    <div />
                    <div />
                    <StatusPill status='pending' />
                  </div>
                )
              })}

              {judgeRoles.length === 0 && pendingInvites.length === 0 && (
                <div style={{ padding: 32, textAlign: 'center', color: '#3D3D3B', fontFamily: 'JetBrains Mono, monospace', fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase' }}>
                  NENHUM JUDGE CADASTRADO
                </div>
              )}
            </div>
          </div>
        )}

        {/* ════════ TAB 5: RESULTADOS ════════ */}
        {activeTab === 'RESULTS' && (
          <div style={{ padding: 16, maxWidth: 1000, margin: '0 auto' }}>

            {/* WOD chips */}
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
              {wods.map((wod, idx) => (
                <button
                  key={wod.id}
                  onClick={() => { setSelectedWodId(wod.id); setEnterTeamId(null); setResultDivisionFilter('all'); setSavedMsg(null) }}
                  style={{
                    background: selectedWodId === wod.id ? '#D4FF3A' : '#111111',
                    color: selectedWodId === wod.id ? '#0A0A0A' : '#6B6B68',
                    border: `1px solid ${selectedWodId === wod.id ? '#D4FF3A' : '#2A2A2A'}`,
                    fontFamily: 'JetBrains Mono, monospace',
                    fontWeight: 700,
                    fontSize: 10,
                    letterSpacing: '0.14em',
                    textTransform: 'uppercase',
                    padding: '6px 12px',
                    cursor: 'pointer',
                  }}
                >
                  WOD {String(idx + 1).padStart(2, '0')} · {wod.name}
                </button>
              ))}
            </div>

            {/* Division filter chips */}
            {divisions.length > 0 && (
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 14 }}>
                {[{ id: 'all', label: 'TODAS' }, ...divisions.map(d => ({ id: d.id, label: divisionLabel(d) }))].map(opt => (
                  <button
                    key={opt.id}
                    onClick={() => { setResultDivisionFilter(opt.id); setEnterTeamId(null) }}
                    style={{
                      background: resultDivisionFilter === opt.id ? '#1A1A1A' : 'none',
                      border: `1px solid ${resultDivisionFilter === opt.id ? '#D4FF3A' : '#2A2A2A'}`,
                      color: resultDivisionFilter === opt.id ? '#D4FF3A' : '#6B6B68',
                      fontFamily: 'JetBrains Mono, monospace',
                      fontWeight: 700,
                      fontSize: 9,
                      letterSpacing: '0.14em',
                      textTransform: 'uppercase',
                      padding: '4px 10px',
                      cursor: 'pointer',
                    }}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            )}

            {/* Success banner */}
            {savedMsg && (
              <div style={{ background: '#D4FF3A18', border: '1px solid #D4FF3A44', padding: '10px 14px', marginBottom: 12 }}>
                <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, fontWeight: 700, color: '#D4FF3A', letterSpacing: '0.12em', textTransform: 'uppercase' }}>
                  {savedMsg}
                </span>
              </div>
            )}

            {!selectedWod ? (
              <div style={{ padding: 32, textAlign: 'center', color: '#3D3D3B', fontFamily: 'JetBrains Mono, monospace', fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase' }}>
                SELECIONE UM WOD
              </div>
            ) : (
              <>
                {/* Summary row */}
                <div style={{ display: 'flex', gap: 16, alignItems: 'center', marginBottom: 12, flexWrap: 'wrap' }}>
                  <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: '#6B6B68', letterSpacing: '0.12em', textTransform: 'uppercase' }}>
                    {sortedWodResults.length} com resultado / {resultFilteredApproved.length} total · {teamsWithoutResult.length} sem resultado
                  </span>
                  {selectedWod.status !== 'published' && (
                    <Btn color='#D4FF3A' disabled={mutating} onClick={() => publishWod(selectedWod.id)}>
                      PUBLISH RESULTS
                    </Btn>
                  )}
                </div>

                {/* Warning banner */}
                {teamsWithoutResult.length > 0 && (
                  <div style={{ background: '#FFB80012', border: '1px solid #FFB80033', padding: '10px 14px', marginBottom: 12 }}>
                    <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, fontWeight: 700, color: '#FFB800', letterSpacing: '0.12em', textTransform: 'uppercase' }}>
                      {teamsWithoutResult.length} equipe(s) sem resultado. Publicar deixa elas com 0 pts.
                    </span>
                  </div>
                )}

                {/* Results table */}
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid #2A2A2A' }}>
                        {['#','EQUIPE','RESULTADO','POSICAO','PONTOS CF','ACOES'].map(h => (
                          <th key={h} style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 9, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#6B6B68', padding: '8px 12px', textAlign: 'left', background: '#0D0D0D' }}>
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {sortedWodResults.map((res, pos) => {
                        const team = teams.find(t => t.id === res.team_id)
                        const points = CF_POINTS[pos] ?? 0
                        const isEditing = overrideResultId === res.id
                        const displayVal = res.score_numeric != null
                          ? decodeScore(selectedWod.score_type as WodScoreType, res.score_numeric)
                          : '—'
                        return (
                          <tr key={res.id} style={{ borderBottom: '1px solid #1A1A1A' }}>
                            <td style={{ padding: '12px', fontFamily: 'JetBrains Mono, monospace', fontWeight: 700, fontSize: 11, color: '#3D3D3B' }}>
                              {String(pos + 1).padStart(2, '0')}
                            </td>
                            <td style={{ padding: '12px', fontWeight: 700, fontSize: 13 }}>
                              {team?.name ?? res.team_id}
                            </td>
                            <td style={{ padding: '12px', fontFamily: 'JetBrains Mono, monospace', fontSize: 12, color: '#F5F5F0' }}>
                              {displayVal}
                            </td>
                            <td style={{ padding: '12px', fontFamily: 'JetBrains Mono, monospace', fontSize: 12, color: '#6B6B68' }}>
                              {pos + 1}°
                            </td>
                            <td style={{ padding: '12px', fontFamily: 'JetBrains Mono, monospace', fontSize: 12, fontWeight: 700, color: '#D4FF3A' }}>
                              {points}
                            </td>
                            <td style={{ padding: '12px' }}>
                              {isEditing ? (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                  <input
                                    autoFocus
                                    type='text'
                                    placeholder='Novo resultado...'
                                    value={overrideDisplay}
                                    onChange={e => setOverrideDisplay(e.target.value)}
                                    style={{ background: '#0D0D0D', border: '1px solid #4DA3FF', color: '#F5F5F0', fontFamily: 'JetBrains Mono, monospace', fontSize: 10, padding: '4px 8px', outline: 'none', width: 140, borderRadius: 0 }}
                                  />
                                  <input
                                    type='text'
                                    placeholder='Motivo...'
                                    value={overrideReason}
                                    onChange={e => setOverrideReason(e.target.value)}
                                    style={{ background: '#0D0D0D', border: '1px solid #2A2A2A', color: '#F5F5F0', fontFamily: 'JetBrains Mono, monospace', fontSize: 10, padding: '4px 8px', outline: 'none', width: 140, borderRadius: 0 }}
                                  />
                                  <div style={{ display: 'flex', gap: 4 }}>
                                    <Btn color='#4DA3FF' disabled={!overrideDisplay.trim() || !overrideReason.trim() || mutating} onClick={() => handleOverride(res.id)}>
                                      SALVAR
                                    </Btn>
                                    <Btn color='#6B6B68' onClick={() => { setOverrideResultId(null); setOverrideDisplay(''); setOverrideReason('') }}>
                                      CANCEL
                                    </Btn>
                                  </div>
                                </div>
                              ) : (
                                <Btn color='#6B6B68' onClick={() => { setOverrideResultId(res.id); setOverrideDisplay(displayVal !== '—' ? displayVal : '') }}>
                                  CORRIGIR
                                </Btn>
                              )}
                            </td>
                          </tr>
                        )
                      })}
                      {teamsWithoutResult.map(team => {
                        const isEntering = enterTeamId === team.id
                        return isEntering ? (
                          <tr key={team.id} style={{ borderBottom: '1px solid #1A1A1A', background: '#0D0D0D' }}>
                            <td style={{ padding: '12px', fontFamily: 'JetBrains Mono, monospace', fontWeight: 700, fontSize: 11, color: '#3D3D3B' }}>—</td>
                            <td style={{ padding: '8px 12px', fontWeight: 700, fontSize: 13, color: '#F5F5F0' }}>{team.name}</td>
                            <td colSpan={3} style={{ padding: '8px 12px' }}>
                              <ScoreInput
                                type={selectedWod.score_type as WodScoreType}
                                fields={enterFields}
                                capSeconds={parseCapSeconds(selectedWod.cap)}
                                onChange={f => { setEnterFields(f); setEnterError(null) }}
                                error={enterError}
                              />
                            </td>
                            <td style={{ padding: '8px 12px' }}>
                              <div style={{ display: 'flex', gap: 4 }}>
                                <Btn color='#D4FF3A' disabled={mutating || !!validateScoreFields(enterFields, parseCapSeconds(selectedWod.cap))} onClick={() => handleSubmitResult(team.id, team.name)}>
                                  SALVAR
                                </Btn>
                                <Btn color='#6B6B68' onClick={() => { setEnterTeamId(null); setEnterError(null) }}>
                                  CANCEL
                                </Btn>
                              </div>
                            </td>
                          </tr>
                        ) : (
                          <tr key={team.id} style={{ borderBottom: '1px solid #1A1A1A', background: '#0D0D0D' }}>
                            <td style={{ padding: '12px', fontFamily: 'JetBrains Mono, monospace', fontWeight: 700, fontSize: 11, color: '#3D3D3B' }}>—</td>
                            <td style={{ padding: '12px', fontWeight: 700, fontSize: 13, color: '#6B6B68' }}>{team.name}</td>
                            <td style={{ padding: '12px', fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: '#3D3D3B', letterSpacing: '0.12em' }}>SEM RESULTADO</td>
                            <td style={{ padding: '12px', fontFamily: 'JetBrains Mono, monospace', fontSize: 12, color: '#3D3D3B' }}>—</td>
                            <td style={{ padding: '12px', fontFamily: 'JetBrains Mono, monospace', fontSize: 12, color: '#3D3D3B' }}>0</td>
                            <td style={{ padding: '12px' }}>
                              <Btn color='#D4FF3A' onClick={() => {
                                setEnterTeamId(team.id)
                                setEnterFields({ type: selectedWod.score_type as WodScoreType })
                                setEnterError(null)
                                setOverrideResultId(null)
                              }}>
                                INSERIR
                              </Btn>
                            </td>
                          </tr>
                        )
                      })}
                      {approvedTeams.length === 0 && (
                        <tr>
                          <td colSpan={6} style={{ padding: '24px 12px', textAlign: 'center', color: '#3D3D3B', fontFamily: 'JetBrains Mono, monospace', fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase' }}>
                            NENHUMA EQUIPE APROVADA
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        )}

        {/* ════════ TAB 6: AUDIT LOG ════════ */}
        {activeTab === 'AUDIT LOG' && (
          <div style={{ padding: 16, maxWidth: 1000, margin: '0 auto' }}>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #2A2A2A' }}>
                    {['QUANDO','QUEM','ACAO + ALVO','MUDANCA + MOTIVO'].map(h => (
                      <th key={h} style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 9, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#6B6B68', padding: '8px 12px', textAlign: 'left', background: '#0D0D0D' }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {auditLog.map(entry => (
                    <AuditRow key={entry.id} entry={entry} profiles={profiles} roles={roles} full />
                  ))}
                  {auditLog.length === 0 && (
                    <tr>
                      <td colSpan={4} style={{ padding: '24px 12px', textAlign: 'center', color: '#3D3D3B', fontFamily: 'JetBrains Mono, monospace', fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase' }}>
                        SEM REGISTROS
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

      </div>
    </div>
  )
}

// ─── ScoreInput ───────────────────────────────────────────────────────────────

const INPUT_SCORE: React.CSSProperties = {
  background: '#111111',
  border: '1px solid #D4FF3A',
  color: '#F5F5F0',
  fontFamily: 'JetBrains Mono, monospace',
  fontWeight: 700,
  fontSize: 13,
  padding: '6px 8px',
  outline: 'none',
  borderRadius: 0,
  width: 64,
  textAlign: 'center',
}

const LABEL_SCORE: React.CSSProperties = {
  fontFamily: 'JetBrains Mono, monospace',
  fontSize: 9,
  fontWeight: 700,
  letterSpacing: '0.14em',
  textTransform: 'uppercase',
  color: '#6B6B68',
}

function ScoreInput({
  type,
  fields,
  capSeconds,
  onChange,
  error,
}: {
  type: WodScoreType
  fields: ScoreFields
  capSeconds?: number | null
  onChange: (f: ScoreFields) => void
  error: string | null
}) {
  const base = { ...fields, type }
  // Real-time cap error shown inline (before user tries to save)
  const capError = type === 'time' && capSeconds != null
    ? validateScoreFields(fields, capSeconds)
    : null
  const displayError = error ?? capError

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        {type === 'time' && (
          <>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
              <span style={LABEL_SCORE}>MIN</span>
              <input
                autoFocus
                type='number'
                min={0}
                max={99}
                value={fields.minutes ?? ''}
                placeholder='00'
                onChange={e => onChange({ ...base, minutes: parseInt(e.target.value) || 0 })}
                style={INPUT_SCORE}
              />
            </div>
            <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 18, fontWeight: 700, color: '#F5F5F0', marginTop: 14 }}>:</span>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
              <span style={LABEL_SCORE}>SEG</span>
              <input
                type='number'
                min={0}
                max={59}
                value={fields.seconds ?? ''}
                placeholder='00'
                onChange={e => onChange({ ...base, seconds: Math.min(59, parseInt(e.target.value) || 0) })}
                style={INPUT_SCORE}
              />
            </div>
          </>
        )}

        {type === 'reps' && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
            <span style={LABEL_SCORE}>REPS</span>
            <input
              autoFocus
              type='number'
              min={1}
              value={fields.reps ?? ''}
              placeholder='0'
              onChange={e => onChange({ ...base, reps: parseInt(e.target.value) || 0 })}
              style={{ ...INPUT_SCORE, width: 96 }}
            />
          </div>
        )}

        {type === 'weight' && (
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6 }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
              <span style={LABEL_SCORE}>KG</span>
              <input
                autoFocus
                type='number'
                min={0.5}
                step={0.5}
                value={fields.kg ?? ''}
                placeholder='0'
                onChange={e => onChange({ ...base, kg: parseFloat(e.target.value) || 0 })}
                style={{ ...INPUT_SCORE, width: 96 }}
              />
            </div>
            <span style={{ ...LABEL_SCORE, marginBottom: 8 }}>KG</span>
          </div>
        )}

        {type === 'rounds_plus_reps' && (
          <>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
              <span style={LABEL_SCORE}>ROUNDS</span>
              <input
                autoFocus
                type='number'
                min={0}
                value={fields.rounds ?? ''}
                placeholder='0'
                onChange={e => onChange({ ...base, rounds: parseInt(e.target.value) || 0 })}
                style={INPUT_SCORE}
              />
            </div>
            <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 13, fontWeight: 700, color: '#6B6B68', marginTop: 14 }}>+</span>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
              <span style={LABEL_SCORE}>REPS</span>
              <input
                type='number'
                min={0}
                max={9999}
                value={fields.partialReps ?? ''}
                placeholder='0'
                onChange={e => onChange({ ...base, partialReps: parseInt(e.target.value) || 0 })}
                style={INPUT_SCORE}
              />
            </div>
          </>
        )}
      </div>
      {displayError && (
        <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 9, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#FF3B30' }}>
          {displayError}
        </span>
      )}
    </div>
  )
}

// ─── Shared sub-components ────────────────────────────────────────────────────

function Btn({
  children,
  color,
  disabled,
  onClick,
}: {
  children: React.ReactNode
  color: string
  disabled?: boolean
  onClick?: () => void
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        background: 'none',
        border: `1px solid ${disabled ? '#2A2A2A' : color}`,
        color: disabled ? '#3D3D3B' : color,
        fontFamily: 'JetBrains Mono, monospace',
        fontWeight: 700,
        fontSize: 9,
        letterSpacing: '0.14em',
        textTransform: 'uppercase',
        padding: '5px 10px',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.5 : 1,
      }}
    >
      {children}
    </button>
  )
}

function ActionItem({ color, text, onClick, cta }: { color: string; text: string; onClick: () => void; cta: string }) {
  return (
    <div style={{ padding: '12px 16px', borderBottom: '1px solid #1A1A1A', display: 'flex', alignItems: 'center', gap: 10 }}>
      <span style={{ width: 6, height: 6, background: color, flexShrink: 0 }} />
      <span style={{ flex: 1, fontSize: 13, color: '#F5F5F0' }}>{text}</span>
      <button
        onClick={onClick}
        style={{ background: 'none', border: 'none', color: color, fontFamily: 'JetBrains Mono, monospace', fontWeight: 700, fontSize: 9, letterSpacing: '0.14em', textTransform: 'uppercase', cursor: 'pointer', padding: 0 }}
      >
        {cta}
      </button>
    </div>
  )
}

const ROLE_LABELS: Record<string, string> = {
  head_judge: 'HEAD JUDGE',
  judge:      'JUDGE',
  athlete:    'ATLETA',
  admin:      'ADMIN',
}

function AuditRow({ entry, profiles, roles, full }: { entry: CompetitionAuditLog; profiles: Record<string, PublicProfile>; roles: CompetitionRole[]; full?: boolean }) {
  const who = entry.changed_by ? (profiles[entry.changed_by]?.name ?? 'Sistema') : 'Sistema'
  const compRole = entry.changed_by ? roles.find(r => r.user_id === entry.changed_by) : null
  const roleLabel = compRole
    ? ROLE_LABELS[compRole.role]
    : (entry.changed_by && profiles[entry.changed_by]?.roles?.includes('admin') ? 'ADMIN' : null)
  const action = humanizeAction(entry.action)
  return (
    <tr style={{ borderBottom: '1px solid #1A1A1A' }}>
      <td style={{ padding: '10px 12px', fontFamily: 'JetBrains Mono, monospace', fontSize: 9, color: '#6B6B68', whiteSpace: 'nowrap' }}>
        {formatDate(entry.created_at)}
      </td>
      <td style={{ padding: '10px 12px' }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: '#F5F5F0' }}>{who}</div>
        {roleLabel && (
          <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 9, fontWeight: 700, letterSpacing: '0.14em', color: '#D4FF3A', marginTop: 2 }}>
            {roleLabel}
          </div>
        )}
      </td>
      <td style={{ padding: '10px 12px' }}>
        <div style={{ fontSize: 12, fontWeight: 600 }}>{action}</div>
        {entry.target_label && (
          <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 9, color: '#6B6B68', letterSpacing: '0.12em', marginTop: 2 }}>
            {entry.target_label}
          </div>
        )}
      </td>
      {full ? (
        <td style={{ padding: '10px 12px' }}>
          {(entry.from_value || entry.to_value) && (
            <div style={{ display: 'flex', gap: 6, alignItems: 'center', fontFamily: 'JetBrains Mono, monospace', fontSize: 9 }}>
              {entry.from_value && (
                <span style={{ textDecoration: 'line-through', color: '#6B6B68' }}>{entry.from_value}</span>
              )}
              {entry.from_value && entry.to_value && (
                <span style={{ color: '#3D3D3B' }}>&#8594;</span>
              )}
              {entry.to_value && (
                <span style={{ color: '#D4FF3A' }}>{entry.to_value}</span>
              )}
            </div>
          )}
          {entry.reason && (
            <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 9, color: '#6B6B68', fontStyle: 'italic', marginTop: 2 }}>
              {entry.reason}
            </div>
          )}
        </td>
      ) : (
        <td style={{ padding: '10px 12px', fontFamily: 'JetBrains Mono, monospace', fontSize: 9, color: '#6B6B68' }}>
          {entry.to_value ?? '—'}
        </td>
      )}
    </tr>
  )
}

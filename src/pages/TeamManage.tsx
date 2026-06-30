import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import type { Competition, CompetitionTeam, CompetitionTeamMember, TeamStatus } from '@/types'

// ── Avatar ────────────────────────────────────────────────────────────────────

function Avatar({ initials, accent }: { initials: string; accent?: boolean }) {
  return (
    <div
      className="flex items-center justify-center flex-shrink-0 font-mono font-black text-[11px]"
      style={{
        width: 32,
        height: 32,
        background: accent ? '#D4FF3A' : '#1F1F1F',
        color: accent ? '#0A0A0A' : '#A8A8A4',
        border: accent ? 'none' : '1px solid #2A2A2A',
        letterSpacing: '0.06em',
      }}
    >
      {initials}
    </div>
  )
}

// ── Status pill ───────────────────────────────────────────────────────────────

const STATUS_LABELS: Record<string, string> = {
  pending_members:  'AWAITING ATHLETES',
  pending_payment:  'AWAITING PAYMENT',
  pending_approval: 'AWAITING APPROVAL',
  approved:         'APPROVED',
  rejected:         'REJEITADO',
  cancelled:        'CANCELADO',
  invited:          'CONVIDADO',
  accepted:         'CONFIRMADO',
  removed:          'REMOVIDO',
}

const STATUS_COLORS: Record<string, string> = {
  approved:         '#D4FF3A',
  accepted:         '#D4FF3A',
  pending_members:  '#FFB800',
  pending_payment:  '#FFB800',
  pending_approval: '#4DA3FF',
  invited:          '#4DA3FF',
  rejected:         '#FF3B30',
  removed:          '#FF3B30',
  cancelled:        '#FF3B30',
}

function StatusPill({ status }: { status: string }) {
  const color = STATUS_COLORS[status] ?? '#6B6B68'
  const label = STATUS_LABELS[status] ?? status.toUpperCase()
  return (
    <span
      className="font-mono font-bold text-[9px]"
      style={{
        letterSpacing: '0.14em',
        color,
        border: `1px solid ${color}`,
        padding: '3px 6px',
        whiteSpace: 'nowrap',
        opacity: 0.9,
      }}
    >
      {label}
    </span>
  )
}

// ── Invite sheet ──────────────────────────────────────────────────────────────


interface InviteSheetProps {
  teamId: string
  onClose: () => void
  onInvited: () => void
}

function InviteSheet({ teamId, onClose, onInvited }: InviteSheetProps) {
  const [mode, setMode] = useState<'user' | 'email'>('user')
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<{ user_id: string; full_name: string; username: string }[]>([])
  const [searching, setSearching] = useState(false)
  const [email, setEmail] = useState('')
  const [inviting, setInviting] = useState<string | null>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (mode !== 'user') return
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (!query.trim()) { setResults([]); return }

    debounceRef.current = setTimeout(async () => {
      setSearching(true)
      const { data, error } = await supabase.rpc('search_athletes_for_invite', { p_query: query.trim(), p_team_id: teamId })
      setSearching(false)
      if (!error && data) setResults(data as { user_id: string; full_name: string; username: string }[])
    }, 300)
  }, [query, mode])

  async function inviteByUserId(r: { user_id: string; full_name: string; username: string }) {
    setInviting(r.user_id)
    const { error } = await supabase.rpc('invite_team_member', { p_team_id: teamId, p_user_id: r.user_id })
    setInviting(null)
    if (error) {
      return
    }
    onInvited()
    onClose()
  }

  async function inviteByEmail() {
    if (!email.trim()) return
    setInviting('email')
    const { error } = await supabase.rpc('invite_team_member', { p_team_id: teamId, p_invited_email: email.trim() })
    setInviting(null)
    if (error) {
      return
    }
    onInvited()
    onClose()
  }

  return (
    <div
      className="absolute inset-0 flex items-end"
      style={{ background: 'rgba(0,0,0,0.72)', zIndex: 90 }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        className="w-full bg-[#0A0A0A] overflow-y-auto"
        style={{
          borderTop: '2px solid #F5F5F0',
          padding: '16px 20px 32px',
          maxHeight: '86%',
          animation: 'sheet-slide 0.22s ease-out',
        }}
      >
        <style>{`@keyframes sheet-slide { from { transform: translateY(100%); } to { transform: translateY(0); } }`}</style>

        {/* Grab bar */}
        <div className="mx-auto mb-3" style={{ width: 36, height: 3, background: '#3D3D3B' }} />

        <h3
          className="font-sans font-bold text-[#F5F5F0] mb-1"
          style={{ fontSize: 20, letterSpacing: '-0.015em', margin: '0 0 4px' }}
        >
          Convidar atleta
        </h3>

        {/* Segmented toggle */}
        <div
          className="grid my-3.5"
          style={{ gridTemplateColumns: '1fr 1fr', border: '1px solid #2A2A2A' }}
        >
          {(['user', 'email'] as const).map(m => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className="font-mono font-black uppercase text-[10px] py-2.5 transition-colors"
              style={{
                letterSpacing: '0.16em',
                background: mode === m ? '#F5F5F0' : 'transparent',
                color: mode === m ? '#0A0A0A' : '#6B6B68',
                border: 'none',
                cursor: 'pointer',
              }}
            >
              {m === 'user' ? 'USERNAME' : 'EMAIL'}
            </button>
          ))}
        </div>

        {mode === 'user' ? (
          <>
            <div className="flex flex-col gap-1.5 mb-3">
              <label className="font-mono font-bold uppercase tracking-[0.14em] text-[10px] text-[#6B6B68]">
                Buscar por username
              </label>
              <input
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="@username ou nome"
                autoFocus
                className="bg-[#1F1F1F] border border-[#2A2A2A] text-[#F5F5F0] font-sans text-[14px] px-3 outline-none focus:border-[#D4FF3A] transition-colors"
                style={{ paddingTop: 11, paddingBottom: 11 }}
              />
            </div>

            {query.trim() && (
              <div>
                <span className="font-mono font-bold uppercase tracking-[0.14em] text-[10px] text-[#6B6B68] block mb-1">
                  RESULTADOS · {searching ? '...' : results.length}
                </span>
                {results.map(r => (
                  <div
                    key={r.user_id}
                    className="flex items-center gap-3 py-3 border-b border-[#2A2A2A]"
                  >
                    <Avatar initials={(r.full_name ?? r.username ?? '?').slice(0, 2).toUpperCase()} />
                    <div className="flex-1 min-w-0">
                      <div className="font-sans font-semibold text-[14px] text-[#F5F5F0]" style={{ letterSpacing: '-0.005em' }}>
                        {r.full_name}
                      </div>
                      <div className="font-mono font-semibold text-[10px] text-[#6B6B68] mt-0.5" style={{ letterSpacing: '0.1em' }}>
                        @{r.username}
                      </div>
                    </div>
                    <button
                      onClick={() => inviteByUserId(r)}
                      disabled={inviting === r.user_id}
                      className="font-mono font-black uppercase text-[10px] px-3 py-1.5 transition-opacity disabled:opacity-40"
                      style={{
                        letterSpacing: '0.14em',
                        border: '1px solid #D4FF3A',
                        color: '#D4FF3A',
                        background: 'transparent',
                        cursor: 'pointer',
                        flexShrink: 0,
                      }}
                    >
                      {inviting === r.user_id ? '...' : 'CONVIDAR'}
                    </button>
                  </div>
                ))}
                {!searching && results.length === 0 && (
                  <div
                    className="py-5 text-center font-mono font-bold uppercase text-[10px] text-[#6B6B68]"
                    style={{ letterSpacing: '0.14em' }}
                  >
                    No users found · try by email
                  </div>
                )}
              </div>
            )}
          </>
        ) : (
          <>
            <div className="flex flex-col gap-1.5 mb-4">
              <label className="font-mono font-bold uppercase tracking-[0.14em] text-[10px] text-[#6B6B68]">
                Email do atleta
              </label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="atleta@email.com"
                autoFocus
                className="bg-[#1F1F1F] border border-[#2A2A2A] text-[#F5F5F0] font-sans text-[14px] px-3 outline-none focus:border-[#D4FF3A] transition-colors"
                style={{ paddingTop: 11, paddingBottom: 11 }}
              />
            </div>
            <button
              onClick={inviteByEmail}
              disabled={!email.trim() || inviting === 'email'}
              className="w-full font-mono font-black uppercase text-[13px] text-[#0A0A0A] bg-[#D4FF3A] py-3.5 flex items-center justify-center mb-3 transition-opacity disabled:opacity-30 disabled:cursor-not-allowed"
              style={{ letterSpacing: '0.16em' }}
            >
              {inviting === 'email' ? 'ENVIANDO...' : 'ENVIAR CONVITE'}
            </button>
          </>
        )}

        {/* Cancel */}
        <button
          onClick={onClose}
          className="w-full font-mono font-bold uppercase text-[11px] text-[#6B6B68] py-3 border border-[#2A2A2A] mt-3"
          style={{ letterSpacing: '0.14em', background: 'transparent', cursor: 'pointer' }}
        >
          CANCELAR
        </button>
      </div>
    </div>
  )
}

// ── Pending invite card ───────────────────────────────────────────────────────

interface PendingInviteCardProps {
  memberId: string
  teamName: string
  onRespond: () => void
}

function PendingInviteCard({ memberId, teamName, onRespond }: PendingInviteCardProps) {
  const [busy, setBusy] = useState<'accept' | 'decline' | null>(null)

  async function respond(accept: boolean) {
    setBusy(accept ? 'accept' : 'decline')
    const { error } = await supabase.rpc('respond_team_invite', {
      p_member_id: memberId,
      p_accept: accept,
    })
    setBusy(null)
    if (error) {
      return
    }
    onRespond()
  }

  return (
    <div className="mx-5 my-4 border border-[#4DA3FF] p-3.5">
      <span className="font-mono font-bold uppercase tracking-[0.14em] text-[10px] text-[#4DA3FF] block mb-2">
        CONVITE PENDENTE
      </span>
      <p className="font-sans text-[13px] text-[#A8A8A4] mb-3" style={{ lineHeight: 1.4 }}>
        You have been invited to team <strong className="text-[#F5F5F0]">{teamName}</strong>.
      </p>
      <div className="flex gap-2">
        <button
          onClick={() => respond(true)}
          disabled={busy !== null}
          className="flex-1 font-mono font-black uppercase text-[11px] text-[#0A0A0A] bg-[#D4FF3A] py-2.5 disabled:opacity-40"
          style={{ letterSpacing: '0.14em' }}
        >
          {busy === 'accept' ? '...' : 'ACEITAR'}
        </button>
        <button
          onClick={() => respond(false)}
          disabled={busy !== null}
          className="flex-1 font-mono font-bold uppercase text-[11px] text-[#FF3B30] border border-[#FF3B30] py-2.5 disabled:opacity-40"
          style={{ letterSpacing: '0.14em', background: 'transparent' }}
        >
          {busy === 'decline' ? '...' : 'RECUSAR'}
        </button>
      </div>
    </div>
  )
}

// ── CTA bottom label ──────────────────────────────────────────────────────────

function ctaLabel(status: TeamStatus, slotsEmpty: number): string {
  switch (status) {
    case 'pending_members':  return `AGUARDANDO ATLETAS (${slotsEmpty} FALTANDO)`
    case 'pending_payment':  return 'AGUARDANDO PAGAMENTO'
    case 'pending_approval': return 'AWAITING HEAD JUDGE APPROVAL'
    case 'rejected':         return 'EQUIPE REJEITADA'
    case 'cancelled':        return 'EQUIPE CANCELADA'
    default:                 return ''
  }
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function TeamManage() {
  const { id: competitionId, teamId } = useParams<{ id: string; teamId: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()

  const [team, setTeam] = useState<CompetitionTeam | null>(null)
  const [members, setMembers] = useState<CompetitionTeamMember[]>([])
  const [competition, setCompetition] = useState<Competition | null>(null)
  const [loading, setLoading] = useState(true)
  const [inviteOpen, setInviteOpen] = useState(false)
  const [copied, setCopied] = useState(false)

  // profiles keyed by user_id for avatar initials + names
  const [profiles, setProfiles] = useState<Record<string, { name: string | null; username: string | null }>>({})

  const load = useCallback(async () => {
    if (!teamId) return
    setLoading(true)

    const [teamRes, membersRes] = await Promise.all([
      supabase.from('competition_teams').select('*').eq('id', teamId).single(),
      supabase.rpc('get_team_members', { p_team_id: teamId }),
    ])

    const teamData: CompetitionTeam | null = teamRes.data ?? null
    const membersData: CompetitionTeamMember[] = membersRes.data ?? []
    setTeam(teamData)
    setMembers(membersData)

    if (teamData) {
      const { data: comp } = await supabase
        .from('competitions')
        .select('*')
        .eq('id', teamData.competition_id)
        .single()
      setCompetition(comp ?? null)

      // Usa RPC SECURITY DEFINER para bypassar RLS da tabela profiles
      const userIds = [
        ...membersData.filter(m => m.user_id).map(m => m.user_id as string),
        ...(teamData.captain_user_id ? [teamData.captain_user_id] : []),
      ]
      const uniqueIds = [...new Set(userIds)]
      if (uniqueIds.length > 0) {
        const { data: profs } = await supabase.rpc('get_profiles_public', { p_user_ids: uniqueIds })
        const map: Record<string, { name: string | null; username: string | null }> = {}
        for (const p of (profs ?? [])) map[p.user_id] = { name: p.full_name, username: p.username }
        setProfiles(map)
      }
    }

    setLoading(false)
  }, [teamId])

  useEffect(() => { load() }, [load])

  const [cancelingInvite, setCancelingInvite] = useState<string | null>(null)
  const [confirmCancelInviteId, setConfirmCancelInviteId] = useState<string | null>(null)

  async function handleCancelInvite(memberId: string) {
    setCancelingInvite(memberId)
    const { error } = await supabase.rpc('cancel_team_invite', { p_member_id: memberId })
    setCancelingInvite(null)
    setConfirmCancelInviteId(null)
    if (error) {
      return
    }
    load()
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-[#D4FF3A] border-t-transparent" style={{ animation: 'spin 0.8s linear infinite' }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    )
  }

  if (!team) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center px-8 text-center">
        <span className="font-mono font-bold uppercase tracking-[0.14em] text-[10px] text-[#6B6B68]">
          Team not found
        </span>
      </div>
    )
  }

  const isCaptain = user?.id === team.captain_user_id
  const maxSize = competition?.team_max_size ?? 4

  // If the captain's member row is missing (DB running old function version), synthesize it
  // so the UI always shows the captain as filled. All permission checks still use team.captain_user_id.
  const captainInMembers = members.some(m => m.team_role === 'captain')
  const effectiveMembers: CompetitionTeamMember[] = captainInMembers
    ? members
    : team.captain_user_id
      ? [
          {
            id: 'captain-placeholder',
            team_id: team.id,
            user_id: team.captain_user_id,
            team_role: 'captain',
            status: 'accepted',
            payment_status: 'not_required',
            invited_email: null,
            invited_by: null,
            created_at: team.created_at ?? new Date().toISOString(),
          },
          ...members,
        ]
      : members

  const activeMembers = effectiveMembers.filter(m => !['rejected', 'removed'].includes(m.status))
  const slotsEmpty = Math.max(0, maxSize - activeMembers.length)
  const canInvite = isCaptain && slotsEmpty > 0 && ['pending_members', 'pending_payment'].includes(team.status)

  // Pending invite for current user (non-captain viewing this team page via invite link)
  const myInvite = user
    ? members.find(m => m.user_id === user.id && m.status === 'invited')
    : null

  function memberDisplayName(m: CompetitionTeamMember): string {
    if (m.user_id && profiles[m.user_id]?.name) return profiles[m.user_id].name!
    if (m.user_id && profiles[m.user_id]?.username) return `@${profiles[m.user_id].username}`
    if (m.invited_email) return m.invited_email
    return 'Aguardando'
  }

  function memberInitials(m: CompetitionTeamMember): string {
    const name = memberDisplayName(m)
    const parts = name.trim().split(/\s+/)
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase()
    return name.slice(0, 2).toUpperCase()
  }

  function memberRoleLabel(m: CompetitionTeamMember): string {
    const isMe = m.user_id === user?.id
    if (m.team_role === 'captain') return isMe ? 'CAPTAIN · YOU' : 'CAPTAIN'
    return isMe ? 'ATHLETE · YOU' : 'ATHLETE'
  }

  const shareUrl = `gounbroken.app/competition/${competition?.public_slug ?? competitionId}/join?t=${encodeURIComponent(team.name.toLowerCase().replace(/\s+/g, '-'))}`

  async function copyShareUrl() {
    try {
      await navigator.clipboard.writeText(`https://${shareUrl}`)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
    }
  }

  const showCta = team.status !== 'approved'

  return (
    <div
      className="min-h-screen bg-[#0A0A0A] flex flex-col relative"
      style={{ maxWidth: 480, margin: '0 auto' }}
    >

      {/* Topbar */}
      <header
        className="flex items-center justify-between px-4 border-b border-[#2A2A2A] flex-shrink-0"
        style={{ height: 52 }}
      >
        <button
          onClick={() => navigate(`/athlete/competitions/${competitionId ?? team.competition_id}`)}
          className="flex items-center justify-center text-[#F5F5F0] active:opacity-60"
          style={{ width: 36, height: 36 }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M19 12H5M5 12l7-7M5 12l7 7" />
          </svg>
        </button>
        <span className="font-mono font-bold uppercase tracking-[0.22em] text-[11px] text-[#A8A8A4]">
          MINHA EQUIPE
        </span>
        <span style={{ width: 36 }} />
      </header>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto pb-28">

        {/* Hero */}
        <div className="px-5 pt-3 pb-5 border-b border-[#2A2A2A]">
          <span className="font-mono font-bold uppercase tracking-[0.14em] text-[10px] text-[#D4FF3A] block mb-1">
            {competition?.name}
          </span>
          <h1
            className="font-sans font-bold text-[#F5F5F0]"
            style={{ fontSize: 26, letterSpacing: '-0.02em', lineHeight: 1.05, margin: '0 0 10px' }}
          >
            {team.name}
          </h1>
          <div className="flex gap-2 flex-wrap items-center">
            <StatusPill status={team.status} />
            <span
              className="font-mono font-semibold text-[10px] text-[#A8A8A4]"
              style={{ letterSpacing: '0.12em' }}
            >
              {activeMembers.length}/{maxSize} ATLETAS
            </span>
          </div>
        </div>

        {/* Warning — pending members */}
        {team.status === 'pending_members' && slotsEmpty > 0 && (
          <div className="mx-5 mt-3.5 border border-[#FFB800] p-3 flex gap-3 items-center">
            <span
              className="font-mono font-black text-[12px] text-[#0A0A0A] bg-[#FFB800] flex items-center justify-center flex-shrink-0"
              style={{ width: 22, height: 22 }}
            >
              !
            </span>
            <p className="font-sans text-[12px] text-[#F5F5F0] flex-1" style={{ lineHeight: 1.35, margin: 0 }}>
              <strong className="text-[#FFB800]">Missing {slotsEmpty} athlete{slotsEmpty !== 1 ? 's' : ''}.</strong>{' '}
              Invite to complete the team and unlock Head Judge approval.
            </p>
          </div>
        )}

        {/* Pending invite for current user */}
        {myInvite && (
          <PendingInviteCard
            memberId={myInvite.id}
            teamName={team.name}
            onRespond={load}
          />
        )}

        {/* Athletes section */}
        <div className="px-5 py-4 border-b border-[#2A2A2A]">
          <div className="flex items-baseline justify-between mb-3">
            <span className="font-mono font-bold uppercase tracking-[0.14em] text-[11px] text-[#A8A8A4]">
              ATLETAS
            </span>
            {canInvite && (
              <button
                onClick={() => setInviteOpen(true)}
                className="font-mono font-black uppercase text-[10px] text-[#D4FF3A] border border-[#D4FF3A] px-2.5 py-1.5 flex items-center gap-1.5 active:opacity-70"
                style={{ letterSpacing: '0.14em', background: 'transparent' }}
              >
                <svg width="10" height="10" viewBox="0 0 12 12" fill="currentColor">
                  <path d="M6 1v10M1 6h10" stroke="currentColor" strokeWidth="1.8" strokeLinecap="square" />
                </svg>
                CONVIDAR
              </button>
            )}
          </div>

          {/* Member rows */}
          {activeMembers.map(m => (
            <div
              key={m.id}
              className="flex items-center gap-3 py-3 border-t border-[#2A2A2A]"
            >
              <Avatar
                initials={memberInitials(m)}
                accent={m.team_role === 'captain'}
              />
              <div className="flex-1 min-w-0">
                <div className="font-sans font-semibold text-[14px] text-[#F5F5F0] truncate" style={{ letterSpacing: '-0.005em' }}>
                  {memberDisplayName(m)}
                </div>
                <div className="font-mono font-semibold text-[10px] text-[#6B6B68] mt-0.5" style={{ letterSpacing: '0.14em' }}>
                  {memberRoleLabel(m)}
                </div>
              </div>
              <StatusPill status={m.status} />
              {isCaptain && m.status === 'invited' && m.team_role !== 'captain' && (
                confirmCancelInviteId === m.id ? (
                  <div className="flex items-center gap-1.5" style={{ flexShrink: 0 }}>
                    <button
                      onClick={() => handleCancelInvite(m.id)}
                      disabled={cancelingInvite === m.id}
                      style={{ padding: '4px 8px', background: '#FF3B30', border: 'none', fontFamily: 'JetBrains Mono, monospace', fontWeight: 900, fontSize: 9, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#0A0A0A', cursor: 'pointer', opacity: cancelingInvite === m.id ? 0.5 : 1 }}
                    >
                      SIM
                    </button>
                    <button
                      onClick={() => setConfirmCancelInviteId(null)}
                      style={{ padding: '4px 8px', background: 'transparent', border: '1px solid #2A2A2A', fontFamily: 'JetBrains Mono, monospace', fontWeight: 700, fontSize: 9, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#6B6B68', cursor: 'pointer' }}
                    >
                      NO
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setConfirmCancelInviteId(m.id)}
                    disabled={cancelingInvite === m.id}
                    className="flex items-center justify-center text-[#6B6B68] hover:text-[#FF3B30] transition-colors disabled:opacity-30 active:opacity-60"
                    style={{ width: 28, height: 28, background: 'transparent', border: 'none', flexShrink: 0 }}
                    title="Cancelar convite"
                  >
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="square">
                      <path d="M1 1l10 10M11 1L1 11" />
                    </svg>
                  </button>
                )
              )}
            </div>
          ))}

          {/* Empty slots */}
          {canInvite && Array.from({ length: slotsEmpty }).map((_, i) => (
            <button
              key={`slot-${i}`}
              onClick={() => setInviteOpen(true)}
              className="w-full flex items-center gap-3 py-3 border-t active:bg-[#141414] transition-colors"
              style={{ borderTopStyle: 'dashed', borderTopColor: '#3D3D3B', background: 'transparent' }}
            >
              <div
                className="flex items-center justify-center flex-shrink-0 text-[#6B6B68]"
                style={{ width: 32, height: 32, border: '1px dashed #3D3D3B' }}
              >
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                  <path d="M6 1v10M1 6h10" stroke="currentColor" strokeWidth="1.8" strokeLinecap="square" />
                </svg>
              </div>
              <span
                className="flex-1 text-left font-mono font-bold uppercase text-[11px] text-[#6B6B68]"
                style={{ letterSpacing: '0.14em' }}
              >
                SLOT {activeMembers.length + i + 1} · TOQUE PRA CONVIDAR
              </span>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#3D3D3B" strokeWidth="2">
                <path d="M9 18l6-6-6-6" />
              </svg>
            </button>
          ))}
        </div>

        {/* Share line */}
        <div
          className="mx-5 my-4 flex items-center justify-between gap-2.5 px-3.5 py-3"
          style={{ border: '1px dashed #3D3D3B' }}
        >
          <span
            className="font-mono font-semibold text-[11px] text-[#A8A8A4] truncate"
            style={{ letterSpacing: '0.04em' }}
          >
            {shareUrl}
          </span>
          <button
            onClick={copyShareUrl}
            className="font-mono font-bold uppercase text-[10px] px-2.5 py-1.5 flex-shrink-0 border border-[#2A2A2A] text-[#6B6B68] flex items-center gap-1.5 active:opacity-70"
            style={{ letterSpacing: '0.14em', background: 'transparent' }}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="9" y="9" width="13" height="13" /><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
            </svg>
            {copied ? 'COPIADO' : 'COPIAR'}
          </button>
        </div>

      </div>

      {/* Sticky bottom CTA — hidden when approved */}
      {showCta && (
        <div className="sticky bottom-0 px-5 py-4 bg-[#0A0A0A] border-t border-[#2A2A2A] flex-shrink-0">
          <button
            disabled
            className="w-full font-mono font-black uppercase text-[12px] text-[#3D3D3B] border border-[#2A2A2A] py-4 flex items-center justify-center cursor-not-allowed"
            style={{ letterSpacing: '0.14em', background: 'transparent' }}
          >
            {ctaLabel(team.status, slotsEmpty)}
          </button>
        </div>
      )}

      {/* Invite sheet */}
      {inviteOpen && (
        <InviteSheet
          teamId={team.id}
          onClose={() => setInviteOpen(false)}
          onInvited={load}
        />
      )}
    </div>
  )
}

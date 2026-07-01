import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { useProfile } from '@/hooks/useProfile'
import { useCompetition } from '@/hooks/useCompetition'
import type { CompetitionStatus, TeamStatus } from '@/types'

// ─── types (leaderboard final) ───────────────────────────────────────────────

interface FinalWodInfo {
  id: string
  name: string
  score_type: string
  order_index: number
}

interface FinalWodCell {
  position: number
  points: number
  raw_result: string
}

interface FinalRow {
  team_id: string
  team_name: string
  box: string | null
  total_points: number
  overall_rank: number
  per_wod: Record<string, FinalWodCell>
}

// ─── helpers ─────────────────────────────────────────────────────────────────

const PT_MONTHS = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC']

function formatDate(iso: string): string {
  const d = new Date(iso + 'T00:00:00')
  return `${String(d.getDate()).padStart(2,'0')} ${PT_MONTHS[d.getMonth()]} · ${d.getFullYear()}`
}

function formatDeadline(iso: string): string {
  const d = new Date(iso) // TIMESTAMPTZ — não adicionar T00:00:00
  return `${String(d.getDate()).padStart(2,'0')} ${PT_MONTHS[d.getMonth()]} · ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`
}

function teamInitials(name: string): string {
  const parts = name.trim().split(/\s+/)
  if (parts.length === 1) return name.slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[1][0]).toUpperCase()
}

// ─── StatusPill ───────────────────────────────────────────────────────────────

type StatusKey = CompetitionStatus | TeamStatus | 'accepted' | 'invited'

const STATUS_COLORS: Record<StatusKey, { dot: string; text: string; label: string }> = {
  open:               { dot: '#D4FF3A', text: '#D4FF3A', label: 'OPEN' },
  in_progress:        { dot: '#4DA3FF', text: '#4DA3FF', label: 'IN PROGRESS' },
  draft:              { dot: '#6B6B68', text: '#6B6B68', label: 'DRAFT' },
  closed:             { dot: '#6B6B68', text: '#6B6B68', label: 'FINISHED' },
  finished:           { dot: '#6B6B68', text: '#6B6B68', label: 'FINALIZED' },
  approved:           { dot: '#D4FF3A', text: '#D4FF3A', label: 'APPROVED' },
  pending_payment:    { dot: '#FFB800', text: '#FFB800', label: 'PENDING PAYMENT' },
  pending_approval:   { dot: '#4DA3FF', text: '#4DA3FF', label: 'PENDING APPROVAL' },
  pending_members:    { dot: '#6B6B68', text: '#6B6B68', label: 'INCOMPLETE' },
  rejected:           { dot: '#FF3B30', text: '#FF3B30', label: 'REJECTED' },
  cancelled:          { dot: '#6B6B68', text: '#6B6B68', label: 'CANCELLED' },
  accepted:           { dot: '#D4FF3A', text: '#D4FF3A', label: 'ACCEPTED' },
  invited:            { dot: '#4DA3FF', text: '#4DA3FF', label: 'INVITED' },
}

function StatusPill({ status, label }: { status: StatusKey; label?: string }) {
  const cfg = STATUS_COLORS[status] ?? STATUS_COLORS.draft
  return (
    <span
      className="inline-flex items-center gap-1.5 font-mono font-black uppercase whitespace-nowrap"
      style={{
        fontSize: 9,
        letterSpacing: '0.16em',
        padding: '4px 7px',
        color: cfg.text,
        border: `1px solid ${cfg.dot}33`,
      }}
    >
      <span style={{ width: 6, height: 6, background: cfg.dot, display: 'block', flexShrink: 0 }} />
      {label ?? cfg.label}
    </span>
  )
}

// ─── NeutralPill ─────────────────────────────────────────────────────────────

function NeutralPill({ children }: { children: React.ReactNode }) {
  return (
    <span
      className="inline-flex items-center gap-1.5 font-mono font-black uppercase whitespace-nowrap"
      style={{ fontSize: 9, letterSpacing: '0.16em', padding: '4px 7px', color: '#A8A8A4', border: '1px solid #2A2A2A' }}
    >
      <span style={{ width: 6, height: 6, background: '#6B6B68', display: 'block', flexShrink: 0 }} />
      {children}
    </span>
  )
}

// ─── StatCell ─────────────────────────────────────────────────────────────────

function StatCell({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ background: '#0A0A0A', padding: '14px 20px' }}>
      <span
        className="font-mono font-bold uppercase block"
        style={{ fontSize: 9, letterSpacing: '0.16em', color: '#6B6B68' }}
      >
        {label}
      </span>
      <div style={{ marginTop: 6 }}>{children}</div>
    </div>
  )
}

// ─── MedalRank ───────────────────────────────────────────────────────────────

function MedalRank({ rank }: { rank: number }) {
  const medal =
    rank === 1 ? { bg: '#C9A227', color: '#0A0A0A' } :
    rank === 2 ? { bg: '#8C9094', color: '#0A0A0A' } :
    rank === 3 ? { bg: '#8B4A2D', color: '#F5F5F0' } :
    null

  if (medal) {
    return (
      <span style={{
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        background: medal.bg, color: medal.color,
        fontFamily: 'JetBrains Mono, monospace', fontWeight: 900, fontSize: 11,
        letterSpacing: '0.04em', padding: '3px 7px',
        fontVariantNumeric: 'tabular-nums',
      }}>
        {String(rank).padStart(2, '0')}
      </span>
    )
  }
  return (
    <span style={{
      fontWeight: 800, fontSize: 14, color: '#6B6B68',
      fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.01em',
    }}>
      {String(rank).padStart(2, '0')}
    </span>
  )
}

// ─── page ─────────────────────────────────────────────────────────────────────

export default function CompetitionDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()
  const { profile } = useProfile(user?.id)
  const { competition, wods, divisions, myTeam, myRole, teamCounts, pendingJudgeInvite, pendingTeamInvite, loading, reload } = useCompetition(id, user?.id)
  const [copied, setCopied] = useState(false)
  const [inviteLoading, setInviteLoading] = useState(false)

  // Final results (finished state)
  const [finalRows, setFinalRows] = useState<FinalRow[]>([])
  const [finalWods, setFinalWods] = useState<FinalWodInfo[]>([])
  const [finalLoading, setFinalLoading] = useState(false)

  // WOD detail sheet
  const [selectedWodId, setSelectedWodId] = useState<string | null>(null)
  const [wodResults, setWodResults] = useState<{
    wod_position: number; v_team_name: string; v_box: string | null; v_raw_result: string
  }[]>([])
  const [resultsLoading, setResultsLoading] = useState(false)

  const selectedWod = wods.find(w => w.id === selectedWodId) ?? null

  useEffect(() => {
    if (!selectedWodId) return
    setWodResults([])
    setResultsLoading(true)
    supabase
      .rpc('get_wod_ranking', { p_wod_id: selectedWodId })
      .then(({ data }) => {
        setWodResults((data as typeof wodResults) ?? [])
        setResultsLoading(false)
      })
  }, [selectedWodId])

  useEffect(() => {
    if (competition?.status !== 'finished' || !id) return
    setFinalLoading(true)
    Promise.all([
      supabase.rpc('get_competition_leaderboard', { p_competition_id: id }),
      supabase.from('competition_wods')
        .select('id, name, score_type, order_index')
        .eq('competition_id', id)
        .eq('status', 'published')
        .order('order_index'),
    ]).then(([lb, wodList]) => {
      setFinalRows((lb.data ?? []) as FinalRow[])
      setFinalWods((wodList.data ?? []) as FinalWodInfo[])
      setFinalLoading(false)
    })
  }, [id, competition?.status])

  const [inviteError, setInviteError] = useState<string | null>(null)
  const [teamInviteLoading, setTeamInviteLoading] = useState(false)
  const [teamInviteError, setTeamInviteError] = useState<string | null>(null)

  const isAdmin = profile?.roles?.includes('admin') ?? false
  const isHeadJudgeOrAdmin = isAdmin || myRole === 'head_judge'
  const isJudgeAny = myRole === 'judge' || myRole === 'head_judge'

  const registrationOpen =
    competition?.status === 'open' &&
    new Date(competition.registration_deadline) > new Date()

  async function handleAcceptInvite() {
    if (!pendingJudgeInvite || inviteLoading) return
    setInviteLoading(true)
    setInviteError(null)
    const { error } = await supabase.rpc('accept_judge_invite', { p_invite_id: pendingJudgeInvite.id })
    setInviteLoading(false)
    if (error) { setInviteError(error.message); return }
    reload()
  }

  async function handleDeclineInvite() {
    if (!pendingJudgeInvite || inviteLoading) return
    setInviteLoading(true)
    setInviteError(null)
    const { error } = await supabase.rpc('decline_judge_invite', { p_invite_id: pendingJudgeInvite.id })
    setInviteLoading(false)
    if (error) { setInviteError(error.message); return }
    reload()
  }

  async function handleAcceptTeamInvite() {
    if (!pendingTeamInvite || teamInviteLoading) return
    setTeamInviteLoading(true)
    setTeamInviteError(null)
    const { error } = await supabase.rpc('respond_team_invite', { p_member_id: pendingTeamInvite.id, p_accept: true })
    setTeamInviteLoading(false)
    if (error) { setTeamInviteError(error.message); return }
    reload()
  }

  async function handleDeclineTeamInvite() {
    if (!pendingTeamInvite || teamInviteLoading) return
    setTeamInviteLoading(true)
    setTeamInviteError(null)
    const { error } = await supabase.rpc('respond_team_invite', { p_member_id: pendingTeamInvite.id, p_accept: false })
    setTeamInviteLoading(false)
    if (error) { setTeamInviteError(error.message); return }
    reload()
  }

  function copySlug() {
    const slug = competition?.public_slug ?? competition?.id ?? ''
    navigator.clipboard.writeText(`gounbroken.app/competition/${slug}`)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (loading) {
    return (
      <div className="flex flex-col fixed inset-0 z-50 md:static md:inset-auto md:z-auto md:flex-1 md:min-h-0" style={{ background: '#0A0A0A' }}>
        {/* topbar skeleton */}
        <header
          className="sticky top-0 z-10 flex items-center justify-between border-b border-[#2A2A2A]"
          style={{ height: 52, padding: '8px 16px 12px', background: '#0A0A0A' }}
        >
          <div style={{ width: 36, height: 36 }} />
          <span className="font-mono font-black uppercase" style={{ fontSize: 11, letterSpacing: '0.22em', color: '#F5F5F0' }}>
            DETAILS
          </span>
          <div style={{ width: 36, height: 36 }} />
        </header>
        <div className="flex justify-center py-16">
          <div className="w-5 h-5 border-2 animate-spin" style={{ borderColor: '#D4FF3A', borderTopColor: 'transparent' }} />
        </div>
      </div>
    )
  }

  if (!competition) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center" style={{ background: '#0A0A0A' }}>
        <span className="font-mono font-bold uppercase" style={{ fontSize: 10, letterSpacing: '0.16em', color: '#6B6B68' }}>
          Competition not found
        </span>
      </div>
    )
  }

  const slug = competition.public_slug ?? competition.id
  const memberCount = myTeam?.members.length ?? 0
  const isCaptain = myTeam?.team.captain_user_id === user?.id

  return (
    <div className="flex flex-col fixed inset-0 z-50 md:static md:inset-auto md:z-auto md:flex-1 md:min-h-0" style={{ background: '#0A0A0A', color: '#F5F5F0' }}>

      {/* Topbar */}
      <header
        className="sticky top-0 z-10 flex items-center justify-between border-b border-[#2A2A2A]"
        style={{ height: 52, padding: '8px 16px 12px', background: '#0A0A0A' }}
      >
        <button
          onClick={() => navigate(-1)}
          className="flex items-center justify-center text-[#6B6B68] active:text-[#F5F5F0]"
          style={{ width: 36, height: 36, background: 'transparent', border: 0 }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>
        <span
          className="font-mono font-black uppercase"
          style={{ fontSize: 11, letterSpacing: '0.22em', color: '#F5F5F0' }}
        >
          DETAILS
        </span>
        <button
          className="flex items-center justify-center text-[#6B6B68] active:text-[#F5F5F0]"
          style={{ width: 36, height: 36, background: 'transparent', border: 0 }}
          onClick={copySlug}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="18" cy="5" r="3" />
            <circle cx="6" cy="12" r="3" />
            <circle cx="18" cy="19" r="3" />
            <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
            <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
          </svg>
        </button>
      </header>

      {/* Scrollable */}
      <div className="flex-1 overflow-y-auto pb-24">

        {/* Hero */}
        <div className="border-b border-[#2A2A2A]" style={{ padding: '12px 20px 20px' }}>
          <span
            className="font-mono font-bold uppercase block"
            style={{ fontSize: 10, letterSpacing: '0.14em', color: '#D4FF3A' }}
          >
            {formatDate(competition.start_date)}
          </span>
          <h1
            className="font-sans font-bold"
            style={{ fontSize: 26, letterSpacing: '-0.02em', lineHeight: 1.05, margin: '6px 0 14px' }}
          >
            {competition.name}
          </h1>
          <div className="flex flex-wrap gap-1.5">
            <StatusPill status={competition.status} />
            {myTeam && <StatusPill status={myTeam.team.status} />}
            <NeutralPill>
              {divisions.length} {divisions.length === 1 ? 'DIVISÃO' : 'DIVISÕES'} · {wods.length} WODs
            </NeutralPill>
          </div>
        </div>

        {/* Team invite banner */}
        {pendingTeamInvite && (
          <div style={{ borderBottom: '1px solid #2A2A2A', borderLeft: '3px solid #D4FF3A', padding: '14px 20px', background: '#111111' }}>
            <span style={{ fontFamily: 'JetBrains Mono, monospace', fontWeight: 900, fontSize: 9, letterSpacing: '0.16em', textTransform: 'uppercase', color: '#D4FF3A', display: 'block', marginBottom: 6 }}>
              INVITE · TEAM
            </span>
            <p style={{ fontSize: 13, color: '#F5F5F0', lineHeight: 1.4, marginBottom: 12 }}>
              You've been invited to the team <strong>{pendingTeamInvite.team_name ?? 'no name'}</strong>.
            </p>
            {teamInviteError && (
              <p style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: '#FF3B30', marginBottom: 10 }}>
                {teamInviteError}
              </p>
            )}
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={handleAcceptTeamInvite} disabled={teamInviteLoading}
                style={{ flex: 1, padding: '11px 0', background: '#D4FF3A', color: '#0A0A0A', border: 0, fontFamily: 'JetBrains Mono, monospace', fontWeight: 900, fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', opacity: teamInviteLoading ? 0.5 : 1, cursor: teamInviteLoading ? 'not-allowed' : 'pointer' }}>
                ACEITAR
              </button>
              <button onClick={handleDeclineTeamInvite} disabled={teamInviteLoading}
                style={{ flex: 1, padding: '11px 0', background: 'transparent', color: '#6B6B68', border: '1px solid #2A2A2A', fontFamily: 'JetBrains Mono, monospace', fontWeight: 900, fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', opacity: teamInviteLoading ? 0.5 : 1, cursor: teamInviteLoading ? 'not-allowed' : 'pointer' }}>
                RECUSAR
              </button>
            </div>
          </div>
        )}

        {/* Judge invite banner */}
        {pendingJudgeInvite && (
          <div
            style={{
              borderBottom: '1px solid #2A2A2A',
              borderLeft: '3px solid #FFB800',
              padding: '14px 20px',
              background: '#111111',
            }}
          >
            <span
              style={{
                fontFamily: 'JetBrains Mono, monospace',
                fontWeight: 900,
                fontSize: 9,
                letterSpacing: '0.16em',
                textTransform: 'uppercase',
                color: '#FFB800',
                display: 'block',
                marginBottom: 6,
              }}
            >
              CONVITE · JUDGE
            </span>
            <p style={{ fontSize: 13, color: '#F5F5F0', lineHeight: 1.4, marginBottom: 12 }}>
              You have been invited to be a judge for this competition.
            </p>
            {inviteError && (
              <p style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: '#FF3B30', marginBottom: 10 }}>
                {inviteError}
              </p>
            )}
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={handleAcceptInvite}
                disabled={inviteLoading}
                style={{
                  flex: 1,
                  padding: '11px 0',
                  background: '#D4FF3A',
                  color: '#0A0A0A',
                  border: 0,
                  fontFamily: 'JetBrains Mono, monospace',
                  fontWeight: 900,
                  fontSize: 10,
                  letterSpacing: '0.14em',
                  textTransform: 'uppercase',
                  opacity: inviteLoading ? 0.5 : 1,
                  cursor: inviteLoading ? 'not-allowed' : 'pointer',
                }}
              >
                ACEITAR
              </button>
              <button
                onClick={handleDeclineInvite}
                disabled={inviteLoading}
                style={{
                  flex: 1,
                  padding: '11px 0',
                  background: 'transparent',
                  color: '#6B6B68',
                  border: '1px solid #2A2A2A',
                  fontFamily: 'JetBrains Mono, monospace',
                  fontWeight: 900,
                  fontSize: 10,
                  letterSpacing: '0.14em',
                  textTransform: 'uppercase',
                  opacity: inviteLoading ? 0.5 : 1,
                  cursor: inviteLoading ? 'not-allowed' : 'pointer',
                }}
              >
                RECUSAR
              </button>
            </div>
          </div>
        )}

        {/* Stats 2×2 grid */}
        <div
          className="border-b border-[#2A2A2A]"
          style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', background: '#2A2A2A', gap: 1 }}
        >
          <StatCell label="LOCAL">
            <span className="font-sans font-semibold" style={{ fontSize: 14, color: '#F5F5F0' }}>
              {competition.venue ?? '—'}
            </span>
          </StatCell>
          <StatCell label="REG. DEADLINE">
            <span className="font-mono font-bold" style={{ fontSize: 13, color: '#F5F5F0' }}>
              {formatDeadline(competition.registration_deadline)}
            </span>
          </StatCell>
          <StatCell label="EQUIPES INSCRITAS">
            <div className="flex items-baseline gap-1">
              <span className="font-mono font-black" style={{ fontSize: 24, letterSpacing: '-0.02em', color: '#F5F5F0' }}>
                {teamCounts.approved}
              </span>
              <span className="font-mono" style={{ fontSize: 12, color: '#6B6B68' }}>
                /{teamCounts.total}
              </span>
            </div>
          </StatCell>
          <StatCell label="DIVISIONS">
            {divisions.length === 0 ? (
              <span className="font-mono" style={{ fontSize: 12, color: '#3D3D3B' }}>—</span>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                {divisions.map(d => (
                  <span key={d.id} className="font-mono font-bold uppercase" style={{ fontSize: 10, letterSpacing: '0.12em', color: '#D4FF3A' }}>
                    {['individual','pair','team3','team4'].indexOf(d.format) >= 0
                      ? { individual:'IND', pair:'PAIR', team3:'TEAM 3', team4:'TEAM 4' }[d.format as 'individual'|'pair'|'team3'|'team4']
                      : d.format.toUpperCase()
                    } · {d.composition.toUpperCase()} · {d.category.toUpperCase()}
                  </span>
                ))}
              </div>
            )}
          </StatCell>
        </div>

        {/* Description */}
        {competition.description && (
          <div className="border-b border-[#2A2A2A]" style={{ padding: '18px 20px' }}>
            <span
              className="font-mono font-bold uppercase block"
              style={{ fontSize: 9, letterSpacing: '0.16em', color: '#6B6B68', marginBottom: 8 }}
            >
              SOBRE
            </span>
            <p className="font-sans" style={{ fontSize: 14, lineHeight: 1.5, color: '#A8A8A4' }}>
              {competition.description}
            </p>
          </div>
        )}

        {/* WODs */}
        <div style={{ padding: '18px 20px 8px' }}>
          <div className="flex justify-between items-baseline" style={{ marginBottom: 12 }}>
            <span
              className="font-mono font-black uppercase"
              style={{ fontSize: 11, letterSpacing: '0.14em', color: '#F5F5F0' }}
            >
              WODs · {wods.length}
            </span>
            <span
              className="font-mono font-bold uppercase"
              style={{ fontSize: 9, letterSpacing: '0.14em', color: '#6B6B68' }}
            >
              TODOS RELEASE D-7
            </span>
          </div>
          {wods.map((w, i) => {
            const isPublished = w.status === 'published'
            const isLocked = w.status === 'submitted' || w.status === 'draft'
            const Tag = isPublished ? 'button' : 'div'
            return (
              <Tag
                key={w.id}
                {...(isPublished ? { onClick: () => setSelectedWodId(w.id) } : {})}
                className="border-t border-[#2A2A2A] w-full text-left"
                style={{
                  display: 'grid',
                  gridTemplateColumns: '28px 1fr auto',
                  gap: 12,
                  alignItems: 'center',
                  padding: '12px 0',
                  background: 'transparent',
                  border: 'none',
                  borderTop: '1px solid #2A2A2A',
                  cursor: isPublished ? 'pointer' : 'default',
                  color: '#F5F5F0',
                }}
              >
                <span
                  className="font-mono font-black"
                  style={{ fontSize: 14, letterSpacing: '-0.01em', color: '#6B6B68', fontVariantNumeric: 'tabular-nums' }}
                >
                  {String(i + 1).padStart(2, '0')}
                </span>
                <div>
                  <div
                    className="font-sans font-semibold"
                    style={{ fontSize: 15, color: isLocked ? '#3D3D3B' : '#F5F5F0' }}
                  >
                    {isLocked ? `WOD ${i + 1}` : w.name}
                  </div>
                  {!isLocked && (
                    <div
                      className="font-mono font-semibold uppercase"
                      style={{ fontSize: 10, letterSpacing: '0.14em', color: '#6B6B68', marginTop: 4 }}
                    >
                      {w.score_type.replace('_', '+').toUpperCase()}{w.cap ? ` · ${w.cap}` : ''}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {w.status === 'published' ? (
                    <>
                      <StatusPill status="approved" label="PUBLICADO" />
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#6B6B68" strokeWidth="2.5">
                        <path d="M9 18l6-6-6-6" />
                      </svg>
                    </>
                  ) : w.status === 'submitted' ? (
                    <StatusPill status="in_progress" label="UNDER REVIEW" />
                  ) : (
                    <StatusPill status="draft" label="COMING SOON" />
                  )}
                </div>
              </Tag>
            )
          })}
          {wods.length === 0 && (
            <div
              className="border-t border-[#2A2A2A] font-mono font-bold uppercase text-center"
              style={{ fontSize: 9, letterSpacing: '0.14em', color: '#6B6B68', padding: '20px 0' }}
            >
              Nenhum WOD cadastrado
            </div>
          )}
        </div>

        {/* Resultado Final */}
        {competition.status === 'finished' && (
          <div className="border-t border-[#2A2A2A]" style={{ padding: '18px 20px 8px' }}>
            <div className="flex justify-between items-baseline" style={{ marginBottom: 12 }}>
              <span className="font-mono font-black uppercase" style={{ fontSize: 11, letterSpacing: '0.14em', color: '#D4FF3A' }}>
                RESULTADO FINAL
              </span>
              <span className="font-mono font-bold uppercase" style={{ fontSize: 9, letterSpacing: '0.14em', color: '#6B6B68' }}>
                {finalRows.length} EQUIPES
              </span>
            </div>
            {finalLoading ? (
              <div className="flex justify-center py-8">
                <div className="w-5 h-5 border-2 animate-spin" style={{ borderColor: '#D4FF3A', borderTopColor: 'transparent' }} />
              </div>
            ) : finalRows.length === 0 ? (
              <div className="font-mono font-bold uppercase text-center" style={{ fontSize: 9, letterSpacing: '0.14em', color: '#6B6B68', padding: '20px 0' }}>
                Nenhum resultado publicado
              </div>
            ) : (
              <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' as React.CSSProperties['WebkitOverflowScrolling'] }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: 'JetBrains Mono, monospace', fontVariantNumeric: 'tabular-nums' }}>
                  <thead>
                    <tr style={{ borderBottom: '2px solid #F5F5F0' }}>
                      <th style={{ padding: '6px 8px', textAlign: 'right', width: 36, fontSize: 9, fontWeight: 800, letterSpacing: '0.16em', textTransform: 'uppercase', color: '#6B6B68', position: 'sticky', left: 0, background: '#0A0A0A' }}>#</th>
                      <th style={{ padding: '6px 10px', textAlign: 'left', minWidth: 110, fontSize: 9, fontWeight: 800, letterSpacing: '0.16em', textTransform: 'uppercase', color: '#6B6B68', position: 'sticky', left: 36, background: '#0A0A0A', borderRight: '1px solid #2A2A2A' }}>EQUIPE</th>
                      {finalWods.map((w, i) => (
                        <th key={w.id} style={{ padding: '6px 8px', textAlign: 'center', width: 52, fontSize: 9, fontWeight: 800, letterSpacing: '0.16em', textTransform: 'uppercase', color: '#6B6B68', whiteSpace: 'nowrap' }}>
                          W{String(i + 1).padStart(2, '0')}
                        </th>
                      ))}
                      <th style={{ padding: '6px 10px', textAlign: 'right', width: 52, fontSize: 9, fontWeight: 800, letterSpacing: '0.16em', textTransform: 'uppercase', color: '#6B6B68', borderLeft: '1px solid #2A2A2A' }}>PTS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {finalRows.map((row, idx) => {
                      const rank = row.overall_rank
                      const isFirst = rank === 1
                      const bg = rank === 1 ? 'rgba(212,255,58,0.10)' : rank <= 3 ? 'rgba(212,255,58,0.04)' : idx % 2 === 1 ? 'rgba(255,255,255,0.02)' : 'transparent'
                      const medal = rank === 1 ? { bg: '#C9A227', color: '#0A0A0A' } : rank === 2 ? { bg: '#8C9094', color: '#0A0A0A' } : rank === 3 ? { bg: '#8B4A2D', color: '#F5F5F0' } : null
                      return (
                        <tr key={row.team_id} style={{ background: bg }}>
                          <td style={{ padding: '8px', textAlign: 'right', borderBottom: '1px solid #1A1A1A', position: 'sticky', left: 0, background: bg === 'transparent' ? '#0A0A0A' : bg }}>
                            {medal ? (
                              <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', background: medal.bg, color: medal.color, fontFamily: 'JetBrains Mono, monospace', fontWeight: 900, fontSize: 11, padding: '2px 6px' }}>{String(rank).padStart(2,'0')}</span>
                            ) : (
                              <span style={{ fontWeight: 800, fontSize: 13, color: '#6B6B68' }}>{String(rank).padStart(2,'0')}</span>
                            )}
                          </td>
                          <td style={{ padding: '8px 10px', fontFamily: 'Space Grotesk, sans-serif', fontWeight: 700, fontSize: isFirst ? 14 : 13, color: isFirst ? '#D4FF3A' : '#F5F5F0', borderBottom: '1px solid #1A1A1A', position: 'sticky', left: 36, background: bg === 'transparent' ? '#0A0A0A' : bg, borderRight: '1px solid #2A2A2A', whiteSpace: 'nowrap', maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {row.team_name}
                          </td>
                          {finalWods.map(w => {
                            const cell = row.per_wod?.[w.id]
                            if (!cell) return <td key={w.id} style={{ textAlign: 'center', padding: '8px', fontSize: 10, color: '#444', fontWeight: 700, borderBottom: '1px solid #1A1A1A' }}>DNS</td>
                            return (
                              <td key={w.id} style={{ textAlign: 'center', padding: '8px', borderBottom: '1px solid #1A1A1A', whiteSpace: 'nowrap' }}>
                                <span style={{ fontSize: cell.position === 1 ? 14 : 12, fontWeight: 800, color: cell.position === 1 ? '#D4FF3A' : '#F5F5F0' }}>{cell.position}</span>
                                <span style={{ fontSize: 9, color: '#6B6B68', marginLeft: 3, fontWeight: 700 }}>{cell.points}p</span>
                              </td>
                            )
                          })}
                          <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 800, fontSize: isFirst ? 17 : 15, color: '#D4FF3A', borderLeft: '1px solid #2A2A2A', borderBottom: '1px solid #1A1A1A', whiteSpace: 'nowrap' }}>
                            {row.total_points}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* My Team */}
        {myTeam && (
          <div className="border-t border-[#2A2A2A]" style={{ padding: '18px 20px 8px' }}>
            <div className="flex justify-between items-baseline" style={{ marginBottom: 12 }}>
              <span
                className="font-mono font-black uppercase"
                style={{ fontSize: 11, letterSpacing: '0.14em', color: '#F5F5F0' }}
              >
                MINHA EQUIPE
              </span>
            </div>
            <button
              onClick={() => navigate(`/athlete/competitions/${id}/team/${myTeam.team.id}`)}
              className="w-full text-left active:bg-[#111111] transition-colors"
              style={{
                display: 'grid',
                gridTemplateColumns: '40px 1fr auto',
                gap: 12,
                alignItems: 'center',
                padding: '12px 0',
                border: 0,
                background: 'transparent',
              }}
            >
              {/* lime avatar */}
              <div
                className="flex items-center justify-center font-mono font-black"
                style={{
                  width: 40,
                  height: 40,
                  background: '#D4FF3A',
                  color: '#0A0A0A',
                  fontSize: 13,
                  letterSpacing: '0.04em',
                  flexShrink: 0,
                }}
              >
                {teamInitials(myTeam.team.name)}
              </div>
              <div className="min-w-0">
                <div className="font-sans font-semibold truncate" style={{ fontSize: 15, color: '#F5F5F0' }}>
                  {myTeam.team.name}
                </div>
                <div
                  className="font-mono font-semibold uppercase"
                  style={{ fontSize: 10, letterSpacing: '0.14em', color: '#6B6B68', marginTop: 4 }}
                >
                  {memberCount} ATHLETES · {isCaptain ? 'CAPTAIN' : 'MEMBER'}
                </div>
              </div>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6B6B68" strokeWidth="2">
                <path d="M9 18l6-6-6-6" />
              </svg>
            </button>
          </div>
        )}

        {/* Share line */}
        <div
          className="flex items-center justify-between gap-2.5"
          style={{
            margin: '16px 20px',
            padding: '12px 14px',
            border: '1px dashed #3A3A3A',
          }}
        >
          <span
            className="font-mono font-semibold truncate"
            style={{ fontSize: 11, letterSpacing: '0.04em', color: '#A8A8A4' }}
          >
            gounbroken.app/competition/{slug}
          </span>
          <button
            onClick={copySlug}
            className="flex items-center gap-1.5 font-mono font-black uppercase flex-shrink-0"
            style={{
              fontSize: 9,
              letterSpacing: '0.14em',
              color: copied ? '#D4FF3A' : '#6B6B68',
              background: 'transparent',
              border: 0,
              padding: 0,
            }}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="9" y="9" width="13" height="13" rx="0" />
              <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
            </svg>
            {copied ? 'COPIADO' : 'COPIAR'}
          </button>
        </div>

        {/* Action buttons */}
        <div className="flex flex-col gap-2" style={{ padding: '0 20px 8px' }}>
          {competition.status === 'in_progress' && (
            <button
              onClick={() => navigate(`/athlete/competitions/${id}/leaderboard`)}
              className="w-full flex items-center justify-center font-mono font-black uppercase"
              style={{
                fontSize: 11,
                letterSpacing: '0.14em',
                padding: '14px 20px',
                border: '1px solid #2A2A2A',
                color: '#F5F5F0',
                background: 'transparent',
              }}
            >
              VER LEADERBOARD
            </button>
          )}

          {isHeadJudgeOrAdmin && (
            <button
              onClick={() => navigate(`/athlete/competitions/${id}/manage`)}
              className="w-full flex items-center justify-center font-mono font-black uppercase"
              style={{
                fontSize: 11,
                letterSpacing: '0.14em',
                padding: '14px 20px',
                border: '1px solid #D4FF3A',
                color: '#D4FF3A',
                background: 'transparent',
              }}
            >
              MANAGE COMPETITION
            </button>
          )}

          {isJudgeAny && (
            <button
              onClick={() => navigate(`/athlete/competitions/${id}/judge`)}
              className="w-full flex items-center justify-center font-mono font-black uppercase"
              style={{
                fontSize: 11,
                letterSpacing: '0.14em',
                padding: '14px 20px',
                border: '1px solid #4DA3FF',
                color: '#4DA3FF',
                background: 'transparent',
              }}
            >
              PAINEL DE JUIZ
            </button>
          )}
        </div>

      </div>

      {/* WOD detail bottom sheet */}
      {selectedWodId && selectedWod && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end">
          <div
            className="absolute inset-0"
            style={{ background: 'rgba(0,0,0,0.6)' }}
            onClick={() => setSelectedWodId(null)}
          />
          <div
            className="relative flex flex-col"
            style={{
              background: '#111111',
              borderTop: '2px solid #D4FF3A',
              maxHeight: '82vh',
              zIndex: 1,
            }}
          >
            {/* Sheet header */}
            <div
              className="flex items-start justify-between gap-3 flex-shrink-0"
              style={{ padding: '20px 20px 14px', borderBottom: '1px solid #2A2A2A' }}
            >
              <div className="min-w-0">
                <span
                  className="font-mono font-black uppercase block"
                  style={{ fontSize: 9, letterSpacing: '0.2em', color: '#D4FF3A', marginBottom: 4 }}
                >
                  WOD {String(wods.findIndex(w => w.id === selectedWodId) + 1).padStart(2, '0')} · {selectedWod.score_type.replace('_', '+').toUpperCase()}{selectedWod.cap ? ` · ${selectedWod.cap}` : ''}
                </span>
                <h2
                  className="font-sans font-bold truncate"
                  style={{ fontSize: 22, letterSpacing: '-0.01em', color: '#F5F5F0' }}
                >
                  {selectedWod.name}
                </h2>
                {selectedWod.description && (
                  <p
                    className="font-sans"
                    style={{ fontSize: 13, color: '#6B6B68', marginTop: 6, lineHeight: 1.5 }}
                  >
                    {selectedWod.description}
                  </p>
                )}
              </div>
              <button
                onClick={() => setSelectedWodId(null)}
                style={{ background: 'none', border: 'none', color: '#6B6B68', padding: 4, flexShrink: 0, cursor: 'pointer' }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M6 6l12 12M18 6l-12 12" />
                </svg>
              </button>
            </div>

            {/* Results */}
            <div className="overflow-y-auto flex-1">
              {resultsLoading ? (
                <div className="flex justify-center py-10">
                  <div className="w-5 h-5 border-2 animate-spin" style={{ borderColor: '#D4FF3A', borderTopColor: 'transparent' }} />
                </div>
              ) : wodResults.length === 0 ? (
                <div style={{ padding: '32px 20px', textAlign: 'center' }}>
                  <span
                    className="font-mono font-bold uppercase block"
                    style={{ fontSize: 10, letterSpacing: '0.16em', color: '#6B6B68', marginBottom: 8 }}
                  >
                    SEM RESULTADOS PUBLICADOS
                  </span>
                  <span
                    className="font-sans"
                    style={{ fontSize: 13, color: '#444', lineHeight: 1.5 }}
                  >
                    Results for this WOD have not been published yet.
                  </span>
                </div>
              ) : (
                <>
                  {/* Column header */}
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '40px 1fr auto',
                      gap: 12,
                      padding: '8px 20px',
                      borderBottom: '1px solid #2A2A2A',
                    }}
                  >
                    {['#', 'EQUIPE', 'RESULTADO'].map(h => (
                      <span
                        key={h}
                        className="font-mono font-black uppercase"
                        style={{ fontSize: 9, letterSpacing: '0.16em', color: '#6B6B68', textAlign: h === 'RESULTADO' ? 'right' : 'left' }}
                      >
                        {h}
                      </span>
                    ))}
                  </div>
                  {wodResults.map((r, idx) => {
                    const isTop = r.wod_position <= 3
                    const isFirst = r.wod_position === 1
                    return (
                      <div
                        key={idx}
                        style={{
                          display: 'grid',
                          gridTemplateColumns: '40px 1fr auto',
                          gap: 12,
                          padding: '12px 20px',
                          borderBottom: '1px solid #1A1A1A',
                          alignItems: 'center',
                          background: isFirst
                            ? 'rgba(212,255,58,0.08)'
                            : isTop
                            ? 'rgba(212,255,58,0.03)'
                            : idx % 2 === 1
                            ? 'rgba(255,255,255,0.02)'
                            : 'transparent',
                        }}
                      >
                        <MedalRank rank={r.wod_position} />
                        <div className="min-w-0">
                          <div
                            className="font-sans font-semibold truncate"
                            style={{ fontSize: 14, color: isFirst ? '#D4FF3A' : '#F5F5F0' }}
                          >
                            {r.v_team_name}
                          </div>
                          {r.v_box && (
                            <div
                              className="font-mono font-semibold truncate"
                              style={{ fontSize: 10, letterSpacing: '0.06em', color: '#6B6B68', marginTop: 2 }}
                            >
                              {r.v_box}
                            </div>
                          )}
                        </div>
                        <span
                          className="font-mono font-black"
                          style={{
                            fontSize: 14,
                            letterSpacing: '0.02em',
                            color: isFirst ? '#D4FF3A' : '#F5F5F0',
                            fontVariantNumeric: 'tabular-nums',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {r.v_raw_result}
                        </span>
                      </div>
                    )
                  })}
                  <div style={{ height: 24 }} />
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Sticky bottom CTA — only if registration open and no team yet */}
      {registrationOpen && !myTeam && (
        <div
          className="sticky bottom-0 border-t border-[#2A2A2A]"
          style={{ padding: '14px 20px 24px', background: '#0A0A0A' }}
        >
          <button
            onClick={() => navigate(`/athlete/competitions/${id}/team/new`)}
            className="w-full flex items-center justify-center font-mono font-black uppercase"
            style={{
              fontSize: 12,
              letterSpacing: '0.14em',
              padding: '16px 20px',
              background: '#D4FF3A',
              color: '#0A0A0A',
              border: 0,
            }}
          >
            CREATE TEAM → BECOME CAPTAIN
          </button>
        </div>
      )}

    </div>
  )
}

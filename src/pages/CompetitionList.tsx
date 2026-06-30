import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { useProfile } from '@/hooks/useProfile'
import type { Competition, CompetitionStatus, TeamStatus } from '@/types'

// ─── types ────────────────────────────────────────────────────────────────────

interface CompetitionRow extends Competition {
  myRole: 'head_judge' | 'judge' | 'athlete' | null
  myTeamStatus: TeamStatus | null
}

// ─── helpers ─────────────────────────────────────────────────────────────────

const PT_MONTHS = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC']
const PT_MONTHS_FULL = ['JANUARY','FEBRUARY','MARCH','APRIL','MAY','JUNE','JULY','AUGUST','SEPTEMBER','OCTOBER','NOVEMBER','DECEMBER']

function parseDateParts(iso: string): { day: string; month: string } {
  const d = new Date(iso + 'T00:00:00')
  return {
    day: String(d.getDate()).padStart(2, '0'),
    month: PT_MONTHS[d.getMonth()],
  }
}

function currentMonthLabel(): string {
  const now = new Date()
  return `YOUR COMPS · ${PT_MONTHS_FULL[now.getMonth()]} ${now.getFullYear()}`
}

type StatusKey =
  | CompetitionStatus
  | TeamStatus
  | 'accepted'
  | 'invited'

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

// ─── StatusPill ───────────────────────────────────────────────────────────────

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

// ─── SectionHead ──────────────────────────────────────────────────────────────

function SectionHead({ num, title }: { num: number; title: string }) {
  return (
    <div
      className="flex items-center gap-3 border-b border-[#2A2A2A]"
      style={{ padding: '10px 20px', background: '#0D0D0D' }}
    >
      <span
        className="inline-flex items-center justify-center font-mono font-black flex-shrink-0"
        style={{ width: 16, height: 16, background: '#D4FF3A', color: '#0A0A0A', fontSize: 9, letterSpacing: '0.06em' }}
      >
        {num}
      </span>
      <span
        className="font-mono font-black uppercase"
        style={{ fontSize: 9, letterSpacing: '0.16em', color: '#6B6B68' }}
      >
        {title}
      </span>
    </div>
  )
}

// ─── CompRow ──────────────────────────────────────────────────────────────────

function CompRow({ comp, dim, onClick }: { comp: CompetitionRow; dim?: boolean; onClick: () => void }) {
  const { day, month } = parseDateParts(comp.start_date)

  return (
    <button
      onClick={onClick}
      className="w-full text-left border-b border-[#2A2A2A] active:bg-[#111111] transition-colors"
      style={{
        display: 'grid',
        gridTemplateColumns: '56px 1fr auto',
        gap: 14,
        padding: '16px 20px',
        alignItems: 'center',
        opacity: dim ? 0.5 : 1,
        background: 'transparent',
      }}
    >
      {/* date box */}
      <div
        className="flex flex-col items-center justify-center"
        style={{
          background: '#111111',
          border: '1px solid #2A2A2A',
          padding: '8px 0',
          gap: 2,
        }}
      >
        <span
          className="font-mono font-black leading-none"
          style={{ fontSize: 16, letterSpacing: '-0.02em', color: '#F5F5F0' }}
        >
          {day}
        </span>
        <span
          className="font-mono font-bold"
          style={{ fontSize: 8.5, letterSpacing: '0.16em', color: '#6B6B68' }}
        >
          {month}
        </span>
      </div>

      {/* info */}
      <div className="min-w-0">
        <div
          className="font-sans font-semibold truncate"
          style={{ fontSize: 15, letterSpacing: '-0.005em', color: '#F5F5F0' }}
        >
          {comp.name}
        </div>
        <div
          className="font-mono font-semibold uppercase mt-1 truncate"
          style={{ fontSize: 9, letterSpacing: '0.14em', color: '#6B6B68' }}
        >
          {comp.venue ?? '—'}
        </div>
      </div>

      {/* right badges */}
      <div className="flex flex-col items-end" style={{ gap: 6 }}>
        <StatusPill status={comp.status} />
        {comp.myRole === 'head_judge' && (
          <span
            className="font-mono font-black uppercase"
            style={{
              fontSize: 9,
              letterSpacing: '0.16em',
              background: '#D4FF3A',
              color: '#0A0A0A',
              padding: '3px 5px',
            }}
          >
            HEAD JUDGE
          </span>
        )}
        {comp.myRole === 'athlete' && comp.myTeamStatus && (
          <StatusPill status={comp.myTeamStatus} />
        )}
      </div>
    </button>
  )
}

// ─── page ─────────────────────────────────────────────────────────────────────

export default function CompetitionList() {
  const { user } = useAuth()
  const { profile } = useProfile(user?.id)
  const navigate = useNavigate()
  const isAdmin = profile?.roles?.includes('admin')
  const [rows, setRows] = useState<CompetitionRow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      setLoading(true)

      const { data: comps } = await supabase
        .from('competitions')
        .select('*')
        .order('start_date', { ascending: false })

      if (!comps || comps.length === 0) {
        setRows([])
        setLoading(false)
        return
      }

      if (!user?.id) {
        setRows(comps.map((c: Competition) => ({ ...c, myRole: null, myTeamStatus: null })))
        setLoading(false)
        return
      }

      const compIds = comps.map((c: Competition) => c.id)

      const [rolesRes, teamsRes] = await Promise.all([
        supabase
          .from('competition_roles')
          .select('competition_id, role')
          .eq('user_id', user.id)
          .in('competition_id', compIds),
        supabase
          .from('competition_teams')
          .select('id, competition_id, status, captain_user_id')
          .in('competition_id', compIds),
      ])

      // Highest-privilege role per competition
      const rolesByComp: Record<string, string> = {}
      for (const r of (rolesRes.data ?? []) as { competition_id: string; role: string }[]) {
        const existing = rolesByComp[r.competition_id]
        if (!existing || r.role === 'head_judge' || (r.role === 'judge' && existing === 'athlete')) {
          rolesByComp[r.competition_id] = r.role
        }
      }

      const allTeams = (teamsRes.data ?? []) as { id: string; competition_id: string; status: string; captain_user_id: string }[]
      const captainTeamIds = new Set(allTeams.filter(t => t.captain_user_id === user.id).map(t => t.id))

      const memberRes = await supabase
        .from('competition_team_members')
        .select('team_id')
        .eq('user_id', user.id)
        .not('status', 'in', '("rejected","removed")')

      const memberTeamIds = new Set([
        ...captainTeamIds,
        ...((memberRes.data ?? []) as { team_id: string }[]).map(m => m.team_id),
      ])

      const teamStatusByComp: Record<string, TeamStatus> = {}
      for (const t of allTeams) {
        if (memberTeamIds.has(t.id)) {
          teamStatusByComp[t.competition_id] = t.status as TeamStatus
        }
      }

      const result: CompetitionRow[] = comps.map((c: Competition) => ({
        ...c,
        myRole: (rolesByComp[c.id] as CompetitionRow['myRole']) ?? null,
        myTeamStatus: teamStatusByComp[c.id] ?? null,
      }))

      setRows(result)
      setLoading(false)
    }

    load()
  }, [user?.id])

  const active = rows.filter(c => ['open', 'in_progress', 'draft'].includes(c.status))
  const finished = rows.filter(c => c.status === 'finished' || c.status === 'closed')
  const inProgress = active.filter(c => c.status === 'in_progress').length
  const asHeadJudge = rows.filter(c => c.myRole === 'head_judge').length

  return (
    <div className="min-h-screen flex flex-col" style={{ background: '#0A0A0A', color: '#F5F5F0' }}>

      {/* Topbar */}
      <header
        className="sticky top-0 z-10 flex items-center justify-between border-b border-[#2A2A2A]"
        style={{ height: 52, padding: '8px 16px 12px', background: '#0A0A0A' }}
      >
        <button
          className="flex items-center justify-center text-[#6B6B68] active:text-[#F5F5F0]"
          style={{ width: 36, height: 36, background: 'transparent', border: 0 }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="7" />
            <path d="M21 21l-4.35-4.35" />
          </svg>
        </button>
        <span
          className="font-mono font-black uppercase"
          style={{ fontSize: 11, letterSpacing: '0.22em', color: '#F5F5F0' }}
        >
          CF · COMPS
        </span>
        {isAdmin ? (
          <button
            onClick={() => navigate('/athlete/competitions/new')}
            className="flex items-center justify-center active:opacity-70"
            style={{ width: 36, height: 36, background: '#D4FF3A', border: 0 }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#0A0A0A" strokeWidth="2.5">
              <path d="M12 5v14M5 12h14" />
            </svg>
          </button>
        ) : (
          <div style={{ width: 36 }} />
        )}
      </header>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto">

        {/* Hero */}
        <div
          className="border-b border-[#2A2A2A]"
          style={{ padding: '14px 20px 18px' }}
        >
          <span
            className="font-mono font-bold uppercase block"
            style={{ fontSize: 10, letterSpacing: '0.14em', color: '#D4FF3A' }}
          >
            {currentMonthLabel()}
          </span>
          {loading ? (
            <div className="mt-2 animate-pulse" style={{ height: 32, width: 200, background: '#111111' }} />
          ) : (
            <h1
              className="font-sans font-bold mt-2"
              style={{ fontSize: 28, letterSpacing: '-0.02em', lineHeight: 1.05 }}
            >
              {active.length} competition{active.length === 1 ? '' : 's'}<br />open.
            </h1>
          )}
          <div
            className="flex flex-wrap gap-2 items-center font-mono font-semibold uppercase"
            style={{ fontSize: 11, letterSpacing: '0.12em', color: '#A8A8A4', marginTop: 10 }}
          >
            <span>{inProgress} IN PROGRESS</span>
            <span style={{ color: '#6B6B68' }}>·</span>
            <span>{asHeadJudge} AS HEAD JUDGE</span>
          </div>
        </div>

        {/* Loading spinner */}
        {loading && (
          <div className="flex justify-center py-16">
            <div
              className="w-5 h-5 border-2 animate-spin"
              style={{ borderColor: '#D4FF3A', borderTopColor: 'transparent' }}
            />
          </div>
        )}

        {/* Active competitions */}
        {!loading && active.length > 0 && (
          <>
            <SectionHead num={1} title="IN PROGRESS · OPEN" />
            {active.map(c => (
              <CompRow
                key={c.id}
                comp={c}
                onClick={() => navigate(`/athlete/competitions/${c.id}`)}
              />
            ))}
          </>
        )}

        {/* Finished competitions */}
        {!loading && finished.length > 0 && (
          <>
            <SectionHead num={active.length > 0 ? 2 : 1} title="FINISHED" />
            {finished.map(c => (
              <CompRow
                key={c.id}
                comp={c}
                dim
                onClick={() => navigate(`/athlete/competitions/${c.id}`)}
              />
            ))}
          </>
        )}

        {/* Empty state */}
        {!loading && rows.length === 0 && (
          <div className="flex flex-col items-center justify-center py-24 px-8 text-center">
            <span
              className="font-mono font-bold uppercase"
              style={{ fontSize: 10, letterSpacing: '0.16em', color: '#6B6B68' }}
            >
              No competitions available
            </span>
          </div>
        )}

        {/* Footer */}
        <div className="mx-5 my-8 border-b border-[#2A2A2A]" />
        <div
          className="px-5 pb-9 font-mono uppercase"
          style={{ fontSize: 10, letterSpacing: '0.14em', color: '#3D3D3B' }}
        >
          CF · COMPS · TEAM COMPETITIONS ONLY
        </div>

      </div>
    </div>
  )
}

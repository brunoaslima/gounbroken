import { useState, useEffect, useLayoutEffect, useCallback, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import type { CompetitionDivision, DivisionFormat } from '@/types'

interface WodInfo {
  id: string
  name: string
  score_type: string
  score_order: string
  cap: string | null
  status: string
  order_index: number
}

interface WodCell {
  wod_name: string
  position: number
  points: number
  raw_result: string
}

interface LeaderboardRow {
  team_id: string
  team_name: string
  box: string | null
  division_id: string | null
  total_points: number
  overall_rank: number
  wod_wins: number
  per_wod: Record<string, WodCell>
}

const FORMAT_SHORT: Record<DivisionFormat, string> = {
  individual: 'IND',
  pair: 'PAIR',
  team3: 'T3',
  team4: 'T4',
}

function divisionShortLabel(d: CompetitionDivision): string {
  return `${FORMAT_SHORT[d.format]} · ${d.composition.toUpperCase()} · ${d.category.toUpperCase()}`
}

const REFRESH_INTERVAL = 10

const ScoreTypeLabel: Record<string, string> = {
  time: 'FOR TIME',
  reps: 'MAX REPS',
  weight: 'MAX KG',
  rounds_plus_reps: 'AMRAP',
}

function RefreshIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M3 12a9 9 0 0 1 15-6.7L21 8" />
      <path d="M21 3v5h-5" />
      <path d="M21 12a9 9 0 0 1-15 6.7L3 16" />
      <path d="M3 21v-5h5" />
    </svg>
  )
}

function BackIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M15 18l-6-6 6-6" />
    </svg>
  )
}

function CrownIcon() {
  return (
    <svg
      width="13" height="13" viewBox="0 0 24 24"
      fill="none" stroke="#D4FF3A" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
      aria-hidden="true"
      style={{ display: 'inline-block', verticalAlign: 'middle', marginLeft: 5, flexShrink: 0 }}
    >
      <path d="M12 6l4 6l5 -4l-2 10h-14l-2 -10l5 4z" />
    </svg>
  )
}

interface RankMove {
  delta: number
  at: number
}

const ARROW_TTL = 30_000
const ARROW_FADE = 8_000

function MoveArrow({ move }: { move?: RankMove }) {
  if (!move || move.delta === 0) return null
  const age = Date.now() - move.at
  if (age >= ARROW_TTL) return null
  const opacity = age <= ARROW_TTL - ARROW_FADE ? 1 : (ARROW_TTL - age) / ARROW_FADE
  const up = move.delta > 0
  return (
    <svg
      width="11" height="11" viewBox="0 0 24 24"
      fill="none" stroke={up ? '#D4FF3A' : '#FF3B30'} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"
      aria-label={up ? `Subiu ${move.delta}` : `Desceu ${-move.delta}`}
      style={{ flexShrink: 0, opacity, transition: 'opacity 1s linear' }}
    >
      {up ? <path d="M12 19V5M5 12l7-7 7 7" /> : <path d="M12 5v14M19 12l-7 7-7-7" />}
    </svg>
  )
}

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
        fontFamily: 'JetBrains Mono, monospace', fontWeight: 900, fontSize: 13,
        letterSpacing: '0.04em', padding: '3px 8px',
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

function DivisionTable({
  rows,
  publishedWods,
  wods,
  movements,
}: {
  rows: LeaderboardRow[]
  publishedWods: WodInfo[]
  wods: WodInfo[]
  movements: Map<string, RankMove>
}) {
  const rowRefs = useRef(new Map<string, HTMLTableRowElement>())
  const prevTopsRef = useRef(new Map<string, number>())

  // FLIP: rows slide smoothly from their previous position to the new one
  useLayoutEffect(() => {
    const newTops = new Map<string, number>()
    rowRefs.current.forEach((el, teamId) => {
      if (el?.isConnected) newTops.set(teamId, el.offsetTop)
    })
    newTops.forEach((top, teamId) => {
      const prev = prevTopsRef.current.get(teamId)
      const el = rowRefs.current.get(teamId)
      if (prev === undefined || !el) return
      const delta = prev - top
      if (delta === 0) return
      el.style.transition = 'none'
      el.style.transform = `translateY(${delta}px)`
      requestAnimationFrame(() => {
        el.style.transition = 'transform 0.6s cubic-bezier(0.22, 1, 0.36, 1)'
        el.style.transform = ''
      })
    })
    prevTopsRef.current = newTops
  }, [rows])

  function rowBg(rank: number, idx: number) {
    if (rank === 1) return 'rgba(212,255,58,0.12)'
    if (rank <= 3) return 'rgba(212,255,58,0.06)'
    if (idx % 2 === 1) return 'rgba(255,255,255,0.025)'
    return 'transparent'
  }

  // detect tiebreaks: teams sharing (division_id, total_points) within these rows
  const tiedKeys = new Set<string>()
  const keyCount = new Map<string, number>()
  rows.forEach(r => {
    const k = `${r.division_id ?? ''}:${r.total_points}`
    keyCount.set(k, (keyCount.get(k) ?? 0) + 1)
  })
  keyCount.forEach((n, k) => { if (n > 1) tiedKeys.add(k) })
  const isTiebreak = (r: LeaderboardRow) => tiedKeys.has(`${r.division_id ?? ''}:${r.total_points}`)

  return (
    <div style={{ flex: 1, overflowX: 'auto', overflowY: 'auto', WebkitOverflowScrolling: 'touch', scrollbarWidth: 'none', minHeight: 0 }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'auto', fontFamily: 'var(--font-mono, monospace)', fontVariantNumeric: 'tabular-nums' }}>
        <thead>
          <tr style={{ background: '#0A0A0A', borderBottom: '2px solid #F5F5F0' }}>
            <th
              style={{
                padding: '8px 10px', textAlign: 'right', width: 48,
                fontFamily: 'inherit', fontSize: 10, fontWeight: 800,
                letterSpacing: '0.18em', textTransform: 'uppercase', color: '#6B6B68',
                position: 'sticky', left: 0, background: '#0A0A0A', zIndex: 2,
              }}
            >
              #
            </th>
            <th
              style={{
                padding: '8px 10px', textAlign: 'left', minWidth: 120,
                fontFamily: 'inherit', fontSize: 10, fontWeight: 800,
                letterSpacing: '0.18em', textTransform: 'uppercase', color: '#6B6B68',
                position: 'sticky', left: 48, background: '#0A0A0A', zIndex: 2,
                borderRight: '1px solid #2A2A2A',
              }}
            >
              EQUIPE
            </th>
            {publishedWods.map((w) => (
              <th
                key={w.id}
                style={{
                  padding: '8px 8px', textAlign: 'center', width: 58,
                  fontFamily: 'inherit', fontSize: 10, fontWeight: 800,
                  letterSpacing: '0.18em', textTransform: 'uppercase', color: '#6B6B68',
                  whiteSpace: 'nowrap',
                }}
              >
                W{String(wods.findIndex(x => x.id === w.id) + 1).padStart(2, '0')}
              </th>
            ))}
            <th
              style={{
                padding: '8px 10px', textAlign: 'right', width: 68,
                fontFamily: 'inherit', fontSize: 10, fontWeight: 800,
                letterSpacing: '0.18em', textTransform: 'uppercase', color: '#6B6B68',
                borderLeft: '1px solid #2A2A2A',
                whiteSpace: 'nowrap',
              }}
            >
              PTS
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, idx) => {
            const rank = row.overall_rank
            const isFirst = rank === 1
            const bg = rowBg(rank, idx)

            return (
              <tr
                key={row.team_id}
                ref={el => {
                  if (el) rowRefs.current.set(row.team_id, el)
                  else rowRefs.current.delete(row.team_id)
                }}
                style={{ background: bg, height: 34 }}
              >
                <td
                  style={{
                    padding: '0 8px', textAlign: 'right',
                    position: 'sticky', left: 0,
                    background: bg === 'transparent' ? '#0A0A0A' : bg,
                    zIndex: 1,
                    borderBottom: '1px solid #1A1A1A',
                    whiteSpace: 'nowrap',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 4 }}>
                    <MoveArrow move={movements.get(row.team_id)} />
                    <MedalRank rank={rank} />
                    {isTiebreak(row) && (
                      <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 8, fontWeight: 800, letterSpacing: '0.12em', color: '#6B6B68', lineHeight: 1 }}>
                        TB
                      </span>
                    )}
                  </div>
                </td>
                <td
                  style={{
                    padding: '0 10px',
                    fontFamily: 'Space Grotesk, sans-serif',
                    fontWeight: 700,
                    fontSize: isFirst ? 15 : 14,
                    letterSpacing: '-0.01em',
                    color: isFirst ? '#D4FF3A' : '#F5F5F0',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    maxWidth: 160,
                    position: 'sticky', left: 48,
                    background: bg === 'transparent' ? '#0A0A0A' : bg,
                    zIndex: 1,
                    borderBottom: '1px solid #1A1A1A',
                    borderRight: '1px solid #2A2A2A',
                  }}
                >
                  <span style={{ display: 'inline-flex', alignItems: 'center', maxWidth: '100%' }}>
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{row.team_name}</span>
                    {isFirst && <CrownIcon />}
                  </span>
                </td>
                {publishedWods.map(w => {
                  const cell = row.per_wod?.[w.id]
                  if (!cell) {
                    return (
                      <td
                        key={w.id}
                        style={{
                          textAlign: 'center', padding: '0 8px',
                          fontSize: 10, color: '#444', fontWeight: 700,
                          borderBottom: '1px solid #1A1A1A',
                        }}
                      >
                        —
                      </td>
                    )
                  }
                  const pos = cell.position
                  const cellBg =
                    pos === 1 ? '#C9A227' :
                    pos === 2 ? '#8C9094' :
                    pos === 3 ? '#8B4A2D' :
                               '#1E1E1E'
                  const cellColor =
                    pos === 1 ? '#0A0A0A' :
                    pos === 2 ? '#0A0A0A' :
                               '#F5F5F0'
                  return (
                    <td
                      key={w.id}
                      style={{
                        textAlign: 'center', padding: '0 6px',
                        borderBottom: '1px solid #1A1A1A',
                      }}
                    >
                      <span style={{
                        display: 'inline-block',
                        background: cellBg, color: cellColor,
                        fontFamily: 'JetBrains Mono, monospace',
                        fontSize: 12, fontWeight: 800,
                        letterSpacing: '0.04em',
                        padding: '3px 7px',
                        fontVariantNumeric: 'tabular-nums',
                      }}>
                        {cell.points}
                      </span>
                    </td>
                  )
                })}
                <td
                  style={{
                    padding: '0 10px', textAlign: 'right',
                    fontWeight: 800,
                    fontSize: isFirst ? 19 : 17,
                    color: '#D4FF3A',
                    letterSpacing: '-0.01em',
                    borderLeft: '1px solid #2A2A2A',
                    borderBottom: '1px solid #1A1A1A',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {row.total_points}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

export default function Leaderboard() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const [rows, setRows] = useState<LeaderboardRow[]>([])
  const [wods, setWods] = useState<WodInfo[]>([])
  const [divisions, setDivisions] = useState<CompetitionDivision[]>([])
  const [selectedDivisionId, setSelectedDivisionId] = useState<string | null>(null)
  const [compName, setCompName] = useState('')
  const [loading, setLoading] = useState(true)
  const [lbError, setLbError] = useState<string | null>(null)
  const [movements, setMovements] = useState<Map<string, RankMove>>(new Map())
  const prevRanksRef = useRef(new Map<string, number>())
  const [countdown, setCountdown] = useState(REFRESH_INTERVAL)
  const [refreshKey, setRefreshKey] = useState(0)
  const countdownRef = useRef(REFRESH_INTERVAL)
  const divFilterRef = useRef<HTMLDivElement>(null)
  const [filterHasMore, setFilterHasMore] = useState(false)
  const dragRef = useRef({ active: false, startX: 0, scrollLeft: 0, moved: false })

  const checkFilterOverflow = useCallback(() => {
    const el = divFilterRef.current
    if (!el) return
    setFilterHasMore(el.scrollLeft + el.clientWidth < el.scrollWidth - 2)
  }, [])

  useEffect(() => {
    checkFilterOverflow()
    const el = divFilterRef.current
    if (!el) return
    el.addEventListener('scroll', checkFilterOverflow, { passive: true })
    window.addEventListener('resize', checkFilterOverflow, { passive: true })
    return () => {
      el.removeEventListener('scroll', checkFilterOverflow)
      window.removeEventListener('resize', checkFilterOverflow)
    }
  }, [checkFilterOverflow, divisions])

  const onFilterMouseDown = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const el = divFilterRef.current
    if (!el) return
    dragRef.current = { active: true, startX: e.pageX - el.offsetLeft, scrollLeft: el.scrollLeft, moved: false }
    el.style.cursor = 'grabbing'
  }, [])

  const onFilterMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const el = divFilterRef.current
    if (!el || !dragRef.current.active) return
    const x = e.pageX - el.offsetLeft
    const delta = x - dragRef.current.startX
    if (Math.abs(delta) > 3) dragRef.current.moved = true
    el.scrollLeft = dragRef.current.scrollLeft - delta
  }, [])

  const onFilterMouseUp = useCallback(() => {
    const el = divFilterRef.current
    dragRef.current.active = false
    if (el) el.style.cursor = 'grab'
  }, [])

  const onFilterClick = useCallback((id: string | null) => {
    // suppress click when the mouse was dragged
    if (dragRef.current.moved) { dragRef.current.moved = false; return }
    setSelectedDivisionId(id)
  }, [])

  const load = useCallback(async () => {
    if (!id) return
    setLoading(true)
    try {
      const lbParams: Record<string, unknown> = { p_competition_id: id }
      if (selectedDivisionId) lbParams.p_division_id = selectedDivisionId

      const [lb, comp, wodList, divList] = await Promise.all([
        supabase.rpc('get_competition_leaderboard', lbParams),
        supabase.from('competitions').select('name').eq('id', id).single(),
        supabase
          .from('competition_wods')
          .select('id, name, score_type, score_order, cap, status, order_index')
          .eq('competition_id', id)
          .order('order_index'),
        supabase.from('competition_divisions').select('*').eq('competition_id', id).order('created_at'),
      ])
      if (lb.error) {
        console.error('[leaderboard] rpc error:', lb.error)
        setLbError(lb.error.message)
      } else {
        setLbError(null)
      }
      if (lb.data) {
        const newRows = lb.data as LeaderboardRow[]
        const now = Date.now()
        // arrows persist ARROW_TTL ms independent of the refresh cycle;
        // a new move resets the clock with the new direction
        setMovements(prev => {
          const next = new Map(prev)
          next.forEach((m, teamId) => { if (now - m.at >= ARROW_TTL) next.delete(teamId) })
          newRows.forEach(r => {
            const prevRank = prevRanksRef.current.get(r.team_id)
            if (prevRank !== undefined && prevRank !== r.overall_rank) {
              next.set(r.team_id, { delta: prevRank - r.overall_rank, at: now })
            }
          })
          return next
        })
        prevRanksRef.current = new Map(newRows.map(r => [r.team_id, r.overall_rank]))
        setRows(newRows)
      }
      if (comp.data) setCompName(comp.data.name)
      if (wodList.data) setWods(wodList.data as WodInfo[])
      if (divList.data) setDivisions(divList.data as CompetitionDivision[])
    } finally {
      setLoading(false)
    }
  }, [id, refreshKey, selectedDivisionId]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { load() }, [load])

  const triggerRefresh = useCallback(() => {
    countdownRef.current = REFRESH_INTERVAL
    setCountdown(REFRESH_INTERVAL)
    setRefreshKey(k => k + 1)
  }, [])

  useEffect(() => {
    const t = setInterval(() => {
      countdownRef.current -= 1
      setCountdown(countdownRef.current)
      if (countdownRef.current <= 0) {
        countdownRef.current = REFRESH_INTERVAL
        setCountdown(REFRESH_INTERVAL)
        setRefreshKey(k => k + 1)
      }
    }, 1000)
    return () => clearInterval(t)
  }, [])

  const publishedWods = wods.filter(w => w.status === 'published')
  const top1 = rows[0]
  const isColumnsMode = divisions.length >= 2 && selectedDivisionId === null
  const tickerDivLeaders = isColumnsMode
    ? divisions
        .map(d => ({ divLabel: divisionShortLabel(d), leader: rows.find(r => r.division_id === d.id) }))
        .filter((x): x is { divLabel: string; leader: LeaderboardRow } => x.leader != null)
    : []

  return (
    <div className="bg-[#0A0A0A] flex flex-col" style={{ position: 'fixed', inset: 0, zIndex: 50, overflow: 'hidden' }}>
      {/* TOP BAR */}
      <div
        className="flex items-center justify-between gap-3 px-4 border-b border-[#2A2A2A]"
        style={{ minHeight: 52 }}
      >
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={() => navigate(`/athlete/competitions/${id}`)}
            className="shrink-0 text-[#F5F5F0] -ml-1"
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '8px 4px' }}
          >
            <BackIcon />
          </button>
          <div className="min-w-0">
            <div
              className="font-sans font-bold truncate"
              style={{ fontSize: 15, color: '#F5F5F0', letterSpacing: '-0.01em' }}
            >
              {compName || 'Leaderboard'}
            </div>
            <div className="font-mono font-bold uppercase" style={{ fontSize: 9, letterSpacing: '0.2em', color: '#6B6B68' }}>
              LEADERBOARD
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {/* LIVE badge */}
          <div
            className="flex items-center gap-1.5 px-2 py-1 font-mono font-black uppercase"
            style={{ fontSize: 9, letterSpacing: '0.2em', background: '#D4FF3A', color: '#0A0A0A' }}
          >
            <span
              style={{
                width: 6, height: 6, background: '#0A0A0A', display: 'inline-block',
                animation: 'lb-pulse 1.2s ease-in-out infinite',
              }}
            />
            LIVE
          </div>

          {/* Countdown + refresh */}
          <div className="flex items-center gap-1.5">
            <span
              className="font-mono font-bold"
              style={{ fontSize: 10, color: '#6B6B68', letterSpacing: '0.1em' }}
            >
              {String(countdown).padStart(2, '0')}s
            </span>
            <button
              onClick={triggerRefresh}
              className="flex items-center justify-center border border-[#2A2A2A] text-[#F5F5F0]"
              style={{ width: 28, height: 28, background: 'none', cursor: 'pointer' }}
              aria-label="Atualizar"
            >
              <RefreshIcon />
            </button>
          </div>
        </div>
      </div>

      {/* WOD STRIP */}
      <div
        className="flex border-b border-[#2A2A2A] overflow-x-auto"
        style={{ gap: 1, background: '#2A2A2A', scrollbarWidth: 'none' }}
      >
        {wods.map((w, i) => (
          <div
            key={w.id}
            className="flex flex-col gap-0.5 shrink-0"
            style={{
              background: '#0A0A0A',
              padding: '8px 12px',
              minWidth: 100,
              flex: '1 0 auto',
            }}
          >
            <span
              className="font-mono font-black uppercase"
              style={{ fontSize: 9, letterSpacing: '0.22em', color: '#6B6B68' }}
            >
              WOD {String(i + 1).padStart(2, '0')}
            </span>
            <span
              className="font-sans font-bold"
              style={{
                fontSize: 13,
                letterSpacing: '-0.01em',
                color: w.status === 'draft' ? '#6B6B68' : w.status === 'submitted' ? '#E8A93A' : '#F5F5F0',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                maxWidth: 120,
              }}
            >
              {w.name}
            </span>
            <div
              className="flex items-center justify-between gap-2 font-mono font-bold uppercase"
              style={{ fontSize: 8, letterSpacing: '0.14em', color: '#6B6B68' }}
            >
              <span>{ScoreTypeLabel[w.score_type] ?? w.score_type}{w.cap ? ` · ${w.cap}` : ''}</span>
              <span
                style={{
                  color: w.status === 'published' ? '#D4FF3A'
                       : w.status === 'submitted' ? '#E8A93A'
                       : '#444',
                }}
              >
                {w.status === 'published' ? '● PUB.' : w.status === 'submitted' ? '◐ REVIEW' : '○ SOON'}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Pulse animation */}
      <style>{`@keyframes lb-pulse { 0%,100%{opacity:1} 50%{opacity:0.2} }`}</style>

      {/* Division filter — only visible when 2+ divisions exist */}
      {divisions.length >= 2 && (
        <div style={{ position: 'relative', flexShrink: 0 }}>
          <div
            ref={divFilterRef}
            className="flex items-center border-b border-[#2A2A2A]"
            style={{
              gap: 1, background: '#2A2A2A',
              overflowX: 'scroll', scrollbarWidth: 'none', msOverflowStyle: 'none',
              WebkitOverflowScrolling: 'touch',
              touchAction: 'pan-x',
              cursor: 'grab',
              userSelect: 'none',
            }}
            onMouseDown={onFilterMouseDown}
            onMouseMove={onFilterMouseMove}
            onMouseUp={onFilterMouseUp}
            onMouseLeave={onFilterMouseUp}
          >
            {[{ id: null, label: 'ALL' }, ...divisions.map(d => ({ id: d.id, label: divisionShortLabel(d) }))].map(item => {
              const active = item.id === selectedDivisionId
              return (
                <button
                  key={item.id ?? 'all'}
                  onClick={() => onFilterClick(item.id)}
                  className="font-mono font-black uppercase shrink-0"
                  style={{
                    fontSize: 9, letterSpacing: '0.18em',
                    padding: '8px 12px',
                    background: active ? '#D4FF3A' : '#0A0A0A',
                    color: active ? '#0A0A0A' : '#6B6B68',
                    border: 'none', cursor: 'inherit',
                    whiteSpace: 'nowrap',
                    touchAction: 'pan-x',
                    WebkitTapHighlightColor: 'transparent',
                  }}
                >
                  {item.label}
                </button>
              )
            })}
          </div>
          {/* right-fade indicator — visible only when more pills are hidden to the right */}
          {filterHasMore && (
            <div
              style={{
                position: 'absolute', top: 0, right: 0, bottom: 0, width: 48,
                pointerEvents: 'none',
                background: 'linear-gradient(to right, transparent, #0A0A0A)',
              }}
            />
          )}
        </div>
      )}

      {/* TABLE */}
      {loading && rows.length === 0 ? (
        <div className="flex-1 flex items-center justify-center">
          <span className="font-mono font-bold uppercase text-[10px] tracking-[0.14em] text-[#6B6B68]">
            Carregando...
          </span>
        </div>
      ) : lbError ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-2 px-6">
          <span className="font-mono font-bold uppercase text-[10px] tracking-[0.14em] text-[#FF3B30]">
            Erro ao carregar
          </span>
          <span className="font-mono text-[10px] text-[#6B6B68] text-center">{lbError}</span>
        </div>
      ) : rows.length === 0 ? (
        <div className="flex-1 flex items-center justify-center">
          <span className="font-mono font-bold uppercase text-[10px] tracking-[0.14em] text-[#6B6B68]">
            Nenhum resultado publicado
          </span>
        </div>
      ) : isColumnsMode ? (
        <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
          <div style={{ display: 'flex', overflowX: 'auto', flex: 1, gap: 1, background: '#2A2A2A', scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch' }}>
            {divisions.map(d => {
              const divRows = rows.filter(r => r.division_id === d.id)
              return (
                <div key={d.id} style={{ display: 'flex', flexDirection: 'column', minWidth: 280, flex: '0 0 auto', background: '#0A0A0A' }}>
                  <div style={{ padding: '8px 12px', borderBottom: '1px solid #2A2A2A', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0, background: '#111111' }}>
                    <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 9, fontWeight: 800, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#D4FF3A' }}>
                      {divisionShortLabel(d)}
                    </span>
                    <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 9, color: '#6B6B68', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                      {divRows.length} EQ.
                    </span>
                  </div>
                  <DivisionTable rows={divRows} publishedWods={publishedWods} wods={wods} movements={movements} />
                </div>
              )
            })}
          </div>
        </div>
      ) : (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <DivisionTable rows={rows} publishedWods={publishedWods} wods={wods} movements={movements} />
        </div>
      )}

      {/* BOTTOM TICKER */}
      {rows.length > 0 && (
        <div
          className="border-t border-[#2A2A2A] flex items-center gap-4 px-4 overflow-hidden"
          style={{ height: 36, background: '#0A0A0A', flexShrink: 0 }}
        >
          <div
            className="font-mono font-bold uppercase shrink-0"
            style={{ fontSize: 9, letterSpacing: '0.18em', color: '#6B6B68' }}
          >
            {rows.length} EQUIPES · {publishedWods.length}/{wods.length} WODS
          </div>
          <div style={{ flex: 1, overflow: 'hidden', position: 'relative' }}>
            <div
              style={{
                display: 'inline-block',
                paddingLeft: '100%',
                animation: 'lb-marquee 28s linear infinite',
                fontFamily: 'monospace',
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: '0.14em',
                textTransform: 'uppercase',
                color: '#6B6B68',
                whiteSpace: 'nowrap',
              }}
            >
              <style>{`@keyframes lb-marquee { from { transform: translateX(0) } to { transform: translateX(-50%) } }`}</style>
              {isColumnsMode ? (
                <>
                  {tickerDivLeaders.map(({ divLabel, leader }) => (
                    <span key={divLabel} style={{ marginRight: 56 }}>
                      {divLabel} · <span style={{ color: '#D4FF3A' }}>{leader.team_name}</span> · {leader.total_points} PTS
                    </span>
                  ))}
                  {tickerDivLeaders.map(({ divLabel, leader }) => (
                    <span key={divLabel + '_2'} style={{ marginRight: 56 }}>
                      {divLabel} · <span style={{ color: '#D4FF3A' }}>{leader.team_name}</span> · {leader.total_points} PTS
                    </span>
                  ))}
                </>
              ) : (
                <>
                  <span style={{ marginRight: 56 }}>
                    LEADER · <span style={{ color: '#D4FF3A' }}>{top1?.team_name}</span> · {top1?.total_points} PTS
                  </span>
                  {top1 && rows[1] && (
                    <span style={{ marginRight: 56 }}>
                      GAP 1ST→2ND · <span style={{ color: '#D4FF3A' }}>{top1.total_points - rows[1].total_points} PTS</span>
                    </span>
                  )}
                  <span style={{ marginRight: 56 }}>
                    LEADER · <span style={{ color: '#D4FF3A' }}>{top1?.team_name}</span> · {top1?.total_points} PTS
                  </span>
                  {top1 && rows[1] && (
                    <span style={{ marginRight: 56 }}>
                      GAP 1ST→2ND · <span style={{ color: '#D4FF3A' }}>{top1.total_points - rows[1].total_points} PTS</span>
                    </span>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

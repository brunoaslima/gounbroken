import { useState, useEffect, useCallback, useRef } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '@/lib/supabase'

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
  total_points: number
  overall_rank: number
  per_wod: Record<string, WodCell>
}

const REFRESH_INTERVAL = 60

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

export default function CompetitionPublic() {
  const { slug } = useParams<{ slug: string }>()

  const [compId, setCompId] = useState<string | null>(null)
  const [compName, setCompName] = useState('')
  const [rows, setRows] = useState<LeaderboardRow[]>([])
  const [wods, setWods] = useState<WodInfo[]>([])
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [countdown, setCountdown] = useState(REFRESH_INTERVAL)
  const [refreshKey, setRefreshKey] = useState(0)
  const countdownRef = useRef(REFRESH_INTERVAL)

  // Resolve slug → competition id on mount
  useEffect(() => {
    if (!slug) return
    supabase
      .from('competitions')
      .select('id, name')
      .eq('public_slug', slug)
      .single()
      .then(({ data, error }) => {
        if (error || !data) { setNotFound(true); setLoading(false); return }
        setCompId(data.id)
        setCompName(data.name)
      })
  }, [slug])

  const load = useCallback(async () => {
    if (!compId) return
    setLoading(true)
    try {
      const [lb, wodList] = await Promise.all([
        supabase.rpc('get_competition_leaderboard', { p_competition_id: compId }),
        supabase
          .from('competition_wods')
          .select('id, name, score_type, score_order, cap, status, order_index')
          .eq('competition_id', compId)
          .order('order_index'),
      ])
      if (lb.data) setRows(lb.data as LeaderboardRow[])
      if (wodList.data) setWods(wodList.data as WodInfo[])
    } finally {
      setLoading(false)
    }
  }, [compId, refreshKey]) // eslint-disable-line react-hooks/exhaustive-deps

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

  function rowBg(rank: number, idx: number) {
    if (rank === 1) return 'rgba(212,255,58,0.12)'
    if (rank <= 3) return 'rgba(212,255,58,0.06)'
    if (idx % 2 === 1) return 'rgba(255,255,255,0.025)'
    return 'transparent'
  }

  if (notFound) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] flex flex-col items-center justify-center gap-3">
        <div className="w-8 h-8 bg-lime flex items-center justify-center">
          <svg width="16" height="16" viewBox="0 0 14 14" fill="none">
            <path d="M7 1L13 12H1L7 1Z" fill="#0A0A0A" />
          </svg>
        </div>
        <span className="font-mono font-bold uppercase tracking-[0.14em] text-[11px] text-[#6B6B68]">
          Competition not found
        </span>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0A0A0A] flex flex-col">
      <style>{`
        @keyframes lb-pulse { 0%,100%{opacity:1} 50%{opacity:0.2} }
        @keyframes lb-marquee { from { transform: translateX(0) } to { transform: translateX(-50%) } }
      `}</style>

      {/* TOP BAR */}
      <div className="flex items-center justify-between gap-3 px-4 border-b border-[#2A2A2A]" style={{ minHeight: 52 }}>
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-6 h-6 bg-lime flex items-center justify-center flex-shrink-0">
            <svg width="12" height="12" viewBox="0 0 14 14" fill="none">
              <path d="M7 1L13 12H1L7 1Z" fill="#0A0A0A" />
            </svg>
          </div>
          <div className="min-w-0">
            <div className="font-sans font-bold truncate" style={{ fontSize: 15, color: '#F5F5F0', letterSpacing: '-0.01em' }}>
              {compName || '...'}
            </div>
            <div className="font-mono font-bold uppercase" style={{ fontSize: 9, letterSpacing: '0.2em', color: '#6B6B68' }}>
              LEADERBOARD
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <div className="flex items-center gap-1.5 px-2 py-1 font-mono font-black uppercase" style={{ fontSize: 9, letterSpacing: '0.2em', background: '#D4FF3A', color: '#0A0A0A' }}>
            <span style={{ width: 6, height: 6, background: '#0A0A0A', display: 'inline-block', animation: 'lb-pulse 1.2s ease-in-out infinite' }} />
            LIVE
          </div>
          <div className="flex items-center gap-1.5">
            <span className="font-mono font-bold" style={{ fontSize: 10, color: '#6B6B68', letterSpacing: '0.1em' }}>
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
      <div className="flex border-b border-[#2A2A2A] overflow-x-auto" style={{ gap: 1, background: '#2A2A2A', scrollbarWidth: 'none' }}>
        {wods.map((w, i) => (
          <div key={w.id} className="flex flex-col gap-0.5 shrink-0" style={{ background: '#0A0A0A', padding: '8px 12px', minWidth: 100, flex: '1 0 auto' }}>
            <span className="font-mono font-black uppercase" style={{ fontSize: 9, letterSpacing: '0.22em', color: '#6B6B68' }}>
              WOD {String(i + 1).padStart(2, '0')}
            </span>
            <span className="font-sans font-bold" style={{ fontSize: 13, letterSpacing: '-0.01em', color: w.status === 'draft' ? '#6B6B68' : w.status === 'submitted' ? '#E8A93A' : '#F5F5F0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 120 }}>
              {w.status === 'published' ? w.name : `WOD ${i + 1}`}
            </span>
            <div className="flex items-center justify-between gap-2 font-mono font-bold uppercase" style={{ fontSize: 8, letterSpacing: '0.14em', color: '#6B6B68' }}>
              <span>{w.status === 'published' ? (ScoreTypeLabel[w.score_type] ?? w.score_type) + (w.cap ? ` · ${w.cap}` : '') : '—'}</span>
              <span style={{ color: w.status === 'published' ? '#D4FF3A' : w.status === 'submitted' ? '#E8A93A' : '#444' }}>
                {w.status === 'published' ? '● PUB.' : w.status === 'submitted' ? '◐ REVIEW' : '○ SOON'}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* TABLE */}
      {loading && rows.length === 0 ? (
        <div className="flex-1 flex items-center justify-center">
          <span className="font-mono font-bold uppercase text-[10px] tracking-[0.14em] text-[#6B6B68]">Carregando...</span>
        </div>
      ) : rows.length === 0 ? (
        <div className="flex-1 flex items-center justify-center">
          <span className="font-mono font-bold uppercase text-[10px] tracking-[0.14em] text-[#6B6B68]">Nenhum resultado publicado</span>
        </div>
      ) : (
        <div className="flex-1 overflow-x-auto" style={{ WebkitOverflowScrolling: 'touch', scrollbarWidth: 'none' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'auto', fontFamily: 'var(--font-mono, monospace)', fontVariantNumeric: 'tabular-nums' }}>
            <thead>
              <tr style={{ background: '#0A0A0A', borderBottom: '2px solid #F5F5F0' }}>
                <th style={{ padding: '8px 10px', textAlign: 'right', width: 48, fontFamily: 'inherit', fontSize: 10, fontWeight: 800, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#6B6B68', position: 'sticky', left: 0, background: '#0A0A0A', zIndex: 2 }}>#</th>
                <th style={{ padding: '8px 10px', textAlign: 'left', minWidth: 120, fontFamily: 'inherit', fontSize: 10, fontWeight: 800, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#6B6B68', position: 'sticky', left: 48, background: '#0A0A0A', zIndex: 2, borderRight: '1px solid #2A2A2A' }}>EQUIPE</th>
                <th className="hidden sm:table-cell" style={{ padding: '8px 10px', textAlign: 'left', width: 110, fontFamily: 'inherit', fontSize: 10, fontWeight: 800, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#6B6B68', whiteSpace: 'nowrap' }}>BOX</th>
                {publishedWods.map((w) => (
                  <th key={w.id} style={{ padding: '8px 8px', textAlign: 'center', width: 58, fontFamily: 'inherit', fontSize: 10, fontWeight: 800, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#6B6B68', whiteSpace: 'nowrap' }}>
                    W{String(wods.findIndex(x => x.id === w.id) + 1).padStart(2, '0')}
                  </th>
                ))}
                <th style={{ padding: '8px 10px', textAlign: 'right', width: 68, fontFamily: 'inherit', fontSize: 10, fontWeight: 800, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#6B6B68', borderLeft: '1px solid #2A2A2A', whiteSpace: 'nowrap' }}>PTS</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, idx) => {
                const rank = row.overall_rank
                const isFirst = rank === 1
                const bg = rowBg(rank, idx)
                return (
                  <tr key={row.team_id} style={{ background: bg, height: 34 }}>
                    <td style={{ padding: '0 8px', textAlign: 'right', position: 'sticky', left: 0, background: bg === 'transparent' ? '#0A0A0A' : bg, zIndex: 1, borderBottom: '1px solid #1A1A1A', whiteSpace: 'nowrap' }}>
                      <MedalRank rank={rank} />
                    </td>
                    <td style={{ padding: '0 10px', fontFamily: 'Space Grotesk, sans-serif', fontWeight: 700, fontSize: isFirst ? 15 : 14, letterSpacing: '-0.01em', color: isFirst ? '#D4FF3A' : '#F5F5F0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 160, position: 'sticky', left: 48, background: bg === 'transparent' ? '#0A0A0A' : bg, zIndex: 1, borderBottom: '1px solid #1A1A1A', borderRight: '1px solid #2A2A2A' }}>
                      {row.team_name}
                    </td>
                    <td className="hidden sm:table-cell" style={{ padding: '0 10px', fontSize: 11, color: '#6B6B68', letterSpacing: '0.04em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 110, borderBottom: '1px solid #1A1A1A' }}>
                      {row.box ?? '—'}
                    </td>
                    {publishedWods.map(w => {
                      const cell = row.per_wod?.[w.id]
                      if (!cell) return <td key={w.id} style={{ textAlign: 'center', padding: '0 8px', fontSize: 10, color: '#444', fontWeight: 700, borderBottom: '1px solid #1A1A1A' }}>DNS</td>
                      const isPos1 = cell.position === 1
                      return (
                        <td key={w.id} style={{ textAlign: 'center', padding: '0 8px', borderBottom: '1px solid #1A1A1A', whiteSpace: 'nowrap' }}>
                          <span style={{ fontSize: isPos1 ? 15 : 13, fontWeight: 800, color: isPos1 ? '#D4FF3A' : '#F5F5F0', letterSpacing: 0 }}>{cell.position}</span>
                          <span style={{ fontSize: 9, color: '#6B6B68', marginLeft: 4, fontWeight: 700 }}>{cell.points}p</span>
                        </td>
                      )
                    })}
                    <td style={{ padding: '0 10px', textAlign: 'right', fontWeight: 800, fontSize: isFirst ? 19 : 17, color: '#D4FF3A', letterSpacing: '-0.01em', borderLeft: '1px solid #2A2A2A', borderBottom: '1px solid #1A1A1A', whiteSpace: 'nowrap' }}>
                      {row.total_points}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* BOTTOM TICKER */}
      {rows.length > 0 && (
        <div className="border-t border-[#2A2A2A] flex items-center gap-4 px-4 overflow-hidden" style={{ height: 36, background: '#0A0A0A', flexShrink: 0 }}>
          <div className="font-mono font-bold uppercase shrink-0" style={{ fontSize: 9, letterSpacing: '0.18em', color: '#6B6B68' }}>
            {rows.length} EQUIPES · {publishedWods.length}/{wods.length} WODS
          </div>
          <div style={{ flex: 1, overflow: 'hidden', position: 'relative' }}>
            <div style={{ display: 'inline-block', paddingLeft: '100%', animation: 'lb-marquee 28s linear infinite', fontFamily: 'monospace', fontSize: 10, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#6B6B68', whiteSpace: 'nowrap' }}>
              <span style={{ marginRight: 56 }}>LEADER · <span style={{ color: '#D4FF3A' }}>{top1?.team_name}</span> · {top1?.total_points} PTS</span>
              {top1 && rows[1] && <span style={{ marginRight: 56 }}>GAP 1ST→2ND · <span style={{ color: '#D4FF3A' }}>{top1.total_points - rows[1].total_points} PTS</span></span>}
              <span style={{ marginRight: 56 }}>LEADER · <span style={{ color: '#D4FF3A' }}>{top1?.team_name}</span> · {top1?.total_points} PTS</span>
              {top1 && rows[1] && <span style={{ marginRight: 56 }}>GAP 1ST→2ND · <span style={{ color: '#D4FF3A' }}>{top1.total_points - rows[1].total_points} PTS</span></span>}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

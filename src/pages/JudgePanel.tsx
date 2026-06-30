import { useEffect, useState, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { useProfile } from '@/hooks/useProfile'
import type { CompetitionWod, CompetitionTeam, CompetitionRole, CompetitionResult } from '@/types'

const SCORE_LABEL: Record<string, string> = {
  time:             'FOR TIME',
  reps:             'AMRAP · REPS',
  weight:           'MAX LOAD · KG',
  rounds_plus_reps: 'ROUNDS + REPS',
}

function parseScore(type: string, val: string): { raw: string; numeric: number } | null {
  switch (type) {
    case 'time': {
      const m = val.match(/^(\d{1,2}):(\d{2})$/)
      if (!m) return null
      const secs = parseInt(m[2], 10)
      if (secs >= 60) return null
      const total = parseInt(m[1], 10) * 60 + secs
      return { raw: val, numeric: total }
    }
    case 'reps': {
      const n = parseInt(val, 10)
      if (isNaN(n) || n < 0) return null
      return { raw: val, numeric: n }
    }
    case 'weight': {
      const n = parseFloat(val.replace(',', '.'))
      if (isNaN(n) || n <= 0) return null
      return { raw: `${val} kg`, numeric: n }
    }
    case 'rounds_plus_reps': {
      const m = val.match(/^(\d+)\s*\+\s*(\d+)$/)
      if (!m) return null
      return { raw: val, numeric: parseInt(m[1], 10) * 1000 + parseInt(m[2], 10) }
    }
    default:
      return null
  }
}

// Exported for unit tests
export { parseScore }

export default function JudgePanel() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()
  const { profile } = useProfile(user?.id)

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [compName, setCompName] = useState('')
  const [wods, setWods] = useState<CompetitionWod[]>([])
  const [totalWodsCount, setTotalWodsCount] = useState(0)
  const [teams, setTeams] = useState<CompetitionTeam[]>([])
  const [results, setResults] = useState<CompetitionResult[]>([])
  const [myRole, setMyRole] = useState<CompetitionRole | null>(null)

  const [activeWodId, setActiveWodId] = useState<string | null>(null)

  // Score form
  const [scoringTeamId, setScoringTeamId] = useState<string | null>(null)
  const [scoreVal, setScoreVal] = useState('')
  const [scoreNotes, setScoreNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  const isAdmin = profile?.roles?.includes('admin') ?? false

  const load = useCallback(async () => {
    if (!id || !user?.id) return
    setLoading(true)
    setError(null)
    try {
      const [compRes, allWodsRes, teamsRes, roleRes] = await Promise.all([
        supabase.from('competitions').select('name').eq('id', id).single(),
        supabase.from('competition_wods').select('*').eq('competition_id', id).order('order_index'),
        supabase.from('competition_teams').select('*').eq('competition_id', id).eq('status', 'approved'),
        supabase.from('competition_roles').select('*').eq('competition_id', id).eq('user_id', user.id).single(),
      ])

      if (compRes.error) throw new Error(compRes.error.message)
      if (allWodsRes.error) throw new Error(allWodsRes.error.message)
      if (teamsRes.error) throw new Error(teamsRes.error.message)

      const allWods = (allWodsRes.data ?? []) as CompetitionWod[]
      const role = roleRes.error ? null : (roleRes.data as CompetitionRole)

      setCompName(compRes.data.name)
      setMyRole(role)
      setTotalWodsCount(allWods.length)

      const visibleWods =
        role?.role === 'judge' && role.assigned_wod_ids?.length
          ? allWods.filter(w => role.assigned_wod_ids!.includes(w.id))
          : allWods

      setWods(visibleWods)
      setTeams((teamsRes.data ?? []) as CompetitionTeam[])

      setActiveWodId(prev =>
        prev && visibleWods.find(w => w.id === prev) ? prev : (visibleWods[0]?.id ?? null)
      )

      if (visibleWods.length > 0) {
        const { data: resultsData } = await supabase
          .from('competition_results')
          .select('*')
          .in('wod_id', visibleWods.map(w => w.id))
        setResults((resultsData ?? []) as CompetitionResult[])
      } else {
        setResults([])
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao carregar dados')
    } finally {
      setLoading(false)
    }
  }, [id, user?.id])

  useEffect(() => { load() }, [load])

  if (loading) return <Screen><Mono color='#6B6B68'>CARREGANDO...</Mono></Screen>
  if (error)   return <Screen><Mono color='#FF3B30'>{error}</Mono></Screen>

  const isJudge = myRole?.role === 'head_judge' || myRole?.role === 'judge'
  if (!isAdmin && !isJudge) return <Screen><Mono color='#FF3B30'>ACESSO NEGADO</Mono></Screen>

  const activeWod    = wods.find(w => w.id === activeWodId) ?? null
  const activeWodIdx = wods.findIndex(w => w.id === activeWodId)
  const wodResults   = activeWod ? results.filter(r => r.wod_id === activeWod.id) : []
  const submittedIds = new Set(wodResults.map(r => r.team_id))
  const pendingTeams = teams.filter(t => !submittedIds.has(t.id))
  const doneTeams    = teams.filter(t => submittedIds.has(t.id))
  const scoringTeam  = scoringTeamId ? teams.find(t => t.id === scoringTeamId) : null

  function openScoreForm(teamId: string) {
    setScoringTeamId(teamId)
    setScoreVal('')
    setScoreNotes('')
    setSubmitError(null)
  }

  function closeScoreForm() {
    setScoringTeamId(null)
    setScoreVal('')
    setScoreNotes('')
    setSubmitError(null)
  }

  async function handleSubmit() {
    if (!activeWod || !scoringTeamId || !scoreVal.trim() || submitting) return
    const parsed = parseScore(activeWod.score_type, scoreVal.trim())
    if (!parsed) {
      setSubmitError(
        activeWod.score_type === 'time'             ? 'Use format MM:SS (e.g. 5:42)' :
        activeWod.score_type === 'rounds_plus_reps' ? 'Use format ROUNDS+REPS (e.g. 5+12)' :
        'Invalid value'
      )
      return
    }
    setSubmitting(true)
    setSubmitError(null)
    try {
      const { error: rpcError } = await supabase.rpc('submit_competition_result', {
        p_wod_id:       activeWod.id,
        p_team_id:      scoringTeamId,
        p_raw_result:   parsed.raw,
        p_score_type:   activeWod.score_type,
        p_score_numeric: parsed.numeric,
        p_notes:        scoreNotes.trim() || null,
      })
      if (rpcError) throw new Error(rpcError.message)
      closeScoreForm()
      await load()
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : 'Submission error')
    } finally {
      setSubmitting(false)
    }
  }

  // ── Score form view ────────────────────────────────────────────────────────
  if (scoringTeamId && activeWod) {
    const placeholder =
      activeWod.score_type === 'time'             ? 'MM:SS' :
      activeWod.score_type === 'reps'             ? '0'     :
      activeWod.score_type === 'weight'           ? '0.0'   : '0+0'
    const unit =
      activeWod.score_type === 'time'             ? 'MIN : SEC · COMPLETION TIME' :
      activeWod.score_type === 'reps'             ? 'REPS · TOTAL AT CAP'         :
      activeWod.score_type === 'weight'           ? 'KG · MAX LOAD'               :
      'ROUNDS + REPS'

    return (
      <div style={pageStyle}>
        {/* Topbar */}
        <div style={topbarStyle}>
          <BackBtn onClick={closeScoreForm} />
          <span style={titleStyle}>
            SUBMETER · WOD {String(activeWodIdx + 1).padStart(2, '0')}
          </span>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: 20, display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 560, margin: '0 auto', width: '100%', boxSizing: 'border-box' }}>

          {/* Context cards */}
          <ContextCard label='EQUIPE' value={scoringTeam?.name ?? '—'} />
          <ContextCard
            label='WOD'
            value={`${String(activeWodIdx + 1).padStart(2, '0')} · ${activeWod.name} · ${SCORE_LABEL[activeWod.score_type]}${activeWod.cap ? ` · CAP ${activeWod.cap}` : ''}`}
          />

          <div style={{ fontWeight: 700, fontSize: 22, letterSpacing: '-0.015em', lineHeight: 1.1 }}>
            Resultado da equipe
          </div>

          {/* Big score input */}
          <div>
            <input
              autoFocus
              type='text'
              value={scoreVal}
              onChange={e => { setScoreVal(e.target.value); setSubmitError(null) }}
              onKeyDown={e => e.key === 'Enter' && handleSubmit()}
              placeholder={placeholder}
              style={{
                fontFamily: 'JetBrains Mono, monospace',
                fontSize: 56, fontWeight: 800,
                letterSpacing: '-0.04em',
                fontVariantNumeric: 'tabular-nums',
                color: '#D4FF3A',
                background: '#111111',
                border: `1px solid ${submitError ? '#FF3B30' : '#2A2A2A'}`,
                padding: '22px 18px',
                outline: 0,
                textAlign: 'center',
                width: '100%',
                boxSizing: 'border-box',
              }}
            />
            <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, fontWeight: 700, letterSpacing: '0.14em', color: '#6B6B68', textAlign: 'center', textTransform: 'uppercase', marginTop: 6 }}>
              {unit}
            </div>
            {submitError && (
              <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, fontWeight: 700, color: '#FF3B30', textAlign: 'center', marginTop: 6, letterSpacing: '0.12em', textTransform: 'uppercase' }}>
                {submitError}
              </div>
            )}
          </div>

          {/* Notes */}
          <div>
            <div style={fieldLabel}>NOTES (OPTIONAL)</div>
            <textarea
              value={scoreNotes}
              onChange={e => setScoreNotes(e.target.value)}
              rows={3}
              placeholder='Ex.: 1 no-rep on thruster · split jerk valid'
              style={{ width: '100%', background: '#111111', border: '1px solid #2A2A2A', color: '#F5F5F0', fontFamily: 'inherit', fontSize: 13, padding: '8px 12px', outline: 'none', resize: 'none', boxSizing: 'border-box' }}
            />
          </div>

          {/* Info */}
          <div style={{ padding: '12px 14px', border: '1px solid #2A2A2A', background: '#111111', display: 'flex', gap: 12, alignItems: 'flex-start' }}>
            <span style={{ width: 22, height: 22, background: '#FFB800', color: '#0A0A0A', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'JetBrains Mono, monospace', fontSize: 12, fontWeight: 800, flexShrink: 0 }}>!</span>
            <div style={{ flex: 1, fontSize: 12, lineHeight: 1.4, color: '#6B6B68' }}>
              After submitting, the result is placed <strong style={{ color: '#F5F5F0' }}>under review</strong>. The Head Judge reviews it before publishing to the leaderboard.
            </div>
          </div>

        </div>

        {/* Bottom CTA */}
        <div style={{ background: '#0A0A0A', borderTop: '1px solid #2A2A2A', padding: '14px 20px 24px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, flexShrink: 0 }}>
          <button onClick={closeScoreForm} style={ghostBtnStyle}>CANCEL</button>
          <button
            onClick={handleSubmit}
            disabled={!scoreVal.trim() || submitting}
            style={{
              background: (!scoreVal.trim() || submitting) ? '#1A1A1A' : '#D4FF3A',
              border: 'none', padding: '14px',
              fontFamily: 'JetBrains Mono, monospace', fontSize: 10, fontWeight: 800,
              letterSpacing: '0.16em', textTransform: 'uppercase',
              color: (!scoreVal.trim() || submitting) ? '#3D3D3B' : '#0A0A0A',
              cursor: (!scoreVal.trim() || submitting) ? 'not-allowed' : 'pointer',
            }}
          >
            {submitting ? 'ENVIANDO...' : 'CONFIRMAR'}
          </button>
        </div>
      </div>
    )
  }

  // ── Main dashboard ─────────────────────────────────────────────────────────
  return (
    <div style={pageStyle}>

      {/* Topbar */}
      <div style={topbarStyle}>
        <BackBtn onClick={() => navigate(-1)} />
        <span style={{ ...titleStyle, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          JUDGE · {compName}
        </span>
        {myRole && (
          <span style={{
            fontFamily: 'JetBrains Mono, monospace', fontWeight: 900, fontSize: 9,
            letterSpacing: '0.16em', textTransform: 'uppercase',
            color: myRole.role === 'head_judge' ? '#D4FF3A' : '#6B6B68',
            padding: '4px 7px',
            border: `1px solid ${myRole.role === 'head_judge' ? '#D4FF3A33' : '#2A2A2A'}`,
            flexShrink: 0,
          }}>
            {myRole.role === 'head_judge' ? 'HEAD JUDGE' : 'JUDGE'}
          </span>
        )}
      </div>

      <div style={{ flex: 1, overflowY: 'auto' }}>

        {/* ── WOD chips ─────────────────────────────────────────────────────── */}
        <div style={{ padding: '14px 16px 16px', borderBottom: '1px solid #2A2A2A' }}>
          <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 9, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#D4FF3A', marginBottom: 10 }}>
            YOUR PANEL
          </div>

          {wods.length === 0 ? (
            <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: '#3D3D3B', letterSpacing: '0.12em', textTransform: 'uppercase' }}>
              NO WODS ASSIGNED
            </div>
          ) : (
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {wods.map((wod, idx) => {
                const count   = results.filter(r => r.wod_id === wod.id).length
                const isActive = wod.id === activeWodId
                return (
                  <button
                    key={wod.id}
                    onClick={() => setActiveWodId(wod.id)}
                    style={{
                      background: isActive ? '#D4FF3A' : '#111111',
                      border: `1px solid ${isActive ? '#D4FF3A' : '#2A2A2A'}`,
                      color: isActive ? '#0A0A0A' : '#6B6B68',
                      fontFamily: 'JetBrains Mono, monospace',
                      fontWeight: 700, fontSize: 10,
                      letterSpacing: '0.14em', textTransform: 'uppercase',
                      padding: '8px 14px', cursor: 'pointer',
                      display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 3,
                    }}
                  >
                    <span>WOD {String(idx + 1).padStart(2, '0')} · {wod.name}</span>
                    <span style={{ fontSize: 9, opacity: 0.7 }}>
                      {SCORE_LABEL[wod.score_type]}{wod.cap ? ` · ${wod.cap}` : ''} · {count}/{teams.length}
                    </span>
                  </button>
                )
              })}
            </div>
          )}
        </div>

        {/* ── Stats ─────────────────────────────────────────────────────────── */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 1, background: '#2A2A2A', borderBottom: '1px solid #2A2A2A' }}>
          <StatCell label='PENDENTES'   value={pendingTeams.length} color='#FFB800' />
          <StatCell label='SUBMETIDOS'  value={doneTeams.length}    color='#D4FF3A' />
          <StatCell label='WODS · SEUS' value={`${wods.length}`}    color='#F5F5F0'
            suffix={`/${totalWodsCount}`}
          />
        </div>

        {/* ── Team list ─────────────────────────────────────────────────────── */}
        {!activeWod ? (
          <div style={{ padding: '40px 20px', textAlign: 'center', fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: '#3D3D3B', letterSpacing: '0.12em', textTransform: 'uppercase' }}>
            SELECIONE UM WOD ACIMA
          </div>
        ) : (
          <>
            {/* Section header */}
            <div style={{ padding: '14px 16px 12px', borderBottom: '1px solid #1A1A1A' }}>
              <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, fontWeight: 800, letterSpacing: '0.16em', textTransform: 'uppercase', color: '#F5F5F0' }}>
                WOD {String(activeWodIdx + 1).padStart(2, '0')} · {activeWod.name}
              </div>
              <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 9, color: '#6B6B68', letterSpacing: '0.12em', textTransform: 'uppercase', marginTop: 3 }}>
                {SCORE_LABEL[activeWod.score_type]}{activeWod.cap ? ` · CAP ${activeWod.cap}` : ''}
              </div>
              {activeWod.description && (
                <div style={{ marginTop: 10, fontSize: 13, color: '#A0A09B', lineHeight: 1.55, whiteSpace: 'pre-wrap', borderTop: '1px solid #1A1A1A', paddingTop: 10 }}>
                  {activeWod.description}
                </div>
              )}
            </div>

            {/* Pending teams */}
            {pendingTeams.length === 0 && doneTeams.length === 0 && (
              <div style={{ padding: '32px 20px', textAlign: 'center', fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: '#3D3D3B', letterSpacing: '0.12em', textTransform: 'uppercase' }}>
                NENHUMA EQUIPE APROVADA
              </div>
            )}

            {pendingTeams.map((t, i) => (
              <button
                key={t.id}
                onClick={() => openScoreForm(t.id)}
                style={{
                  display: 'grid', gridTemplateColumns: '44px 1fr auto',
                  gap: 14, alignItems: 'center',
                  padding: '14px 16px',
                  borderTop: 0, borderLeft: 0, borderRight: 0, borderBottom: '1px solid #1A1A1A',
                  background: 'transparent',
                  textAlign: 'left', cursor: 'pointer', width: '100%', color: '#F5F5F0',
                }}
              >
                <span style={{ fontFamily: 'JetBrains Mono, monospace', fontWeight: 800, fontSize: 16, letterSpacing: '-0.01em', color: '#3D3D3B' }}>
                  #{String(i + 1).padStart(2, '0')}
                </span>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 15, letterSpacing: '-0.005em' }}>{t.name}</div>
                  {t.box && (
                    <div style={{ marginTop: 3, fontFamily: 'JetBrains Mono, monospace', fontSize: 10, fontWeight: 600, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#6B6B68' }}>
                      {t.box}
                    </div>
                  )}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 9, fontWeight: 700, color: '#D4FF3A', padding: '4px 8px', border: '1px solid #D4FF3A44', letterSpacing: '0.14em', textTransform: 'uppercase' }}>
                    REGISTRAR
                  </span>
                  <span style={{ color: '#3D3D3B', fontSize: 18, fontWeight: 300 }}>›</span>
                </div>
              </button>
            ))}

            {/* Done teams separator */}
            {doneTeams.length > 0 && (
              <>
                <div style={{ padding: '10px 16px', background: '#0D0D0D', borderBottom: '1px solid #1A1A1A' }}>
                  <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 9, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#3D3D3B' }}>
                    SUBMETIDOS · {doneTeams.length}
                  </span>
                </div>
                {doneTeams.map(t => {
                  const result = wodResults.find(r => r.team_id === t.id)
                  return (
                    <div
                      key={t.id}
                      style={{ display: 'grid', gridTemplateColumns: '44px 1fr auto', gap: 14, alignItems: 'center', padding: '12px 16px', borderBottom: '1px solid #1A1A1A', opacity: 0.6 }}
                    >
                      <div style={{ width: 32, height: 32, background: '#D4FF3A18', border: '1px solid #D4FF3A33', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'JetBrains Mono, monospace', fontWeight: 900, fontSize: 14, color: '#D4FF3A' }}>
                        ✓
                      </div>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: 14, textDecoration: 'line-through', textDecorationColor: '#3D3D3B' }}>{t.name}</div>
                        <div style={{ marginTop: 3, fontFamily: 'JetBrains Mono, monospace', fontSize: 10, fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#6B6B68' }}>
                          {result?.raw_result ?? '—'}
                        </div>
                      </div>
                      <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 9, fontWeight: 900, color: '#D4FF3A', padding: '4px 7px', border: '1px solid #D4FF3A33', letterSpacing: '0.14em', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
                        SUBMETIDO
                      </span>
                    </div>
                  )
                })}
              </>
            )}
          </>
        )}

      </div>
    </div>
  )
}

// ─── Shared primitives ────────────────────────────────────────────────────────

const pageStyle: React.CSSProperties = {
  minHeight: '100vh', background: '#0A0A0A', color: '#F5F5F0',
  fontFamily: 'Space Grotesk, sans-serif', display: 'flex', flexDirection: 'column',
}

const topbarStyle: React.CSSProperties = {
  background: '#111111', borderBottom: '1px solid #2A2A2A',
  padding: '0 16px', height: 52,
  display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0,
}

const titleStyle: React.CSSProperties = {
  fontFamily: 'JetBrains Mono, monospace', fontWeight: 700,
  fontSize: 10, letterSpacing: '0.22em', textTransform: 'uppercase',
}

const fieldLabel: React.CSSProperties = {
  fontFamily: 'JetBrains Mono, monospace', fontSize: 9, fontWeight: 700,
  letterSpacing: '0.16em', textTransform: 'uppercase', color: '#6B6B68', marginBottom: 6,
}

const ghostBtnStyle: React.CSSProperties = {
  background: 'none', border: '1px solid #2A2A2A', padding: '14px',
  fontFamily: 'JetBrains Mono, monospace', fontSize: 10, fontWeight: 800,
  letterSpacing: '0.16em', textTransform: 'uppercase', color: '#6B6B68', cursor: 'pointer',
}

function BackBtn({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{ background: 'none', border: 'none', color: '#6B6B68', cursor: 'pointer', padding: '4px 8px 4px 0', fontFamily: 'JetBrains Mono, monospace', fontSize: 16, lineHeight: 1 }}
    >
      ←
    </button>
  )
}

function ContextCard({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ background: '#111111', border: '1px solid #2A2A2A', padding: '12px 14px' }}>
      <div style={fieldLabel}>{label}</div>
      <div style={{ fontWeight: 700, fontSize: 15, letterSpacing: '-0.01em' }}>{value}</div>
    </div>
  )
}

function StatCell({ label, value, color, suffix }: { label: string; value: number | string; color: string; suffix?: string }) {
  return (
    <div style={{ background: '#0A0A0A', padding: '14px 12px' }}>
      <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 9, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#6B6B68' }}>{label}</div>
      <div style={{ marginTop: 6, fontFamily: 'JetBrains Mono, monospace', fontSize: 22, fontWeight: 800, letterSpacing: '-0.02em', color }}>
        {value}{suffix && <span style={{ fontSize: 11, color: '#6B6B68', marginLeft: 3 }}>{suffix}</span>}
      </div>
    </div>
  )
}

function Screen({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ minHeight: '100vh', background: '#0A0A0A', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      {children}
    </div>
  )
}

function Mono({ children, color }: { children: React.ReactNode; color: string }) {
  return (
    <span style={{ fontFamily: 'JetBrains Mono, monospace', fontWeight: 700, fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color }}>
      {children}
    </span>
  )
}

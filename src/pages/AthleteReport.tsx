import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { useProfile } from '@/hooks/useProfile'
import { supabase } from '@/lib/supabase'
import type { PrescribedWorkoutData } from '@/types'

// ─── Types ────────────────────────────────────────────────────────────────────

interface AthletePR {
  movement_name: string
  reps: number
  max_weight: number
}

// ─── Constants ────────────────────────────────────────────────────────────────

const PT_MONTHS = [
  'JANUARY', 'FEBRUARY', 'MARCH', 'APRIL', 'MAY', 'JUNE',
  'JULY', 'AUGUST', 'SEPTEMBER', 'OCTOBER', 'NOVEMBER', 'DECEMBER',
]

const FOCUS_MUSCLES: Record<string, string[]> = {
  'superior':     ['pec','shl','shr','bcl','bcr','lat','tcl','tcr','trap'],
  'push':         ['pec','shl','shr','tcl','tcr'],
  'empurrar':     ['pec','shl','shr','tcl','tcr'],
  'pull':         ['lat','bcl','bcr','trap','rdl','rdr'],
  'puxar':        ['lat','bcl','bcr','trap','rdl','rdr'],
  'inferior':     ['qul','qur','pal','par','hip','glu','hml','hmr'],
  'squat':        ['qul','qur','pal','par','hip'],
  'agachar':      ['qul','qur','pal','par','hip'],
  'posterior':    ['hml','hmr','glu','lmb'],
  'hip':          ['hml','hmr','glu','hip'],
  'core':         ['abs','lmb'],
  'full':         ['pec','shl','shr','bcl','bcr','lat','tcl','tcr','qul','qur','glu','hml','hmr','abs'],
  'full_body':    ['pec','shl','shr','bcl','bcr','lat','tcl','tcr','qul','qur','glu','hml','hmr','abs'],
  'crossfit':     ['qul','qur','shl','shr','abs','lat','glu'],
  'wod':          ['qul','qur','shl','shr','abs','lat','glu'],
  'cardio':       ['pal','par','abs'],
  'conditioning': ['pal','par','abs'],
  'olympico':     ['qul','qur','shl','shr','lat','trap'],
  'forca':        ['pec','lat','qul','qur','hml','hmr'],
  'hipertrofia':  ['pec','lat','shl','shr','qul','qur','bcl','bcr','tcl','tcr'],
}

const CELL_LABELS: Record<string, string> = {
  head:'—', nape:'Neck', shl:'Shldr·L', shr:'Shldr·R',
  trap:'Traps', pec:'Chest', bcl:'Biceps L', bcr:'Biceps R',
  fal:'Forearm·L', abs:'Core', far:'Forearm·R', hip:'Hip',
  qul:'Quad·L', qur:'Quad·R', pal:'Ham·L', par:'Ham·R',
  rdl:'RDelt·L', rdr:'RDelt·R', tcl:'Triceps L', tcr:'Triceps R',
  lat:'Lats', lmb:'Low Back', glu:'Glutes', hml:'Post·L', hmr:'Post·R',
}

const ALWAYS_UNTRAINED = new Set(['head', 'fal', 'far'])

const FOCUS_DISPLAY: Array<{ keys: string[]; label: string }> = [
  { keys: ['push','empurrar'],            label: 'Push' },
  { keys: ['pull','puxar'],               label: 'Pull' },
  { keys: ['squat','agachar','inferior'], label: 'Lower · Squat' },
  { keys: ['posterior','hip'],            label: 'Hip / Post' },
  { keys: ['core'],                       label: 'Core' },
  { keys: ['cardio','conditioning'],      label: 'Cardio / Ergs' },
  { keys: ['superior'],                   label: 'Upper' },
  { keys: ['full','full_body'],           label: 'Full Body' },
  { keys: ['crossfit','wod'],             label: 'CrossFit' },
  { keys: ['forca'],                      label: 'Strength' },
]

const FOCUS_COLORS: Record<string, string> = {
  push: '#4DA3FF', empurrar: '#4DA3FF',
  pull: '#46C2FF', puxar: '#46C2FF',
  inferior: '#D4FF3A', squat: '#D4FF3A', agachar: '#D4FF3A',
  posterior: '#FF8A00', hip: '#FF8A00',
  core: '#A8A8A4', cardio: '#A8A8A4',
  full: '#D4FF3A', crossfit: '#D4FF3A', full_body: '#D4FF3A', wod: '#D4FF3A',
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate()
}

function getFirstDayOfMonth(year: number, month: number): number {
  // Returns 0=Mon .. 6=Sun
  const day = new Date(year, month, 1).getDay()
  return day === 0 ? 6 : day - 1
}

function computeMuscleVolume(workouts: PrescribedWorkoutData[]): Record<string, number> {
  const counts: Record<string, number> = {}
  for (const w of workouts) {
    if (!w.focus) continue
    const activated = new Set<string>()
    for (const tag of w.focus) {
      const muscles = FOCUS_MUSCLES[tag.toLowerCase()] ?? []
      muscles.forEach(m => activated.add(m))
    }
    activated.forEach(m => { counts[m] = (counts[m] ?? 0) + 1 })
  }
  return counts
}

function muscleIntensity(muscleVolume: Record<string, number>): Record<string, number> {
  const max = Math.max(0, ...Object.values(muscleVolume))
  if (max === 0) return {}
  const result: Record<string, number> = {}
  for (const [k, v] of Object.entries(muscleVolume)) {
    result[k] = v / max
  }
  return result
}

function cellBg(intensity: number | undefined): string {
  if (intensity === undefined || intensity === 0) return 'rgba(255,255,255,0.04)'
  const alpha = 0.08 + intensity * 0.92
  return `rgba(212,255,58,${alpha.toFixed(3)})`
}

function cellTextColor(intensity: number | undefined): string {
  if (intensity === undefined || intensity === 0) return 'rgba(165,165,160,0.4)'
  return intensity > 0.5 ? '#0F0F0E' : '#D4FF3A'
}

function getPrimaryFocusColor(focus: string[] | null): string {
  if (!focus || focus.length === 0) return 'transparent'
  for (const tag of focus) {
    const color = FOCUS_COLORS[tag.toLowerCase()]
    if (color) return color
  }
  return '#A8A8A4'
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function SectionLabel({ number, text }: { number: string; text: string }) {
  return (
    <p className="text-[9px] font-black text-muted-gray/40 uppercase tracking-[0.2em] mb-3">
      {number} · {text}
    </p>
  )
}

// ─── Body Heatmap ─────────────────────────────────────────────────────────────

type HeatView = 'front' | 'back' | 'both'

interface HeatCellProps {
  id: string
  gridArea: string
  intensity: number | undefined
  volume: number
}

function HeatCell({ id, gridArea, intensity, volume }: HeatCellProps) {
  const isUntrained = ALWAYS_UNTRAINED.has(id)
  const eff = isUntrained ? undefined : intensity
  const bg = cellBg(eff)
  const color = cellTextColor(eff)

  return (
    <div
      style={{
        gridArea,
        background: bg,
        border: '1px solid rgba(255,255,255,0.06)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 1,
        minHeight: 0,
        overflow: 'hidden',
      }}
    >
      <span style={{ fontSize: 8, fontFamily: 'JetBrains Mono, monospace', textTransform: 'uppercase', color, lineHeight: 1.2, textAlign: 'center', padding: '0 2px' }}>
        {CELL_LABELS[id] ?? id}
      </span>
      {!isUntrained && volume > 0 && (
        <span style={{ fontSize: 10, fontFamily: 'JetBrains Mono, monospace', fontWeight: 700, color, lineHeight: 1 }}>
          {volume}x
        </span>
      )}
    </div>
  )
}

function FrontGrid({ intensities, volumes }: { intensities: Record<string, number>; volumes: Record<string, number> }) {
  const cells: Array<{ id: string; area: string }> = [
    { id: 'head', area: 'head' },
    { id: 'nape', area: 'nape' },
    { id: 'shl',  area: 'shl' },
    { id: 'trap', area: 'trap' },
    { id: 'shr',  area: 'shr' },
    { id: 'bcl',  area: 'bcl' },
    { id: 'pec',  area: 'pec' },
    { id: 'bcr',  area: 'bcr' },
    { id: 'fal',  area: 'fal' },
    { id: 'abs',  area: 'abs' },
    { id: 'far',  area: 'far' },
    { id: 'hip',  area: 'hip' },
    { id: 'qul',  area: 'qul' },
    { id: 'qur',  area: 'qur' },
    { id: 'pal',  area: 'pal' },
    { id: 'par',  area: 'par' },
  ]

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateAreas: `
          ".    head head ."
          ".    nape nape ."
          "shl  trap trap shr"
          "bcl  pec  pec  bcr"
          "fal  abs  abs  far"
          ".    hip  hip  ."
          "qul  qul  qur  qur"
          "pal  pal  par  par"
        `,
        gridTemplateRows: '30px 18px 36px 50px 40px 20px 60px 40px',
        gridTemplateColumns: '1fr 1.05fr 1.05fr 1fr',
        gap: 2,
      }}
    >
      {cells.map(c => (
        <HeatCell
          key={c.id}
          id={c.id}
          gridArea={c.area}
          intensity={intensities[c.id]}
          volume={volumes[c.id] ?? 0}
        />
      ))}
    </div>
  )
}

function BackGrid({ intensities, volumes }: { intensities: Record<string, number>; volumes: Record<string, number> }) {
  const cells: Array<{ id: string; area: string }> = [
    { id: 'head', area: 'head' },
    { id: 'nape', area: 'nape' },
    { id: 'rdl',  area: 'rdl' },
    { id: 'trap', area: 'trap' },
    { id: 'rdr',  area: 'rdr' },
    { id: 'tcl',  area: 'tcl' },
    { id: 'lat',  area: 'lat' },
    { id: 'tcr',  area: 'tcr' },
    { id: 'fal',  area: 'fal' },
    { id: 'lmb',  area: 'lmb' },
    { id: 'far',  area: 'far' },
    { id: 'glu',  area: 'glu' },
    { id: 'hml',  area: 'hml' },
    { id: 'hmr',  area: 'hmr' },
    { id: 'pal',  area: 'pal' },
    { id: 'par',  area: 'par' },
  ]

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateAreas: `
          ".    head head ."
          ".    nape nape ."
          "rdl  trap trap rdr"
          "tcl  lat  lat  tcr"
          "fal  lmb  lmb  far"
          ".    glu  glu  ."
          "hml  hml  hmr  hmr"
          "pal  pal  par  par"
        `,
        gridTemplateRows: '30px 18px 36px 50px 40px 26px 60px 40px',
        gridTemplateColumns: '1fr 1.05fr 1.05fr 1fr',
        gap: 2,
      }}
    >
      {cells.map(c => (
        <HeatCell
          key={c.id}
          id={c.id}
          gridArea={c.area}
          intensity={intensities[c.id]}
          volume={volumes[c.id] ?? 0}
        />
      ))}
    </div>
  )
}

function HeatLegend() {
  return (
    <div className="mt-3 flex items-center gap-2">
      <span style={{ fontSize: 9, fontFamily: 'JetBrains Mono, monospace', color: 'rgba(168,168,164,0.5)', textTransform: 'uppercase' }}>
        VOLUME
      </span>
      <div
        style={{
          flex: 1,
          height: 8,
          background: 'linear-gradient(to right, rgba(212,255,58,0.08), rgba(212,255,58,1))',
          border: '1px solid rgba(255,255,255,0.06)',
        }}
      />
      <span style={{ fontSize: 9, fontFamily: 'JetBrains Mono, monospace', color: '#D4FF3A', textTransform: 'uppercase' }}>
        +
      </span>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function AthleteReport() {
  const navigate = useNavigate()
  const { athleteId } = useParams<{ athleteId?: string }>()
  const { user } = useAuth()
  const { profile } = useProfile(user?.id)

  const isIAUser = profile?.roles?.includes('ai') ?? false
  const isCoachView = !!athleteId
  const targetId = athleteId ?? user?.id ?? ''

  const [allWorkouts, setAllWorkouts] = useState<PrescribedWorkoutData[]>([])
  const [prs, setPrs] = useState<AthletePR[]>([])
  const [athleteName, setAthleteName] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const now = new Date()
  const [selectedYear, setSelectedYear]   = useState(now.getFullYear())
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth()) // 0-indexed

  const [heatView, setHeatView] = useState<HeatView>('front')

  // ── Data loading ────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!targetId) return
    let cancelled = false

    async function load() {
      setLoading(true)
      try {
        // Workouts
        const workoutsRes = isCoachView
          ? await supabase.rpc('personal_get_athlete_workouts', { p_athlete_id: targetId })
          : await supabase.rpc('get_my_prescribed_workouts')

        // PRs
        const prsRes = await supabase.rpc('get_athlete_prs', { p_athlete_id: targetId })

        // Athlete name for coach view
        if (isCoachView) {
          const profileRes = await supabase
            .from('profiles')
            .select('name,username')
            .eq('user_id', targetId)
            .maybeSingle()
          if (!cancelled && profileRes.data) {
            setAthleteName(profileRes.data.name ?? profileRes.data.username ?? null)
          }
        }

        if (!cancelled) {
          setAllWorkouts((workoutsRes.data as PrescribedWorkoutData[]) ?? [])
          setPrs((prsRes.data as AthletePR[]) ?? [])
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    return () => { cancelled = true }
  }, [targetId, isCoachView])

  // ── Derived data ─────────────────────────────────────────────────────────────

  const monthWorkouts = allWorkouts.filter(w => {
    const [y, m] = w.workout_date.split('-')
    return parseInt(y) === selectedYear && parseInt(m) - 1 === selectedMonth
  })

  const todayStr = now.toISOString().slice(0, 10)

  // Consistency
  const withFeedback   = monthWorkouts.filter(w => w.feedback != null)
  const completed      = withFeedback.filter(w => w.feedback?.status === 'completed').length
  const partial        = withFeedback.filter(w => w.feedback?.status === 'partially_completed').length
  const skipped        = withFeedback.filter(w => w.feedback?.status === 'skipped').length
  const noFeedbackPast = monthWorkouts.filter(w => !w.feedback && w.workout_date < todayStr).length
  const totalPrescribed = monthWorkouts.length
  const doneSessions   = completed + partial
  const consistencyPct = totalPrescribed > 0 ? Math.round((doneSessions / totalPrescribed) * 100) : 0

  // PRs this month — consider all PRs for count since no date on PR data
  const prsCount = prs.length

  // Muscle volume & intensity
  const muscleVolumes   = computeMuscleVolume(monthWorkouts)
  const muscleIntensities = muscleIntensity(muscleVolumes)

  // Focus distribution
  const focusCounts: Record<string, number> = {}
  for (const w of monthWorkouts) {
    if (!w.focus) continue
    for (const tag of w.focus) {
      const key = tag.toLowerCase()
      focusCounts[key] = (focusCounts[key] ?? 0) + 1
    }
  }

  const focusBars = FOCUS_DISPLAY.map(({ keys, label }) => {
    const count = keys.reduce((acc, k) => acc + (focusCounts[k] ?? 0), 0)
    return { label, count }
  }).filter(f => f.count > 0).sort((a, b) => b.count - a.count)

  const maxFocusCount = Math.max(0, ...focusBars.map(f => f.count))

  // Calendar
  const daysInMonth  = getDaysInMonth(selectedYear, selectedMonth)
  const firstWeekday = getFirstDayOfMonth(selectedYear, selectedMonth) // 0=Mon

  // Build a map day -> workout for the month
  const dayWorkoutMap: Record<number, PrescribedWorkoutData> = {}
  for (const w of monthWorkouts) {
    const day = parseInt(w.workout_date.split('-')[2])
    if (!dayWorkoutMap[day]) dayWorkoutMap[day] = w
  }

  // Feedback difficulty
  const diffEasy     = monthWorkouts.filter(w => w.feedback?.perceived_difficulty === 'easy').length
  const diffOk       = monthWorkouts.filter(w => w.feedback?.perceived_difficulty === 'appropriate').length
  const diffHard     = monthWorkouts.filter(w => w.feedback?.perceived_difficulty === 'too_hard').length

  // PRs sorted
  const sortedPrs = [...prs].sort((a, b) => b.max_weight - a.max_weight)

  // Month nav
  const prevMonth = () => {
    if (selectedMonth === 0) { setSelectedMonth(11); setSelectedYear(y => y - 1) }
    else setSelectedMonth(m => m - 1)
  }
  const nextMonth = () => {
    if (selectedMonth === 11) { setSelectedMonth(0); setSelectedYear(y => y + 1) }
    else setSelectedMonth(m => m + 1)
  }

  const monthLabel = `${PT_MONTHS[selectedMonth]} · ${selectedYear}`

  // Athlete display name
  const displayName = isCoachView
    ? (athleteName ?? 'Athlete')
    : (profile?.name ?? profile?.username ?? 'Athlete')

  // ── Render ──────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div style={{ minHeight: '100dvh', background: '#0F0F0E', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: 32, height: 32, border: '2px solid #D4FF3A', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
      </div>
    )
  }

  const cardStyle: React.CSSProperties = {
    background: '#111110',
    border: '1px solid rgba(255,255,255,0.06)',
    padding: '16px',
    marginBottom: 12,
  }

  return (
    <div style={{ minHeight: '100dvh', background: '#0F0F0E', fontFamily: 'Space Grotesk, sans-serif' }}>
      {/* Top bar */}
      <div style={{ position: 'sticky', top: 0, zIndex: 50, background: '#0F0F0E', borderBottom: '1px solid rgba(255,255,255,0.06)', padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
        <button
          onClick={() => navigate(-1)}
          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px 8px 4px 0', color: '#F5F5F0', display: 'flex', alignItems: 'center' }}
          aria-label="Back"
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
          </svg>
        </button>

        <div style={{ flex: 1, textAlign: 'center' }}>
          <p style={{ fontSize: 11, fontFamily: 'JetBrains Mono, monospace', color: '#D4FF3A', letterSpacing: '0.15em', marginBottom: 2 }}>
            REPORT
          </p>
          <p style={{ fontSize: 13, fontWeight: 700, color: '#F5F5F0', letterSpacing: '0.08em' }}>
            {monthLabel}
          </p>
        </div>

        <div style={{ display: 'flex', gap: 4 }}>
          {isIAUser && (
            <button
              onClick={() => navigate(athleteId ? `/wrapped/${athleteId}` : '/wrapped')}
              style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, fontWeight: 800, letterSpacing: '0.16em', color: '#D4FF3A', background: 'rgba(212,255,58,0.1)', border: '1px solid rgba(212,255,58,0.3)', padding: '6px 12px', cursor: 'pointer' }}
            >
              WRAPPED
            </button>
          )}
          <button onClick={prevMonth} style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)', color: '#F5F5F0', width: 32, height: 32, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }} aria-label="Previous month">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
              <path fillRule="evenodd" d="M10.707 3.293a1 1 0 010 1.414L7.414 8l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
          </button>
          <button onClick={nextMonth} style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)', color: '#F5F5F0', width: 32, height: 32, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }} aria-label="Next month">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
              <path fillRule="evenodd" d="M5.293 3.293a1 1 0 011.414 0l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414-1.414L8.586 8 5.293 4.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
        </div>
      </div>

      {/* Scrollable content */}
      <div style={{ maxWidth: 480, margin: '0 auto', padding: '16px 16px 80px' }}>

        {/* ── Section 1: Magazine Cover ──────────────────────────────────────── */}
        <div style={{ ...cardStyle, marginBottom: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
            <span style={{ fontSize: 9, fontFamily: 'JetBrains Mono, monospace', color: '#D4FF3A', letterSpacing: '0.2em', textTransform: 'uppercase' }}>CF · SCORES</span>
            {isCoachView && (
              <span style={{ fontSize: 9, fontFamily: 'JetBrains Mono, monospace', color: 'rgba(168,168,164,0.5)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>COACH VIEW</span>
            )}
          </div>

          <p style={{ fontSize: 32, fontWeight: 900, fontStyle: 'italic', color: '#F5F5F0', letterSpacing: '-0.02em', lineHeight: 1, marginBottom: 8 }}>
            {PT_MONTHS[selectedMonth]}
          </p>
          <p style={{ fontSize: 18, fontWeight: 700, color: '#D4FF3A', letterSpacing: '0.1em', marginBottom: 12 }}>
            {selectedYear}
          </p>

          <p style={{ fontSize: 15, fontWeight: 600, color: '#F5F5F0', marginBottom: 16 }}>
            {displayName}
          </p>

          {/* Stat pills */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
            <div style={{ background: 'rgba(212,255,58,0.08)', border: '1px solid rgba(212,255,58,0.2)', padding: '6px 12px', display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: 70 }}>
              <span style={{ fontSize: 20, fontFamily: 'JetBrains Mono, monospace', fontWeight: 700, color: '#D4FF3A', lineHeight: 1 }}>{doneSessions}</span>
              <span style={{ fontSize: 9, color: 'rgba(168,168,164,0.7)', letterSpacing: '0.12em', marginTop: 2 }}>SESSIONS</span>
            </div>
            <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)', padding: '6px 12px', display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: 70 }}>
              <span style={{ fontSize: 20, fontFamily: 'JetBrains Mono, monospace', fontWeight: 700, color: '#F5F5F0', lineHeight: 1 }}>{prsCount}</span>
              <span style={{ fontSize: 9, color: 'rgba(168,168,164,0.7)', letterSpacing: '0.12em', marginTop: 2 }}>PRs</span>
            </div>
            <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)', padding: '6px 12px', display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: 70 }}>
              <span style={{ fontSize: 20, fontFamily: 'JetBrains Mono, monospace', fontWeight: 700, color: '#F5F5F0', lineHeight: 1 }}>{consistencyPct}%</span>
              <span style={{ fontSize: 9, color: 'rgba(168,168,164,0.7)', letterSpacing: '0.12em', marginTop: 2 }}>CONSIST.</span>
            </div>
          </div>

          {/* Lime rule */}
          <div style={{ height: 2, background: '#D4FF3A' }} />
        </div>

        {/* Empty state */}
        {monthWorkouts.length === 0 && (
          <div style={{ ...cardStyle, textAlign: 'center', padding: '40px 16px' }}>
            <p style={{ color: 'rgba(168,168,164,0.5)', fontSize: 14, letterSpacing: '0.05em' }}>
              No workouts recorded in this period
            </p>
          </div>
        )}

        {monthWorkouts.length > 0 && (
          <>
            {/* ── Section 2: Consistency ──────────────────────────────────────── */}
            <div style={cardStyle}>
              <SectionLabel number="01" text="Consistency" />

              <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 12 }}>
                <span style={{ fontSize: 40, fontFamily: 'JetBrains Mono, monospace', fontWeight: 700, color: '#D4FF3A', lineHeight: 1 }}>
                  {doneSessions}
                </span>
                <span style={{ fontSize: 16, color: 'rgba(168,168,164,0.7)', fontFamily: 'JetBrains Mono, monospace' }}>
                  / {totalPrescribed} sessions
                </span>
              </div>

              {/* Progress bar */}
              <div style={{ height: 6, background: 'rgba(255,255,255,0.06)', marginBottom: 12, position: 'relative' }}>
                <div style={{ position: 'absolute', top: 0, left: 0, height: '100%', width: `${consistencyPct}%`, background: '#D4FF3A', transition: 'width 0.5s ease' }} />
              </div>

              {/* Chips */}
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <div style={{ padding: '4px 10px', background: 'rgba(212,255,58,0.1)', border: '1px solid rgba(212,255,58,0.25)', display: 'flex', gap: 6, alignItems: 'center' }}>
                  <span style={{ fontSize: 9, color: '#D4FF3A', letterSpacing: '0.12em', fontFamily: 'JetBrains Mono, monospace' }}>DONE</span>
                  <span style={{ fontSize: 13, fontFamily: 'JetBrains Mono, monospace', fontWeight: 700, color: '#D4FF3A' }}>{completed}</span>
                </div>
                <div style={{ padding: '4px 10px', background: 'rgba(255,138,0,0.1)', border: '1px solid rgba(255,138,0,0.25)', display: 'flex', gap: 6, alignItems: 'center' }}>
                  <span style={{ fontSize: 9, color: '#FF8A00', letterSpacing: '0.12em', fontFamily: 'JetBrains Mono, monospace' }}>PARTIAL</span>
                  <span style={{ fontSize: 13, fontFamily: 'JetBrains Mono, monospace', fontWeight: 700, color: '#FF8A00' }}>{partial}</span>
                </div>
                <div style={{ padding: '4px 10px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', display: 'flex', gap: 6, alignItems: 'center' }}>
                  <span style={{ fontSize: 9, color: 'rgba(168,168,164,0.6)', letterSpacing: '0.12em', fontFamily: 'JetBrains Mono, monospace' }}>MISSED</span>
                  <span style={{ fontSize: 13, fontFamily: 'JetBrains Mono, monospace', fontWeight: 700, color: 'rgba(168,168,164,0.6)' }}>{skipped + noFeedbackPast}</span>
                </div>
                {monthWorkouts.filter(w => !w.feedback && w.workout_date >= todayStr).length > 0 && (
                  <div style={{ padding: '4px 10px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', display: 'flex', gap: 6, alignItems: 'center' }}>
                    <span style={{ fontSize: 9, color: 'rgba(168,168,164,0.4)', letterSpacing: '0.12em', fontFamily: 'JetBrains Mono, monospace' }}>UPCOMING</span>
                    <span style={{ fontSize: 13, fontFamily: 'JetBrains Mono, monospace', fontWeight: 700, color: 'rgba(168,168,164,0.4)' }}>
                      {monthWorkouts.filter(w => !w.feedback && w.workout_date >= todayStr).length}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* ── Section 3: Body Heatmap ──────────────────────────────────────── */}
            <div style={cardStyle}>
              <SectionLabel number="02" text="Muscle Map" />

              {/* View toggle */}
              <div style={{ display: 'flex', gap: 4, marginBottom: 12 }}>
                {(['front','back','both'] as HeatView[]).map(v => (
                  <button
                    key={v}
                    onClick={() => setHeatView(v)}
                    style={{
                      flex: 1,
                      padding: '6px 0',
                      background: heatView === v ? '#D4FF3A' : 'rgba(255,255,255,0.04)',
                      border: `1px solid ${heatView === v ? '#D4FF3A' : 'rgba(255,255,255,0.08)'}`,
                      color: heatView === v ? '#0F0F0E' : 'rgba(168,168,164,0.7)',
                      fontSize: 10,
                      fontFamily: 'JetBrains Mono, monospace',
                      fontWeight: 700,
                      letterSpacing: '0.12em',
                      textTransform: 'uppercase',
                      cursor: 'pointer',
                    }}
                  >
                    {v === 'front' ? 'FRONT' : v === 'back' ? 'BACK' : 'BOTH'}
                  </button>
                ))}
              </div>

              {heatView === 'both' ? (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  <div>
                    <p style={{ fontSize: 9, fontFamily: 'JetBrains Mono, monospace', color: 'rgba(168,168,164,0.4)', letterSpacing: '0.15em', marginBottom: 4, textAlign: 'center' }}>FRONT</p>
                    <FrontGrid intensities={muscleIntensities} volumes={muscleVolumes} />
                  </div>
                  <div>
                    <p style={{ fontSize: 9, fontFamily: 'JetBrains Mono, monospace', color: 'rgba(168,168,164,0.4)', letterSpacing: '0.15em', marginBottom: 4, textAlign: 'center' }}>BACK</p>
                    <BackGrid intensities={muscleIntensities} volumes={muscleVolumes} />
                  </div>
                </div>
              ) : heatView === 'front' ? (
                <FrontGrid intensities={muscleIntensities} volumes={muscleVolumes} />
              ) : (
                <BackGrid intensities={muscleIntensities} volumes={muscleVolumes} />
              )}

              <HeatLegend />
            </div>

            {/* ── Section 4: Focus Distribution ───────────────────────────────── */}
            {focusBars.length > 0 && (
              <div style={cardStyle}>
                <SectionLabel number="03" text="Focus Distribution" />
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {focusBars.map(({ label, count }) => (
                    <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span style={{ fontSize: 11, color: 'rgba(168,168,164,0.8)', minWidth: 110, flexShrink: 0 }}>{label}</span>
                      <div style={{ flex: 1, height: 6, background: 'rgba(255,255,255,0.06)' }}>
                        <div style={{ height: '100%', width: `${(count / maxFocusCount) * 100}%`, background: '#D4FF3A' }} />
                      </div>
                      <span style={{ fontSize: 11, fontFamily: 'JetBrains Mono, monospace', fontWeight: 700, color: '#D4FF3A', minWidth: 20, textAlign: 'right' }}>{count}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ── Section 5: Monthly Calendar ─────────────────────────────────── */}
            <div style={cardStyle}>
              <SectionLabel number="04" text="Calendar" />

              {/* Weekday headers */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2, marginBottom: 4 }}>
                {['M','T','W','T','F','S','S'].map((d, i) => (
                  <div key={i} style={{ textAlign: 'center', fontSize: 9, fontFamily: 'JetBrains Mono, monospace', color: 'rgba(168,168,164,0.4)', letterSpacing: '0.1em', paddingBottom: 4 }}>
                    {d}
                  </div>
                ))}
              </div>

              {/* Calendar grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2 }}>
                {/* Empty cells for offset */}
                {Array.from({ length: firstWeekday }).map((_, i) => (
                  <div key={`empty-${i}`} style={{ aspectRatio: '1', background: 'transparent' }} />
                ))}

                {/* Day cells */}
                {Array.from({ length: daysInMonth }).map((_, i) => {
                  const day = i + 1
                  const dateStr = `${selectedYear}-${String(selectedMonth + 1).padStart(2,'0')}-${String(day).padStart(2,'0')}`
                  const workout = dayWorkoutMap[day]
                  const isToday = dateStr === todayStr
                  const dotColor = workout ? getPrimaryFocusColor(workout.focus) : null

                  return (
                    <div
                      key={day}
                      style={{
                        aspectRatio: '1',
                        background: workout ? 'rgba(255,255,255,0.04)' : 'transparent',
                        border: isToday ? '1px solid #D4FF3A' : '1px solid transparent',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 2,
                        position: 'relative',
                      }}
                    >
                      <span style={{
                        fontSize: 10,
                        fontFamily: 'JetBrains Mono, monospace',
                        color: isToday ? '#D4FF3A' : workout ? '#F5F5F0' : 'rgba(168,168,164,0.3)',
                        fontWeight: isToday ? 700 : 400,
                      }}>
                        {day}
                      </span>
                      {dotColor && (
                        <div style={{ width: 4, height: 4, background: dotColor, borderRadius: '50%' }} />
                      )}
                    </div>
                  )
                })}
              </div>

              {/* Legend */}
              <div style={{ marginTop: 12, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                {[
                  { color: '#4DA3FF', label: 'Push' },
                  { color: '#46C2FF', label: 'Pull' },
                  { color: '#D4FF3A', label: 'Lower / Full' },
                  { color: '#FF8A00', label: 'Posterior' },
                  { color: '#A8A8A4', label: 'Core / Cardio' },
                ].map(({ color, label }) => (
                  <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <div style={{ width: 6, height: 6, background: color, borderRadius: '50%', flexShrink: 0 }} />
                    <span style={{ fontSize: 9, color: 'rgba(168,168,164,0.6)', fontFamily: 'JetBrains Mono, monospace' }}>{label}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* ── Section 6: PRs ──────────────────────────────────────────────── */}
            {sortedPrs.length > 0 && (
              <div style={cardStyle}>
                <SectionLabel number="05" text="PRs · Personal Records" />
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  {/* Header row */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr auto auto', gap: 8, padding: '0 0 8px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                    <span style={{ fontSize: 9, fontFamily: 'JetBrains Mono, monospace', color: 'rgba(168,168,164,0.4)', letterSpacing: '0.1em' }}>MOVIMENTO</span>
                    <span style={{ fontSize: 9, fontFamily: 'JetBrains Mono, monospace', color: 'rgba(168,168,164,0.4)', letterSpacing: '0.1em', textAlign: 'right', width: 32 }}>REPS</span>
                    <span style={{ fontSize: 9, fontFamily: 'JetBrains Mono, monospace', color: 'rgba(168,168,164,0.4)', letterSpacing: '0.1em', textAlign: 'right', width: 60 }}>LOAD</span>
                  </div>
                  {sortedPrs.map((pr, idx) => (
                    <div
                      key={`${pr.movement_name}-${pr.reps}-${idx}`}
                      style={{
                        display: 'grid',
                        gridTemplateColumns: '1fr auto auto',
                        gap: 8,
                        padding: '8px 0',
                        borderBottom: '1px solid rgba(255,255,255,0.04)',
                      }}
                    >
                      <span style={{ fontSize: 13, color: '#F5F5F0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {pr.movement_name}
                      </span>
                      <span style={{ fontSize: 12, fontFamily: 'JetBrains Mono, monospace', color: 'rgba(168,168,164,0.6)', textAlign: 'right', width: 32 }}>
                        {pr.reps === 1 ? '1RM' : `${pr.reps}RM`}
                      </span>
                      <span style={{ fontSize: 13, fontFamily: 'JetBrains Mono, monospace', fontWeight: 700, color: '#D4FF3A', textAlign: 'right', width: 60 }}>
                        {pr.max_weight}kg
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ── Section 7: Feedback Summary ──────────────────────────────────── */}
            {withFeedback.length > 0 && (
              <div style={cardStyle}>
                <SectionLabel number="06" text="Perceived Effort" />

                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
                  <div style={{ padding: '8px 12px', background: 'rgba(77,163,255,0.1)', border: '1px solid rgba(77,163,255,0.25)', display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: 80 }}>
                    <span style={{ fontSize: 24, fontFamily: 'JetBrains Mono, monospace', fontWeight: 700, color: '#4DA3FF', lineHeight: 1 }}>{diffEasy}</span>
                    <span style={{ fontSize: 9, color: 'rgba(77,163,255,0.7)', letterSpacing: '0.1em', marginTop: 3, fontFamily: 'JetBrains Mono, monospace' }}>EASY</span>
                  </div>
                  <div style={{ padding: '8px 12px', background: 'rgba(212,255,58,0.08)', border: '1px solid rgba(212,255,58,0.2)', display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: 80 }}>
                    <span style={{ fontSize: 24, fontFamily: 'JetBrains Mono, monospace', fontWeight: 700, color: '#D4FF3A', lineHeight: 1 }}>{diffOk}</span>
                    <span style={{ fontSize: 9, color: 'rgba(212,255,58,0.7)', letterSpacing: '0.1em', marginTop: 3, fontFamily: 'JetBrains Mono, monospace' }}>JUST RIGHT</span>
                  </div>
                  <div style={{ padding: '8px 12px', background: 'rgba(255,138,0,0.1)', border: '1px solid rgba(255,138,0,0.25)', display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: 80 }}>
                    <span style={{ fontSize: 24, fontFamily: 'JetBrains Mono, monospace', fontWeight: 700, color: '#FF8A00', lineHeight: 1 }}>{diffHard}</span>
                    <span style={{ fontSize: 9, color: 'rgba(255,138,0,0.7)', letterSpacing: '0.1em', marginTop: 3, fontFamily: 'JetBrains Mono, monospace' }}>TOO HEAVY</span>
                  </div>
                </div>

                {diffHard > 1 && (
                  <div style={{ background: 'rgba(255,138,0,0.08)', border: '1px solid rgba(255,138,0,0.25)', padding: '10px 12px', display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                    <span style={{ color: '#FF8A00', fontSize: 14, flexShrink: 0, lineHeight: 1.4 }}>!</span>
                    <p style={{ fontSize: 12, color: '#FF8A00', lineHeight: 1.5, margin: 0 }}>
                      {diffHard} workouts marked as too heavy — consider adjusting the volume.
                    </p>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

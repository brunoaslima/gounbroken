import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'

const TIER_COLORS = ['#6B6B68', '#A8A8A4', '#4DA3FF', '#D4FF3A', '#FF8A00', '#FF3B30']
const TIER_LABELS = ['UNTRAINED', 'NOVICE', 'INTERMEDIATE', 'ADVANCED', 'ELITE', 'WORLD']

const HERO_H1 = 'Log it. Train it.\nProve it.'

// marker jumps novice -> intermediate -> advanced (centers of tier segments)
const MARKER_STEPS = [
  { left: 23, label: 'NOVICE' },
  { left: 49, label: 'INTERMEDIATE' },
  { left: 75, label: 'ADVANCED' },
]

const JOURNEY = [
  {
    num: '01', label: 'LOG', color: '#4DA3FF',
    title: 'Every lift on record',
    desc: 'PRs, benchmarks and WODs with auto e1RM math — and a percentile tier that tells you exactly where you stand.',
    log: '> snatch 82kg logged',
  },
  {
    num: '02', label: 'TRAIN', color: '#D4FF3A',
    title: 'Programmed, not guessed',
    desc: 'Sessions from your coach or AI suggestions, buildup calculator and a competition-grade timer.',
    log: '> week 4 · day 2 loaded',
  },
  {
    num: '03', label: 'COMPETE', color: '#FF8A00',
    title: 'Prove it on the floor',
    desc: 'Create events, judge in real time and watch the live leaderboard move as scores come in.',
    log: '> heat 3 · lane 5 · GO',
  },
]

const TICKER_ITEMS = [
  'PR: M.SILVA · CLEAN 118KG · TOP 14%',
  'NEW COMP: SUMMER THROWDOWN · 24 TEAMS',
  'PR: ANA C. · FRAN 04:12',
  'LIVE: OPEN BOX CHAMPIONSHIP · ROUND 3',
  'PR: R.TORRES · DEADLIFT 212KG · TOP 9%',
  'COACH: 12 SESSIONS PUBLISHED TODAY',
  'PR: J.RAMOS · SNATCH 71KG',
  'NEW BOX: NORTH BARBELL JOINED',
]

interface BoardRow { team: string; pts: number }

const INITIAL_BOARD: BoardRow[] = [
  { team: 'ALPHA WOLVES', pts: 284 },
  { team: 'IRON FORGE',   pts: 271 },
  { team: 'STEEL MIND',   pts: 263 },
  { team: 'BRUTAL CREW',  pts: 248 },
  { team: 'RAW POWER',    pts: 232 },
  { team: 'NORTH BARBELL',pts: 219 },
]

// deterministic script: a comeback story instead of random noise
const BOARD_SCRIPT = [
  { team: 'BRUTAL CREW',   add: 34, status: 'HEAT 3 · LANE 2 · SCORE IN' },
  { team: 'ALPHA WOLVES',  add: 15, status: 'HEAT 3 · LANE 5 · SCORE IN' },
  { team: 'NORTH BARBELL', add: 55, status: 'HEAT 4 · LANE 1 · BEST HEAT' },
  { team: 'STEEL MIND',    add: 24, status: 'HEAT 4 · LANE 3 · SCORE IN' },
  { team: 'RAW POWER',     add: 31, status: 'HEAT 4 · LANE 6 · SCORE IN' },
  { team: 'IRON FORGE',    add: 42, status: 'FINAL EVENT · SCORE IN' },
]

const FAQ_ITEMS = [
  { q: 'Is it really free to start?', a: 'Yes. Create an account and log unlimited PRs with no card required. Paid plans add coach programming, team competitions and advanced analytics.' },
  { q: 'How do live competitions work?', a: 'Create the event, set divisions and WODs, invite judges. Scores go in from the judge panel and the public leaderboard updates in seconds — no spreadsheets, no recount.' },
  { q: 'Can my coach program for me?', a: 'Coaches prescribe sessions straight into your app. You execute, log and progress while they see every athlete\'s full history in one dashboard.' },
  { q: 'Does it work offline as a PWA?', a: 'Install Go Unbroken to your home screen and log lifts at the rack even with no signal. Everything syncs the moment you reconnect.' },
]

const CTA_WORDS = ['climb', 'season', 'story', 'comp']

function useCountUp(target: number, active: boolean) {
  const [val, setVal] = useState(0)
  useEffect(() => {
    if (!active) return
    const dur = 1300
    const t0 = Date.now()
    const iv = setInterval(() => {
      const p = Math.min(1, (Date.now() - t0) / dur)
      const eased = 1 - Math.pow(1 - p, 3)
      setVal(Math.round(target * eased))
      if (p >= 1) clearInterval(iv)
    }, 40)
    return () => clearInterval(iv)
  }, [active, target])
  return val
}

function useTypeOn(text: string, speed = 40) {
  const [n, setN] = useState(0)
  useEffect(() => {
    const iv = setInterval(() => {
      setN(prev => {
        if (prev >= text.length) { clearInterval(iv); return prev }
        return prev + 1
      })
    }, speed)
    return () => clearInterval(iv)
  }, [text, speed])
  return { shown: text.slice(0, n), done: n >= text.length }
}

// section reveal: dry 120ms step, not a soft fade
function Section({ children, id, style }: { children: React.ReactNode; id?: string; style?: React.CSSProperties }) {
  const ref = useRef<HTMLElement>(null)
  const [vis, setVis] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setVis(true); io.disconnect() } }, { threshold: 0.12 })
    io.observe(el)
    return () => io.disconnect()
  }, [])
  return (
    <section
      ref={ref}
      id={id}
      style={{
        ...style,
        opacity: vis ? 1 : 0,
        transform: vis ? 'none' : 'translateY(12px)',
        transition: 'opacity 120ms linear, transform 120ms linear',
      }}
    >
      {children}
    </section>
  )
}

function StatCard({ num, label, color, live, last }: { num: number; label: string; color: string; live?: boolean; last?: boolean }) {
  const ref = useRef<HTMLDivElement>(null)
  const [active, setActive] = useState(false)
  const val = useCountUp(num, active)
  const [extra, setExtra] = useState(0)
  const [flash, setFlash] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) setActive(true) }, { threshold: 0.3 })
    io.observe(el)
    return () => io.disconnect()
  }, [])

  // after the count-up, the number keeps ticking — alive, not a static stat
  useEffect(() => {
    if (!active || !live) return
    let t: ReturnType<typeof setTimeout>
    const loop = () => {
      t = setTimeout(() => {
        setExtra(e => e + 1)
        setFlash(true)
        setTimeout(() => setFlash(false), 120)
        loop()
      }, 4000 + Math.random() * 3000)
    }
    const start = setTimeout(loop, 1600)
    return () => { clearTimeout(t); clearTimeout(start) }
  }, [active, live])

  return (
    <div ref={ref} style={{ padding: '36px 32px', borderRight: last ? undefined : '1px solid #2A2A2A', textAlign: 'center' }}>
      <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 46, fontWeight: 800, lineHeight: 1, color: flash ? '#F5F5F0' : color }}>
        {(val + extra).toLocaleString('en-US')}
      </div>
      <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, fontWeight: 700, letterSpacing: '0.16em', color: '#5a5a57', marginTop: 10 }}>
        {label}
      </div>
    </div>
  )
}

function RollingPts({ value, color }: { value: number; color: string }) {
  const [disp, setDisp] = useState(value)
  const prevRef = useRef(value)
  useEffect(() => {
    const from = prevRef.current
    prevRef.current = value
    if (from === value) return
    const t0 = Date.now()
    const iv = setInterval(() => {
      const p = Math.min(1, (Date.now() - t0) / 300)
      setDisp(Math.round(from + (value - from) * p))
      if (p >= 1) clearInterval(iv)
    }, 30)
    return () => clearInterval(iv)
  }, [value])
  return (
    <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 18, fontWeight: 800, textAlign: 'right', color }}>
      {disp}
    </span>
  )
}

function ScriptedBoard() {
  const [rows, setRows] = useState<BoardRow[]>(INITIAL_BOARD)
  const [status, setStatus] = useState('ROUND 3 · STANDBY')
  const [flashTeam, setFlashTeam] = useState<string | null>(null)
  const [arrows, setArrows] = useState<Record<string, number>>({})
  const rowsRef = useRef<BoardRow[]>(INITIAL_BOARD)
  const rowRefs = useRef(new Map<string, HTMLDivElement>())
  const prevTopsRef = useRef(new Map<string, number>())
  const timeoutsRef = useRef<ReturnType<typeof setTimeout>[]>([])

  const commit = (next: BoardRow[]) => { rowsRef.current = next; setRows(next) }
  const later = (fn: () => void, ms: number) => { timeoutsRef.current.push(setTimeout(fn, ms)) }

  useEffect(() => {
    let idx = 0
    const iv = setInterval(() => {
      if (idx >= BOARD_SCRIPT.length) {
        // hard reset, dry cut — the story loops
        idx = 0
        commit(INITIAL_BOARD.map(r => ({ ...r })))
        setStatus('ROUND 3 · STANDBY')
        setArrows({})
        return
      }
      const ev = BOARD_SCRIPT[idx]
      idx++
      setStatus(ev.status)
      commit(rowsRef.current.map(r => r.team === ev.team ? { ...r, pts: r.pts + ev.add } : r))
      setFlashTeam(ev.team)
      later(() => setFlashTeam(null), 900)
      // tension beat, then the reorder
      later(() => {
        const before = rowsRef.current.map(r => r.team)
        const next = [...rowsRef.current].sort((a, b) => b.pts - a.pts)
        const moved: Record<string, number> = {}
        next.forEach((r, i) => {
          const old = before.indexOf(r.team)
          if (old !== i) moved[r.team] = old - i
        })
        commit(next)
        setArrows(moved)
        later(() => setArrows({}), 1600)
      }, 500)
    }, 4000)
    const timeouts = timeoutsRef.current
    return () => { clearInterval(iv); timeouts.forEach(clearTimeout) }
  }, [])

  // FLIP: rows slide to their new position
  const orderKey = rows.map(r => r.team).join('|')
  useLayoutEffect(() => {
    const tops = new Map<string, number>()
    rowRefs.current.forEach((el, team) => { if (el?.isConnected) tops.set(team, el.offsetTop) })
    tops.forEach((top, team) => {
      const prev = prevTopsRef.current.get(team)
      const el = rowRefs.current.get(team)
      if (prev === undefined || !el) return
      const delta = prev - top
      if (delta === 0) return
      el.style.transition = 'none'
      el.style.transform = `translateY(${delta}px)`
      void el.offsetHeight
      el.style.transition = 'transform 400ms cubic-bezier(0.2,0.8,0.2,1)'
      el.style.transform = ''
    })
    prevTopsRef.current = tops
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderKey])

  const maxPts = Math.max(...rows.map(r => r.pts))

  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 32px', background: '#D4FF3A', color: '#0A0A0A' }}>
        <span style={{ width: 8, height: 8, background: '#0A0A0A', display: 'inline-block', animation: 'blink 1.4s ease-in-out infinite' }} />
        <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12, fontWeight: 800, letterSpacing: '0.16em' }}>COMPETITION DAY</span>
        <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', color: 'rgba(0,0,0,0.55)', marginLeft: 'auto' }}>
          OPEN BOX CHAMPIONSHIP 2026 · {status}
        </span>
      </div>
      <div style={{ padding: '8px 0' }}>
        {rows.map((row, i) => {
          const isFlash = row.team === flashTeam
          const move = arrows[row.team]
          return (
            <div
              key={row.team}
              ref={el => {
                if (el) rowRefs.current.set(row.team, el)
                else rowRefs.current.delete(row.team)
              }}
              style={{ display: 'grid', gridTemplateColumns: '48px 16px 1fr 160px 70px', alignItems: 'center', gap: 14, padding: '15px 32px', borderBottom: '1px solid #161616', background: isFlash ? '#13160a' : 'transparent', transition: 'background 0.25s' }}
            >
              <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 15, fontWeight: 800, color: TIER_COLORS[i] || '#6B6B68' }}>
                {String(i + 1).padStart(2, '0')}
              </span>
              <span style={{ width: 11, height: 11, background: TIER_COLORS[i] || '#6B6B68', display: 'inline-block' }} />
              <span style={{ fontWeight: 700, fontSize: 15, color: '#F5F5F0' }}>
                {row.team}
                {move !== undefined && (
                  <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, fontWeight: 800, marginLeft: 10, color: move > 0 ? '#D4FF3A' : '#FF3B30' }}>
                    {move > 0 ? `▲${move}` : `▼${-move}`}
                  </span>
                )}
              </span>
              <div style={{ height: 8, background: '#1c1c1c' }}>
                <div style={{ height: '100%', width: `${Math.round((row.pts / maxPts) * 100)}%`, background: TIER_COLORS[i] || '#6B6B68', transition: 'width 0.5s cubic-bezier(0.2,0.8,0.2,1)' }} />
              </div>
              <RollingPts value={row.pts} color={i === 0 ? '#D4FF3A' : '#A8A8A4'} />
            </div>
          )
        })}
      </div>
    </>
  )
}

export default function Landing() {
  const navigate = useNavigate()
  const [openFaq, setOpenFaq] = useState<number | null>(null)
  const { shown: h1Shown, done: h1Done } = useTypeOn(HERO_H1)
  const [markerStep, setMarkerStep] = useState(0)
  const [journeyActive, setJourneyActive] = useState(0)
  const [journeyHover, setJourneyHover] = useState<number | null>(null)
  const [ctaWord, setCtaWord] = useState(0)
  const [ctaInvert, setCtaInvert] = useState(false)

  // percentile marker climbs tiers in dry steps once the H1 finishes typing
  useEffect(() => {
    if (!h1Done) return
    const t1 = setTimeout(() => setMarkerStep(1), 1100)
    const t2 = setTimeout(() => setMarkerStep(2), 2200)
    return () => { clearTimeout(t1); clearTimeout(t2) }
  }, [h1Done])

  // journey cards cycle; hover steals and pauses the cycle
  useEffect(() => {
    if (journeyHover !== null) return
    const iv = setInterval(() => setJourneyActive(a => (a + 1) % JOURNEY.length), 3500)
    return () => clearInterval(iv)
  }, [journeyHover])

  // CTA slot word: dry cut with an 80ms inverted flash
  useEffect(() => {
    const iv = setInterval(() => {
      setCtaWord(w => (w + 1) % CTA_WORDS.length)
      setCtaInvert(true)
      setTimeout(() => setCtaInvert(false), 80)
    }, 2500)
    return () => clearInterval(iv)
  }, [])

  const journeyCurrent = journeyHover ?? journeyActive
  const marker = MARKER_STEPS[markerStep]
  const go = (path: string) => navigate(path)

  return (
    <div style={{ fontFamily: "'Space Grotesk', sans-serif", background: '#0A0A0A', color: '#F5F5F0', minHeight: '100vh' }}>

      {/* NAV */}
      <nav style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '18px 32px', borderBottom: '1px solid #2A2A2A', position: 'sticky', top: 0, background: 'rgba(10,10,10,0.92)', backdropFilter: 'blur(6px)', zIndex: 40 }}>
        <button onClick={() => go('/landing')} style={{ display: 'flex', alignItems: 'center', gap: 9, fontWeight: 700, fontSize: 17, background: 'transparent', border: 'none', color: '#F5F5F0', cursor: 'pointer' }}>
          GO<span style={{ width: 18, height: 5, background: '#D4FF3A', display: 'inline-block' }} />UNBROKEN
        </button>
        <div style={{ display: 'flex', alignItems: 'center', gap: 24, fontFamily: "'JetBrains Mono', monospace", fontSize: 10, fontWeight: 700, letterSpacing: '0.14em' }}>
          <a href="#journey" style={{ color: '#A8A8A4', textDecoration: 'none' }}>JOURNEY</a>
          <a href="#leaderboard" style={{ color: '#A8A8A4', textDecoration: 'none' }}>COMPETITION</a>
          <a href="#faq" style={{ color: '#A8A8A4', textDecoration: 'none' }}>FAQ</a>
          <button onClick={() => go('/login')} style={{ background: '#D4FF3A', color: '#0A0A0A', border: 'none', padding: '11px 18px', fontFamily: "'JetBrains Mono', monospace", fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', cursor: 'pointer' }}>
            CREATE FREE ACCOUNT →
          </button>
        </div>
      </nav>

      {/* HERO */}
      <section style={{ padding: '64px 32px 56px', borderBottom: '1px solid #2A2A2A', textAlign: 'center' }}>
        <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, fontWeight: 700, letterSpacing: '0.24em', color: '#4DA3FF', marginBottom: 26 }}>
          FROM FIRST PR TO COMPETITION FLOOR
        </div>
        <h1 style={{ fontSize: 'clamp(48px,7vw,100px)', fontWeight: 700, lineHeight: 0.95, letterSpacing: '-0.035em', margin: '0 0 18px', whiteSpace: 'pre-line', minHeight: '1.9em' }}>
          {h1Shown}
          <span style={{ display: 'inline-block', width: '0.5em', height: '0.82em', background: '#D4FF3A', verticalAlign: 'baseline', transform: 'translateY(0.12em)', marginLeft: 6, animation: h1Done ? 'blink 1.1s step-end infinite' : 'none' }} />
        </h1>
        <p style={{ fontSize: 15.5, lineHeight: 1.7, color: '#A8A8A4', maxWidth: 500, margin: '0 auto 40px', opacity: h1Done ? 1 : 0 }}>
          The full athlete journey in one platform — log your PRs, follow your programming, and compete on a live floor.
        </p>

        {/* Percentile strip — supporting artifact, marker climbs in steps */}
        <div style={{ maxWidth: 640, margin: '0 auto', opacity: h1Done ? 1 : 0 }}>
          <div style={{ position: 'relative', height: 24, display: 'flex', border: '1px solid #2A2A2A' }}>
            {[12, 22, 30, 22, 10, 4].map((pct, i) => (
              <div key={i} style={{ flex: `0 0 ${pct}%`, background: TIER_COLORS[i] }} />
            ))}
            <div style={{ position: 'absolute', top: -7, bottom: -7, left: `${marker.left}%`, width: 3, background: '#F5F5F0', transition: 'left 300ms linear' }}>
              <span style={{ position: 'absolute', bottom: 'calc(100% + 6px)', left: '50%', transform: 'translateX(-50%)', whiteSpace: 'nowrap', fontFamily: "'JetBrains Mono', monospace", fontSize: 9, fontWeight: 800, letterSpacing: '0.12em', background: '#F5F5F0', color: '#0A0A0A', padding: '3px 7px' }}>
                YOU · {marker.label}
              </span>
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 10, fontFamily: "'JetBrains Mono', monospace", fontSize: 8.5, fontWeight: 700, letterSpacing: '0.1em' }}>
            {TIER_LABELS.map((t, i) => (
              <span key={t} style={{ color: i === 3 ? '#D4FF3A' : i === 4 ? '#FF8A00' : i === 5 ? '#FF3B30' : '#5a5a57' }}>{t}</span>
            ))}
          </div>
        </div>

        <button onClick={() => go('/login')} style={{ display: 'inline-block', marginTop: 40, background: '#D4FF3A', color: '#0A0A0A', border: 'none', fontFamily: "'JetBrains Mono', monospace", fontSize: 12, fontWeight: 800, letterSpacing: '0.14em', padding: '16px 30px', cursor: 'pointer' }}>
          START LOGGING FREE →
        </button>
      </section>

      {/* JOURNEY — the thesis of the page */}
      <Section id="journey" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', borderBottom: '1px solid #2A2A2A' }}>
        {JOURNEY.map((s, i) => {
          const active = journeyCurrent === i
          return (
            <div
              key={s.label}
              onMouseEnter={() => setJourneyHover(i)}
              onMouseLeave={() => setJourneyHover(null)}
              style={{
                padding: active ? '37px 32px 40px' : '40px 32px',
                borderRight: i < 2 ? '1px solid #2A2A2A' : undefined,
                borderTop: active ? `6px solid ${s.color}` : `3px solid ${s.color}`,
                opacity: active ? 1 : 0.4,
                transition: 'opacity 120ms linear',
                cursor: 'default',
              }}
            >
              <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 84, fontWeight: 800, lineHeight: 1, color: active ? s.color : '#2A2A2A', transition: 'color 120ms linear' }}>
                {s.num}
              </div>
              <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, fontWeight: 800, letterSpacing: '0.2em', color: s.color, margin: '18px 0 12px' }}>
                {s.label}
              </div>
              <h3 style={{ fontSize: 19, fontWeight: 700, margin: '0 0 11px' }}>{s.title}</h3>
              <p style={{ fontSize: 13, lineHeight: 1.65, color: '#6B6B68', margin: 0 }}>{s.desc}</p>
              <div style={{ height: 20, marginTop: 16, fontFamily: "'JetBrains Mono', monospace", fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', color: s.color }}>
                {active ? s.log : ''}
              </div>
              {i === 2 && (
                <a href="#leaderboard" style={{ display: 'inline-block', marginTop: 10, fontFamily: "'JetBrains Mono', monospace", fontSize: 10, fontWeight: 800, letterSpacing: '0.16em', color: '#FF8A00', textDecoration: 'none' }}>
                  SEE IT LIVE ↓
                </a>
              )}
            </div>
          )
        })}
      </Section>

      {/* STATS */}
      <Section style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', borderBottom: '1px solid #2A2A2A', background: '#111111' }}>
        <StatCard num={12847} label="PRs LOGGED" color="#D4FF3A" live />
        <StatCard num={1203} label="ATHLETES RANKED" color="#4DA3FF" />
        <StatCard num={47} label="COMPETITIONS RUN" color="#FF8A00" last />
      </Section>

      {/* TICKER */}
      <div style={{ borderBottom: '1px solid #2A2A2A', overflow: 'hidden', height: 32, display: 'flex', alignItems: 'center' }}>
        <div style={{ display: 'inline-block', whiteSpace: 'nowrap', animation: 'landing-marquee 36s linear infinite', fontFamily: "'JetBrains Mono', monospace", fontSize: 10, fontWeight: 700, letterSpacing: '0.14em', color: '#6B6B68' }}>
          {[0, 1].map(dup => (
            <span key={dup}>
              {TICKER_ITEMS.map(item => (
                <span key={item} style={{ marginRight: 18 }}>
                  {item} <span style={{ color: '#3D3D3B', marginLeft: 18 }}>///</span>
                </span>
              ))}
            </span>
          ))}
        </div>
      </div>

      {/* LIVE LEADERBOARD — scripted comeback story */}
      <Section id="leaderboard" style={{ borderBottom: '1px solid #2A2A2A' }}>
        <ScriptedBoard />
      </Section>

      {/* COACH & ORGANIZER */}
      <Section style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', borderBottom: '1px solid #2A2A2A' }}>
        <div style={{ padding: '44px 32px', borderRight: '1px solid #2A2A2A' }}>
          <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, fontWeight: 800, letterSpacing: '0.2em', color: '#4DA3FF', marginBottom: 16 }}>COACH</div>
          <h3 style={{ fontSize: 22, fontWeight: 700, margin: '0 0 12px', letterSpacing: '-0.01em' }}>Program 40 athletes from one screen.</h3>
          <p style={{ fontSize: 13.5, lineHeight: 1.65, color: '#6B6B68', margin: '0 0 20px' }}>
            Prescribe sessions, athletes log them, and every curve lands back on your dashboard.
          </p>
          <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', color: '#A8A8A4', lineHeight: 2 }}>
            › PRESCRIBE — SESSIONS STRAIGHT TO THE APP<br />
            › TRACK — EVERY ATHLETE'S FULL HISTORY<br />
            › ADJUST — AI SUGGESTIONS ON TAP
          </div>
        </div>
        <div style={{ padding: '44px 32px' }}>
          <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, fontWeight: 800, letterSpacing: '0.2em', color: '#FF8A00', marginBottom: 16 }}>ORGANIZER</div>
          <h3 style={{ fontSize: 22, fontWeight: 700, margin: '0 0 12px', letterSpacing: '-0.01em' }}>Run a throwdown without spreadsheets.</h3>
          <p style={{ fontSize: 13.5, lineHeight: 1.65, color: '#6B6B68', margin: '0 0 20px' }}>
            Divisions, teams, judges and a public live board — the whole event in one place.
          </p>
          <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', color: '#A8A8A4', lineHeight: 2 }}>
            › CREATE — DIVISIONS, WODS, HEATS<br />
            › JUDGE — SCORES IN FROM THE FLOOR<br />
            › BROADCAST — LIVE PUBLIC LEADERBOARD
          </div>
        </div>
      </Section>

      {/* TESTIMONIALS */}
      <Section style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', borderBottom: '1px solid #2A2A2A' }}>
        {[
          { quote: '"I stopped guessing. Every cycle ends with a number that used to be a maybe."', name: 'MARINA C.', badge: 'TOP 9%', badgeColor: '#D4FF3A' },
          { quote: '"Programming 40 athletes is one screen now, with a live board on comp day."', name: 'COACH RAFA', badge: 'BOX OWNER', badgeColor: '#4DA3FF' },
          { quote: '"Ran a 24-team throwdown with zero spreadsheets. Scores in, board moves, done."', name: 'PAULA S.', badge: 'EVENT ORGANIZER', badgeColor: '#FF8A00' },
        ].map((t, i) => (
          <div key={t.name} style={{ padding: '34px 32px', borderRight: i < 2 ? '1px solid #2A2A2A' : undefined }}>
            <p style={{ fontSize: 15, lineHeight: 1.55, fontWeight: 500, margin: '0 0 18px' }}>{t.quote}</p>
            <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', color: '#6B6B68' }}>
              {t.name} · <span style={{ color: t.badgeColor }}>{t.badge}</span>
            </div>
          </div>
        ))}
      </Section>

      {/* FAQ */}
      <Section id="faq" style={{ display: 'grid', gridTemplateColumns: '280px 1fr', borderBottom: '1px solid #2A2A2A' }}>
        <div style={{ padding: '44px 32px', borderRight: '1px solid #2A2A2A' }}>
          <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, fontWeight: 700, letterSpacing: '0.22em', color: '#D4FF3A', marginBottom: 14 }}>FAQ</div>
          <h2 style={{ fontSize: 28, fontWeight: 700, letterSpacing: '-0.02em', lineHeight: 1, margin: 0 }}>Good<br />to know.</h2>
        </div>
        <div>
          {FAQ_ITEMS.map((item, i) => {
            const open = openFaq === i
            return (
              <div key={i} style={{ borderBottom: '1px solid #1c1c1c' }}>
                <button
                  onClick={() => setOpenFaq(open ? null : i)}
                  style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16, background: 'transparent', border: 'none', cursor: 'pointer', padding: '22px 32px', textAlign: 'left' }}
                >
                  <span style={{ fontSize: 16, fontWeight: 600, letterSpacing: '-0.01em', color: open ? '#D4FF3A' : '#F5F5F0' }}>{item.q}</span>
                  <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 20, fontWeight: 400, color: '#D4FF3A', lineHeight: 1 }}>{open ? '−' : '+'}</span>
                </button>
                {open && (
                  <p style={{ fontSize: 14, lineHeight: 1.7, color: '#6B6B68', margin: 0, padding: '0 32px 24px', maxWidth: 560 }}>{item.a}</p>
                )}
              </div>
            )
          })}
        </div>
      </Section>

      {/* CTA FINAL */}
      <section style={{ background: '#D4FF3A', color: '#0A0A0A', padding: '80px 32px', textAlign: 'center' }}>
        <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, fontWeight: 800, letterSpacing: '0.2em', marginBottom: 20 }}>FROM FIRST PR TO PODIUM</div>
        <h2 style={{ fontSize: 'clamp(40px,6vw,74px)', fontWeight: 700, lineHeight: 0.92, letterSpacing: '-0.03em', margin: '0 0 30px' }}>
          Start your{' '}
          <span style={{ display: 'inline-block', minWidth: '5.5ch', textAlign: 'left', background: ctaInvert ? '#0A0A0A' : 'transparent', color: ctaInvert ? '#D4FF3A' : '#0A0A0A' }}>
            {CTA_WORDS[ctaWord]}
          </span>
          {' '}today.
        </h2>
        <button onClick={() => go('/login')} style={{ background: '#0A0A0A', color: '#D4FF3A', border: 'none', fontFamily: "'JetBrains Mono', monospace", fontSize: 12, fontWeight: 800, letterSpacing: '0.14em', padding: '18px 42px', cursor: 'pointer' }}>
          CREATE FREE ACCOUNT →
        </button>
        <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, fontWeight: 700, letterSpacing: '0.14em', marginTop: 22, color: 'rgba(0,0,0,0.5)' }}>
          FREE TO START · NO CARD REQUIRED
        </div>
      </section>

      {/* FOOTER */}
      <footer style={{ padding: '40px 32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 24, flexWrap: 'wrap' }}>
        <button onClick={() => go('/landing')} style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 700, fontSize: 15, background: 'transparent', border: 'none', color: '#F5F5F0', cursor: 'pointer' }}>
          GO<span style={{ width: 15, height: 4, background: '#D4FF3A', display: 'inline-block' }} />UNBROKEN
        </button>
        <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9.5, fontWeight: 700, letterSpacing: '0.16em', color: '#3D3D3B' }}>
          © 2026 · STRENGTH · SCORES · SINCE 2026
        </div>
      </footer>

      <style>{`
        @keyframes blink { 0%,100%{opacity:1} 50%{opacity:.15} }
        @keyframes landing-marquee { from { transform: translateX(0) } to { transform: translateX(-50%) } }
      `}</style>
    </div>
  )
}

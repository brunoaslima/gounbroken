import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'

const TIER_COLORS = ['#6B6B68', '#A8A8A4', '#4DA3FF', '#D4FF3A', '#FF8A00', '#FF3B30']
const TIER_LABELS = ['UNTRAINED', 'NOVICE', 'INTERMEDIATE', 'ADVANCED', 'ELITE', 'WORLD']

const INITIAL_BOARD = [
  { team: 'ALPHA WOLVES', pts: 284 },
  { team: 'IRON FORGE',   pts: 271 },
  { team: 'STEEL MIND',   pts: 263 },
  { team: 'BRUTAL CREW',  pts: 248 },
  { team: 'RAW POWER',    pts: 232 },
  { team: 'NORTH BARBELL',pts: 219 },
]

const FAQ_ITEMS = [
  { q: 'Is it really free to start?', a: 'Yes. Create an account and log unlimited PRs with no card required. Paid plans add coach programming, team competitions and advanced analytics.' },
  { q: 'How is my percentile calculated?', a: 'We compare your best lifts against anonymized data from thousands of athletes, normalized by bodyweight, age and sex — so your rank is fair, not just a raw number.' },
  { q: 'Can my coach program for me?', a: 'Coaches prescribe sessions straight into your app. You execute, log and progress while they see every athlete\'s full history in one dashboard.' },
  { q: 'Does it work offline as a PWA?', a: 'Install Go Unbroken to your home screen and log lifts at the rack even with no signal. Everything syncs the moment you reconnect.' },
]

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

function StatCard({ num, label, color }: { num: number; label: string; color: string }) {
  const ref = useRef<HTMLDivElement>(null)
  const [active, setActive] = useState(false)
  const val = useCountUp(num, active)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) setActive(true) }, { threshold: 0.3 })
    io.observe(el)
    return () => io.disconnect()
  }, [])
  return (
    <div ref={ref} style={{ padding: '36px 32px', borderRight: '1px solid #2A2A2A', textAlign: 'center' }}>
      <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 46, fontWeight: 800, lineHeight: 1, color }}>
        {val.toLocaleString('en-US')}
      </div>
      <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, fontWeight: 700, letterSpacing: '0.16em', color: '#5a5a57', marginTop: 10 }}>
        {label}
      </div>
    </div>
  )
}

export default function Landing() {
  const navigate = useNavigate()
  const [board, setBoard] = useState(INITIAL_BOARD)
  const [flash, setFlash] = useState<string | null>(null)
  const [openFaq, setOpenFaq] = useState<number | null>(null)
  const heroRef = useRef<HTMLDivElement>(null)
  const [heroActive, setHeroActive] = useState(false)
  const heroVal = useCountUp(18, heroActive)

  useEffect(() => {
    const el = heroRef.current
    if (!el) return
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) setHeroActive(true) }, { threshold: 0.3 })
    io.observe(el)
    return () => io.disconnect()
  }, [])

  useEffect(() => {
    const timer = setInterval(() => {
      setBoard(prev => {
        const next = prev.map(r => ({ ...r }))
        const i = Math.floor(Math.random() * next.length)
        next[i].pts += Math.floor(Math.random() * 7) + 1
        const teamName = next[i].team
        setFlash(teamName)
        setTimeout(() => setFlash(null), 600)
        return next
      })
    }, 2300)
    return () => clearInterval(timer)
  }, [])

  const sorted = [...board].sort((a, b) => b.pts - a.pts)
  const maxPts = Math.max(...sorted.map(r => r.pts))

  const go = (path: string) => navigate(path)

  return (
    <div style={{ fontFamily: "'Space Grotesk', sans-serif", background: '#0A0A0A', color: '#F5F5F0', minHeight: '100vh' }}>

      {/* NAV */}
      <nav style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '18px 32px', borderBottom: '1px solid #2A2A2A', position: 'sticky', top: 0, background: 'rgba(10,10,10,0.92)', backdropFilter: 'blur(6px)', zIndex: 40 }}>
        <button onClick={() => go('/landing')} style={{ display: 'flex', alignItems: 'center', gap: 9, fontWeight: 700, fontSize: 17, background: 'transparent', border: 'none', color: '#F5F5F0', cursor: 'pointer' }}>
          GO<span style={{ width: 18, height: 5, background: '#D4FF3A', display: 'inline-block' }} />UNBROKEN
        </button>
        <div style={{ display: 'flex', alignItems: 'center', gap: 24, fontFamily: "'JetBrains Mono', monospace", fontSize: 10, fontWeight: 700, letterSpacing: '0.14em' }}>
          <a href="#leaderboard" style={{ color: '#A8A8A4', textDecoration: 'none' }}>LEADERBOARD</a>
          <a href="#faq" style={{ color: '#A8A8A4', textDecoration: 'none' }}>FAQ</a>
          <button onClick={() => go('/login')} style={{ background: '#D4FF3A', color: '#0A0A0A', border: 'none', padding: '11px 18px', fontFamily: "'JetBrains Mono', monospace", fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', cursor: 'pointer' }}>
            CREATE FREE ACCOUNT →
          </button>
        </div>
      </nav>

      {/* HERO */}
      <section style={{ padding: '64px 32px 56px', borderBottom: '1px solid #2A2A2A', textAlign: 'center' }}>
        <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, fontWeight: 700, letterSpacing: '0.24em', color: '#4DA3FF', marginBottom: 26 }}>
          UNTRAINED → WORLD-CLASS · WHERE DO YOU STAND?
        </div>
        <h1 style={{ fontSize: 'clamp(48px,7vw,100px)', fontWeight: 700, lineHeight: 0.9, letterSpacing: '-0.035em', margin: '0 0 18px' }}>
          Where do<br />you rank<span style={{ color: '#D4FF3A' }}>?</span>
        </h1>
        <p style={{ fontSize: 15.5, lineHeight: 1.7, color: '#A8A8A4', maxWidth: 480, margin: '0 auto 44px' }}>
          Every lift you log places you on the global strength curve. See your tier, your percentile, your next jump.
        </p>

        {/* Percentile bar */}
        <div style={{ maxWidth: 760, margin: '0 auto' }}>
          <div style={{ position: 'relative', height: 60, display: 'flex', border: '1px solid #2A2A2A', overflow: 'visible' }}>
            {[12, 22, 30, 22, 10, 4].map((pct, i) => (
              <div key={i} style={{ flex: `0 0 ${pct}%`, background: TIER_COLORS[i] }} />
            ))}
            <div style={{ position: 'absolute', top: -10, bottom: -10, left: '82%', width: 3, background: '#F5F5F0' }}>
              <span style={{ position: 'absolute', bottom: 'calc(100% + 6px)', left: '50%', transform: 'translateX(-50%)', whiteSpace: 'nowrap', fontFamily: "'JetBrains Mono', monospace", fontSize: 9, fontWeight: 800, letterSpacing: '0.12em', background: '#F5F5F0', color: '#0A0A0A', padding: '3px 7px' }}>
                YOU · ADVANCED
              </span>
              <span style={{ position: 'absolute', top: 'calc(100% + 6px)', left: '50%', transform: 'translateX(-50%)', width: 9, height: 9, background: '#F5F5F0', display: 'block' }} />
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 12, fontFamily: "'JetBrains Mono', monospace", fontSize: 8.5, fontWeight: 700, letterSpacing: '0.1em', color: '#5a5a57' }}>
            {TIER_LABELS.map((t, i) => (
              <span key={t} style={{ color: i === 3 ? '#D4FF3A' : i === 4 ? '#FF8A00' : i === 5 ? '#FF3B30' : '#5a5a57' }}>{t}</span>
            ))}
          </div>
        </div>

        <div ref={heroRef} style={{ marginTop: 46, fontFamily: "'JetBrains Mono', monospace", fontWeight: 800, lineHeight: 1 }}>
          <span style={{ fontSize: 13, color: '#6B6B68', letterSpacing: '0.16em', display: 'block', marginBottom: 8 }}>YOUR PLACEMENT</span>
          <span style={{ fontSize: 'clamp(56px,9vw,120px)' }}>top {heroVal}%</span>
        </div>
        <button onClick={() => go('/login')} style={{ display: 'inline-block', marginTop: 34, background: '#D4FF3A', color: '#0A0A0A', border: 'none', fontFamily: "'JetBrains Mono', monospace", fontSize: 12, fontWeight: 800, letterSpacing: '0.14em', padding: '16px 30px', cursor: 'pointer' }}>
          FIND MY RANK →
        </button>
      </section>

      {/* STATS */}
      <section style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', borderBottom: '1px solid #2A2A2A', background: '#111111' }}>
        <StatCard num={12847} label="PRs LOGGED" color="#D4FF3A" />
        <StatCard num={1203}  label="ATHLETES RANKED" color="#4DA3FF" />
        <div style={{ padding: '36px 32px', textAlign: 'center' }}>
          <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 46, fontWeight: 800, lineHeight: 1, color: '#FF8A00' }}>47</div>
          <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, fontWeight: 700, letterSpacing: '0.16em', color: '#5a5a57', marginTop: 10 }}>COMPETITIONS RUN</div>
        </div>
      </section>

      {/* LEADERBOARD */}
      <section id="leaderboard" style={{ borderBottom: '1px solid #2A2A2A' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 32px', background: '#D4FF3A', color: '#0A0A0A' }}>
          <span style={{ width: 8, height: 8, background: '#0A0A0A', borderRadius: '50%', display: 'inline-block', animation: 'blink 1.4s ease-in-out infinite' }} />
          <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12, fontWeight: 800, letterSpacing: '0.16em' }}>LIVE LEADERBOARD</span>
          <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', color: 'rgba(0,0,0,0.55)', marginLeft: 'auto' }}>OPEN BOX CHAMPIONSHIP 2026 · ROUND 3</span>
        </div>
        <div style={{ padding: '8px 0' }}>
          {sorted.map((row, i) => {
            const isFlash = row.team === flash
            return (
              <div key={row.team} style={{ display: 'grid', gridTemplateColumns: '48px 16px 1fr 160px 70px', alignItems: 'center', gap: 14, padding: '15px 32px', borderBottom: '1px solid #161616', background: isFlash ? '#13160a' : 'transparent', transition: 'background 0.25s' }}>
                <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 15, fontWeight: 800, color: TIER_COLORS[i] || '#6B6B68' }}>
                  {String(i + 1).padStart(2, '0')}
                </span>
                <span style={{ width: 11, height: 11, background: TIER_COLORS[i] || '#6B6B68', display: 'inline-block' }} />
                <span style={{ fontWeight: 700, fontSize: 15, color: '#F5F5F0' }}>{row.team}</span>
                <div style={{ height: 8, background: '#1c1c1c' }}>
                  <div style={{ height: '100%', width: `${Math.round((row.pts / maxPts) * 100)}%`, background: TIER_COLORS[i] || '#6B6B68', transition: 'width 0.5s cubic-bezier(0.2,0.8,0.2,1)' }} />
                </div>
                <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 18, fontWeight: 800, textAlign: 'right', color: i === 0 ? '#D4FF3A' : '#A8A8A4' }}>{row.pts}</span>
              </div>
            )
          })}
        </div>
      </section>

      {/* FEATURES */}
      <section style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', borderBottom: '1px solid #2A2A2A' }}>
        {[
          { color: '#4DA3FF', label: 'PROGRESSION', title: 'Every PR, charted', desc: 'Lifts, WODs and benchmarks tracked over time, with auto e1RM math.' },
          { color: '#D4FF3A', label: 'PERCENTILE', title: 'Ranked vs humanity', desc: 'Normalized by bodyweight, age and sex — a tier you can trust.' },
          { color: '#FF8A00', label: 'COMPETITION', title: 'Live team boards', desc: 'Build competitions, judge in real time, watch the board move.' },
        ].map((f, i) => (
          <div key={f.label} style={{ padding: '40px 32px', borderRight: i < 2 ? '1px solid #2A2A2A' : undefined, borderTop: `3px solid ${f.color}` }}>
            <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, fontWeight: 800, letterSpacing: '0.16em', color: f.color, marginBottom: 18 }}>{f.label}</div>
            <h3 style={{ fontSize: 19, fontWeight: 700, margin: '0 0 11px' }}>{f.title}</h3>
            <p style={{ fontSize: 13, lineHeight: 1.65, color: '#6B6B68', margin: 0 }}>{f.desc}</p>
          </div>
        ))}
      </section>

      {/* TESTIMONIALS */}
      <section style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', borderBottom: '1px solid #2A2A2A' }}>
        {[
          { quote: '"The percentile is addictive — I climbed from novice to advanced and never left."', name: 'DIEGO M.', badge: 'TOP 21%', badgeColor: '#D4FF3A' },
          { quote: '"Programming 40 athletes is one screen now, with a live board on comp day."', name: 'COACH RAFA', badge: 'BOX OWNER', badgeColor: '#4DA3FF' },
          { quote: '"I stopped guessing. I know my number and exactly where it puts me."', name: 'MARINA C.', badge: 'TOP 9%', badgeColor: '#D4FF3A' },
        ].map((t, i) => (
          <div key={t.name} style={{ padding: '34px 32px', borderRight: i < 2 ? '1px solid #2A2A2A' : undefined }}>
            <p style={{ fontSize: 15, lineHeight: 1.55, fontWeight: 500, margin: '0 0 18px' }}>{t.quote}</p>
            <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', color: '#6B6B68' }}>
              {t.name} · <span style={{ color: t.badgeColor }}>{t.badge}</span>
            </div>
          </div>
        ))}
      </section>

      {/* FAQ */}
      <section id="faq" style={{ display: 'grid', gridTemplateColumns: '280px 1fr', borderBottom: '1px solid #2A2A2A' }}>
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
      </section>

      {/* CTA FINAL */}
      <section style={{ background: '#D4FF3A', color: '#0A0A0A', padding: '80px 32px', textAlign: 'center' }}>
        <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, fontWeight: 800, letterSpacing: '0.2em', marginBottom: 20 }}>CLAIM YOUR PLACEMENT</div>
        <h2 style={{ fontSize: 'clamp(40px,6vw,74px)', fontWeight: 700, lineHeight: 0.92, letterSpacing: '-0.03em', margin: '0 0 30px' }}>See where you<br />stand today.</h2>
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
      `}</style>
    </div>
  )
}

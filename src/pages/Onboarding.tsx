import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { useProfile, type ExperienceLevel } from '@/hooks/useProfile'
import { supabase } from '@/lib/supabase'
import { PRESET_MOVEMENTS } from '@/lib/presetMovements'
import { phCapture } from '@/lib/posthog'

// ── Types ──────────────────────────────────────────────────────────────

type Step = 1 | 2 | 3 | 4 | 5
type Gender = 'male' | 'female' | 'other' | 'prefer_not_to_say'

const TOTAL_STEPS = 5

const TRAINING_TYPES = [
  'CrossFit', 'Bodybuilding', 'Functional fitness', 'Running',
  'Hyrox', 'Weightlifting', 'Powerlifting', 'Other',
] as const

const GOALS: { key: string; label: string }[] = [
  { key: 'strength',              label: 'Build strength' },
  { key: 'conditioning',          label: 'Conditioning' },
  { key: 'crossfit_performance',  label: 'CrossFit performance' },
  { key: 'fat_loss',              label: 'Lose fat' },
  { key: 'muscle_gain',           label: 'Build muscle' },
  { key: 'technique',             label: 'Improve technique' },
  { key: 'return_to_routine',     label: 'Return to routine' },
  { key: 'competition',           label: 'Compete' },
]

const LEVELS: { key: ExperienceLevel; label: string }[] = [
  { key: 'beginner',     label: 'Beginner' },
  { key: 'intermediate', label: 'Intermediate' },
  { key: 'advanced',     label: 'Advanced' },
  { key: 'athlete',      label: 'Competitive' },
]

const FREQ_OPTIONS: { value: number | null; label: string }[] = [
  { value: 2,    label: '1–2 days' },
  { value: 4,    label: '3–4 days' },
  { value: 6,    label: '5–6 days' },
  { value: 7,    label: 'Every day' },
  { value: null, label: 'No fixed routine' },
]

const QUICK_ADJUST = [-5, -2.5, +2.5, +5]

// ── Helpers ────────────────────────────────────────────────────────────

const Ruler = () => (
  <div className="flex justify-between items-end" style={{ height: 14 }}>
    {Array.from({ length: 51 }).map((_, i) => (
      <span key={i} style={{
        width: 1.5,
        height: i % 5 === 0 ? 14 : 7,
        background: i % 5 === 0 ? '#F5F5F0' : '#3D3D3B',
        display: 'block',
      }} />
    ))}
  </div>
)

function ProgressBar({ step }: { step: number }) {
  return (
    <div className="flex gap-1 px-5 pb-5">
      {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
        <div key={i} className="flex-1 h-[3px] transition-all" style={{ background: i < step ? '#D4FF3A' : '#2A2A2A' }} />
      ))}
    </div>
  )
}

function TopBar({ step, onBack, onSkip, showSkip }: {
  step: Step; onBack: () => void; onSkip: () => void; showSkip: boolean
}) {
  return (
    <div>
      <div className="flex items-center justify-between px-5 pt-5 pb-4">
        {step > 1 ? (
          <button onClick={onBack} className="w-8 h-8 flex items-center justify-center text-[#6B6B68] active:text-[#F5F5F0]">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M15 19l-7-7 7-7" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        ) : (
          <div className="w-8" />
        )}
        <span className="font-mono font-bold uppercase tracking-[0.18em] text-[11px] text-[#A8A8A4]">
          Setup · {String(step).padStart(2, '0')} / {String(TOTAL_STEPS).padStart(2, '0')}
        </span>
        {showSkip ? (
          <button onClick={onSkip}
            className="font-mono font-bold uppercase tracking-[0.12em] text-[11px] text-[#6B6B68] active:text-[#F5F5F0]">
            Skip
          </button>
        ) : (
          <div className="w-10" />
        )}
      </div>
      <ProgressBar step={step} />
    </div>
  )
}

function ContinueBtn({ label = 'CONTINUAR →', disabled = false, loading = false, onClick }: {
  label?: string; disabled?: boolean; loading?: boolean; onClick?: () => void
}) {
  return (
    <div className="px-5 pb-10 pt-4 shrink-0">
      <button
        onClick={onClick}
        disabled={disabled || loading}
        className="w-full flex items-center justify-center gap-2 font-mono font-bold uppercase tracking-[0.18em] text-[12px] py-4 disabled:opacity-40 transition-colors"
        style={{ background: '#D4FF3A', color: '#0A0A0A' }}
      >
        {loading && <span className="w-3.5 h-3.5 border-2 border-black/20 border-t-black/70 rounded-full animate-spin" />}
        {loading ? 'Saving...' : label}
      </button>
    </div>
  )
}

// ── Step 1: Welcome ─────────────────────────────────────────────────────

function StepWelcome({ onNext }: { onNext: () => void }) {
  return (
    <div className="flex flex-col flex-1">
      <div className="flex-1 px-5 pt-2 pb-4">
        <span className="font-mono font-bold uppercase tracking-[0.12em] text-[10px] text-[#6B6B68] block mb-5">
          Welcome
        </span>
        <h1 className="font-sans font-black leading-none text-[#F5F5F0] mb-3"
          style={{ fontSize: 40, letterSpacing: '-0.02em', lineHeight: 1.05 }}>
          Every PR.<br />
          <span style={{ color: '#D4FF3A' }}>Every number.</span><br />
          In one place.
        </h1>
        <p className="font-sans text-[#6B6B68] text-[14px] leading-relaxed mt-5">
          Record your 1RMs, track your progression, and see where you stand against the rest of humanity.
        </p>

        <div className="mt-10">
          <Ruler />
          <div className="flex items-center justify-between mt-2">
            <span className="font-mono font-bold uppercase tracking-[0.12em] text-[10px] text-[#3D3D3B]">
              Personal · Record · Log
            </span>
            <span className="font-mono font-bold text-[10px] text-[#3D3D3B]">100</span>
          </div>
        </div>
      </div>
      <ContinueBtn onClick={onNext} />
    </div>
  )
}

// ── Step 2: Physical data ───────────────────────────────────────────────

function StepProfile({ onNext }: {
  onNext: (data: { gender: Gender; weight: number; height: number; date_of_birth: string }) => void
}) {
  const [gender, setGender] = useState<Gender | ''>('')
  const [weight, setWeight] = useState('')
  const [height, setHeight] = useState('')
  const [dob, setDob] = useState('')

  const dobValid = (() => {
    if (!dob || dob.length !== 10) return false
    const y = parseInt(dob.slice(0, 4))
    const cur = new Date().getFullYear()
    return y >= cur - 100 && y <= cur - 10
  })()

  const weightNum = parseFloat(weight)
  const heightNum = parseInt(height)

  const canContinue =
    !!gender &&
    weightNum >= 30 && weightNum <= 300 &&
    heightNum >= 100 && heightNum <= 250 &&
    dobValid

  function handleContinue() {
    if (!canContinue) return
    onNext({ gender: gender as Gender, weight: weightNum, height: heightNum, date_of_birth: dob })
  }

  const Label = ({ children }: { children: React.ReactNode }) => (
    <span className="font-mono font-bold uppercase tracking-[0.12em] text-[10px] text-[#6B6B68] block mb-2">
      {children}
    </span>
  )

  return (
    <div className="flex flex-col flex-1">
      <div className="flex-1 px-5 pt-2 overflow-y-auto">
        <span className="font-mono font-bold uppercase tracking-[0.12em] text-[10px] text-[#6B6B68] block mb-3">
          Your numbers
        </span>
        <h1 className="font-sans font-black text-[#F5F5F0] mb-1"
          style={{ fontSize: 32, letterSpacing: '-0.02em', lineHeight: 1.1 }}>
          Calibrate the ranking.
        </h1>
        <p className="font-sans text-[#6B6B68] text-[13px] mb-7">
          Used to calculate your percentile. None of this goes to the feed.
        </p>

        {/* ── Date of birth ── */}
        <Label>Date of birth</Label>
        <div className="mb-6">
          <input
            type="date"
            value={dob}
            onChange={e => setDob(e.target.value)}
            max={`${new Date().getFullYear() - 10}-12-31`}
            min={`${new Date().getFullYear() - 100}-01-01`}
            className="w-full bg-[#141414] border border-[#2A2A2A] text-[#F5F5F0] focus:outline-none focus:border-[#D4FF3A] px-4 font-mono font-bold text-[18px] [color-scheme:dark]"
            style={{ height: 64 }}
          />
        </div>

        {/* ── Gender ── */}
        <Label>Gender</Label>
        <div className="grid grid-cols-2 mb-6" style={{ gap: 0 }}>
          {([
            { value: 'male'                as Gender, label: 'Male' },
            { value: 'female'              as Gender, label: 'Female' },
            { value: 'other'               as Gender, label: 'Other' },
            { value: 'prefer_not_to_say'   as Gender, label: 'Prefer not to say' },
          ]).map((opt, i) => {
            const isActive = gender === opt.value
            const isLeft  = i % 2 === 0
            const isTop   = i < 2
            return (
              <button key={opt.value} type="button" onClick={() => setGender(opt.value)}
                className="py-3.5 px-2 font-mono font-bold uppercase tracking-[0.06em] text-[11px] transition-colors"
                style={{
                  border: '1px solid #2A2A2A',
                  borderLeft: isLeft ? '1px solid #2A2A2A' : 'none',
                  borderTop:  isTop  ? '1px solid #2A2A2A' : 'none',
                  background: isActive ? '#F5F5F0' : '#141414',
                  color:      isActive ? '#0A0A0A' : '#A8A8A4',
                }}>
                {opt.label}
              </button>
            )
          })}
        </div>

        {/* ── Weight ── */}
        <Label>Body weight</Label>
        <div className="border border-[#2A2A2A] bg-[#141414] flex items-center mb-6" style={{ height: 64 }}>
          <input
            type="number" inputMode="decimal" step="0.5" min="30" max="300"
            value={weight} onChange={e => setWeight(e.target.value)}
            className="flex-1 bg-transparent px-5 text-[#F5F5F0] placeholder-[#3D3D3B] focus:outline-none font-mono font-bold text-[20px]"
            placeholder="e.g. 82"
          />
          <span className="font-mono font-bold text-[#3D3D3B] text-[14px] pr-5">KG</span>
        </div>

        {/* ── Height ── */}
        <Label>Height</Label>
        <div className="border border-[#2A2A2A] bg-[#141414] flex items-center mb-4" style={{ height: 64 }}>
          <input
            type="number" inputMode="numeric" min="100" max="250"
            value={height} onChange={e => setHeight(e.target.value)}
            className="flex-1 bg-transparent px-5 text-[#F5F5F0] placeholder-[#3D3D3B] focus:outline-none font-mono font-bold text-[20px]"
            placeholder="e.g. 178"
          />
          <span className="font-mono font-bold text-[#3D3D3B] text-[14px] pr-5">CM</span>
        </div>
      </div>
      <ContinueBtn onClick={handleContinue} disabled={!canContinue} />
    </div>
  )
}

// ── Step 3: Training profile ────────────────────────────────────────────

function StepTraining({ onNext }: {
  onNext: (data: {
    training_frequency: number | null
    training_types: string[]
    main_goals: string[]
    experience_level: ExperienceLevel | null
  }) => void
}) {
  const [freq, setFreq]   = useState<number | null | undefined>(undefined)
  const [types, setTypes] = useState<string[]>([])
  const [goals, setGoals] = useState<string[]>([])
  const [level, setLevel] = useState<ExperienceLevel | null>(null)

  function toggle<T>(arr: T[], v: T): T[] {
    return arr.includes(v) ? arr.filter(x => x !== v) : [...arr, v]
  }

  const canContinue =
    freq !== undefined &&
    types.length > 0 &&
    goals.length > 0 &&
    !!level

  function handleContinue() {
    if (!canContinue) return
    onNext({
      training_frequency: freq ?? null,
      training_types: types,
      main_goals: goals,
      experience_level: level,
    })
  }

  const Label = ({ children }: { children: React.ReactNode }) => (
    <span className="font-mono font-bold uppercase tracking-[0.12em] text-[10px] text-[#6B6B68] block mb-2">
      {children}
    </span>
  )

  const chip = (active: boolean): React.CSSProperties => ({
    border: '1px solid #2A2A2A',
    background: active ? '#D4FF3A' : '#141414',
    color:      active ? '#0A0A0A' : '#A8A8A4',
    padding: '10px 14px',
  })

  return (
    <div className="flex flex-col flex-1">
      <div className="flex-1 px-5 pt-2 overflow-y-auto">
        <span className="font-mono font-bold uppercase tracking-[0.12em] text-[10px] text-[#6B6B68] block mb-3">
          Training profile
        </span>
        <h1 className="font-sans font-black text-[#F5F5F0] mb-5"
          style={{ fontSize: 28, letterSpacing: '-0.02em', lineHeight: 1.1 }}>
          How do you train?
        </h1>

        {/* ── Frequência ── */}
        <Label>Days per week</Label>
        <div className="flex flex-wrap mb-5" style={{ gap: 6 }}>
          {FREQ_OPTIONS.map(opt => {
            const active = freq === opt.value
            return (
              <button key={opt.label} type="button" onClick={() => setFreq(opt.value)}
                style={chip(active)}
                className="font-mono font-bold uppercase tracking-[0.08em] text-[11px]">
                {opt.label}
              </button>
            )
          })}
        </div>

        {/* ── Tipos de treino ── */}
        <Label>Training type · multiple choice</Label>
        <div className="flex flex-wrap mb-5" style={{ gap: 6 }}>
          {TRAINING_TYPES.map(t => {
            const active = types.includes(t)
            return (
              <button key={t} type="button" onClick={() => setTypes(toggle(types, t))}
                style={chip(active)}
                className="font-mono font-bold uppercase tracking-[0.08em] text-[11px]">
                {t}
              </button>
            )
          })}
        </div>

        {/* ── Goals ── */}
        <Label>Goal · multiple choice</Label>
        <div className="flex flex-wrap mb-5" style={{ gap: 6 }}>
          {GOALS.map(g => {
            const active = goals.includes(g.key)
            return (
              <button key={g.key} type="button" onClick={() => setGoals(toggle(goals, g.key))}
                style={chip(active)}
                className="font-mono font-bold uppercase tracking-[0.08em] text-[11px]">
                {g.label}
              </button>
            )
          })}
        </div>

        {/* ── Level ── */}
        <Label>Current level</Label>
        <div className="grid grid-cols-2 mb-4" style={{ gap: 0 }}>
          {LEVELS.map((opt, i) => {
            const isActive = level === opt.key
            const isLeft = i % 2 === 0
            const isTop  = i < 2
            return (
              <button key={opt.key} type="button" onClick={() => setLevel(opt.key)}
                className="py-3.5 font-mono font-bold uppercase tracking-[0.08em] text-[12px] transition-colors"
                style={{
                  border: '1px solid #2A2A2A',
                  borderLeft: isLeft ? '1px solid #2A2A2A' : 'none',
                  borderTop:  isTop  ? '1px solid #2A2A2A' : 'none',
                  background: isActive ? '#F5F5F0' : '#141414',
                  color:      isActive ? '#0A0A0A' : '#A8A8A4',
                }}>
                {opt.label}
              </button>
            )
          })}
        </div>
      </div>
      <ContinueBtn onClick={handleContinue} disabled={!canContinue} />
    </div>
  )
}

// ── Step 4: First PR (optional) ─────────────────────────────────────────

function StepFirstPR({ userId, onNext, onSkip }: {
  userId: string
  onNext: () => void
  onSkip: () => void
}) {
  const [search, setSearch]     = useState('')
  const [movement, setMovement] = useState('')
  const [weight, setWeight]     = useState(0)
  const [saving, setSaving]     = useState(false)
  const [showList, setShowList] = useState(false)

  const filtered = search.length >= 1
    ? PRESET_MOVEMENTS.filter(m => m.toLowerCase().includes(search.toLowerCase())).slice(0, 6)
    : []

  function selectMovement(name: string) {
    setMovement(name)
    setSearch(name)
    setShowList(false)
  }

  function adjustWeight(delta: number) {
    setWeight(prev => Math.max(0, Math.round((prev + delta) * 2) / 2))
  }

  const canSave = !!movement && weight > 0

  async function handleSave() {
    if (!canSave) return
    setSaving(true)
    try {
      const { data: existingMov } = await supabase
        .from('movements')
        .select('id')
        .eq('user_id', userId)
        .eq('name', movement)
        .maybeSingle()

      let movementId = existingMov?.id
      if (!movementId) {
        const { data: newMov } = await supabase
          .from('movements')
          .insert({ user_id: userId, name: movement })
          .select('id')
          .single()
        movementId = newMov?.id
      }
      if (!movementId) throw new Error('Failed to create exercise')

      await supabase.from('scores').insert({
        user_id:     userId,
        movement_id: movementId,
        reps:        1,
        weight_kg:   weight,
        recorded_at: new Date().toISOString().split('T')[0],
      })
      onNext()
    } catch (err) {
      console.error(err)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex flex-col flex-1">
      <div className="flex-1 px-5 pt-2 overflow-y-auto">
        <span className="font-mono font-bold uppercase tracking-[0.12em] text-[10px] text-[#6B6B68] block mb-3">
          Seu primeiro PR · opcional
        </span>
        <h1 className="font-sans font-black text-[#F5F5F0] mb-1"
          style={{ fontSize: 28, letterSpacing: '-0.02em', lineHeight: 1.1 }}>
          Add now or later.
        </h1>
        <p className="font-sans text-[#6B6B68] text-[13px] mb-6 leading-relaxed">
          This data helps the app personalize your strength and progress analysis.
        </p>

        {/* Movement search */}
        <span className="font-mono font-bold uppercase tracking-[0.12em] text-[10px] text-[#6B6B68] block mb-2">
          Exercise
        </span>
        <div className="relative mb-6">
          <div className="border border-[#2A2A2A] bg-[#141414]">
            <input
              type="text" value={search}
              onChange={e => { setSearch(e.target.value); setMovement(''); setShowList(true) }}
              onFocus={() => setShowList(true)}
              placeholder="Ex: Back Squat, Bench Press…"
              autoComplete="off" autoCorrect="off" autoCapitalize="off" spellCheck={false}
              className="w-full bg-transparent px-4 py-3.5 text-[#F5F5F0] placeholder-[#3D3D3B] focus:outline-none text-[15px]"
            />
          </div>
          {showList && filtered.length > 0 && (
            <div className="absolute z-10 w-full border border-[#2A2A2A] border-t-0 bg-[#141414]">
              {filtered.map(name => (
                <button key={name} type="button" onMouseDown={() => selectMovement(name)}
                  className="w-full px-4 py-3 text-left font-sans text-[14px] text-[#A8A8A4] border-b border-[#1F1F1F] last:border-0 active:bg-[#1F1F1F]">
                  {name}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Carga */}
        <div className="flex items-center justify-between mb-2">
          <span className="font-mono font-bold uppercase tracking-[0.12em] text-[10px] text-[#6B6B68]">Carga</span>
          <span className="font-mono font-bold uppercase tracking-widest text-[10px] px-2 py-1 border border-[#2A2A2A] text-[#A8A8A4]">KG</span>
        </div>
        <div className="border border-[#2A2A2A] bg-[#141414] flex items-center px-5" style={{ height: 96 }}>
          <input
            type="number" step="0.5" min="0"
            value={weight === 0 ? '' : weight}
            onChange={e => setWeight(parseFloat(e.target.value) || 0)}
            className="flex-1 bg-transparent text-[#F5F5F0] focus:outline-none"
            style={{ fontSize: 52, fontFamily: '"JetBrains Mono",ui-monospace,monospace', fontWeight: 800, fontVariantNumeric: 'tabular-nums', lineHeight: 1 }}
            placeholder="0" inputMode="decimal"
          />
          {weight > 0 && (
            <span className="font-mono font-bold uppercase tracking-[0.12em] text-[11px] px-2 py-1"
              style={{ background: '#D4FF3A', color: '#0A0A0A', flexShrink: 0 }}>
              1RM
            </span>
          )}
        </div>
        <div className="flex" style={{ gap: 0 }}>
          {QUICK_ADJUST.map((d, i) => (
            <button key={d} type="button" onClick={() => adjustWeight(d)}
              className="flex-1 py-3 font-mono font-bold text-[12px] text-[#F5F5F0] active:bg-[#2A2A2A] transition-colors"
              style={{
                border: '1px solid #2A2A2A',
                borderLeft: i === 0 ? '1px solid #2A2A2A' : 'none',
                background: '#141414',
              }}>
              {d > 0 ? `+${d}` : d}
            </button>
          ))}
        </div>
      </div>

      <div className="px-5 pb-10 pt-4 flex gap-0 shrink-0">
        <button onClick={onSkip}
          className="flex-1 py-4 font-mono font-bold uppercase tracking-[0.14em] text-[11px] text-[#6B6B68] border border-[#2A2A2A] active:bg-[#1F1F1F] transition-colors">
          Adicionar depois
        </button>
        <button onClick={handleSave} disabled={!canSave || saving}
          className="flex-[2] py-4 font-mono font-bold uppercase tracking-[0.14em] text-[12px] flex items-center justify-center gap-2 disabled:opacity-40 transition-colors border border-l-0 border-[#D4FF3A]"
          style={{ background: '#D4FF3A', color: '#0A0A0A' }}>
          {saving && <span className="w-3.5 h-3.5 border-2 border-black/20 border-t-black/70 rounded-full animate-spin" />}
          {saving ? 'Salvando…' : 'Salvar PR →'}
        </button>
      </div>
    </div>
  )
}

// ── Step 5: Done ────────────────────────────────────────────────────────

function StepDone({ onFinish }: { onFinish: () => void }) {
  return (
    <div className="flex flex-col flex-1">
      <div className="flex-1 flex flex-col justify-center px-5 pt-2 pb-8">
        {/* Check mark */}
        <div className="mb-8" style={{ width: 48, height: 48, background: '#D4FF3A', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path d="M5 13l4 4L19 7" stroke="#0A0A0A" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>

        <h1 className="font-sans font-black text-[#F5F5F0] mb-3"
          style={{ fontSize: 40, letterSpacing: '-0.02em', lineHeight: 1.05 }}>
          Tudo certo.<br />
          <span style={{ color: '#D4FF3A' }}>Bem-vindo</span><br />
          ao Go Unbroken.
        </h1>
        <p className="font-sans text-[#6B6B68] text-[14px] leading-relaxed">
          Your PRs, your progress, and where you stand in the rankings — all in one place.
        </p>

        <div className="mt-10">
          <Ruler />
          <div className="flex items-center justify-between mt-2">
            <span className="font-mono font-bold uppercase tracking-[0.12em] text-[10px] text-[#3D3D3B]">
              Personal · Record · Log
            </span>
            <span className="font-mono font-bold text-[10px] text-[#3D3D3B]">100</span>
          </div>
        </div>
      </div>
      <ContinueBtn label="LET'S GO →" onClick={onFinish} />
    </div>
  )
}

// ── Main page ──────────────────────────────────────────────────────────

export default function Onboarding() {
  const { user } = useAuth()
  const { profile, saveProfile, completeOnboarding } = useProfile(user?.id)
  const navigate = useNavigate()

  const [step, setStep] = useState<Step>(1)
  const [saving, setSaving] = useState(false)

  // Collected data
  const [profileData, setProfileData] = useState<{
    gender: Gender; weight: number; height: number; date_of_birth: string
  } | null>(null)

  function goBack() { setStep(s => Math.max(1, s - 1) as Step) }

  // Identity from auth metadata — used when the profile row doesn't exist yet
  const metaName     = user?.user_metadata?.name     as string | undefined
  const metaUsername = user?.user_metadata?.username as string | undefined

  // Step 2 (physical data) just stores locally — saving happens after step 3
  function handleProfileNext(data: { gender: Gender; weight: number; height: number; date_of_birth: string }) {
    phCapture('onboarding_step_completed', { step: 2, step_name: 'physical_data' })
    setProfileData(data)
    setStep(3)
  }

  // Step 3 (training profile) — persist everything to DB
  async function handleTrainingNext(training: {
    training_frequency: number | null
    training_types: string[]
    main_goals: string[]
    experience_level: ExperienceLevel | null
  }) {
    if (!profileData) return
    setSaving(true)
    try {
      await saveProfile({
        date_of_birth:      profileData.date_of_birth,
        body_weight_kg:     profileData.weight,
        height_cm:          profileData.height,
        gender:             profileData.gender,
        training_frequency: training.training_frequency,
        training_types:     training.training_types,
        main_goals:         training.main_goals,
        experience_level:   training.experience_level,
        body_fat_pct:       null,
        name:     profile ? undefined : metaName,
        username: profile ? undefined : metaUsername,
      })
      phCapture('onboarding_step_completed', { step: 3, step_name: 'training_profile', experience_level: training.experience_level, training_types: training.training_types, main_goals: training.main_goals })
      setStep(4)
    } finally {
      setSaving(false)
    }
  }

  function handlePRDone() {
    phCapture('onboarding_step_completed', { step: 4, step_name: 'first_pr' })
    setStep(5)
  }
  function handlePRSkip() {
    phCapture('onboarding_skipped', { step: 4, step_name: 'first_pr' })
    setStep(5)
  }

  async function handleFinish() {
    try { await completeOnboarding() } catch { /* non-fatal */ }
    phCapture('onboarding_completed')
    navigate('/athlete', { replace: true })
  }

  // Skip is only allowed on step 4 (PRs)
  function handleSkip() {
    if (step === 4) {
      phCapture('onboarding_skipped', { step: 4, step_name: 'first_pr' })
      setStep(5)
    }
  }

  // Show "Pular" button only on step 4 (PRs)
  const showSkip = step === 4

  return (
    <div className="min-h-screen flex flex-col safe-top safe-bottom" style={{ background: '#0A0A0A' }}>
      {step < TOTAL_STEPS ? (
        <TopBar step={step} onBack={goBack} onSkip={handleSkip} showSkip={showSkip} />
      ) : (
        <div className="pt-5 pb-4">
          <ProgressBar step={TOTAL_STEPS} />
        </div>
      )}

      {step === 1 && <StepWelcome onNext={() => { phCapture('onboarding_step_completed', { step: 1, step_name: 'welcome' }); setStep(2) }} />}
      {step === 2 && <StepProfile onNext={handleProfileNext} />}
      {step === 3 && (
        saving ? (
          <div className="flex-1 flex items-center justify-center">
            <span className="w-6 h-6 border-2 border-[#D4FF3A] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <StepTraining onNext={handleTrainingNext} />
        )
      )}
      {step === 4 && user && (
        <StepFirstPR userId={user.id} onNext={handlePRDone} onSkip={handlePRSkip} />
      )}
      {step === 5 && <StepDone onFinish={handleFinish} />}
    </div>
  )
}

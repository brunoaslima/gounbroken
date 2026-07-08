import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { useProfile, type ExperienceLevel } from '@/hooks/useProfile'
import { supabase } from '@/lib/supabase'
import { PRESET_MOVEMENTS } from '@/lib/presetMovements'
import { phCapture } from '@/lib/posthog'

// ── Types ──────────────────────────────────────────────────────────────

type Step = 1 | 2 | 3 | 4 | 5 | 6
type Gender = 'male' | 'female' | 'other' | 'prefer_not_to_say'

const TOTAL_STEPS = 6

const TRAINING_TYPES = [
  'CrossFit', 'Bodybuilding', 'Functional fitness', 'Running',
  'Hyrox', 'Weightlifting', 'Powerlifting', 'Other',
] as const

const GOALS: { key: string; label: string }[] = [
  { key: 'strength',             label: 'Build strength' },
  { key: 'conditioning',         label: 'Conditioning' },
  { key: 'crossfit_performance', label: 'CrossFit performance' },
  { key: 'fat_loss',             label: 'Lose fat' },
  { key: 'muscle_gain',          label: 'Build muscle' },
  { key: 'technique',            label: 'Improve technique' },
  { key: 'return_to_routine',    label: 'Return to routine' },
  { key: 'competition',          label: 'Compete' },
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

// ── Image compression ──────────────────────────────────────────────────

async function compressAvatar(file: File): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const srcUrl = URL.createObjectURL(file)
    img.onload = () => {
      const MAX = 600
      const scale = Math.min(MAX / img.naturalWidth, MAX / img.naturalHeight, 1)
      const w = Math.round(img.naturalWidth * scale)
      const h = Math.round(img.naturalHeight * scale)
      const canvas = document.createElement('canvas')
      canvas.width = w
      canvas.height = h
      canvas.getContext('2d')!.drawImage(img, 0, 0, w, h)
      URL.revokeObjectURL(srcUrl)
      canvas.toBlob(
        b => (b ? resolve(b) : reject(new Error('compress failed'))),
        'image/webp',
        0.85
      )
    }
    img.onerror = () => { URL.revokeObjectURL(srcUrl); reject(new Error('load failed')) }
    img.src = srcUrl
  })
}

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

function ContinueBtn({ label = 'CONTINUE →', disabled = false, loading = false, onClick }: {
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

// ── Step 2: Profile photo ───────────────────────────────────────────────

function StepPhoto({ userId, onNext }: {
  userId: string
  onNext: (avatarUrl: string | null) => void
}) {
  const [preview, setPreview] = useState<string | null>(null)
  const [file, setFile]       = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    if (!f) return
    setUploadError(null)
    try {
      const blob = await compressAvatar(f)
      setFile(new File([blob], 'avatar.webp', { type: 'image/webp' }))
      setPreview(URL.createObjectURL(blob))
    } catch {
      setUploadError('Could not process image. Try another photo.')
    }
  }

  async function handleContinue() {
    if (!file) { onNext(null); return }
    setUploading(true)
    setUploadError(null)
    try {
      const path = `${userId}/avatar.webp`
      const { error } = await supabase.storage
        .from('avatars')
        .upload(path, file, { upsert: true, contentType: 'image/webp' })
      if (error) throw error
      const { data } = supabase.storage.from('avatars').getPublicUrl(path)
      const url = `${data.publicUrl}?t=${Date.now()}`
      await supabase.from('profiles')
        .update({ avatar_url: url, updated_at: new Date().toISOString() })
        .eq('user_id', userId)
      onNext(url)
    } catch {
      setUploadError('Upload failed. Try again or skip.')
      setUploading(false)
    }
  }

  return (
    <div className="flex flex-col flex-1">
      <div className="flex-1 px-5 pt-2 pb-4 flex flex-col">
        <span className="font-mono font-bold uppercase tracking-[0.12em] text-[10px] text-[#6B6B68] block mb-3">
          Profile photo
        </span>
        <h1 className="font-sans font-black text-[#F5F5F0] mb-2"
          style={{ fontSize: 28, letterSpacing: '-0.02em', lineHeight: 1.1 }}>
          The leaderboard has your name.
        </h1>
        <p className="font-sans font-black mb-8" style={{ fontSize: 28, letterSpacing: '-0.02em', lineHeight: 1.1, color: '#D4FF3A' }}>
          Now give it a face.
        </p>

        {/* Upload zone */}
        <div className="flex justify-center mb-6">
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="relative flex items-center justify-center overflow-hidden"
            style={{
              width: 160,
              height: 160,
              border: uploadError ? '1.5px solid #FF3B30' : '1.5px dashed #2A2A2A',
              background: '#141414',
            }}
          >
            {preview ? (
              <>
                <img src={preview} alt="Preview" className="absolute inset-0 w-full h-full object-cover" />
                {uploading && (
                  <div className="absolute inset-0 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.6)' }}>
                    <span className="w-8 h-8 border-2 border-[#D4FF3A] border-t-transparent rounded-full animate-spin" />
                  </div>
                )}
                {!uploading && (
                  <div className="absolute bottom-0 right-0 px-2 py-1"
                    style={{ background: '#D4FF3A' }}>
                    <span className="font-mono font-bold uppercase tracking-[0.1em] text-[9px] text-[#0A0A0A]">Change</span>
                  </div>
                )}
              </>
            ) : (
              <div className="flex flex-col items-center gap-3">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#3D3D3B" strokeWidth="1.5">
                  <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                  <circle cx="12" cy="13" r="4" />
                </svg>
                <span className="font-mono font-bold uppercase tracking-[0.1em] text-[9px] text-[#3D3D3B]">
                  Tap to upload
                </span>
              </div>
            )}
          </button>
        </div>

        {uploadError && (
          <p className="font-mono text-[10px] text-center mb-4" style={{ color: '#FF3B30' }}>{uploadError}</p>
        )}

        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileChange}
        />
      </div>
      <ContinueBtn onClick={handleContinue} loading={uploading} />
    </div>
  )
}

// ── Step 3: Physical data ───────────────────────────────────────────────

function StepProfile({ onNext, initial, loading = false, error = null }: {
  onNext: (data: { gender: Gender; weight: number; height: number }) => void
  initial?: { gender?: Gender | null; weight?: number | null; height?: number | null }
  loading?: boolean
  error?: string | null
}) {
  const [gender, setGender] = useState<Gender | ''>(initial?.gender ?? '')
  const [weight, setWeight] = useState(initial?.weight && initial.weight > 0 ? String(initial.weight) : '')
  const [height, setHeight] = useState(initial?.height && initial.height > 0 ? String(initial.height) : '')

  const weightNum = parseFloat(weight)
  const heightNum = parseInt(height)

  const weightOk  = !weight || (weightNum >= 30 && weightNum <= 300)
  const heightOk  = !height || (heightNum >= 100 && heightNum <= 250)
  const canContinue =
    !!gender &&
    !!weight && weightNum >= 30 && weightNum <= 300 &&
    !!height && heightNum >= 100 && heightNum <= 250

  function handleContinue() {
    if (!canContinue) return
    onNext({ gender: gender as Gender, weight: weightNum, height: heightNum })
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

        {/* ── Gender ── */}
        <Label>Gender</Label>
        <div className="flex mb-2">
          {([
            { value: 'male'              as Gender, label: 'Male' },
            { value: 'female'            as Gender, label: 'Female' },
            { value: 'prefer_not_to_say' as Gender, label: 'Prefer not to say' },
          ]).map((opt, i) => {
            const isActive = gender === opt.value
            return (
              <button key={opt.value} type="button" onClick={() => setGender(opt.value)}
                className="flex-1 py-3.5 px-1 font-mono font-bold uppercase tracking-[0.06em] text-[10px] transition-colors"
                style={{
                  border: '1px solid #2A2A2A',
                  borderLeft: i === 0 ? '1px solid #2A2A2A' : 'none',
                  background: isActive ? '#F5F5F0' : '#141414',
                  color:      isActive ? '#0A0A0A' : '#A8A8A4',
                }}>
                {opt.label}
              </button>
            )
          })}
        </div>
        {!gender && (
          <p className="font-mono text-[10px] text-[#FF3B30] uppercase tracking-[0.1em] mb-4">Select a gender to continue</p>
        )}
        {gender && <div className="mb-4" />}

        {/* ── Weight ── */}
        <Label>Body weight</Label>
        <div className="border bg-[#141414] flex items-center mb-1"
          style={{ height: 64, borderColor: !weightOk ? '#FF3B30' : '#2A2A2A' }}>
          <input
            type="number" inputMode="decimal" step="0.5" min="30" max="300"
            value={weight} onChange={e => setWeight(e.target.value)}
            className="flex-1 bg-transparent px-5 text-[#F5F5F0] placeholder-[#3D3D3B] focus:outline-none font-mono font-bold text-[20px]"
            placeholder="e.g. 82"
          />
          <span className="font-mono font-bold text-[#3D3D3B] text-[14px] pr-5">KG</span>
        </div>
        {!weightOk && (
          <p className="font-mono text-[10px] text-[#FF3B30] uppercase tracking-[0.1em] mb-4">Must be between 30 and 300 kg</p>
        )}
        {weightOk && <div className="mb-4" />}

        {/* ── Height ── */}
        <Label>Height</Label>
        <div className="border bg-[#141414] flex items-center mb-1"
          style={{ height: 64, borderColor: !heightOk ? '#FF3B30' : '#2A2A2A' }}>
          <input
            type="number" inputMode="numeric" min="100" max="250"
            value={height} onChange={e => setHeight(e.target.value)}
            className="flex-1 bg-transparent px-5 text-[#F5F5F0] placeholder-[#3D3D3B] focus:outline-none font-mono font-bold text-[20px]"
            placeholder="e.g. 178"
          />
          <span className="font-mono font-bold text-[#3D3D3B] text-[14px] pr-5">CM</span>
        </div>
        {!heightOk && (
          <p className="font-mono text-[10px] text-[#FF3B30] uppercase tracking-[0.1em] mb-2">Must be between 100 and 250 cm</p>
        )}

        {error && (
          <p className="font-mono text-[10px] text-[#FF3B30] uppercase tracking-[0.1em] mt-2">{error}</p>
        )}
      </div>
      <ContinueBtn onClick={handleContinue} disabled={!canContinue} loading={loading} />
    </div>
  )
}

// ── Step 4: Training profile ────────────────────────────────────────────

const COMPETE_OPTIONS: { value: string; label: string }[] = [
  { value: 'never',        label: 'Never' },
  { value: 'occasionally', label: 'Occasionally' },
  { value: 'regularly',    label: 'Regularly' },
  { value: 'competitive',  label: "I'm a competitive athlete" },
]

const VALID_LEVELS = new Set<string>(['beginner', 'intermediate', 'advanced', 'athlete'])

function StepTraining({ onNext, initial, loading = false, error = null }: {
  onNext: (data: {
    training_frequency: number | null
    training_types: string[]
    main_goals: string[]
    experience_level: ExperienceLevel | null
    competition_level: string | null
  }) => void
  initial?: {
    training_frequency?: number | null
    training_types?: string[] | null
    main_goals?: string[] | null
    experience_level?: string | null
    competition_level?: string | null
  }
  loading?: boolean
  error?: string | null
}) {
  // Treat DB null as "not yet selected" to avoid bypassing canContinue.
  // Only propagate null if training_types exist (meaning step 4 was previously completed
  // and null means the user explicitly chose "No fixed routine").
  const hadPriorData = (initial?.training_types?.length ?? 0) > 0
  const [freq, setFreq]       = useState<number | null | undefined>(
    hadPriorData ? initial?.training_frequency : undefined
  )
  const [types, setTypes]     = useState<string[]>(initial?.training_types ?? [])
  const [goals, setGoals]     = useState<string[]>(initial?.main_goals ?? [])
  const initLevel = initial?.experience_level && VALID_LEVELS.has(initial.experience_level)
    ? initial.experience_level as ExperienceLevel
    : null
  const [level, setLevel]     = useState<ExperienceLevel | null>(initLevel)
  const [compete, setCompete] = useState<string | null>(initial?.competition_level ?? null)

  function toggle<T>(arr: T[], v: T): T[] {
    return arr.includes(v) ? arr.filter(x => x !== v) : [...arr, v]
  }

  // freq: undefined = never touched; null = explicitly "No fixed routine"; number = days
  const canContinue =
    freq !== undefined &&
    types.length > 0 &&
    goals.length > 0 &&
    !!level &&
    !!compete

  function handleContinue() {
    if (!canContinue) return
    onNext({
      training_frequency: freq ?? null,
      training_types: types,
      main_goals: goals,
      experience_level: level,
      competition_level: compete,
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

        <Label>Current level</Label>
        <div className="grid grid-cols-2 mb-5" style={{ gap: 0 }}>
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

        <Label>Do you compete?</Label>
        <div className="flex flex-col mb-4" style={{ gap: 0 }}>
          {COMPETE_OPTIONS.map((opt, i) => {
            const isActive = compete === opt.value
            return (
              <button key={opt.value} type="button" onClick={() => setCompete(opt.value)}
                className="py-3.5 px-4 text-left font-mono font-bold uppercase tracking-[0.08em] text-[11px] transition-colors"
                style={{
                  border: '1px solid #2A2A2A',
                  borderTop: i === 0 ? '1px solid #2A2A2A' : 'none',
                  background: isActive ? '#D4FF3A' : '#141414',
                  color:      isActive ? '#0A0A0A' : '#A8A8A4',
                }}>
                {opt.label}
              </button>
            )
          })}
        </div>
        {error && (
          <p className="font-mono text-[10px] text-[#FF3B30] uppercase tracking-[0.1em] px-5 pb-2">{error}</p>
        )}
      </div>
      <ContinueBtn onClick={handleContinue} disabled={!canContinue} loading={loading} />
    </div>
  )
}

// ── Step 5: First PR (optional) ─────────────────────────────────────────

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

  const filtered = (search.length >= 1
    ? PRESET_MOVEMENTS.filter(m => m.toLowerCase().includes(search.toLowerCase()))
    : PRESET_MOVEMENTS
  ).slice().sort((a, b) => a.localeCompare(b))

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
      <div className="flex-1 px-5 pt-2">
        <span className="font-mono font-bold uppercase tracking-[0.12em] text-[10px] text-[#6B6B68] block mb-3">
          First PR · optional
        </span>
        <h1 className="font-sans font-black text-[#F5F5F0] mb-1"
          style={{ fontSize: 28, letterSpacing: '-0.02em', lineHeight: 1.1 }}>
          Add now or later.
        </h1>
        <p className="font-sans text-[#6B6B68] text-[13px] mb-6 leading-relaxed">
          This data helps the app personalize your strength and progress analysis.
        </p>

        <span className="font-mono font-bold uppercase tracking-[0.12em] text-[10px] text-[#6B6B68] block mb-2">
          Exercise
        </span>
        <div className="relative mb-6">
          <div className="border border-[#2A2A2A] bg-[#141414]">
            <input
              type="text" value={search}
              onChange={e => { setSearch(e.target.value); setMovement(''); setShowList(true) }}
              onFocus={() => setShowList(true)}
              onBlur={() => setTimeout(() => setShowList(false), 150)}
              placeholder="Ex: Back Squat, Bench Press…"
              autoComplete="off" autoCorrect="off" autoCapitalize="off" spellCheck={false}
              className="w-full bg-transparent px-4 py-3.5 text-[#F5F5F0] placeholder-[#3D3D3B] focus:outline-none text-[15px]"
            />
          </div>
          {showList && filtered.length > 0 && (
            <div className="absolute z-10 w-full border border-[#2A2A2A] border-t-0 bg-[#141414] overflow-y-auto" style={{ maxHeight: 240 }}>
              {filtered.map(name => (
                <button key={name} type="button" onMouseDown={() => selectMovement(name)}
                  className="w-full px-4 py-3 text-left font-sans text-[14px] text-[#A8A8A4] border-b border-[#1F1F1F] last:border-0 active:bg-[#1F1F1F]">
                  {name}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="flex items-center justify-between mb-2">
          <span className="font-mono font-bold uppercase tracking-[0.12em] text-[10px] text-[#6B6B68]">Load</span>
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
          Add later
        </button>
        <button onClick={handleSave} disabled={!canSave || saving}
          className="flex-[2] py-4 font-mono font-bold uppercase tracking-[0.14em] text-[12px] flex items-center justify-center gap-2 disabled:opacity-40 transition-colors border border-l-0 border-[#D4FF3A]"
          style={{ background: '#D4FF3A', color: '#0A0A0A' }}>
          {saving && <span className="w-3.5 h-3.5 border-2 border-black/20 border-t-black/70 rounded-full animate-spin" />}
          {saving ? 'Saving…' : 'Save PR →'}
        </button>
      </div>
    </div>
  )
}

// ── Step 6: Done ────────────────────────────────────────────────────────

function StepDone({ onFinish }: { onFinish: () => void }) {
  return (
    <div className="flex flex-col flex-1">
      <div className="flex-1 flex flex-col justify-center px-5 pt-2 pb-8">
        <div className="mb-8" style={{ width: 48, height: 48, background: '#D4FF3A', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path d="M5 13l4 4L19 7" stroke="#0A0A0A" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>

        <h1 className="font-sans font-black text-[#F5F5F0] mb-3"
          style={{ fontSize: 40, letterSpacing: '-0.02em', lineHeight: 1.05 }}>
          All set.<br />
          <span style={{ color: '#D4FF3A' }}>Welcome</span><br />
          to Go Unbroken.
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
  const { profile, loading, saveProfile, completeOnboarding, updateOnboardingStep } = useProfile(user?.id)
  const navigate = useNavigate()

  const [step, setStep]             = useState<Step | null>(null)
  const [initialized, setInitialized] = useState(false)
  const [saving, setSaving]         = useState(false)
  const [stepError, setStepError]   = useState<string | null>(null)


  // Resume from where the user left off
  useEffect(() => {
    if (loading || initialized) return
    const savedStep = profile?.onboarding_step ?? 0
    const resumeStep = Math.max(1, Math.min(savedStep + 1, TOTAL_STEPS)) as Step
    setStep(resumeStep)
    setInitialized(true)
  }, [loading, initialized, profile])

  function goBack() { setStepError(null); setStep(s => s ? Math.max(1, s - 1) as Step : 1) }

  const metaName     = user?.user_metadata?.name     as string | undefined
  const metaUsername = user?.user_metadata?.username as string | undefined

  async function handleWelcomeNext() {
    // If sign-up INSERT failed, profile row doesn't exist yet.
    // Create a minimal stub so updateOnboardingStep (UPDATE) actually lands.
    if (!profile) {
      await saveProfile({
        name:     metaName,
        username: metaUsername,
      }).catch(() => {})
    }
    await updateOnboardingStep(1)
    phCapture('onboarding_step_completed', { step: 1, step_name: 'welcome' })
    setStep(2)
  }

  async function handlePhotoNext(avatarUrl: string | null) {
    phCapture('onboarding_step_completed', { step: 2, step_name: 'photo', skipped: !avatarUrl })
    await updateOnboardingStep(2)
    setStep(3)
  }

  async function handleProfileNext(data: { gender: Gender; weight: number; height: number }) {
    setSaving(true)
    setStepError(null)
    try {
      await saveProfile({
        body_weight_kg: data.weight,
        height_cm:      data.height,
        gender:         data.gender,
        name:     profile ? undefined : metaName,
        username: profile ? undefined : metaUsername,
      })
      await updateOnboardingStep(3)
      phCapture('onboarding_step_completed', { step: 3, step_name: 'physical_data' })
      setStep(4)
    } catch {
      setStepError('Failed to save. Check your connection and try again.')
    } finally {
      setSaving(false)
    }
  }

  async function handleTrainingNext(training: {
    training_frequency: number | null
    training_types: string[]
    main_goals: string[]
    experience_level: ExperienceLevel | null
    competition_level: string | null
  }) {
    setSaving(true)
    setStepError(null)
    try {
      await saveProfile({
        training_frequency: training.training_frequency,
        training_types:     training.training_types,
        main_goals:         training.main_goals,
        experience_level:   training.experience_level,
        competition_level:  training.competition_level,
        body_fat_pct:       null,
      })
      await updateOnboardingStep(4)
      phCapture('onboarding_step_completed', {
        step: 4, step_name: 'training_profile',
        experience_level: training.experience_level,
        training_types: training.training_types,
        main_goals: training.main_goals,
      })
      setStep(5)
    } catch {
      setStepError('Failed to save. Check your connection and try again.')
    } finally {
      setSaving(false)
    }
  }

  async function handlePRDone() {
    phCapture('onboarding_step_completed', { step: 5, step_name: 'first_pr' })
    await updateOnboardingStep(5)
    setStep(6)
  }

  async function handlePRSkip() {
    phCapture('onboarding_skipped', { step: 5, step_name: 'first_pr' })
    await updateOnboardingStep(5)
    setStep(6)
  }

  async function handleFinish() {
    setSaving(true)
    try {
      await completeOnboarding()
      phCapture('onboarding_completed')
      navigate('/athlete', { replace: true })
    } catch {
      setStepError('Something went wrong. Please try again.')
      setSaving(false)
    }
  }

  async function handleSkip() {
    if (step === 2) await handlePhotoNext(null)
    if (step === 5) await handlePRSkip()
  }

  const showSkip = step === 2 || step === 5

  // Loading state while determining resume step
  if (!step) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#0A0A0A' }}>
        <span className="w-6 h-6 border-2 border-[#D4FF3A] border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col safe-top safe-bottom" style={{ background: '#0A0A0A' }}>
      {step < TOTAL_STEPS ? (
        <TopBar step={step} onBack={goBack} onSkip={handleSkip} showSkip={showSkip} />
      ) : (
        <div className="pt-5 pb-4">
          <ProgressBar step={TOTAL_STEPS} />
        </div>
      )}

      {step === 1 && <StepWelcome onNext={handleWelcomeNext} />}
      {step === 2 && user && <StepPhoto userId={user.id} onNext={handlePhotoNext} />}
      {step === 3 && (
        <StepProfile
          onNext={handleProfileNext}
          loading={saving}
          error={stepError}
          initial={{
            gender:  profile?.gender as Gender | null,
            weight:  profile?.body_weight_kg,
            height:  profile?.height_cm,
          }}
        />
      )}
      {step === 4 && (
        <StepTraining
          onNext={handleTrainingNext}
          loading={saving}
          error={stepError}
          initial={{
            training_frequency: profile?.training_frequency,
            training_types:     profile?.training_types,
            main_goals:         profile?.main_goals,
            experience_level:   profile?.experience_level,
            competition_level:  profile?.competition_level,
          }}
        />
      )}
      {step === 5 && user && (
        <StepFirstPR userId={user.id} onNext={handlePRDone} onSkip={handlePRSkip} />
      )}
      {step === 6 && <StepDone onFinish={handleFinish} />}
    </div>
  )
}

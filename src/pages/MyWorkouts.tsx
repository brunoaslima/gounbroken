import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { useProfile } from '@/hooks/useProfile'
import type { PrescribedWorkoutData, WorkoutFeedback } from '@/types'
import WorkoutCard from '@/components/WorkoutCard'
import WorkoutImportSheet from '@/components/WorkoutImportSheet'

// ── Helpers ───────────────────────────────────────────────────────────

const PT_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

function toLocalDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function getWeekBounds(): { start: string; end: string } {
  const today = new Date()
  const dow = today.getDay()
  const monday = new Date(today)
  monday.setDate(today.getDate() - (dow === 0 ? 6 : dow - 1))
  const sunday = new Date(monday)
  sunday.setDate(monday.getDate() + 6)
  return { start: toLocalDateStr(monday), end: toLocalDateStr(sunday) }
}

function getCurrentWeekBounds(): { start: Date; end: Date } {
  const today = new Date()
  const dow = today.getDay()
  const monday = new Date(today)
  monday.setDate(today.getDate() - (dow === 0 ? 6 : dow - 1))
  monday.setHours(0, 0, 0, 0)
  const sunday = new Date(monday)
  sunday.setDate(monday.getDate() + 6)
  sunday.setHours(23, 59, 59, 999)
  return { start: monday, end: sunday }
}

function getAvailableDays(): { str: string; label: string; num: number }[] {
  const today = new Date()
  const dow = today.getDay()
  const result: { str: string; label: string; num: number }[] = []
  // Sunday: show next Mon–Sat. Otherwise: today through Saturday.
  const start = dow === 0 ? 1 : 0
  const end   = dow === 0 ? 6 : 6 - dow
  for (let i = start; i <= end; i++) {
    const d = new Date(today)
    d.setDate(today.getDate() + i)
    result.push({ str: toLocalDateStr(d), label: PT_SHORT[d.getDay()], num: d.getDate() })
  }
  return result
}

// ── Generate sheet ────────────────────────────────────────────────────

const DURATIONS = [
  { value: 60,  label: '1h' },
  { value: 90,  label: '1h30' },
  { value: 120, label: '2h' },
  { value: 180, label: '3h' },
]

const INTENSITIES = [
  { value: 'leve',     label: 'Light' },
  { value: 'moderada', label: 'Moderate' },
  { value: 'alta',     label: 'High' },
  { value: 'maxima',   label: 'Max' },
]

const FOCUS_OPTIONS = [
  { value: 'forca',      label: 'Strength' },
  { value: 'crossfit',   label: 'WOD / CrossFit' },
  { value: 'superior',   label: 'Upper body' },
  { value: 'inferior',   label: 'Lower body' },
  { value: 'full_body',  label: 'Full Body' },
  { value: 'core',       label: 'Core' },
  { value: 'cardio',     label: 'Cardio' },
  { value: 'mobilidade', label: 'Mobility' },
]

interface GenerateSheetProps {
  onClose: () => void
  onDone: () => void
}

function GenerateSheet({ onClose, onDone }: GenerateSheetProps) {
  const availableDays = getAvailableDays()
  const [selectedDays, setSelectedDays] = useState<string[]>([])
  const [duration, setDuration] = useState(60)
  const [intensity, setIntensity] = useState('moderada')
  const [focus, setFocus] = useState<string[]>([])
  const [generating, setGenerating] = useState(false)

  function toggleDay(str: string) {
    setSelectedDays(prev => prev.includes(str) ? prev.filter(d => d !== str) : [...prev, str])
  }
  function toggleFocus(v: string) {
    setFocus(prev => prev.includes(v) ? prev.filter(f => f !== v) : [...prev, v])
  }

  async function handleGenerate() {
    if (!selectedDays.length) {
      return
    }
    setGenerating(true)
    try {
      const { data, error } = await supabase.functions.invoke('generate-workout', {
        body: { days: selectedDays, duration_minutes: duration, focus, intensity },
      })
      if (error) throw error
      onDone()
    } catch (err) {
      console.error(err)
    } finally {
      setGenerating(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end" onClick={onClose}>
      <div className="absolute inset-0 bg-black/70" />
      <div
        className="relative w-full bg-graphite border-t border-[#2A2A2A] flex flex-col"
        style={{ maxHeight: '92vh' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Loading overlay */}
        {generating && (
          <div className="absolute inset-0 z-10 bg-graphite/95 flex flex-col items-center justify-center gap-4">
            <div className="w-10 h-10 border-2 border-lime border-t-transparent rounded-full animate-spin" />
            <p className="font-mono font-bold uppercase tracking-[0.12em] text-[11px] text-[#A8A8A4]">Creating plan...</p>
          </div>
        )}

        {/* Sheet header */}
        <div className="flex items-center justify-between px-5 border-b border-[#2A2A2A]" style={{ height: 52 }}>
          <button onClick={onClose} className="font-mono font-bold uppercase tracking-[0.12em] text-[11px] text-[#A8A8A4] active:text-soft-white">
            Cancel
          </button>
          <span className="font-mono font-bold uppercase tracking-[0.18em] text-[11px] text-[#A8A8A4]">Week plan</span>
          <div style={{ width: 60 }} />
        </div>

        <div className="flex-1 overflow-y-auto">

          {/* Days */}
          <div className="px-5 pt-5 pb-4 border-b border-[#2A2A2A]">
            <span className="font-mono font-bold uppercase tracking-[0.12em] text-[10px] text-[#6B6B68] block mb-3">
              Training days
            </span>
            <div className="grid grid-cols-7" style={{ gap: 0 }}>
              {availableDays.map((d, i) => {
                const sel = selectedDays.includes(d.str)
                return (
                  <button key={d.str} onClick={() => toggleDay(d.str)}
                    className="flex flex-col items-center py-3 transition-colors"
                    style={{
                      border: '1px solid #2A2A2A',
                      borderLeft: i === 0 ? '1px solid #2A2A2A' : 'none',
                      background: sel ? '#D4FF3A' : '#141414',
                    }}>
                    <span className="font-mono font-bold uppercase text-[9px]" style={{ color: sel ? '#0A0A0A' : '#6B6B68' }}>{d.label}</span>
                    <span className="font-mono font-black text-[15px] mt-0.5" style={{ color: sel ? '#0A0A0A' : '#F5F5F0' }}>{d.num}</span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Duration */}
          <div className="px-5 pt-4 pb-4 border-b border-[#2A2A2A]">
            <span className="font-mono font-bold uppercase tracking-[0.12em] text-[10px] text-[#6B6B68] block mb-3">Duration per session</span>
            <div className="flex" style={{ gap: 0 }}>
              {DURATIONS.map((d, i) => (
                <button key={d.value} onClick={() => setDuration(d.value)}
                  className="flex-1 py-3 font-mono font-bold text-[12px] uppercase tracking-widest transition-colors"
                  style={{
                    border: '1px solid #2A2A2A',
                    borderLeft: i === 0 ? '1px solid #2A2A2A' : 'none',
                    background: duration === d.value ? '#D4FF3A' : '#141414',
                    color: duration === d.value ? '#0A0A0A' : '#A8A8A4',
                  }}>
                  {d.label}
                </button>
              ))}
            </div>
          </div>

          {/* Intensity */}
          <div className="px-5 pt-4 pb-4 border-b border-[#2A2A2A]">
            <span className="font-mono font-bold uppercase tracking-[0.12em] text-[10px] text-[#6B6B68] block mb-3">Intensity</span>
            <div className="flex" style={{ gap: 0 }}>
              {INTENSITIES.map((item, i) => (
                <button key={item.value} onClick={() => setIntensity(item.value)}
                  className="flex-1 py-3 font-mono font-bold text-[11px] uppercase tracking-widest transition-colors"
                  style={{
                    border: '1px solid #2A2A2A',
                    borderLeft: i === 0 ? '1px solid #2A2A2A' : 'none',
                    background: intensity === item.value ? '#D4FF3A' : '#141414',
                    color: intensity === item.value ? '#0A0A0A' : '#A8A8A4',
                  }}>
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          {/* Focus */}
          <div className="px-5 pt-4 pb-5">
            <span className="font-mono font-bold uppercase tracking-[0.12em] text-[10px] text-[#6B6B68] block mb-1">Focus</span>
            <span className="font-mono text-[10px] text-[#3D3D3B] block mb-3">Optional — plan balanced by your PRs if not selected</span>
            <div className="flex flex-wrap" style={{ gap: 0 }}>
              {FOCUS_OPTIONS.map((f, i) => (
                <button key={f.value} onClick={() => toggleFocus(f.value)}
                  className="font-mono font-bold uppercase tracking-[0.1em] text-[10px] py-2.5 px-3 transition-colors"
                  style={{
                    border: '1px solid #2A2A2A',
                    marginLeft: i === 0 ? 0 : -1,
                    marginTop: i >= 4 ? -1 : 0,
                    background: focus.includes(f.value) ? '#D4FF3A' : '#141414',
                    color: focus.includes(f.value) ? '#0A0A0A' : '#A8A8A4',
                  }}>
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {/* Generate button */}
          <div className="px-5 pb-8">
            <button
              onClick={handleGenerate}
              disabled={generating || !selectedDays.length}
              className="w-full bg-lime text-graphite font-mono font-bold uppercase tracking-[0.18em] text-[12px] py-4 disabled:opacity-30 active:bg-lime-lo transition-colors"
            >
              Create week plan
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Section group ─────────────────────────────────────────────────────

function Section({
  title,
  workouts,
  userId,
  onFeedbackChange,
}: {
  title: string
  workouts: PrescribedWorkoutData[]
  userId?: string
  onFeedbackChange?: (workoutId: string, feedback: import('@/types').WorkoutFeedback) => void
}) {
  if (!workouts.length) return null
  return (
    <div>
      <span className="font-mono font-bold uppercase tracking-[0.12em] text-[10px] text-[#A8A8A4] block mb-3">{title}</span>
      <div className="space-y-2">
        {workouts.map(w => (
          <WorkoutCard
            key={w.id}
            workout={w}
            defaultExpanded={workouts.length === 1}
            userId={userId}
            onFeedbackChange={onFeedbackChange}
          />
        ))}
      </div>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────

type SourceFilter = 'all' | 'personal' | 'ai'

export default function MyWorkouts() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { profile } = useProfile(user?.id)
  const [workouts, setWorkouts] = useState<PrescribedWorkoutData[]>([])
  const [loading, setLoading] = useState(true)
  const [generateOpen, setGenerateOpen] = useState(false)
  const [importOpen, setImportOpen] = useState(false)
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>('all')

  const hasAIRole = profile?.roles?.includes('ai') ?? false

  function handleFeedbackChange(workoutId: string, feedback: WorkoutFeedback) {
    setWorkouts(prev => prev.map(w =>
      w.id === workoutId ? { ...w, feedback } : w
    ))
  }

  async function loadWorkouts() {
    const { data, error } = await supabase.rpc('get_my_prescribed_workouts')
    if (error) console.error('get_my_prescribed_workouts error:', error)
    setWorkouts(data ?? [])
    setLoading(false)
  }

  useEffect(() => {
    if (!user) return
    loadWorkouts()
  }, [user])

  const today = toLocalDateStr(new Date())
  const { start: weekStart, end: weekEnd } = getWeekBounds()

  const { start: weekStart2, end: weekEnd2 } = getCurrentWeekBounds()
  const generatedThisWeek = workouts.some(w =>
    w.source === 'ai' && new Date(w.created_at) >= weekStart2 && new Date(w.created_at) <= weekEnd2
  )

  const hasAI = workouts.some(w => w.source === 'ai')
  const hasPersonal = workouts.some(w => w.source === 'personal')

  const filtered = sourceFilter === 'all' ? workouts
    : workouts.filter(w => w.source === sourceFilter)

  const thisWeek = filtered.filter(w => w.workout_date >= weekStart && w.workout_date <= weekEnd)
    .sort((a, b) => a.workout_date.localeCompare(b.workout_date))
  const upcoming = filtered.filter(w => w.workout_date > weekEnd)
    .sort((a, b) => a.workout_date.localeCompare(b.workout_date))
  const past = filtered.filter(w => w.workout_date < weekStart)
    .sort((a, b) => b.workout_date.localeCompare(a.workout_date))

  return (
    <div className="min-h-screen bg-graphite pb-28 md:pb-8 safe-top">
      {generateOpen && (
        <GenerateSheet
          onClose={() => setGenerateOpen(false)}
          onDone={() => { setGenerateOpen(false); setLoading(true); loadWorkouts() }}
        />
      )}
      {user && (
        <WorkoutImportSheet
          open={importOpen}
          onClose={() => setImportOpen(false)}
          onDone={() => { setImportOpen(false); setLoading(true); loadWorkouts() }}
          userId={user.id}
          hasAIRole={hasAIRole}
          generatedThisWeek={generatedThisWeek}
          onOpenGenerate={() => setGenerateOpen(true)}
        />
      )}

      {/* TopBar */}
      <header className="sticky top-0 z-10 bg-graphite border-b border-[#2A2A2A]" style={{ height: 52 }}>
        <div className="flex items-center justify-between px-5 h-full md:max-w-5xl md:mx-auto">
          <span className="font-mono font-bold uppercase tracking-[0.18em] text-[11px] text-[#A8A8A4]">
            Workouts
          </span>
          <div className="flex items-center gap-3">
          {hasAIRole && (
          <button
            onClick={() => navigate('/athlete/report')}
            className="flex items-center gap-1.5 active:opacity-60 transition-opacity font-mono font-bold uppercase tracking-[0.14em] text-[11px]"
            style={{ color: '#A8A8A4' }}
            title="View monthly report"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="3" width="18" height="18" rx="0"/><path d="M7 8h10M7 12h7M7 16h4"/>
            </svg>
            <span className="hidden md:inline">Report</span>
          </button>
          )}
          <button
            onClick={() => setImportOpen(true)}
            className="flex items-center gap-2 active:opacity-60 transition-opacity font-mono font-bold uppercase tracking-[0.14em] text-[11px]"
            style={{ color: '#D4FF3A' }}
            title="Adicionar treino"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#D4FF3A" strokeWidth="2">
              <path d="M12 5v14M5 12h14" />
            </svg>
            <span className="hidden md:inline">New workout</span>
          </button>
          </div>
        </div>
      </header>

      {/* Source filter tabs */}
      {(hasAI || hasPersonal) && workouts.length > 0 && (
        <div className="flex border-b border-[#2A2A2A]">
          {([
            { value: 'all',      label: 'All' },
            { value: 'personal', label: 'Personal' },
            { value: 'ai',       label: 'Suggested' },
          ] as { value: SourceFilter; label: string }[]).map((tab, i) => (
            <button
              key={tab.value}
              onClick={() => setSourceFilter(tab.value)}
              className="flex-1 py-3 font-mono font-bold uppercase tracking-[0.1em] text-[11px] transition-colors"
              style={{
                borderRight: i < 2 ? '1px solid #2A2A2A' : 'none',
                background: sourceFilter === tab.value ? '#F5F5F0' : 'transparent',
                color: sourceFilter === tab.value ? '#0A0A0A' : '#6B6B68',
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>
      )}

      <div className="px-5 pt-5 space-y-5 md:px-8 md:max-w-5xl md:mx-auto">
        {loading ? (
          <div className="flex justify-center py-16">
            <div className="w-6 h-6 border-2 border-lime border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 && workouts.length === 0 ? (
          <div className="text-center py-16 space-y-4">
            <p className="font-sans font-bold text-[17px] text-soft-white">No workouts yet</p>
            <p className="font-mono text-[11px] uppercase tracking-widest text-[#6B6B68]">
              Wait for your trainer or create a week plan
            </p>
            {hasAIRole && !generatedThisWeek && (
              <button
                onClick={() => setGenerateOpen(true)}
                className="mt-2 bg-lime text-graphite font-mono font-bold uppercase tracking-[0.18em] text-[12px] px-6 py-3"
              >
                Create week plan
              </button>
            )}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16">
            <p className="font-mono text-[11px] uppercase tracking-widest text-[#6B6B68]">
              {sourceFilter === 'ai' ? 'No plan created yet' : 'No personal trainer workouts'}
            </p>
            {sourceFilter === 'ai' && hasAIRole && !generatedThisWeek && (
              <button
                onClick={() => setGenerateOpen(true)}
                className="mt-4 bg-lime text-graphite font-mono font-bold uppercase tracking-[0.18em] text-[12px] px-6 py-3"
              >
                Create week plan
              </button>
            )}
          </div>
        ) : (
          <>
            <Section title={`This week · ${thisWeek.length}`} workouts={thisWeek} userId={user?.id} onFeedbackChange={handleFeedbackChange} />
            <Section title={`Upcoming · ${upcoming.length}`} workouts={upcoming} />
            <Section title={`Previous · ${past.length}`} workouts={past} userId={user?.id} onFeedbackChange={handleFeedbackChange} />
          </>
        )}
      </div>
    </div>
  )
}

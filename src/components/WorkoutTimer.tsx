import { useEffect, useRef, useState } from 'react'
import type { WorkoutSectionData } from '@/types'

interface TimerStore {
  startedAt: number
  accumulated: number
  running: boolean
}

function getSectionCapSeconds(section: WorkoutSectionData): number | null {
  const fc = section.format_config ?? {}
  if (fc.time_cap_minutes != null) return Math.round((fc.time_cap_minutes as number) * 60)
  if (fc.time_minutes != null)     return Math.round((fc.time_minutes as number) * 60)
  return null
}

function fmt(s: number): string {
  const clamped = Math.max(0, Math.floor(s))
  const m = Math.floor(clamped / 60)
  const sec = clamped % 60
  return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
}

interface WorkoutTimerProps {
  workoutDate: string
  section: WorkoutSectionData
  savedDuration: number | null
  onSave: (duration: number) => void
  onClose: () => void
}

export function WorkoutTimer({ workoutDate, section, savedDuration, onSave, onClose }: WorkoutTimerProps) {
  const capSeconds = getSectionCapSeconds(section)
  const storageKey = `timer_${workoutDate}_${section.position}`

  const [accumulated, setAccumulated] = useState(0)
  const [startedAt, setStartedAt]     = useState<number | null>(null)
  const [display, setDisplay]         = useState(0)
  const [stopped, setStopped]         = useState(false)
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const running = startedAt !== null

  // Restore from localStorage on mount
  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey)
      if (!raw) return
      const store: TimerStore = JSON.parse(raw)
      if (store.running) {
        const extra = (Date.now() - store.startedAt) / 1000
        setAccumulated(store.accumulated + extra)
        setStartedAt(Date.now())
      } else {
        setAccumulated(store.accumulated)
      }
    } catch { /* stale or corrupt — start fresh */ }
  }, [storageKey])

  // Tick
  useEffect(() => {
    if (!running) { if (tickRef.current) clearInterval(tickRef.current); return }
    tickRef.current = setInterval(() => {
      const elapsed = accumulated + (Date.now() - startedAt!) / 1000
      setDisplay(capSeconds != null ? Math.max(0, capSeconds - elapsed) : elapsed)
    }, 250)
    return () => { if (tickRef.current) clearInterval(tickRef.current) }
  }, [running, startedAt, accumulated, capSeconds])

  // Sync display when paused
  useEffect(() => {
    if (!running) {
      setDisplay(capSeconds != null ? Math.max(0, capSeconds - accumulated) : accumulated)
    }
  }, [running, accumulated, capSeconds])

  function persist(accum: number, isRunning: boolean, startAt: number | null) {
    const store: TimerStore = { startedAt: startAt ?? Date.now(), accumulated: accum, running: isRunning }
    localStorage.setItem(storageKey, JSON.stringify(store))
  }

  function handleStart() {
    const now = Date.now()
    setStartedAt(now)
    setStopped(false)
    persist(accumulated, true, now)
  }

  function handlePause() {
    const extra = startedAt ? (Date.now() - startedAt) / 1000 : 0
    const newAccum = accumulated + extra
    setAccumulated(newAccum)
    setStartedAt(null)
    persist(newAccum, false, null)
  }

  function handleStop() {
    if (startedAt) {
      const extra = (Date.now() - startedAt) / 1000
      setAccumulated(prev => prev + extra)
      setStartedAt(null)
    }
    setStopped(true)
    localStorage.removeItem(storageKey)
  }

  function handleSave() {
    const duration = Math.round(accumulated)
    onSave(duration)
    localStorage.removeItem(storageKey)
  }

  function handleReset() {
    setAccumulated(0)
    setStartedAt(null)
    setStopped(false)
    localStorage.removeItem(storageKey)
  }

  const elapsed = running ? accumulated + (Date.now() - startedAt!) / 1000 : accumulated
  const isCapped = capSeconds != null && elapsed >= capSeconds

  const displaySeconds = stopped
    ? Math.round(accumulated)
    : Math.round(display)

  const isActive = running && !isCapped

  return (
    <div
      className="fixed inset-0 flex flex-col"
      style={{ background: '#0A0A0A', zIndex: 60 }}
    >
      {/* Top bar */}
      <div className="flex items-center justify-between px-5 pt-6 pb-4 shrink-0">
        <button
          onClick={onClose}
          className="font-mono font-bold uppercase tracking-[0.14em] text-[10px] text-[#6B6B68] active:text-[#F5F5F0]"
        >
          ← Back
        </button>
        <span className="font-mono font-bold uppercase tracking-[0.14em] text-[10px] text-[#6B6B68]">
          {section.section_type.replace(/_/g, ' ')}
        </span>
        <div className="w-10" />
      </div>

      {/* Main display */}
      <div className="flex-1 flex flex-col items-center justify-center px-5">
        {capSeconds != null && (
          <p className="font-mono font-bold uppercase tracking-[0.18em] text-[10px] text-[#3D3D3B] mb-6">
            Cap {fmt(capSeconds)}
          </p>
        )}

        <div
          className="font-mono font-black tabular-nums transition-colors"
          style={{
            fontSize: 'clamp(64px, 18vw, 96px)',
            letterSpacing: '-0.02em',
            lineHeight: 1,
            color: isCapped ? '#FF3B30' : isActive ? '#D4FF3A' : '#F5F5F0',
          }}
        >
          {fmt(displaySeconds)}
        </div>

        {capSeconds != null && !stopped && (
          <p className="font-mono font-bold uppercase tracking-[0.14em] text-[10px] text-[#3D3D3B] mt-4">
            {isCapped ? 'Time cap reached' : capSeconds != null ? `Elapsed ${fmt(Math.round(elapsed))}` : ''}
          </p>
        )}

        {savedDuration != null && !running && accumulated === 0 && (
          <p className="font-mono text-[11px] text-[#3D3D3B] mt-6">
            Last saved: {fmt(savedDuration)}
          </p>
        )}
      </div>

      {/* Controls */}
      <div className="px-5 pb-10 shrink-0 space-y-3">
        {stopped ? (
          <>
            <button
              onClick={handleSave}
              className="w-full py-4 font-mono font-bold uppercase tracking-[0.18em] text-[12px]"
              style={{ background: '#D4FF3A', color: '#0A0A0A' }}
            >
              Save — {fmt(Math.round(accumulated))}
            </button>
            <div className="flex gap-3">
              <button
                onClick={handleReset}
                className="flex-1 py-3.5 font-mono font-bold uppercase tracking-[0.14em] text-[11px] border border-[#2A2A2A] text-[#6B6B68]"
              >
                Reset
              </button>
              <button
                onClick={handleStart}
                className="flex-1 py-3.5 font-mono font-bold uppercase tracking-[0.14em] text-[11px] border border-[#2A2A2A] text-[#F5F5F0]"
              >
                Resume
              </button>
            </div>
          </>
        ) : running ? (
          <div className="flex gap-3">
            <button
              onClick={handlePause}
              className="flex-1 py-4 font-mono font-bold uppercase tracking-[0.14em] text-[11px] border border-[#2A2A2A] text-[#F5F5F0]"
            >
              Pause
            </button>
            <button
              onClick={handleStop}
              className="flex-1 py-4 font-mono font-bold uppercase tracking-[0.14em] text-[11px]"
              style={{ background: '#F5F5F0', color: '#0A0A0A' }}
            >
              Finish
            </button>
          </div>
        ) : (
          <button
            onClick={handleStart}
            className="w-full py-4 font-mono font-bold uppercase tracking-[0.18em] text-[12px]"
            style={{ background: '#D4FF3A', color: '#0A0A0A' }}
          >
            {accumulated > 0 ? 'Resume' : 'Start'}
          </button>
        )}
      </div>
    </div>
  )
}

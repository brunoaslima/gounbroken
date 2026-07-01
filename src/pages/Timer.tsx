import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTimer } from '@/hooks/useTimer'
import { TimerTypePicker } from '@/components/timer/TimerTypePicker'
import { TimerConfig } from '@/components/timer/TimerConfig'
import { TimerDisplay } from '@/components/timer/TimerDisplay'
import type { TimerConfig as TimerConfigType } from '@/lib/timerTypes'
import { DEFAULT_CONFIG } from '@/lib/timerTypes'

export default function Timer() {
  const navigate = useNavigate()
  const [draftConfig, setDraftConfig] = useState<TimerConfigType>(DEFAULT_CONFIG)
  const timer = useTimer()

  const showDisplay = timer.status !== 'idle'

  return (
    <div className="min-h-screen bg-[#0A0A0A]" style={{ maxWidth: 480, margin: '0 auto' }}>

      {/* Config screen */}
      <header
        className="flex items-center justify-between px-4 border-b border-[#2A2A2A] flex-shrink-0"
        style={{ height: 52 }}
      >
        <button
          onClick={() => navigate(-1)}
          className="flex items-center justify-center text-[#F5F5F0] active:opacity-60"
          style={{ width: 36, height: 36 }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M19 12H5M5 12l7-7M5 12l7 7" />
          </svg>
        </button>
        <span className="font-mono font-bold uppercase tracking-[0.22em] text-[11px] text-[#A8A8A4]">
          TIMER
        </span>
        <span style={{ width: 36 }} />
      </header>

      <div className="px-5 pt-6 pb-32 flex flex-col gap-6">
        {/* Type picker */}
        <div className="flex flex-col gap-2">
          <span className="font-mono font-bold uppercase tracking-[0.14em] text-[10px] text-[#6B6B68]">
            Timer Type
          </span>
          <TimerTypePicker
            value={draftConfig.mode}
            onChange={mode => setDraftConfig(c => ({ ...c, mode }))}
          />
        </div>

        {/* Config inputs */}
        <TimerConfig
          config={draftConfig}
          onChange={setDraftConfig}
        />

        {/* CTA */}
        <button
          type="button"
          onClick={() => timer.start(draftConfig)}
          className="w-full font-mono font-black uppercase text-[13px] text-[#0A0A0A] bg-[#D4FF3A] py-4 flex items-center justify-center"
          style={{ letterSpacing: '0.16em' }}
        >
          START →
        </button>
      </div>

      {/* Fullscreen timer overlay */}
      {showDisplay && (
        <TimerDisplay
          status={timer.status}
          config={timer.config}
          displayFormatted={timer.displayFormatted}
          displaySeconds={timer.displaySeconds}
          currentRound={timer.currentRound}
          totalRounds={timer.totalRounds}
          phase={timer.phase}
          countdownValue={timer.countdownValue}
          finalDisplay={timer.finalDisplay}
          cappedOut={timer.cappedOut}
          onPause={timer.pause}
          onResume={timer.resume}
          onReset={timer.reset}
          onFinishEarly={timer.finishEarly}
          onSkipPhase={timer.skipPhase}
          onAddMinute={timer.addMinute}
        />
      )}
    </div>
  )
}

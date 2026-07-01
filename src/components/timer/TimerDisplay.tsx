import type { TimerStatus, TimerPhase, TimerConfig, TimerMode } from '@/lib/timerTypes'
import { MODE_LABELS } from '@/lib/timerTypes'
import { fmtTime } from '@/hooks/useTimer'

interface Props {
  status: TimerStatus
  config: TimerConfig
  displayFormatted: string
  displaySeconds: number
  currentRound: number
  totalRounds: number
  phase: TimerPhase
  countdownValue: number
  finalDisplay: string
  cappedOut: boolean
  amrapRounds: number
  onPause: () => void
  onResume: () => void
  onReset: () => void
  onFinishEarly: () => void
  onSkipPhase: () => void
  onAddMinute: () => void
  onAddAmrapRound: () => void
}

function getBg(status: TimerStatus, config: TimerConfig, displaySeconds: number, phase: TimerPhase) {
  if (status === 'done') return '#0A0A0A'
  if (status === 'countdown') return '#0A0A0A'
  if (status === 'paused') return '#0A0A0A'
  if (config.mode === 'tabata' || config.mode === 'interval') {
    return phase === 'work' ? '#110A00' : '#00080F'
  }
  if ((config.mode === 'for_time' || config.mode === 'amrap') && displaySeconds <= 10 && displaySeconds > 0) {
    return '#1A0400'
  }
  return '#0A0A0A'
}

function getNumberColor(status: TimerStatus, config: TimerConfig, displaySeconds: number, phase: TimerPhase) {
  if (status === 'paused') return '#555555'
  if (status === 'done') return '#D4FF3A'
  if (config.mode === 'tabata' || config.mode === 'interval') {
    if (displaySeconds <= 5 && status === 'running') return '#FF3B30'
    return phase === 'work' ? '#FF8A00' : '#4DA3FF'
  }
  if ((config.mode === 'for_time' || config.mode === 'amrap') && displaySeconds <= 10 && displaySeconds > 0) {
    return '#FF3B30'
  }
  return '#D4FF3A'
}

function PhaseLabel({ config, phase, status }: { config: TimerConfig; phase: TimerPhase; status: TimerStatus }) {
  if (status !== 'running' && status !== 'paused') return null
  if (config.mode !== 'tabata' && config.mode !== 'interval') return null
  return (
    <span
      className="font-mono font-black uppercase"
      style={{
        fontSize: 11, letterSpacing: '0.2em',
        color: phase === 'work' ? '#FF8A00' : '#4DA3FF',
      }}
    >
      {phase === 'work' ? 'WORK' : 'REST'}
    </span>
  )
}

function SecondaryInfo({
  status, config, currentRound, totalRounds, phase,
}: {
  status: TimerStatus
  config: TimerConfig
  currentRound: number
  totalRounds: number
  phase: TimerPhase
}) {
  if (status === 'countdown' || status === 'idle' || status === 'done') return null
  const mode: TimerMode = config.mode

  if (mode === 'emom') {
    return (
      <div className="flex gap-5">
        <Stat label="MIN" value={`${currentRound}`} />
        <Stat label="OF" value={`${totalRounds}`} />
        <Stat label="FORMAT" value="EMOM" />
      </div>
    )
  }
  if (mode === 'tabata' || mode === 'interval') {
    return (
      <div className="flex gap-5">
        <Stat label="ROUND" value={`${currentRound}`} />
        <Stat label="OF" value={`${totalRounds}`} />
        <Stat label="PHASE" value={phase === 'work' ? 'WORK' : 'REST'} color={phase === 'work' ? '#FF8A00' : '#4DA3FF'} />
      </div>
    )
  }
  if (mode === 'for_time') {
    return (
      <div className="flex gap-5">
        <Stat label="CAP" value={fmtTime(config.capSeconds)} />
        <Stat label="MODE" value="FOR TIME" />
      </div>
    )
  }
  if (mode === 'amrap') {
    return (
      <div className="flex gap-5">
        <Stat label="DURATION" value={fmtTime(config.capSeconds)} />
      </div>
    )
  }
  return null
}

function Stat({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div className="flex flex-col items-center">
      <span className="font-mono font-bold uppercase tracking-[0.14em] text-[10px] text-[#3D3D3B]">{label}</span>
      <span className="font-mono font-bold text-[14px]" style={{ color: color ?? '#6B6B68' }}>{value}</span>
    </div>
  )
}

function ControlBtn({
  onClick, disabled, color = '#2A2A2A', textColor = '#F5F5F0', filled = false, neutral = false, children,
}: {
  onClick: () => void
  disabled?: boolean
  color?: string
  textColor?: string
  filled?: boolean
  neutral?: boolean
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      style={{
        flex: 1, height: 52,
        background: filled ? color : 'transparent',
        border: `1px solid ${color}`,
        color: filled ? textColor : neutral ? '#F5F5F0' : color,
        fontFamily: "'JetBrains Mono', monospace",
        fontSize: 10, fontWeight: 700, letterSpacing: '0.14em',
        textTransform: 'uppercase', cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.3 : 1,
      }}
    >
      {children}
    </button>
  )
}

export function TimerDisplay({
  status, config, displayFormatted, displaySeconds, currentRound, totalRounds,
  phase, countdownValue, finalDisplay, cappedOut, amrapRounds,
  onPause, onResume, onReset, onFinishEarly, onSkipPhase, onAddMinute, onAddAmrapRound,
}: Props) {
  const bg = getBg(status, config, displaySeconds, phase)
  const numColor = getNumberColor(status, config, displaySeconds, phase)
  const isPhased = config.mode === 'tabata' || config.mode === 'interval'
  const isForTime = config.mode === 'for_time'
  const isAmrap = config.mode === 'amrap'
  const isRunning = status === 'running'
  const isPaused = status === 'paused'

  const pulseStyle = isRunning && displaySeconds <= 10 && displaySeconds > 0 && !isPhased
    ? { animation: 'timerPulse 1s ease-in-out infinite' }
    : {}

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 100,
        background: bg,
        display: 'flex', flexDirection: 'column',
        transition: 'background 0.3s',
      }}
    >
      {/* Header */}
      <div
        style={{
          height: 48, borderBottom: '1px solid #1A1A1A',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '0 20px', flexShrink: 0,
        }}
      >
        <span className="font-mono font-bold uppercase tracking-[0.14em] text-[10px] text-[#6B6B68]">
          {MODE_LABELS[config.mode]}
        </span>
        {(isRunning || isPaused) && (
          <span
            className="font-mono font-bold uppercase tracking-[0.14em] text-[10px]"
            style={{ color: isRunning ? '#D4FF3A' : '#555555' }}
          >
            {isRunning ? '● RUNNING' : '❚❚ PAUSED'}
          </span>
        )}
      </div>

      {/* Main content */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, padding: '0 24px' }}>

        {/* Phase label */}
        <PhaseLabel config={config} phase={phase} status={status} />

        {/* Countdown */}
        {status === 'countdown' && (
          <div style={{ textAlign: 'center' }}>
            <span
              className="font-mono font-black"
              style={{ fontSize: 'clamp(96px, 30vw, 180px)', color: '#F5F5F0', lineHeight: 1, display: 'block' }}
            >
              {countdownValue}
            </span>
            <span className="font-mono font-bold uppercase tracking-[0.2em] text-[11px] text-[#6B6B68]">GET READY</span>
          </div>
        )}

        {/* Running / Paused display */}
        {(isRunning || isPaused) && (
          <span
            className="font-mono font-black"
            style={{
              fontSize: 'clamp(72px, 22vw, 140px)',
              color: numColor,
              lineHeight: 1,
              letterSpacing: '-0.02em',
              transition: 'color 0.3s',
              ...pulseStyle,
            }}
          >
            {displayFormatted}
          </span>
        )}

        {/* Done display */}
        {status === 'done' && (
          <div style={{ textAlign: 'center' }}>
            <span
              className="font-mono font-black block"
              style={{ fontSize: 'clamp(64px, 18vw, 120px)', color: '#D4FF3A', lineHeight: 1, letterSpacing: '-0.02em' }}
            >
              {finalDisplay}
            </span>
            <span
              className="font-mono font-bold uppercase tracking-[0.2em] block"
              style={{ fontSize: 11, color: cappedOut ? '#FF3B30' : '#D4FF3A', marginTop: 12 }}
            >
              {cappedOut ? 'TIME CAP' : 'FINISHED'}
            </span>
          </div>
        )}

        {/* AMRAP round counter */}
        {isAmrap && (isRunning || isPaused) && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginTop: 8 }}>
            <div style={{ textAlign: 'center' }}>
              <span className="font-mono font-bold uppercase tracking-[0.14em] text-[10px] text-[#3D3D3B] block">ROUNDS</span>
              <span className="font-mono font-black" style={{ fontSize: 36, color: '#D4FF3A', lineHeight: 1 }}>
                {amrapRounds}
              </span>
            </div>
            <button
              type="button"
              onClick={onAddAmrapRound}
              disabled={!isRunning}
              style={{
                height: 48, padding: '0 20px',
                background: 'transparent', border: '1px solid #D4FF3A',
                color: '#D4FF3A',
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 10, fontWeight: 700, letterSpacing: '0.14em',
                textTransform: 'uppercase', cursor: 'pointer',
                opacity: isRunning ? 1 : 0.3,
              }}
            >
              + ROUND
            </button>
          </div>
        )}

        {/* AMRAP done: show rounds */}
        {isAmrap && status === 'done' && amrapRounds > 0 && (
          <span className="font-mono font-bold uppercase tracking-[0.14em] text-[10px]" style={{ color: '#6B6B68' }}>
            {amrapRounds} ROUND{amrapRounds !== 1 ? 'S' : ''} COMPLETED
          </span>
        )}

        {/* Secondary info */}
        <SecondaryInfo status={status} config={config} currentRound={currentRound} totalRounds={totalRounds} phase={phase} />
      </div>

      {/* Controls */}
      <div style={{ padding: '0 20px 32px', flexShrink: 0 }}>
        {status === 'done' && (
          <ControlBtn onClick={onReset} color="#D4FF3A" textColor="#0A0A0A" filled>
            NEW TIMER
          </ControlBtn>
        )}

        {(isRunning || isPaused) && (
          <div style={{ display: 'flex', gap: 8 }}>
            {/* Primary: pause / resume */}
            <ControlBtn
              onClick={isRunning ? onPause : onResume}
              color="#D4FF3A"
              textColor="#0A0A0A"
              filled
            >
              {isRunning ? 'PAUSE' : 'RESUME'}
            </ControlBtn>

            {/* Secondary: contextual */}
            {isPhased && (
              <ControlBtn onClick={onSkipPhase} disabled={!isRunning} color="#2A2A2A" neutral>
                SKIP
              </ControlBtn>
            )}
            {isForTime && (
              <ControlBtn onClick={onFinishEarly} disabled={!isRunning} color="#2A2A2A" neutral>
                DONE
              </ControlBtn>
            )}
            {isForTime && (
              <ControlBtn onClick={onAddMinute} color="#2A2A2A" neutral>
                +1 MIN
              </ControlBtn>
            )}

            {/* Reset */}
            <ControlBtn onClick={onReset} color="#FF3B30" textColor="#FF3B30">
              RESET
            </ControlBtn>
          </div>
        )}

        {status === 'countdown' && (
          <ControlBtn onClick={onReset} color="#FF3B30" textColor="#FF3B30">
            CANCEL
          </ControlBtn>
        )}
      </div>

      <style>{`
        @keyframes timerPulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.55; }
        }
      `}</style>
    </div>
  )
}

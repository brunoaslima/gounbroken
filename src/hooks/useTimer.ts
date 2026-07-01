import { useState, useRef, useEffect } from 'react'
import type { TimerMode, TimerPhase, TimerStatus, TimerConfig } from '@/lib/timerTypes'
import { DEFAULT_CONFIG } from '@/lib/timerTypes'
import {
  initAudio, beepCountdown, beepGo, beepWork, beepRest,
  beepTick, beepFinish, closeAudio,
} from '@/lib/timerAudio'

export function fmtTime(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds))
  const mm = Math.floor(s / 60)
  const ss = s % 60
  if (mm > 0) return `${String(mm).padStart(2, '0')}:${String(ss).padStart(2, '0')}`
  return String(ss).padStart(2, '0')
}

export function useTimer() {
  // ── React state (drives rendering) ────────────────────────────────────────
  const [config, setConfigState] = useState<TimerConfig>(DEFAULT_CONFIG)
  const [status, setStatus] = useState<TimerStatus>('idle')
  const [displaySeconds, setDisplaySeconds] = useState(0)
  const [currentRound, setCurrentRound] = useState(1)
  const [phase, setPhase] = useState<TimerPhase>('work')
  const [countdownValue, setCountdownValue] = useState(3)
  const [finalDisplay, setFinalDisplay] = useState('')
  const [cappedOut, setCappedOut] = useState(false)

  // ── Refs (read inside setInterval without stale closures) ─────────────────
  const configRef    = useRef<TimerConfig>(DEFAULT_CONFIG)
  const statusRef    = useRef<TimerStatus>('idle')
  const roundRef     = useRef(1)
  const phaseRef     = useRef<TimerPhase>('work')
  const timerStartRef = useRef(0)   // wall-clock ms when timer started (adjusted for pauses)
  const phaseStartRef = useRef(0)   // wall-clock ms when current phase started (adjusted)
  const pausedAtRef   = useRef(0)
  const intervalRef   = useRef<ReturnType<typeof setInterval>>()
  const wakeLockRef   = useRef<WakeLockSentinel | null>(null)
  const lastTickSecRef = useRef(-1) // last second at which tick beep played
  const prevRoundRef   = useRef(0)  // for EMOM: detect minute change

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clearInterval(intervalRef.current)
      wakeLockRef.current?.release().catch(() => {})
      closeAudio()
    }
  }, [])

  // ── Helpers ───────────────────────────────────────────────────────────────
  function syncConfig(cfg: TimerConfig) {
    configRef.current = cfg
    setConfigState(cfg)
  }

  async function acquireWakeLock() {
    try { wakeLockRef.current = await navigator.wakeLock.request('screen') } catch {}
  }

  function doFinish(capped: boolean, elapsed: number) {
    clearInterval(intervalRef.current)
    wakeLockRef.current?.release().catch(() => {})
    wakeLockRef.current = null
    statusRef.current = 'done'
    setStatus('done')
    setCappedOut(capped)
    setFinalDisplay(fmtTime(elapsed))
    beepFinish()
    navigator.vibrate?.([200, 100, 200])
  }

  function advancePhase(cfg: TimerConfig, curRound: number, curPhase: TimerPhase) {
    const now = Date.now()
    if (curPhase === 'work') {
      phaseStartRef.current = now
      phaseRef.current = 'rest'
      setPhase('rest')
      lastTickSecRef.current = -1
      beepRest()
    } else {
      const next = curRound + 1
      if (next > cfg.rounds) {
        const elapsed = (now - timerStartRef.current) / 1000
        doFinish(false, elapsed)
      } else {
        phaseStartRef.current = now
        phaseRef.current = 'work'
        setPhase('work')
        roundRef.current = next
        setCurrentRound(next)
        lastTickSecRef.current = -1
        beepWork()
      }
    }
  }

  // ── Tick (runs every 100ms) ───────────────────────────────────────────────
  // Stored in a ref so setInterval always calls the latest version
  const tickFnRef = useRef<() => void>(() => {})
  tickFnRef.current = function tick() {
    const now = Date.now()
    const cfg = configRef.current

    switch (cfg.mode) {
      case 'for_time':
      case 'amrap': {
        const elapsedSec = (now - timerStartRef.current) / 1000
        const remaining = cfg.capSeconds - elapsedSec
        if (remaining <= 0) {
          setDisplaySeconds(0)
          doFinish(true, cfg.capSeconds)
          return
        }
        const remCeil = Math.ceil(remaining)
        setDisplaySeconds(remCeil)
        if (remCeil <= 10 && remCeil !== lastTickSecRef.current) {
          lastTickSecRef.current = remCeil
          beepTick()
        }
        break
      }
      case 'emom': {
        const elapsedSec = (now - timerStartRef.current) / 1000
        const currentMin = Math.floor(elapsedSec / 60)
        if (currentMin >= cfg.rounds) {
          doFinish(false, elapsedSec)
          return
        }
        const withinMin = elapsedSec % 60
        const remaining = Math.ceil(60 - withinMin)
        setDisplaySeconds(remaining)
        const newRound = currentMin + 1
        if (newRound !== prevRoundRef.current) {
          prevRoundRef.current = newRound
          roundRef.current = newRound
          setCurrentRound(newRound)
          lastTickSecRef.current = -1
          if (newRound > 1) beepWork()
        }
        if (remaining <= 10 && remaining !== lastTickSecRef.current) {
          lastTickSecRef.current = remaining
          beepTick()
        }
        break
      }
      case 'tabata':
      case 'interval': {
        const curPhase = phaseRef.current
        const phaseDur = curPhase === 'work' ? cfg.workSeconds : cfg.restSeconds
        const phaseElapsed = (now - phaseStartRef.current) / 1000
        const remaining = phaseDur - phaseElapsed
        if (remaining <= 0) {
          advancePhase(cfg, roundRef.current, curPhase)
          return
        }
        const remCeil = Math.ceil(remaining)
        setDisplaySeconds(remCeil)
        if (remCeil <= 10 && remCeil !== lastTickSecRef.current) {
          lastTickSecRef.current = remCeil
          beepTick()
        }
        break
      }
      case 'stopwatch': {
        const elapsedSec = (now - timerStartRef.current) / 1000
        setDisplaySeconds(Math.floor(elapsedSec))
        break
      }
    }
  }

  // ── Public API ────────────────────────────────────────────────────────────
  function start(cfg: TimerConfig) {
    initAudio()
    syncConfig(cfg)
    statusRef.current = 'countdown'
    setStatus('countdown')
    setCountdownValue(3)
    lastTickSecRef.current = -1
    prevRoundRef.current = 0

    let count = 3
    beepCountdown()
    const cdInterval = setInterval(() => {
      count--
      if (count <= 0) {
        clearInterval(cdInterval)
        beepGo()
        const now = Date.now()
        timerStartRef.current = now
        phaseStartRef.current = now
        roundRef.current = 1
        phaseRef.current = 'work'
        setCurrentRound(1)
        setPhase('work')
        setCappedOut(false)
        setFinalDisplay('')
        statusRef.current = 'running'
        setStatus('running')
        acquireWakeLock()
        intervalRef.current = setInterval(() => tickFnRef.current(), 100)
      } else {
        setCountdownValue(count)
        beepCountdown()
      }
    }, 1000)
  }

  function pause() {
    if (statusRef.current !== 'running') return
    clearInterval(intervalRef.current)
    pausedAtRef.current = Date.now()
    wakeLockRef.current?.release().catch(() => {})
    wakeLockRef.current = null
    statusRef.current = 'paused'
    setStatus('paused')
  }

  function resume() {
    if (statusRef.current !== 'paused') return
    const pauseDur = Date.now() - pausedAtRef.current
    timerStartRef.current += pauseDur
    phaseStartRef.current += pauseDur
    statusRef.current = 'running'
    setStatus('running')
    acquireWakeLock()
    intervalRef.current = setInterval(() => tickFnRef.current(), 100)
  }

  function reset() {
    clearInterval(intervalRef.current)
    wakeLockRef.current?.release().catch(() => {})
    wakeLockRef.current = null
    statusRef.current = 'idle'
    setStatus('idle')
    setDisplaySeconds(0)
    setCurrentRound(1)
    setPhase('work')
    setFinalDisplay('')
    setCappedOut(false)
    setCountdownValue(3)
    lastTickSecRef.current = -1
    prevRoundRef.current = 0
  }

  // For Time only: user finishes before cap
  function finishEarly() {
    if (statusRef.current !== 'running' && statusRef.current !== 'paused') return
    const elapsed = (Date.now() - timerStartRef.current) / 1000
    clearInterval(intervalRef.current)
    doFinish(false, elapsed)
  }

  // Tabata / Interval: skip current phase
  function skipPhase() {
    if (statusRef.current !== 'running') return
    advancePhase(configRef.current, roundRef.current, phaseRef.current)
  }

  // For Time / AMRAP: add 1 minute to cap
  function addMinute() {
    const updated = { ...configRef.current, capSeconds: configRef.current.capSeconds + 60 }
    syncConfig(updated)
  }

  const totalRounds = (['tabata', 'interval', 'emom'] as TimerMode[]).includes(config.mode)
    ? config.rounds : 1

  return {
    status,
    config,
    displaySeconds,
    displayFormatted: fmtTime(displaySeconds),
    currentRound,
    totalRounds,
    phase,
    countdownValue,
    finalDisplay,
    cappedOut,
    // Actions
    start,
    pause,
    resume,
    reset,
    finishEarly,
    skipPhase,
    addMinute,
    setConfig: syncConfig,
  }
}

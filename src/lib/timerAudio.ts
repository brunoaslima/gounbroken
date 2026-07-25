let ctx: AudioContext | null = null

export function initAudio() {
  if (!ctx) ctx = new AudioContext()
  if (ctx.state === 'suspended') ctx.resume().catch(() => {})
}

// Mobile browsers auto-suspend the AudioContext when the app is backgrounded
// (app switch, screen lock) and never resume it on their own — without this,
// beeps silently stop firing until the user starts a brand new timer
if (typeof document !== 'undefined') {
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && ctx?.state === 'suspended') {
      ctx.resume().catch(() => {})
    }
  })
}

// square wave carries more harmonics than sine, so it cuts through mixed
// audio (music playing alongside) more reliably at the same perceived volume
function beep(freq: number, durationMs: number, volume = 0.6, type: OscillatorType = 'square') {
  if (!ctx) return
  try {
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.type = type
    osc.frequency.value = freq
    gain.gain.setValueAtTime(volume, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + durationMs / 1000)
    osc.start()
    osc.stop(ctx.currentTime + durationMs / 1000)
  } catch {}
}

export function beepCountdown() { beep(880, 100, 0.6) }
export function beepGo()        { beep(1100, 250, 1) }
export function beepWork()      { beep(880, 90, 1); setTimeout(() => beep(880, 90, 1), 120) }
export function beepRest()      { beep(440, 180, 1) }
export function beepTick()      { beep(600, 60, 0.4) }
export function beepFinish()    {
  beep(880, 150, 0.8)
  setTimeout(() => beep(1100, 150, 0.8), 200)
  setTimeout(() => beep(1320, 300, 1), 420)
}

export function closeAudio() {
  ctx?.close().catch(() => {})
  ctx = null
}

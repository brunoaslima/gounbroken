let ctx: AudioContext | null = null

export function initAudio() {
  if (!ctx) ctx = new AudioContext()
  if (ctx.state === 'suspended') ctx.resume().catch(() => {})
}

function beep(freq: number, durationMs: number, volume = 0.3) {
  if (!ctx) return
  try {
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.frequency.value = freq
    gain.gain.setValueAtTime(volume, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + durationMs / 1000)
    osc.start()
    osc.stop(ctx.currentTime + durationMs / 1000)
  } catch {}
}

export function beepCountdown() { beep(880, 100) }
export function beepGo()        { beep(1100, 250, 0.5) }
export function beepWork()      { beep(880, 80); setTimeout(() => beep(880, 80), 120) }
export function beepRest()      { beep(440, 150) }
export function beepTick()      { beep(600, 60, 0.15) }
export function beepFinish()    {
  beep(880, 150)
  setTimeout(() => beep(1100, 150), 200)
  setTimeout(() => beep(1320, 300, 0.5), 420)
}

export function closeAudio() {
  ctx?.close().catch(() => {})
  ctx = null
}

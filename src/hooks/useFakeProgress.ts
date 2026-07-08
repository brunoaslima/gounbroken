import { useEffect, useRef, useState } from 'react'

// AI generation calls are single-shot (no real progress events from the
// server), unlike Tesseract's OCR which reports real percentages. This
// simulates the same 0-100% + staged-message UX so both loading screens
// feel consistent — eases towards 90% while waiting, then complete() jumps
// to 100% once the actual response arrives.
export function useFakeProgress(active: boolean, stages: string[]) {
  const [progress, setProgress] = useState(0)
  const [label, setLabel] = useState(stages[0] ?? '')
  const doneRef = useRef(false)

  useEffect(() => {
    if (!active) { setProgress(0); setLabel(stages[0] ?? ''); doneRef.current = false; return }

    setProgress(0)
    const tick = setInterval(() => {
      if (doneRef.current) return
      setProgress(p => {
        const next = p + (90 - p) * 0.08
        return next > 90 ? 90 : next
      })
    }, 200)

    let i = 0
    setLabel(stages[0] ?? '')
    const stageTick = setInterval(() => {
      if (doneRef.current) return
      i = Math.min(i + 1, stages.length - 1)
      setLabel(stages[i])
    }, 1800)

    return () => { clearInterval(tick); clearInterval(stageTick) }
  }, [active]) // eslint-disable-line react-hooks/exhaustive-deps

  function complete() {
    doneRef.current = true
    setProgress(100)
    setLabel(stages[stages.length - 1] ?? '')
  }

  return { progress: Math.round(progress), label, complete }
}

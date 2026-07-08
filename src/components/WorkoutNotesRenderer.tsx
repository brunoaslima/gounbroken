import type { CSSProperties, ReactNode } from 'react'
import { classifyWorkoutLine, FORMAT_HIGHLIGHT_RE, EXERCISE_HIGHLIGHT_RE, EXERCISE_PREFIX_RE } from '@/lib/workoutLineParser'

// ── Inline highlight helper ───────────────────────────────────────────────────

export function highlightSpans(text: string, pattern: RegExp, style: CSSProperties): ReactNode {
  const parts: ReactNode[] = []
  const re = new RegExp(pattern.source, 'gi')
  let last = 0
  let m: RegExpExecArray | null
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) parts.push(<span key={`t${last}`}>{text.slice(last, m.index)}</span>)
    parts.push(<span key={`h${m.index}`} style={style}>{m[0]}</span>)
    last = m.index + m[0].length
  }
  if (last < text.length) parts.push(<span key={`t${last}`}>{text.slice(last)}</span>)
  return <>{parts}</>
}

// ── Per-type line renderers ───────────────────────────────────────────────────

export function FormatLineContent({ text }: { text: string }) {
  return <>{highlightSpans(text, FORMAT_HIGHLIGHT_RE, { color: '#D4FF3A', fontWeight: 700 })}</>
}

export function ExerciseLineContent({ text }: { text: string }) {
  return <>{highlightSpans(text, EXERCISE_HIGHLIGHT_RE, { color: '#D4FF3A' })}</>
}

// ── A/B sub-part detection ────────────────────────────────────────────────────
// Detects lines like "A. Max T2B" / "B. 6' EMOM:" and splits notes into parts.
// Only activates when there are at least 2 such part-header lines.

const PART_HEADER_RE = /^([A-Z])\.\s*/

interface WorkoutPart {
  label: string
  lines: string[]
}

export function splitIntoParts(notes: string): WorkoutPart[] | null {
  const lines = notes.split('\n')
  const headerCount = lines.filter(l => PART_HEADER_RE.test(l.trim())).length
  if (headerCount < 2) return null

  const parts: WorkoutPart[] = []
  let current: WorkoutPart | null = null

  for (const line of lines) {
    const m = line.trim().match(PART_HEADER_RE)
    if (m) {
      if (current) parts.push(current)
      const rest = line.trim().slice(m[0].length)
      current = { label: m[1], lines: rest ? [rest] : [] }
    } else if (current) {
      current.lines.push(line)
    }
  }
  if (current) parts.push(current)
  return parts.length >= 2 ? parts : null
}

// ── Single-line renderer (shared) ─────────────────────────────────────────────

export function WorkoutLine({ line, index }: { line: string; index: number }) {
  const type = classifyWorkoutLine(line)
  const t = line.trim()
  const indent = line.length - line.trimStart().length

  if (type === 'empty') return <div key={index} style={{ height: 4 }} />

  if (type === 'format') return (
    <p className="font-mono font-semibold tracking-wider mt-0.5 uppercase" style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', paddingLeft: indent * 7 }}>
      <FormatLineContent text={t} />
    </p>
  )

  if (type === 'exercise' || type === 'plain') {
    const m = t.match(EXERCISE_PREFIX_RE)
    if (m) {
      const atIdx = m[2].search(/\s+@/)
      const name = atIdx >= 0 ? m[2].slice(0, atIdx) : m[2]
      const annotation = atIdx >= 0 ? m[2].slice(atIdx + 1) : null
      return (
        <p className="flex items-baseline gap-1.5 flex-wrap leading-snug" style={{ paddingLeft: indent * 7 }}>
          <span className="text-lime font-black text-[13px] tracking-wide shrink-0 uppercase">{m[1]}</span>
          <span className="text-soft-white font-bold text-[15px] uppercase tracking-wide">{name}</span>
          {annotation && <span className="font-mono italic text-[12px]" style={{ color: 'rgba(255,255,255,0.35)' }}>{annotation}</span>}
        </p>
      )
    }
    return <p className="text-soft-white font-bold text-[15px] leading-snug uppercase tracking-wide" style={{ paddingLeft: indent * 7 }}>{t}</p>
  }

  if (type === 'note') return (
    <p className="font-mono text-xs italic" style={{ color: '#6B6B68', paddingLeft: indent * 7 }}>
      {t.replace(/^obs:\s*/i, '')}
    </p>
  )

  if (type === 'title') return (
    <p className="font-mono font-black text-muted-gray tracking-[0.12em] uppercase mt-2" style={{ fontSize: 11 }}>{t}</p>
  )

  return <p className="text-soft-white font-bold text-[15px] leading-snug uppercase tracking-wide">{t}</p>
}

// ── Canonical free-text renderer ─────────────────────────────────────────────
// Used by WorkoutCard (saved display) and WorkoutPreview (import sheet preview).
// Styling is shared; callers only control the outer container.

export function WorkoutNotesRenderer({ notes }: { notes: string }) {
  const parts = splitIntoParts(notes)

  if (parts) {
    return (
      <div className="space-y-3">
        {parts.map((part, pi) => (
          <div key={pi}>
            {pi > 0 && <div style={{ height: 1, background: '#2A2A2A', margin: '4px 0 8px' }} />}
            <div style={{ borderLeft: '2px solid #D4FF3A', paddingLeft: 8, marginBottom: 6 }}>
              <span className="font-mono font-black uppercase tracking-[0.16em]" style={{ fontSize: 10, color: '#D4FF3A' }}>
                Part {part.label}
              </span>
            </div>
            <div className="space-y-1.5" style={{ paddingLeft: 10 }}>
              {part.lines.map((line, i) => <WorkoutLine key={i} line={line} index={i} />)}
            </div>
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-1.5">
      {notes.split('\n').map((line, i) => <WorkoutLine key={i} line={line} index={i} />)}
    </div>
  )
}

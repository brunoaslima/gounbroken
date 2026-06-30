import { useRef, useState } from 'react'
import { createWorker } from 'tesseract.js'
import { supabase } from '@/lib/supabase'
type SheetState = 'menu' | 'manual' | 'processing' | 'review'
type ViewMode = 'edit' | 'preview'

interface Props {
  open: boolean
  onClose: () => void
  onDone: () => void
  userId: string
  hasAIRole?: boolean
  generatedThisWeek?: boolean
  onOpenGenerate?: () => void
}

function todayISO() {
  return new Date().toISOString().slice(0, 10)
}

// ─── Workout block detector ───────────────────────────────────────────────────

// Lines that ARE a real training section header (standalone keyword)
const BLOCK_HEADER_RE = /^(warm[\s-]?up|aquecimento|wod|strength|força|skill|conditioning|condicionamento|metcon|accessory|acessório|mobility|mobilidade|cardio|gymnastics|ginástica|cool[\s-]?down)\s*[:\-–]?\s*$/i

// Lines that signal the end of workout content (metadata after the WOD)
const END_MARKER_RE = /^(inscrições?|inscricoes?|booking|register|sign[\s-]?up|participantes?|alunos?|comments?|comentários?|location|horário|horario|detalhes\s+da\s+aula|class\s+details?)/i

// Fallback: lines with actual exercise/workout content
const WORKOUT_SIGNALS = [
  /\d+\s*[x×]\s*\d+/i,
  /\d+\s*rep(etições?|s)?/i,
  /\d+[\s,]*kg/i,
  /\b(amrap|emom|for[\s-]?time|tabata|rounds?|chipper)\b/i,
  /\b(squat|deadlift|clean|snatch|jerk|press|pull[\s-]?up|push[\s-]?up|lunge|row|run|bike|jump|burpee|thruster|swing|box[\s-]?jump)\b/i,
  /\b(agachamento|terra|supino|remada|corrida|polichinelo|desenvolvimento|levantamento)\b/i,
  /\d+\s*min(utos?)?/i,
  /@\d+%/i,
  /\b(sets?|séries?)\s*[:=]\s*\d/i,
]

function isWorkoutLine(line: string) {
  return WORKOUT_SIGNALS.some(p => p.test(line))
}

// ─── OCR normalization ────────────────────────────────────────────────────────

function normalizeWorkoutText(text: string): string {
  const lines = text.split('\n').map(line => {
    // "N rest" / "N descanso" at end of line → "N' rest"
    line = line.replace(/^(\s*)(\d+)\s+(rest|descanso)\s*$/i, "$1$2' $3")
    return line
  })
  // Collapse multiple consecutive blank lines into one
  const result: string[] = []
  let prevBlank = false
  for (const line of lines) {
    const blank = line.trim() === ''
    if (blank && prevBlank) continue
    result.push(line)
    prevBlank = blank
  }
  return result.join('\n').trim()
}

/**
 * Extracts and normalizes the workout block from raw OCR text.
 *
 * Strategy:
 * 1. Find the first real block header (WARM UP, WOD, STRENGTH…) — skip metadata before it
 * 2. Stop at end-of-workout markers (INSCRIÇÕES, BOOKING…)
 * 3. Fallback to signal-based search if no block header found
 * 4. Normalize the extracted block (OCR corrections + blank lines)
 */
export function detectWorkoutBlock(raw: string): string | null {
  const lines = raw.split('\n')

  // Find first real block header
  let startIdx = -1
  for (let i = 0; i < lines.length; i++) {
    if (BLOCK_HEADER_RE.test(lines[i].trim())) {
      startIdx = i
      break
    }
  }

  // Fallback: first line with workout signals
  if (startIdx === -1) {
    for (let i = 0; i < lines.length; i++) {
      if (isWorkoutLine(lines[i])) {
        startIdx = Math.max(0, i - 1)
        break
      }
    }
  }

  if (startIdx === -1) return null

  // Find end marker after start
  let endIdx = lines.length
  for (let i = startIdx + 1; i < lines.length; i++) {
    const t = lines[i].trim()
    if (t && END_MARKER_RE.test(t)) {
      endIdx = i
      break
    }
  }

  const block = lines.slice(startIdx, endIdx)
  return normalizeWorkoutText(block.join('\n')) || null
}

// ─── Workout syntax highlight ─────────────────────────────────────────────────

type LineType = 'title' | 'format' | 'exercise' | 'note' | 'empty' | 'plain'

function classifyLine(line: string): LineType {
  const t = line.trim()
  if (!t) return 'empty'

  // Block titles: exact match to known section keywords
  if (BLOCK_HEADER_RE.test(t)) return 'title'
  // Short all-caps line without digits (e.g. "METCON", "WOD", "STRENGTH")
  if (t.length <= 35 && /^[A-ZÁÉÍÓÚÀÂÊÔÃÕÇ\s\-\/\.]+$/.test(t) && !/\d/.test(t) && t.length > 2) return 'title'

  // Format lines: AMRAP, EMOM, For Time, Rounds, rep schemes, etc.
  if (/\b(amrap|emom|for[\s-]?time|for[\s-]?load|for[\s-]?quality|tabata|every|e\.m\.o\.m|a\.m\.r\.a\.p|chipper|ladder)\b/i.test(t)) return 'format'
  if (/^\d+\s*rounds?\s*(of|de|:)?\s*/i.test(t)) return 'format'
  if (/^(each\s+for\s+time|for\s+load|build\s+to|time\s+cap)/i.test(t)) return 'format'
  if (/^\d+r\b.*\b(each|for|time)\b/i.test(t)) return 'format'  // 5R, EACH FOR TIME
  if (/^\d+-\d+(-\d+)+/.test(t)) return 'format'                  // 21-15-9

  // Note lines: rest, scale, instructions
  if (/^(\d+['´']\s*)?(rest|descanso)\b/i.test(t)) return 'note'
  if (/^(obs|scale|note|nota|objetivo|goal|atenção|time[\s-]?cap|rx\+?|scaled|cap|moderate|focus|technique|score|build)\b/i.test(t)) return 'note'
  if (/^[-–*]\s*(rest|descanso|obs|note|nota|scale)\b/i.test(t)) return 'note'

  // Exercise lines: anything with reps, loads, distances, cals, or movement names
  if (/\d+\s*[x×]\s*\d+/i.test(t)) return 'exercise'
  if (/\d+\s*rep(etições?|s)?/i.test(t)) return 'exercise'
  if (/\d+[\s,]*kg/i.test(t)) return 'exercise'
  if (/\d+[/\d]*\s*m\b/i.test(t)) return 'exercise'   // 500/425m
  if (/\d+\s*cal\b/i.test(t)) return 'exercise'
  if (/\b(squat|deadlift|clean|snatch|jerk|press|pull[\s-]?up|push[\s-]?up|lunge|row|run|bike|jump|burpee|thruster|swing|box[\s-]?jump|muscle[\s-]?up|handstand|toes[\s-]?to[\s-]?bar|knees[\s-]?to|sit[\s-]?up|double[\s-]?under|rope|kettlebell|wall[\s-]?ball|kang|turkish|romanian|rdl)\b/i.test(t)) return 'exercise'
  if (/\b(agachamento|terra|supino|remada|corrida|polichinelo|desenvolvimento|levantamento|barra|halter|sino)\b/i.test(t)) return 'exercise'
  if (/^\d+\s+[a-z]/i.test(t)) return 'exercise'

  return 'plain'
}

function highlightSpans(text: string, pattern: RegExp, style: React.CSSProperties): React.ReactNode {
  const parts: React.ReactNode[] = []
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

function FormatLineContent({ text }: { text: string }) {
  // Highlight format keywords, rep schemes, and time expressions
  return <>{highlightSpans(
    text,
    /\b(AMRAP|EMOM|For\s+Time|For\s+Load|For\s+Quality|Tabata|Every|Rounds?|Chipper|Ladder|Each\s+For\s+Time|Time\s+Cap|E\.M\.O\.M|A\.M\.R\.A\.P|Min\s+\d+)\b|\d+r\b|\d+-\d+(-\d+)+|\d+[''´`]?\s*(min\.?)?|\d+:\d{2}/i,
    { color: '#D4FF3A', fontWeight: 700 },
  )}</>
}

function ExerciseLineContent({ text }: { text: string }) {
  // Highlight numbers, loads, reps, distances, cals
  return <>{highlightSpans(
    text,
    /\d+\s*[x×]\s*\d+|\d+[/\d]*\s*m\b|\d+[\s,]*kg|\d+[\s,]*lb|\d+\s*cal(?:ories?)?\b|\d+\s*rep(?:etições?|s)?|\d+\s*min(?:utos?)?|\d+\s*seg(?:undos?)?|@\s*\d+%|\d+%|\d+[''´`]/,
    { color: '#D4FF3A' },
  )}</>
}

function WorkoutPreview({ text }: { text: string }) {
  if (!text.trim()) {
    return (
      <div style={{ border: '1px solid #2A2A2A', padding: '10px 12px', minHeight: 192 }}>
        <span className="font-mono text-[12px]" style={{ color: '#3D3D3B' }}>No content yet.</span>
      </div>
    )
  }

  const lines = text.split('\n')

  return (
    <div style={{ border: '1px solid #2A2A2A', padding: '10px 12px', minHeight: 192, lineHeight: 1.75 }}>
      {lines.map((line, i) => {
        const type = classifyLine(line)
        const trimmed = line.trimStart()
        const indent = line.length - trimmed.length

        if (type === 'empty') return <div key={i} style={{ height: '0.5em' }} />

        if (type === 'title') {
          return (
            <div
              key={i}
              className="font-mono font-bold uppercase tracking-[0.16em]"
              style={{ color: '#D4FF3A', fontSize: 11, marginTop: i > 0 ? 10 : 0, marginBottom: 1 }}
            >
              {trimmed}
            </div>
          )
        }

        if (type === 'format') {
          return (
            <div
              key={i}
              className="font-mono font-bold"
              style={{ color: '#FFFFFF', fontSize: 13, paddingLeft: indent * 7, marginTop: 2 }}
            >
              <FormatLineContent text={trimmed} />
            </div>
          )
        }

        if (type === 'exercise') {
          return (
            <div
              key={i}
              className="font-mono"
              style={{ color: '#E5E5E3', fontSize: 13, paddingLeft: indent * 7 }}
            >
              <ExerciseLineContent text={trimmed} />
            </div>
          )
        }

        if (type === 'note') {
          return (
            <div
              key={i}
              className="font-mono"
              style={{ color: '#6B6B68', fontSize: 12, paddingLeft: indent * 7, fontStyle: 'italic' }}
            >
              {trimmed}
            </div>
          )
        }

        return (
          <div key={i} className="font-mono" style={{ color: '#A8A8A4', fontSize: 13, paddingLeft: indent * 7 }}>
            {line || ' '}
          </div>
        )
      })}
    </div>
  )
}

// Preprocess image for better OCR: grayscale + contrast boost + invert if dark background
async function preprocessForOCR(file: File): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas')
        // Scale down large images to speed up OCR (max 2000px on longest side)
        const maxDim = 2000
        const scale = Math.min(1, maxDim / Math.max(img.width, img.height))
        canvas.width = Math.round(img.width * scale)
        canvas.height = Math.round(img.height * scale)
        const ctx = canvas.getContext('2d')!
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height)

        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
        const d = imageData.data

        // Convert to grayscale
        let totalBrightness = 0
        for (let i = 0; i < d.length; i += 4) {
          const gray = Math.round(0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2])
          d[i] = d[i + 1] = d[i + 2] = gray
          totalBrightness += gray
        }

        // If average brightness < 100 → dark background → invert for better OCR
        const avgBrightness = totalBrightness / (d.length / 4)
        if (avgBrightness < 100) {
          for (let i = 0; i < d.length; i += 4) {
            d[i] = 255 - d[i]
            d[i + 1] = 255 - d[i + 1]
            d[i + 2] = 255 - d[i + 2]
          }
        }

        // Contrast stretch: expand range to [0, 255]
        let min = 255, max = 0
        for (let i = 0; i < d.length; i += 4) {
          if (d[i] < min) min = d[i]
          if (d[i] > max) max = d[i]
        }
        const range = max - min || 1
        for (let i = 0; i < d.length; i += 4) {
          const v = Math.round(((d[i] - min) / range) * 255)
          d[i] = d[i + 1] = d[i + 2] = v
        }

        ctx.putImageData(imageData, 0, 0)
        canvas.toBlob(blob => {
          URL.revokeObjectURL(url)
          resolve(blob!)
        }, 'image/png')
      } catch (e) {
        URL.revokeObjectURL(url)
        reject(e)
      }
    }
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Falha ao carregar imagem')) }
    img.src = url
  })
}

// ─── Text → sections parser ───────────────────────────────────────────────────

function sectionLabel(raw: string): string {
  const l = raw.toLowerCase().replace(/[\s\-]+/g, '')
  if (l === 'wod') return 'WOD'
  if (l.includes('warmup') || l.includes('aquecimento')) return 'Warm-Up'
  if (l === 'strength' || l === 'força' || l === 'forca') return 'Strength'
  if (l === 'skill') return 'Skill'
  if (l === 'metcon' || l.includes('conditioning') || l.includes('condicionamento')) return 'Metcon'
  if (l.includes('accessory') || l.includes('acessório') || l.includes('acessorio')) return 'Accessory'
  if (l.includes('mobility') || l.includes('mobilidade')) return 'Mobility'
  if (l === 'cardio') return 'Cardio'
  if (l.includes('gymnastics') || l.includes('ginástica') || l.includes('ginastica')) return 'Gymnastics'
  return raw.trim()
}

function sectionType(raw: string): string {
  const l = raw.toLowerCase().replace(/[\s\-]+/g, '')
  if (l === 'wod') return 'wod'
  if (l.includes('warmup') || l.includes('aquecimento')) return 'warmup'
  if (l === 'strength' || l === 'força' || l === 'forca') return 'strength'
  if (l === 'skill') return 'skill'
  if (l === 'metcon' || l.includes('conditioning') || l.includes('condicionamento')) return 'conditioning'
  if (l.includes('accessory') || l.includes('acessório') || l.includes('acessorio')) return 'accessory'
  if (l.includes('mobility') || l.includes('mobilidade')) return 'mobility'
  if (l === 'cardio') return 'cardio'
  return 'wod'
}

function makeSection(label: string, bodyLines: string[], pos: number) {
  return {
    id: crypto.randomUUID(),
    section_type: sectionType(label),
    label: sectionLabel(label),
    position: pos,
    notes: bodyLines.join('\n').trim(),
    format_type: 'LIVRE',
    format_config: null,
    modality_tags: [],
    exercises: [],
  }
}

function parseTextIntoSections(text: string) {
  const lines = text.split('\n')
  const sections: ReturnType<typeof makeSection>[] = []
  let currentHeader: string | null = null
  let currentBody: string[] = []
  let pos = 0

  for (const line of lines) {
    const t = line.trim()
    if (t && BLOCK_HEADER_RE.test(t)) {
      const body = currentBody.join('\n').trim()
      if (body) sections.push(makeSection(currentHeader ?? 'Treino', currentBody, pos++))
      currentHeader = t
      currentBody = []
    } else {
      currentBody.push(line)
    }
  }
  // flush last block
  const body = currentBody.join('\n').trim()
  if (body) sections.push(makeSection(currentHeader ?? 'Treino', currentBody, pos++))

  // fallback: no block headers found → single section
  if (sections.length === 0) {
    sections.push(makeSection('Treino', lines, 0))
  }

  return sections
}

export default function WorkoutImportSheet({
  open, onClose, onDone, userId,
  hasAIRole, generatedThisWeek, onOpenGenerate,
}: Props) {
  const cameraRef = useRef<HTMLInputElement>(null)
  const galleryRef = useRef<HTMLInputElement>(null)

  const [state, setState] = useState<SheetState>('menu')
  const [viewMode, setViewMode] = useState<ViewMode>('edit')
  const [date, setDate] = useState(todayISO)
  const [text, setText] = useState('')
  const [fullText, setFullText] = useState('')
  const [workoutBlock, setWorkoutBlock] = useState<string | null>(null)
  const [trimmed, setTrimmed] = useState(false)
  const [progress, setProgress] = useState(0)
  const [progressLabel, setProgressLabel] = useState('')
  const [saving, setSaving] = useState(false)
  const [ocrError, setOcrError] = useState<string | null>(null)

  function reset() {
    setState('menu')
    setViewMode('edit')
    setText('')
    setFullText('')
    setWorkoutBlock(null)
    setTrimmed(false)
    setProgress(0)
    setProgressLabel('')
    setOcrError(null)
    setSaving(false)
    setDate(todayISO())
  }

  function handleClose() {
    reset()
    onClose()
  }

  async function handleImageSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) {
      setOcrError('Invalid file. Please select an image.')
      return
    }
    e.target.value = ''
    setOcrError(null)
    setProgress(0)
    setProgressLabel('Preparando imagem…')
    setState('processing')

    try {
      // Preprocess for better OCR accuracy
      const processed = await preprocessForOCR(file)
      setProgressLabel('Iniciando OCR…')

      const worker = await createWorker('por+eng', 1, {
        logger: (m: { status: string; progress: number }) => {
          if (m.status === 'loading tesseract core') setProgressLabel('Carregando OCR…')
          if (m.status === 'loading language traineddata') setProgressLabel('Carregando idioma…')
          if (m.status === 'recognizing text') {
            setProgress(Math.round((m.progress ?? 0) * 100))
            setProgressLabel(`Lendo texto… ${Math.round((m.progress ?? 0) * 100)}%`)
          }
        },
      })
      const { data } = await worker.recognize(processed)
      await worker.terminate()

      const extracted = data.text.trim()
      if (!extracted) {
        setOcrError('Nenhum texto encontrado. Tente uma imagem com mais contraste ou escreva manualmente.')
        setState('menu')
        return
      }

      const block = detectWorkoutBlock(extracted)
      setFullText(extracted)
      setWorkoutBlock(block)
      setTrimmed(false)
      // Default: show full text so user can decide whether to trim
      setText(extracted)
      setState('review')
    } catch {
      setOcrError('Erro ao processar imagem. Tente novamente.')
      setState('menu')
    }
  }

  async function save() {
    setSaving(true)
    try {
      if (!text.trim()) {; setSaving(false); return }
      const sections = parseTextIntoSections(text)

      const { error } = await supabase.rpc('personal_save_workout', {
        p_athlete_id: userId,
        p_workout_date: date,
        p_focus: [],
        p_notes: null,
        p_sections: sections,
      })
      if (error) throw error
      reset()
      onDone()
    } catch (err: unknown) {
    } finally {
      setSaving(false)
    }
  }

  if (!open) return null

  return (
    <>
      <div className="fixed inset-0 z-40" style={{ background: 'rgba(0,0,0,0.6)' }} onClick={handleClose} />
      <div
        className={[
          'fixed z-50 flex flex-col',
          // Mobile: bottom sheet
          'bottom-0 left-0 right-0',
          // Desktop: centered modal with full border
          'md:bottom-auto md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2',
          'md:right-auto md:w-[600px] md:border md:border-[#2A2A2A]',
        ].join(' ')}
        style={{ background: '#111111', borderTop: '1px solid #2A2A2A', maxHeight: '90vh' }}
      >
        {/* Handle (mobile only) */}
        <div className="flex justify-center pt-3 pb-2 shrink-0 md:hidden">
          <div style={{ width: 32, height: 3, background: '#3D3D3B' }} />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 pb-4 shrink-0" style={{ borderBottom: '1px solid #2A2A2A' }}>
          <div>
            {state !== 'menu' && state !== 'processing' && (
              <button
                onClick={() => { setState('menu'); setOcrError(null) }}
                className="font-mono font-bold uppercase tracking-[0.12em] text-[10px] text-[#6B6B68] active:text-soft-white flex items-center gap-1 mb-1"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M15 19l-7-7 7-7" />
                </svg>
                Voltar
              </button>
            )}
            <span className="font-mono font-bold uppercase tracking-[0.18em] text-[11px] text-[#A8A8A4] block">
              {state === 'menu'       ? 'Adicionar treino' :
               state === 'manual'    ? 'Escrever manualmente' :
               state === 'processing'? 'Processando imagem…' :
                                       'Revisar treino'}
            </span>
          </div>
          <button onClick={handleClose} className="text-[#6B6B68] active:text-soft-white" style={{ padding: 8 }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="overflow-y-auto flex-1">

          {/* ── MENU ─────────────────────────────────────────────────── */}
          {state === 'menu' && (
            <div className="py-2">
              {ocrError && (
                <div className="mx-5 mt-3 mb-1 px-4 py-3" style={{ background: '#1A0000', border: '1px solid #FF4444' }}>
                  <span className="font-mono text-[11px] uppercase tracking-[0.1em]" style={{ color: '#FF4444' }}>{ocrError}</span>
                </div>
              )}

              {/* Manual */}
              <button
                onClick={() => { setState('manual'); setText('') }}
                className="w-full flex items-center gap-4 px-5 py-4 active:bg-[#141414]"
                style={{ borderBottom: '1px solid #1A1A1A' }}
              >
                <div className="flex items-center justify-center shrink-0" style={{ width: 40, height: 40, background: '#1A1A1A', border: '1px solid #2A2A2A' }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#A8A8A4" strokeWidth="1.8">
                    <path d="M12 20h9M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z" />
                  </svg>
                </div>
                <div className="text-left">
                  <span className="font-sans font-bold text-[15px] text-soft-white block">Type manually</span>
                  <span className="font-mono text-[11px] text-[#6B6B68]">Type or paste the workout content</span>
                </div>
              </button>

              {/* Camera */}
              <button
                onClick={() => cameraRef.current?.click()}
                className="w-full flex items-center gap-4 px-5 py-4 active:bg-[#141414]"
                style={{ borderBottom: '1px solid #1A1A1A' }}
              >
                <div className="flex items-center justify-center shrink-0" style={{ width: 40, height: 40, background: '#1A1A1A', border: '1px solid #2A2A2A' }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#A8A8A4" strokeWidth="1.8">
                    <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z" />
                    <circle cx="12" cy="13" r="4" />
                  </svg>
                </div>
                <div className="text-left">
                  <span className="font-sans font-bold text-[15px] text-soft-white block">Take a photo</span>
                  <span className="font-mono text-[11px] text-[#6B6B68]">Use camera — OCR extracts the text</span>
                </div>
              </button>

              {/* Gallery */}
              <button
                onClick={() => galleryRef.current?.click()}
                className="w-full flex items-center gap-4 px-5 py-4 active:bg-[#141414]"
                style={{ borderBottom: '1px solid #1A1A1A' }}
              >
                <div className="flex items-center justify-center shrink-0" style={{ width: 40, height: 40, background: '#1A1A1A', border: '1px solid #2A2A2A' }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#A8A8A4" strokeWidth="1.8">
                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                    <circle cx="8.5" cy="8.5" r="1.5" />
                    <polyline points="21 15 16 10 5 21" />
                  </svg>
                </div>
                <div className="text-left">
                  <span className="font-sans font-bold text-[15px] text-soft-white block">Escolher da galeria</span>
                  <span className="font-mono text-[11px] text-[#6B6B68]">Screenshot ou foto salva — OCR extrai o texto</span>
                </div>
              </button>

              {/* AI generate (role-gated) */}
              {hasAIRole && !generatedThisWeek && onOpenGenerate && (
                <button
                  onClick={() => { handleClose(); onOpenGenerate() }}
                  className="w-full flex items-center gap-4 px-5 py-4 active:bg-[#141414]"
                  style={{ borderBottom: '1px solid #1A1A1A' }}
                >
                  <div className="flex items-center justify-center shrink-0" style={{ width: 40, height: 40, background: '#1A1A1A', border: '1px solid #2A2A2A' }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#D4FF3A" strokeWidth="1.8">
                      <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
                    </svg>
                  </div>
                  <div className="text-left">
                    <span className="font-sans font-bold text-[15px] text-soft-white block">Gerar plano da semana</span>
                    <span className="font-mono text-[11px] text-[#6B6B68]">Crie um plano personalizado para a semana</span>
                  </div>
                </button>
              )}

              {/* Hidden file inputs */}
              <input ref={cameraRef}  type="file" accept="image/*" capture="environment" className="hidden" onChange={handleImageSelected} />
              <input ref={galleryRef} type="file" accept="image/*" className="hidden" onChange={handleImageSelected} />
            </div>
          )}

          {/* ── PROCESSING ───────────────────────────────────────────── */}
          {state === 'processing' && (
            <div className="flex flex-col items-center justify-center py-16 px-5 gap-6">
              <div className="w-10 h-10 border-2 border-lime border-t-transparent rounded-full animate-spin" />
              <div className="w-full" style={{ maxWidth: 260 }}>
                <div style={{ height: 3, background: '#1A1A1A' }}>
                  <div style={{ height: 3, background: '#D4FF3A', width: `${progress}%`, transition: 'width 0.3s' }} />
                </div>
                <span className="font-mono text-[10px] uppercase tracking-widest text-[#6B6B68] block text-center mt-2">
                  {progressLabel || 'Preparando…'}
                </span>
              </div>
            </div>
          )}

          {/* ── MANUAL ───────────────────────────────────────────────── */}
          {state === 'manual' && (
            <div className="px-5 py-4 flex flex-col gap-4">

              {/* Date */}
              <div>
                <span className="font-mono font-bold uppercase tracking-[0.14em] text-[10px] text-[#6B6B68] block mb-2">Data do treino</span>
                <input
                  type="date"
                  value={date}
                  onChange={e => setDate(e.target.value)}
                  className="font-mono text-[13px] text-soft-white bg-transparent outline-none w-full"
                  style={{ borderBottom: '1px solid #2A2A2A', paddingBottom: 6, colorScheme: 'dark' }}
                />
              </div>

              {/* Content */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="font-mono font-bold uppercase tracking-[0.14em] text-[10px] text-[#6B6B68]">Workout content</span>
                  <div className="flex" style={{ border: '1px solid #2A2A2A' }}>
                    <button onClick={() => setViewMode('edit')}
                      className="font-mono font-bold uppercase tracking-[0.12em] text-[10px] px-3 py-1"
                      style={{ background: viewMode === 'edit' ? '#D4FF3A' : '#1A1A1A', color: viewMode === 'edit' ? '#0A0A0A' : '#6B6B68' }}>
                      Editar
                    </button>
                    <button onClick={() => setViewMode('preview')}
                      className="font-mono font-bold uppercase tracking-[0.12em] text-[10px] px-3 py-1"
                      style={{ background: viewMode === 'preview' ? '#D4FF3A' : '#1A1A1A', color: viewMode === 'preview' ? '#0A0A0A' : '#6B6B68', borderLeft: '1px solid #2A2A2A' }}>
                      Visualizar
                    </button>
                  </div>
                </div>
                {viewMode === 'edit' ? (
                  <textarea
                    value={text}
                    onChange={e => setText(e.target.value)}
                    placeholder="Cole ou escreva o treino aqui..."
                    rows={12}
                    className="w-full bg-transparent font-mono text-[13px] text-soft-white outline-none resize-none"
                    style={{ border: '1px solid #2A2A2A', padding: '10px 12px', lineHeight: 1.6 }}
                    autoFocus
                  />
                ) : (
                  <WorkoutPreview text={text} />
                )}
              </div>
            </div>
          )}

          {/* ── REVIEW (OCR) ─────────────────────────────────────────── */}
          {state === 'review' && (
            <div className="px-5 py-4 flex flex-col gap-4">
              {/* OCR banner + trim controls */}
              <div style={{ background: '#0A1A00', border: '1px solid #2A3A1A', padding: '10px 14px' }}>
                <span className="font-mono text-[10px] uppercase tracking-[0.1em] block mb-2" style={{ color: '#6EBF5E' }}>
                  Extracted text — review and correct before saving
                </span>
                {workoutBlock && workoutBlock !== fullText && (
                  !trimmed ? (
                    <button
                      onClick={() => { setText(workoutBlock!); setTrimmed(true) }}
                      className="flex items-center gap-2 active:opacity-70"
                      style={{ background: '#D4FF3A', padding: '5px 12px' }}
                    >
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#0A0A0A" strokeWidth="2.5">
                        <path d="M6 2v20M18 2v20M3 12h18" /><circle cx="6" cy="6" r="2" /><circle cx="18" cy="6" r="2" />
                      </svg>
                      <span className="font-mono font-bold uppercase tracking-[0.14em] text-[10px]" style={{ color: '#0A0A0A' }}>
                        Trim — keep workout only
                      </span>
                    </button>
                  ) : (
                    <button
                      onClick={() => { setText(fullText); setTrimmed(false) }}
                      className="flex items-center gap-2 active:opacity-70"
                      style={{ border: '1px solid #2A3A1A', padding: '5px 12px' }}
                    >
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#6EBF5E" strokeWidth="2">
                        <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" /><path d="M3 3v5h5" />
                      </svg>
                      <span className="font-mono font-bold uppercase tracking-[0.14em] text-[10px]" style={{ color: '#6EBF5E' }}>
                        Restore full text
                      </span>
                    </button>
                  )
                )}
              </div>

              {/* Date */}
              <div>
                <span className="font-mono font-bold uppercase tracking-[0.14em] text-[10px] text-[#6B6B68] block mb-2">Data do treino</span>
                <input
                  type="date"
                  value={date}
                  onChange={e => setDate(e.target.value)}
                  className="font-mono text-[13px] text-soft-white bg-transparent outline-none w-full"
                  style={{ borderBottom: '1px solid #2A2A2A', paddingBottom: 6, colorScheme: 'dark' }}
                />
              </div>

              {/* Edit / preview toggle */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="font-mono font-bold uppercase tracking-[0.14em] text-[10px] text-[#6B6B68]">Workout content</span>
                  <div className="flex" style={{ border: '1px solid #2A2A2A' }}>
                    <button onClick={() => setViewMode('edit')}
                      className="font-mono font-bold uppercase tracking-[0.12em] text-[10px] px-3 py-1"
                      style={{ background: viewMode === 'edit' ? '#D4FF3A' : '#1A1A1A', color: viewMode === 'edit' ? '#0A0A0A' : '#6B6B68' }}>
                      Editar
                    </button>
                    <button onClick={() => setViewMode('preview')}
                      className="font-mono font-bold uppercase tracking-[0.12em] text-[10px] px-3 py-1"
                      style={{ background: viewMode === 'preview' ? '#D4FF3A' : '#1A1A1A', color: viewMode === 'preview' ? '#0A0A0A' : '#6B6B68', borderLeft: '1px solid #2A2A2A' }}>
                      Visualizar
                    </button>
                  </div>
                </div>
                {viewMode === 'edit' ? (
                  <textarea
                    value={text}
                    onChange={e => setText(e.target.value)}
                    rows={12}
                    className="w-full bg-transparent font-mono text-[13px] text-soft-white outline-none resize-none"
                    style={{ border: '1px solid #2A2A2A', padding: '10px 12px', lineHeight: 1.6 }}
                  />
                ) : (
                  <WorkoutPreview text={text} />
                )}
              </div>
            </div>
          )}
        </div>

        {/* ── SAVE FOOTER ─────────────────────────────────────────────── */}
        {(state === 'manual' || state === 'review') && (() => {
          const canSave = text.trim().length > 0
          return (
            <div className="px-5 py-4 shrink-0" style={{ borderTop: '1px solid #2A2A2A' }}>
              <button
                onClick={save}
                disabled={saving || !canSave}
                className="w-full font-mono font-bold uppercase tracking-[0.18em] text-[12px] py-4"
                style={{
                  background: canSave ? '#D4FF3A' : '#1A1A1A',
                  color: canSave ? '#0A0A0A' : '#3D3D3B',
                }}
              >
                {saving ? 'Salvando…' : 'Salvar treino'}
              </button>
            </div>
          )
        })()}
      </div>
    </>
  )
}

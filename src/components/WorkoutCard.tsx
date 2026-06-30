import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { PrescribedWorkoutData, WorkoutFeedback } from '@/types'
import { buildFormatLine, buildPrescription, dayLabel, formatDateBR } from '@/lib/workoutDisplay'

// ── Free-text workout renderer ────────────────────────────────────────
// Used when a section has notes but no structured exercises (imported/manual workouts)

type WLineType = 'format' | 'exercise' | 'note' | 'title' | 'plain' | 'empty'

function wClassify(line: string): WLineType {
  const t = line.trim()
  if (!t) return 'empty'
  // Block sub-headers
  if (/^(warm[\s-]?up|aquecimento|wod|strength|força|skill|conditioning|condicionamento|metcon|accessory|acessório|mobility|mobilidade|cardio)\s*[:\-–]?\s*$/i.test(t)) return 'title'
  if (t.length <= 35 && /^[A-ZÁÉÍÓÚÀÂÊÔÃÕÇ\s\-\/\.]+$/.test(t) && !/\d/.test(t) && t.length > 2) return 'title'
  // Format lines
  if (/\b(amrap|emom|for[\s-]?time|for[\s-]?load|tabata|every|chipper|ladder)\b/i.test(t)) return 'format'
  if (/^\d+\s*rounds?\s*(of|de|:)?\s*/i.test(t)) return 'format'
  if (/^(each\s+for\s+time|for\s+load|build\s+to|time\s+cap)/i.test(t)) return 'format'
  if (/^\d+r\b.*\b(each|for|time)\b/i.test(t)) return 'format'
  if (/^\d+-\d+(-\d+)+/.test(t)) return 'format'
  // Notes
  if (/^(\d+['´']\s*)?(rest|descanso)\b/i.test(t)) return 'note'
  if (/^(obs|scale|note|nota|objetivo|goal|time[\s-]?cap|rx\+?|scaled|cap|moderate|focus|technique|score|build)\b/i.test(t)) return 'note'
  // Exercises
  if (/\d+\s*[x×]\s*\d+/i.test(t)) return 'exercise'
  if (/\d+\s*rep(?:etições?|s)?/i.test(t)) return 'exercise'
  if (/\d+[\s,]*kg/i.test(t)) return 'exercise'
  if (/\d+[/\d]*\s*m\b/i.test(t)) return 'exercise'
  if (/\d+\s*cal\b/i.test(t)) return 'exercise'
  if (/\b(squat|deadlift|clean|snatch|jerk|press|pull[\s-]?up|push[\s-]?up|lunge|row|run|bike|jump|burpee|thruster|swing|box[\s-]?jump|muscle[\s-]?up|handstand|toes[\s-]?to[\s-]?bar|sit[\s-]?up|double[\s-]?under|rope|kettlebell|wall[\s-]?ball|kang|romanian)\b/i.test(t)) return 'exercise'
  if (/\b(agachamento|terra|supino|remada|corrida|polichinelo|desenvolvimento|levantamento|barra|halter|sino)\b/i.test(t)) return 'exercise'
  if (/^\d+\s+[a-z]/i.test(t)) return 'exercise'
  return 'plain'
}

function WorkoutNotesRenderer({ notes }: { notes: string }) {
  return (
    <div className="space-y-1.5">
      {notes.split('\n').map((line, i) => {
        const type = wClassify(line)
        const t = line.trim()
        if (type === 'empty') return <div key={i} style={{ height: 4 }} />
        if (type === 'format') return (
          <p key={i} className="text-lime text-[13px] font-black tracking-wide mt-0.5 uppercase">{t}</p>
        )
        if (type === 'exercise') return (
          <p key={i} className="text-soft-white font-bold text-[15px] leading-snug uppercase tracking-wide">{t}</p>
        )
        if (type === 'note') return (
          <p key={i} className="text-muted-gray/50 text-xs italic">{t}</p>
        )
        if (type === 'title') return (
          <p key={i} className="text-[11px] font-black text-muted-gray tracking-[0.12em] uppercase mt-2">{t}:</p>
        )
        return <p key={i} className="text-muted-gray/70 text-sm leading-relaxed">{t}</p>
      })}
    </div>
  )
}

const FOCUS_LABELS: Record<string, string> = {
  superior: 'Upper', inferior: 'Lower', full_body: 'Full Body',
  core: 'Core', cardio: 'Cardio', mobilidade: 'Mobility',
  forca: 'Strength', tecnica: 'Technique', crossfit: 'CrossFit',
}

// ── Feedback display helpers ──────────────────────────────────────────

const STATUS_LABELS: Record<string, string> = {
  completed:           'Done',
  partially_completed: 'Partially done',
  skipped:             'Skipped',
}
const STATUS_COLORS: Record<string, string> = {
  completed:           'text-lime',
  partially_completed: 'text-amber-400',
  skipped:             'text-muted-gray/50',
}
const ENJOYMENT_LABELS: Record<string, string> = {
  liked: 'Liked', neutral: 'Neutral', disliked: 'Disliked',
}
const DIFFICULTY_LABELS: Record<string, string> = {
  easy: 'Light', appropriate: 'Just right', too_hard: 'Too hard',
}

// ── Feedback sheet (student-facing) ──────────────────────────────────

interface FeedbackSheetProps {
  workoutId: string
  initialStatus: 'completed' | 'partially_completed' | 'skipped'
  existing?: WorkoutFeedback | null
  onSaved: (feedback: WorkoutFeedback) => void
  onClose: () => void
}

function FeedbackSheet({ workoutId, initialStatus, existing, onSaved, onClose }: FeedbackSheetProps) {
  const [enjoyment, setEnjoyment] = useState<'liked' | 'neutral' | 'disliked' | null>(
    existing?.enjoyment ?? null
  )
  const [difficulty, setDifficulty] = useState<'easy' | 'appropriate' | 'too_hard' | null>(
    existing?.perceived_difficulty ?? null
  )
  const [comment, setComment] = useState(existing?.student_comment ?? '')
  const [saving, setSaving] = useState(false)

  async function handleSave() {
    setSaving(true)
    try {
      const { error } = await supabase.rpc('save_workout_feedback', {
        p_workout_id:           workoutId,
        p_status:               initialStatus,
        p_enjoyment:            enjoyment ?? null,
        p_perceived_difficulty: difficulty ?? null,
        p_student_comment:      comment.trim() || null,
      })
      if (error) throw error
      onSaved({
        workout_id:          workoutId,
        status:              initialStatus,
        enjoyment:           enjoyment ?? null,
        perceived_difficulty: difficulty ?? null,
        student_comment:     comment.trim() || null,
        completed_at:        ['completed', 'partially_completed'].includes(initialStatus) ? new Date().toISOString() : null,
      })
      onClose()
    } catch (err) {
      console.error('save_workout_feedback error:', err)
    } finally {
      setSaving(false)
    }
  }

  const btnBase = 'flex-1 py-2.5 text-[12px] font-bold tracking-wide border transition-all'

  return (
    <div className="fixed inset-0 z-50 flex items-end" onClick={onClose}>
      <div className="absolute inset-0 bg-black/70" />
      <div
        className="relative w-full bg-graphite border-t border-white/10 rounded-t-3xl px-5 pt-5 pb-8 space-y-5"
        onClick={e => e.stopPropagation()}
      >
        {/* Handle */}
        <div className="absolute top-2.5 left-1/2 -translate-x-1/2 w-9 h-1 bg-white/15 rounded-full" />

        <p className="text-soft-white font-black text-base">Como foi o treino?</p>

        {/* Enjoyment */}
        <div>
          <p className="text-[10px] font-bold text-muted-gray/50 uppercase tracking-widest mb-2">How was it?</p>
          <div className="flex gap-2">
            {([
              { value: 'liked',    label: 'Liked' },
              { value: 'neutral',  label: 'Neutral' },
              { value: 'disliked', label: 'Disliked' },
            ] as const).map(opt => (
              <button key={opt.value}
                onClick={() => setEnjoyment(enjoyment === opt.value ? null : opt.value)}
                className={`${btnBase} ${enjoyment === opt.value
                  ? 'bg-lime/15 border-lime/50 text-lime'
                  : 'bg-white/5 border-white/10 text-muted-gray/60'
                }`}>
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Difficulty */}
        <div>
          <p className="text-[10px] font-bold text-muted-gray/50 uppercase tracking-widest mb-2">Intensity</p>
          <div className="flex gap-2">
            {([
              { value: 'easy',        label: 'Light' },
              { value: 'appropriate', label: 'Just right' },
              { value: 'too_hard',    label: 'Too hard' },
            ] as const).map(opt => (
              <button key={opt.value}
                onClick={() => setDifficulty(difficulty === opt.value ? null : opt.value)}
                className={`${btnBase} ${difficulty === opt.value
                  ? 'bg-lime/15 border-lime/50 text-lime'
                  : 'bg-white/5 border-white/10 text-muted-gray/60'
                }`}>
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Optional comment */}
        <div>
          <p className="text-[10px] font-bold text-muted-gray/50 uppercase tracking-widest mb-2">Comment</p>
          <textarea
            value={comment}
            onChange={e => setComment(e.target.value)}
            rows={2}
            placeholder="How was the workout? Anything too heavy, too easy, or uncomfortable?"
            className="w-full bg-white/5 border border-white/10 text-soft-white text-sm placeholder:text-muted-gray/25 px-3 py-2.5 resize-none focus:outline-none focus:border-lime/40"
          />
        </div>

        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full bg-lime text-graphite font-black text-sm py-3.5 tracking-wide disabled:opacity-40 transition-opacity"
        >
          {saving ? 'Saving…' : 'Save'}
        </button>
      </div>
    </div>
  )
}

// ── Feedback summary (read-only) ──────────────────────────────────────

function FeedbackSummary({ feedback }: { feedback: WorkoutFeedback; isCoach?: boolean }) {
  return (
    <div className="space-y-2">
      <p className="text-[9px] font-black text-muted-gray/35 uppercase tracking-widest">Feedback do treino</p>
      <div className="flex flex-wrap gap-2 items-center">
        <span className={`text-[11px] font-bold px-2.5 py-1 border ${
          feedback.status === 'completed'           ? 'border-lime/30 bg-lime/10 text-lime' :
          feedback.status === 'partially_completed' ? 'border-amber-400/30 bg-amber-400/10 text-amber-400' :
                                                      'border-white/10 bg-white/5 text-muted-gray/50'
        }`}>
          {STATUS_LABELS[feedback.status]}
        </span>
        {feedback.enjoyment && (
          <span className="text-[11px] font-medium text-muted-gray/55 px-2 py-1 border border-white/8 bg-white/3">
            {ENJOYMENT_LABELS[feedback.enjoyment]}
          </span>
        )}
        {feedback.perceived_difficulty && (
          <span className={`text-[11px] font-medium px-2 py-1 border ${
            feedback.perceived_difficulty === 'too_hard'
              ? 'border-amber-400/20 bg-amber-400/5 text-amber-400/70'
              : 'border-white/8 bg-white/3 text-muted-gray/55'
          }`}>
            {DIFFICULTY_LABELS[feedback.perceived_difficulty]}
          </span>
        )}
      </div>
      {feedback.student_comment && (
        <p className="text-muted-gray/40 text-[11px] italic leading-relaxed border-l-2 border-white/10 pl-2.5">
          "{feedback.student_comment}"
        </p>
      )}
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────

interface WorkoutCardProps {
  workout: PrescribedWorkoutData
  defaultExpanded?: boolean
  onEdit?: () => void
  onDelete?: () => void
  /** Pass user.id when rendering in student view to enable feedback */
  userId?: string
  /** Called when student submits/updates feedback */
  onFeedbackChange?: (workoutId: string, feedback: WorkoutFeedback) => void
  /** True when rendered in coach/personal view — shows feedback read-only */
  isCoachView?: boolean
}

export default function WorkoutCard({
  workout,
  defaultExpanded = false,
  onEdit,
  onDelete,
  userId,
  onFeedbackChange,
  isCoachView = false,
}: WorkoutCardProps) {
  const [expanded, setExpanded] = useState(defaultExpanded)
  const [confirming, setConfirming] = useState(false)
  const [localFeedback, setLocalFeedback] = useState<WorkoutFeedback | null>(workout.feedback ?? null)
  const [pendingStatus, setPendingStatus] = useState<'completed' | 'partially_completed' | 'skipped' | null>(null)

  const today = new Date()
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
  const isToday = workout.workout_date === todayStr
  const isPast  = workout.workout_date < todayStr

  const totalEx = workout.sections.reduce((a, s) => a + s.exercises.length, 0)

  // Student can give feedback on past and today's workouts
  const canFeedback = !!userId && (isToday || isPast) && !isCoachView

  function handleStatusClick(status: 'completed' | 'partially_completed' | 'skipped') {
    if (status === 'skipped') {
      // Skipped — save immediately without extra feedback
      supabase.rpc('save_workout_feedback', {
        p_workout_id: workout.id,
        p_status: 'skipped',
        p_enjoyment: null,
        p_perceived_difficulty: null,
        p_student_comment: null,
      }).then(({ error }) => {
        if (!error) {
          const fb: WorkoutFeedback = { workout_id: workout.id, status: 'skipped' }
          setLocalFeedback(fb)
          onFeedbackChange?.(workout.id, fb)
        }
      })
    } else {
      // Completed or partial — open feedback sheet
      setPendingStatus(status)
    }
  }

  function handleFeedbackSaved(feedback: WorkoutFeedback) {
    setLocalFeedback(feedback)
    onFeedbackChange?.(workout.id, feedback)
  }

  return (
    <>
      {pendingStatus && (
        <FeedbackSheet
          workoutId={workout.id}
          initialStatus={pendingStatus}
          existing={localFeedback}
          onSaved={handleFeedbackSaved}
          onClose={() => setPendingStatus(null)}
        />
      )}

      <div className={`relative rounded-2xl border overflow-hidden ${
        isToday ? 'bg-card border-lime/30' : isPast ? 'bg-card border-white/5 opacity-85' : 'bg-card border-white/5'
      }`}>

        {/* ── Card header ── */}
        <button
          className="w-full flex items-start gap-3 px-4 pt-4 pb-3 text-left"
          onClick={() => setExpanded(e => !e)}
        >
          {/* Date badge */}
          <div className={`min-w-[44px] h-[44px] rounded-xl flex flex-col items-center justify-center shrink-0 ${
            isToday ? 'bg-lime' : 'bg-white/8'
          }`}>
            <span className={`text-[9px] font-bold uppercase tracking-wide ${isToday ? 'text-graphite/70' : 'text-muted-gray/60'}`}>
              {dayLabel(workout.workout_date).slice(0, 3)}
            </span>
            <span className={`text-[17px] font-black leading-tight ${isToday ? 'text-graphite' : 'text-soft-white'}`}>
              {workout.workout_date.split('-')[2]}
            </span>
          </div>

          <div className="flex-1 min-w-0 pt-0.5">
            {/* Date + trainer/source */}
            <p className={`text-xs font-semibold ${isToday ? 'text-lime' : 'text-muted-gray/60'}`}>
              {isToday ? 'Hoje · ' : ''}{dayLabel(workout.workout_date)}, {formatDateBR(workout.workout_date)}
              {workout.source !== 'ai' && workout.trainer_name && (
                <span className="text-muted-gray/40"> · {workout.trainer_name}</span>
              )}
            </p>

            {/* Focus tags */}
            {workout.focus?.length ? (
              <div className="flex flex-wrap gap-1.5 mt-1.5">
                {workout.focus.map(f => (
                  <span key={f}
                    className={`text-[11px] font-bold px-2.5 py-0.5 border ${
                      isToday
                        ? 'bg-lime/15 border-lime/30 text-lime'
                        : 'bg-white/6 border-white/10 text-muted-gray'
                    }`}>
                    {FOCUS_LABELS[f] ?? f}
                  </span>
                ))}
              </div>
            ) : null}

            {/* Summary line */}
            <div className="flex items-center gap-2 mt-1.5">
              <p className="text-muted-gray/40 text-[11px]">
                {workout.sections.length} block{workout.sections.length !== 1 ? 's' : ''}
                {totalEx > 0 ? ` · ${totalEx} exercise${totalEx !== 1 ? 's' : ''}` : ''}
              </p>
              {/* Feedback status chip in header */}
              {localFeedback && (
                <span className={`text-[10px] font-bold ${STATUS_COLORS[localFeedback.status]}`}>
                  · {STATUS_LABELS[localFeedback.status]}
                </span>
              )}
            </div>
          </div>

          <svg className={`w-4 h-4 mt-1 text-muted-gray/30 shrink-0 transition-transform ${expanded ? 'rotate-180' : ''}`}
            fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {onEdit && (
          <button
            onClick={e => { e.stopPropagation(); onEdit() }}
            className="absolute top-3 right-[60px] p-1.5 text-muted-gray/30 hover:text-lime transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </button>
        )}
        {onDelete && (
          confirming ? (
            <div className="absolute top-2.5 right-10 flex items-center gap-1.5 bg-card border border-warning/25 rounded-xl px-2.5 py-1.5 z-10"
              onClick={e => e.stopPropagation()}>
              <span className="text-warning text-[10px] font-semibold whitespace-nowrap">Delete?</span>
              <button onClick={() => { setConfirming(false); onDelete() }}
                className="text-[10px] font-bold text-graphite bg-warning px-2 py-0.5 rounded-lg">
                Yes
              </button>
              <button onClick={() => setConfirming(false)}
                className="text-[10px] text-muted-gray bg-white/8 px-2 py-0.5 rounded-lg">
                No
              </button>
            </div>
          ) : (
            <button
              onClick={e => { e.stopPropagation(); setConfirming(true) }}
              className="absolute top-3 right-10 p-1.5 text-muted-gray/30 hover:text-warning transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          )
        )}

        {/* ── Expanded content ── */}
        {expanded && (
          <div className="border-t border-white/6 px-3 pb-3 pt-2.5 space-y-2">

            {/* Student note — shown to student above sections */}
            {workout.student_note && (
              <div className="bg-lime/5 border border-lime/15 px-3.5 py-3">
                <p className="text-[9px] font-black text-lime/60 uppercase tracking-widest mb-1">Note</p>
                <p className="text-soft-white/80 text-[13px] leading-relaxed">{workout.student_note}</p>
              </div>
            )}

            {workout.sections.map(section => {
              const formatLine = buildFormatLine(section)
              return (
              <div key={section.id} className="bg-white/[0.03] border border-white/8 px-3.5 py-3.5 space-y-3">
                {/* Section header */}
                <div>
                  <p className="text-[10px] font-black tracking-[0.14em] uppercase leading-none">
                    <span className="text-lime">{section.section_type.replace(/_/g, ' ')}</span>
                    <span className="text-white/30 mx-1">·</span>
                    <span className="text-white/55 normal-case tracking-normal font-semibold">{section.label}</span>
                    {section.modality_tags && section.modality_tags.length > 0 && (
                      <span className="ml-2 text-white/25 normal-case font-normal tracking-normal">
                        · {(section.modality_tags as string[]).join(', ')}
                      </span>
                    )}
                  </p>
                  {formatLine && (
                    <p className="text-white/35 text-[11px] font-semibold tracking-wider mt-1.5 pl-0.5">
                      {formatLine}
                    </p>
                  )}
                </div>

                {/* Exercises */}
                <div className="space-y-3">
                  {section.exercises.map(ex => {
                    const lines = buildPrescription(ex)
                    return (
                      <div key={ex.id}>
                        {/* Exercise name */}
                        <p className="text-soft-white font-bold text-[14px] leading-snug">
                          {ex.movement_name}
                        </p>
                        {/* Prescription lines */}
                        {lines.map((line, i) => (
                          <p key={i} className={`text-[12px] leading-relaxed mt-0.5 ${
                            line.startsWith('*') ? 'text-muted-gray/35 italic' : 'text-muted-gray/60 font-medium'
                          }`}>
                            {line.startsWith('*') ? line.slice(1) : line}
                          </p>
                        ))}
                        {/* Notes */}
                        {ex.notes && (
                          <p className="text-muted-gray/30 text-[11px] italic mt-0.5">
                            {ex.notes}
                          </p>
                        )}
                      </div>
                    )
                  })}
                </div>

                {/* Section notes — rich rendering for text-only sections, plain for supplementary */}
                {section.notes && section.exercises.length === 0 && (
                  <WorkoutNotesRenderer notes={section.notes} />
                )}
                {section.notes && section.exercises.length > 0 && (
                  <p className="text-muted-gray/50 text-xs italic border-t border-white/5 pt-2">
                    {section.notes}
                  </p>
                )}
              </div>
              )
            })}

            {/* Workout-level notes */}
            {workout.notes && (
              <div className="px-1 py-2">
                <p className="text-[10px] font-bold text-muted-gray/40 uppercase tracking-widest mb-1">Notes</p>
                <p className="text-muted-gray/70 text-sm leading-relaxed">{workout.notes}</p>
              </div>
            )}

            {/* ── Student feedback section ── */}
            {canFeedback && (
              <div className="bg-white/[0.02] border border-white/6 px-3.5 py-3.5">
                {localFeedback ? (
                  /* Has feedback — show summary + edit option */
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <p className="text-[10px] font-black text-muted-gray/35 uppercase tracking-widest">Your feedback</p>
                      <button
                        onClick={() => setPendingStatus(localFeedback.status)}
                        className="text-[10px] text-muted-gray/40 underline underline-offset-2"
                      >
                        Edit
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <span className={`text-[12px] font-bold px-2.5 py-1 border ${
                        localFeedback.status === 'completed'           ? 'border-lime/30 bg-lime/10 text-lime' :
                        localFeedback.status === 'partially_completed' ? 'border-amber-400/30 bg-amber-400/10 text-amber-400' :
                                                                          'border-white/10 bg-white/5 text-muted-gray/50'
                      }`}>
                        {STATUS_LABELS[localFeedback.status]}
                      </span>
                      {localFeedback.enjoyment && (
                        <span className="text-[12px] font-semibold text-muted-gray/60 px-2.5 py-1 border border-white/8 bg-white/5">
                          {ENJOYMENT_LABELS[localFeedback.enjoyment]}
                        </span>
                      )}
                      {localFeedback.perceived_difficulty && (
                        <span className="text-[12px] font-semibold text-muted-gray/60 px-2.5 py-1 border border-white/8 bg-white/5">
                          {DIFFICULTY_LABELS[localFeedback.perceived_difficulty]}
                        </span>
                      )}
                    </div>
                    {localFeedback.student_comment && (
                      <p className="text-muted-gray/40 text-[12px] italic">
                        "{localFeedback.student_comment}"
                      </p>
                    )}
                  </div>
                ) : (
                  /* No feedback yet — show status buttons */
                  <div className="space-y-3">
                    <p className="text-[10px] font-black text-muted-gray/40 uppercase tracking-widest">Workout feedback</p>
                    <div className="space-y-2">
                      <button
                        onClick={() => handleStatusClick('completed')}
                        className="w-full py-3 text-[13px] font-bold border border-lime/30 bg-lime/10 text-lime tracking-wide"
                      >
                        I did it
                      </button>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleStatusClick('partially_completed')}
                          className="flex-1 py-2.5 text-[12px] font-bold border border-white/10 bg-white/5 text-muted-gray/70 tracking-wide"
                        >
                          Partial
                        </button>
                        <button
                          onClick={() => handleStatusClick('skipped')}
                          className="flex-1 py-2.5 text-[12px] font-bold border border-white/8 bg-white/3 text-muted-gray/35 tracking-wide"
                        >
                          Skipped
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ── Coach view: show student feedback read-only ── */}
            {isCoachView && localFeedback && (
              <div className="bg-white/[0.02] border border-white/6 px-3.5 py-3">
                <FeedbackSummary feedback={localFeedback} isCoach />
              </div>
            )}
          </div>
        )}
      </div>
    </>
  )
}

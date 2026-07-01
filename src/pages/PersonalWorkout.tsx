import React, { useState, useEffect, useRef } from 'react'
import { useNavigate, useSearchParams, useLocation } from 'react-router-dom'
import type { PrescribedWorkoutData } from '@/types'
import { supabase } from '@/lib/supabase'
import {
  type SectionType,
  type TrainingFocus,
  SECTION_LABELS,
  FOCUS_LABELS,
  getSuggestions,
  isWeighted,
} from '@/lib/exerciseLibrary'

// ── Types ──────────────────────────────────────────────────────────────

interface AthletePR {
  movement_name: string
  reps: number
  max_weight: number
}

interface DraftExercise {
  tempId: string
  movement_name: string
  sets: string
  reps: string
  duration_min: string
  duration_sec: string
  load_kg: string
  load_kg_to: string
  load_pct_1rm: string
  load_pct_1rm_to: string
  rpe: string
  rest_seconds: string
  notes: string
}

type FormatType = 'LIVRE' | 'AMRAP' | 'FOR_TIME' | 'EMOM' | 'TABATA' | 'ROUNDS' | 'INTERVAL' | 'UNBROKEN'

const WORKOUT_TAGS = ['Partner WOD', 'Team WOD'] as const
type WorkoutTag = typeof WORKOUT_TAGS[number]

const SECTION_MODALITY_TAGS = ['Chipper', 'Ladder', 'Buy-in', 'Cash-out', 'YIGI', 'Complex'] as const
type SectionModalityTag = typeof SECTION_MODALITY_TAGS[number]

interface DraftSection {
  tempId: string
  section_type: SectionType
  label: string
  exercises: DraftExercise[]
  notes: string
  format_type: FormatType
  format_minutes: string
  format_rounds: string
  format_work_seconds: string
  format_rest_seconds: string
  format_rest_between_rounds: string
  format_interval_seconds: string
  format_time_cap: string
  modality_tags: SectionModalityTag[]
}

// ── Helpers ──────────────────────────────────────────────────────────

function uid(): string {
  return Math.random().toString(36).slice(2)
}

// ── Suggestion types & mapper ─────────────────────────────────────────

interface SuggestionExercise {
  movement_name: string
  sets: number | null
  reps: number | null
  duration_seconds: number | null
  load_kg: number | null
  load_pct_1rm: number | null
  rpe: number | null
  rest_seconds: number | null
  notes: string | null
  position: number
}

interface SuggestionSection {
  section_type: string
  label: string
  position: number
  format_type: string | null
  format_config: Record<string, number> | null
  notes: string | null
  exercises: SuggestionExercise[]
}

function suggestionToDraft(sections: SuggestionSection[]): DraftSection[] {
  return sections.map(s => ({
    tempId: uid(),
    section_type: s.section_type as SectionType,
    label: s.label,
    exercises: s.exercises.map(e => ({
      tempId: uid(),
      movement_name: e.movement_name,
      sets:            e.sets            != null ? String(e.sets)            : '',
      reps:            e.reps            != null ? String(e.reps)            : '',
      duration_min:    e.duration_seconds != null ? String(Math.floor(e.duration_seconds / 60)) : '',
      duration_sec:    e.duration_seconds != null ? String(e.duration_seconds % 60)              : '',
      load_kg:         e.load_kg         != null ? String(e.load_kg)         : '',
      load_kg_to:      '',
      load_pct_1rm:    e.load_pct_1rm    != null ? String(e.load_pct_1rm)    : '',
      load_pct_1rm_to: '',
      rpe:             e.rpe             != null ? String(e.rpe)             : '',
      rest_seconds:    e.rest_seconds    != null ? String(e.rest_seconds)    : '',
      notes:           e.notes ?? '',
    })),
    notes:                      s.notes ?? '',
    format_type:                ((s.format_type as FormatType) ?? 'LIVRE'),
    format_minutes:             s.format_config?.time_minutes     != null ? String(s.format_config.time_minutes)              : '',
    format_rounds:              s.format_config?.rounds           != null ? String(s.format_config.rounds)                    : '',
    format_work_seconds:        s.format_config?.work_seconds     != null ? String(s.format_config.work_seconds)              : '',
    format_rest_seconds:        s.format_config?.rest_seconds     != null ? String(s.format_config.rest_seconds)              : '',
    format_rest_between_rounds: s.format_config?.rest_between_rounds_seconds != null ? String(s.format_config.rest_between_rounds_seconds) : '',
    format_interval_seconds:    s.format_config?.interval_seconds != null ? String(s.format_config.interval_seconds)          : '',
    format_time_cap:            s.format_config?.time_cap_minutes != null ? String(s.format_config.time_cap_minutes)          : '',
    modality_tags: [],
  }))
}

// ── SuggestSheet ──────────────────────────────────────────────────────

type SuggestMode = 'full' | 'section'

const SUGGEST_FOCUS_OPTIONS = [
  { value: 'full_body',  label: 'Full Body' },
  { value: 'superior',   label: 'Upper Body' },
  { value: 'inferior',   label: 'Lower Body' },
  { value: 'forca',      label: 'Strength' },
  { value: 'crossfit',   label: 'CrossFit' },
  { value: 'cardio',     label: 'Cardio' },
  { value: 'tecnica',    label: 'Skill / Technique' },
  { value: 'mobilidade', label: 'Mobility' },
] as const

const SUGGEST_DURATIONS = [30, 45, 60] as const

const SUGGEST_INTENSITIES = [
  { value: 'leve',     label: 'Light',    desc: 'RPE 5–6 · Technique and active recovery' },
  { value: 'moderada', label: 'Moderate', desc: 'RPE 7 · Consistent effort without hitting the limit' },
  { value: 'intensa',  label: 'High',     desc: 'RPE 8–9 · Heavy loads, near the limit' },
] as const

const SINGLE_SECTION_TYPES = [
  { value: 'mobility',     label: 'Mobility',     desc: 'Joint activation and mobility' },
  { value: 'warm_up',      label: 'Warm-up',      desc: 'General warm-up' },
  { value: 'strength',     label: 'Strength',     desc: 'Barbell strength work' },
  { value: 'skill',        label: 'Skill',        desc: 'Technique and gymnastics' },
  { value: 'conditioning', label: 'Conditioning', desc: 'Metabolic work (AMRAP, EMOM…)' },
  { value: 'wod',          label: 'WOD / Metcon', desc: 'Full workout of the day' },
  { value: 'accessories',  label: 'Accessories',  desc: 'Supplemental work' },
  { value: 'cool_down',    label: 'Cool Down',    desc: 'Cool-down and stretching' },
] as const

function SuggestSheet({
  open,
  athleteId,
  currentFocus,
  onResult,
  onClose,
}: {
  open: boolean
  athleteId: string
  currentFocus: TrainingFocus[]
  onResult: (sections: DraftSection[], studentNote: string | null, additive: boolean) => void
  onClose: () => void
}) {
  const preselected = currentFocus.length === 1
    ? SUGGEST_FOCUS_OPTIONS.find(o => o.value === currentFocus[0])?.value ?? 'full_body'
    : 'full_body'

  const [mode, setMode] = useState<SuggestMode>('full')
  const [selectedFocus, setSelectedFocus] = useState<string>(preselected)
  const [selectedSectionType, setSelectedSectionType] = useState<string>('strength')
  const [duration, setDuration] = useState<number>(60)
  const [intensity, setIntensity] = useState<string>('moderada')
  const [coachNotes, setCoachNotes] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (open) {
      setMode('full')
      setSelectedFocus(preselected)
      setSelectedSectionType('strength')
      setLoading(false)
      setError(null)
      setCoachNotes('')
    }
  }, [open]) // eslint-disable-line react-hooks/exhaustive-deps

  async function generate() {
    setLoading(true)
    setError(null)
    try {
      const { data, error: fnErr } = await supabase.functions.invoke('suggest-workout', {
        body: {
          athlete_id: athleteId,
          focus: selectedFocus,
          duration_minutes: duration,
          intensity,
          mode,
          section_type: mode === 'section' ? selectedSectionType : undefined,
          coach_notes: coachNotes.trim() || undefined,
        },
      })
      if (fnErr) throw fnErr
      if (!data?.sections?.length) throw new Error('Empty suggestion. Please try again.')
      onResult(
        suggestionToDraft(data.sections as SuggestionSection[]),
        data.student_note ?? null,
        mode === 'section',
      )
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error generating suggestion. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-end" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60" />
      <div
        className="relative w-full bg-graphite border-t border-white/10 rounded-t-3xl flex flex-col"
        style={{ maxHeight: '92dvh' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Handle */}
        <div className="w-10 h-1 bg-white/20 rounded-full mx-auto mt-3 mb-1 shrink-0" />

        <div className="overflow-y-auto flex-1 px-5 pb-4 space-y-5">
          {/* Header */}
          <div className="pt-2">
            <h2 className="text-soft-white font-black text-lg">Suggest workout</h2>
            <p className="text-muted-gray/60 text-xs mt-1">
              Create a base to edit before sending to the athlete.
            </p>
          </div>

          {/* Mode selector */}
          <div className="flex bg-white/5 border border-white/8 rounded-xl p-1 gap-1">
            {([
              { value: 'full' as SuggestMode,    label: 'Full workout' },
              { value: 'section' as SuggestMode, label: 'Single section' },
            ]).map(opt => (
              <button
                key={opt.value}
                onClick={() => setMode(opt.value)}
                className={`flex-1 py-2.5 text-xs font-bold rounded-lg transition-all ${
                  mode === opt.value ? 'bg-lime text-graphite' : 'text-muted-gray/60'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          {/* ── Full workout fields ── */}
          {mode === 'full' && (
            <>
              {/* Focus */}
              <div>
                <p className="text-[11px] font-bold text-muted-gray uppercase tracking-widest mb-2">
                  Workout focus
                  {currentFocus.length === 1 && SUGGEST_FOCUS_OPTIONS.some(o => o.value === currentFocus[0]) && (
                    <span className="ml-2 text-lime/50 normal-case tracking-normal font-normal">
                      · using workout focus
                    </span>
                  )}
                </p>
                <div className="flex flex-wrap gap-2">
                  {SUGGEST_FOCUS_OPTIONS.map(opt => (
                    <button
                      key={opt.value}
                      onClick={() => setSelectedFocus(opt.value)}
                      className={`text-xs font-bold px-3 py-1.5 transition-all rounded-lg ${
                        selectedFocus === opt.value
                          ? 'bg-lime text-graphite'
                          : 'bg-white/5 text-muted-gray border border-white/10'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Duration */}
              <div>
                <p className="text-[11px] font-bold text-muted-gray uppercase tracking-widest mb-2">Duration</p>
                <div className="flex gap-2">
                  {SUGGEST_DURATIONS.map(d => (
                    <button
                      key={d}
                      onClick={() => setDuration(d)}
                      className={`flex-1 text-xs font-bold py-2.5 transition-all rounded-lg ${
                        duration === d
                          ? 'bg-lime text-graphite'
                          : 'bg-white/5 text-muted-gray border border-white/10'
                      }`}
                    >
                      {d} min
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* ── Single section fields ── */}
          {mode === 'section' && (
            <div>
              <p className="text-[11px] font-bold text-muted-gray uppercase tracking-widest mb-2">Section type</p>
              <div className="grid grid-cols-2 gap-2">
                {SINGLE_SECTION_TYPES.map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => setSelectedSectionType(opt.value)}
                    className={`text-left px-3 py-2.5 rounded-xl border transition-all ${
                      selectedSectionType === opt.value
                        ? 'border-lime/40 bg-lime/8'
                        : 'border-white/8 bg-white/3'
                    }`}
                  >
                    <p className={`text-xs font-bold ${
                      selectedSectionType === opt.value ? 'text-lime' : 'text-soft-white'
                    }`}>
                      {opt.label}
                    </p>
                    <p className="text-[10px] text-muted-gray/40 mt-0.5 leading-snug">{opt.desc}</p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Intensity — shown for both modes */}
          <div>
            <p className="text-[11px] font-bold text-muted-gray uppercase tracking-widest mb-2">Intensity</p>
            <div className="space-y-2">
              {SUGGEST_INTENSITIES.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => setIntensity(opt.value)}
                  className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-xl border transition-all text-left ${
                    intensity === opt.value
                      ? 'border-lime/40 bg-lime/8'
                      : 'border-white/8 bg-white/3'
                  }`}
                >
                  <div className={`w-2 h-2 rounded-full shrink-0 ${
                    intensity === opt.value ? 'bg-lime' : 'bg-white/20'
                  }`} />
                  <div>
                    <p className={`text-xs font-bold leading-none ${
                      intensity === opt.value ? 'text-lime' : 'text-soft-white'
                    }`}>
                      {opt.label}
                    </p>
                    <p className="text-[10px] text-muted-gray/50 mt-1">{opt.desc}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Optional coach notes */}
          <div>
            <p className="text-[11px] font-bold text-muted-gray uppercase tracking-widest mb-2">
              Coach notes
              <span className="ml-1.5 normal-case tracking-normal font-normal text-muted-gray/40">· optional</span>
            </p>
            <textarea
              value={coachNotes}
              onChange={e => setCoachNotes(e.target.value)}
              rows={2}
              placeholder="Ex: athlete returning from shoulder injury, prefers less upper body volume…"
              className="w-full bg-white/5 border border-white/10 rounded-xl text-soft-white text-xs placeholder:text-muted-gray/25 px-3 py-2.5 resize-none focus:outline-none focus:border-lime/40 transition-colors"
            />
          </div>

          {/* Error */}
          {error && (
            <div className="bg-warning/10 border border-warning/30 rounded-xl px-4 py-3">
              <p className="text-warning text-xs">{error}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 pb-8 pt-3 shrink-0 border-t border-white/8">
          <button
            onClick={generate}
            disabled={loading}
            className="w-full bg-lime disabled:opacity-50 text-graphite font-black text-sm py-4 rounded-2xl flex items-center justify-center gap-2 transition-opacity"
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-graphite/30 border-t-graphite rounded-full animate-spin" />
                Generating…
              </>
            ) : (
              mode === 'section' ? 'Create section' : 'Create suggestion'
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

function emptyExercise(name = ''): DraftExercise {
  return {
    tempId: uid(),
    movement_name: name,
    sets: '', reps: '', duration_min: '', duration_sec: '',
    load_kg: '', load_kg_to: '', load_pct_1rm: '', load_pct_1rm_to: '', rpe: '', rest_seconds: '', notes: '',
  }
}

function fmtDuration(min: string, sec: string): string {
  const m = parseInt(min || '0')
  const s = parseInt(sec || '0')
  if (m === 0 && s === 0) return ''
  if (m === 0) return `${s}s`
  return `${m}:${String(s).padStart(2, '0')}`
}

function durationToSeconds(min: string, sec: string): number | null {
  const m = parseInt(min || '0')
  const s = parseInt(sec || '0')
  const total = m * 60 + s
  return total > 0 ? total : null
}

function emptySection(type: SectionType): DraftSection {
  return {
    tempId: uid(),
    section_type: type,
    label: SECTION_LABELS[type],
    exercises: [],
    notes: '',
    format_type: 'LIVRE',
    format_minutes: '',
    format_rounds: '',
    format_work_seconds: '',
    format_rest_seconds: '',
    format_rest_between_rounds: '',
    format_interval_seconds: '',
    format_time_cap: '',
    modality_tags: [],
  }
}

function calcLoad(pr: number, pct: number): string {
  return String(Math.round((pr * pct) / 100 * 2) / 2)
}

const WORKOUT_TAG_KEYS: Record<string, WorkoutTag> = {
  partner_wod: 'Partner WOD',
  team_wod: 'Team WOD',
}

function splitFocus(allFocus: string[] | null): { focus: TrainingFocus[]; workoutTags: WorkoutTag[] } {
  const focus: TrainingFocus[] = []
  const workoutTags: WorkoutTag[] = []
  for (const f of allFocus ?? []) {
    if (WORKOUT_TAG_KEYS[f]) workoutTags.push(WORKOUT_TAG_KEYS[f])
    else focus.push(f as TrainingFocus)
  }
  return { focus, workoutTags }
}

function workoutToDraft(workout: PrescribedWorkoutData): DraftSection[] {
  return workout.sections.map(s => {
    const fc = (s.format_config ?? {}) as Record<string, unknown>
    const num = (k: string) => fc[k] != null ? String(fc[k]) : ''
    const existingTags = (
      s.modality_tags ??
      (Array.isArray(fc.modality_tags) ? (fc.modality_tags as string[]) : [])
    ).filter((t): t is SectionModalityTag => (SECTION_MODALITY_TAGS as readonly string[]).includes(t))
    return {
      tempId: uid(),
      section_type: s.section_type as SectionType,
      label: s.label,
      exercises: s.exercises.map(e => {
        const ds = e.duration_seconds ?? 0
        return {
          tempId: uid(),
          movement_name: e.movement_name,
          sets:            e.sets     != null ? String(e.sets)     : '',
          reps:            e.reps     != null ? String(e.reps)     : '',
          duration_min:    ds > 0 ? String(Math.floor(ds / 60)) : '',
          duration_sec:    ds > 0 ? String(ds % 60)              : '',
          load_kg:         e.load_kg         != null ? String(e.load_kg)         : '',
          load_kg_to:      e.load_kg_to      != null ? String(e.load_kg_to)      : '',
          load_pct_1rm:    e.load_pct_1rm    != null ? String(e.load_pct_1rm)    : '',
          load_pct_1rm_to: e.load_pct_1rm_to != null ? String(e.load_pct_1rm_to) : '',
          rpe:             e.rpe             != null ? String(e.rpe)             : '',
          rest_seconds:    e.rest_seconds    != null ? String(e.rest_seconds)    : '',
          notes:           e.notes ?? '',
        }
      }),
      notes:                      s.notes ?? '',
      format_type:                ((s.format_type ?? 'LIVRE') as FormatType),
      format_minutes:             num('time_minutes'),
      format_rounds:              num('rounds'),
      format_work_seconds:        num('work_seconds'),
      format_rest_seconds:        num('rest_seconds'),
      format_rest_between_rounds: num('rest_between_rounds_seconds'),
      format_interval_seconds:    num('interval_seconds'),
      format_time_cap:            num('time_cap_minutes'),
      modality_tags:              existingTags,
    }
  })
}

const PT_BR_DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

function dayName(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number)
  return PT_BR_DAYS[new Date(y, m - 1, d).getDay()]
}

function formatDate(dateStr: string): string {
  const [y, m, d] = dateStr.split('-')
  return `${d}/${m}/${y}`
}

// ── Sub-components ───────────────────────────────────────────────────

function Avatar({ name }: { name: string }) {
  const initials = name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() || '?'
  const colors = ['#B8FF3B', '#46C2FF', '#FFB84D', '#C084FC', '#F87171', '#34D399']
  const color = colors[name.charCodeAt(0) % colors.length]
  return (
    <div className="w-8 h-8 rounded-xl flex items-center justify-center font-black text-xs shrink-0"
      style={{ background: color + '20', color }}>
      {initials}
    </div>
  )
}

function PRBadge({ kg }: { kg: number }) {
  return (
    <span className="text-[10px] font-bold px-2 py-0.5 bg-lime/15 text-lime border border-lime/25">
      PR: {kg}kg
    </span>
  )
}

// ── Exercise row ─────────────────────────────────────────────────────

function ExerciseRow({ ex, prs, onChange, onDelete, dragHandleProps }: {
  ex: DraftExercise
  prs: AthletePR[]
  onChange: (updated: DraftExercise) => void
  onDelete: () => void
  dragHandleProps?: React.HTMLAttributes<HTMLSpanElement>
}) {
  const [expanded, setExpanded] = useState(false)
  const weighted = isWeighted(ex.movement_name)

  const pr1rm = prs.find(
    p => p.movement_name.toLowerCase() === ex.movement_name.toLowerCase() && p.reps === 1
  )

  function field(k: keyof DraftExercise, value: string) {
    onChange({ ...ex, [k]: value })
  }

  function applyPct() {
    if (!pr1rm) return
    const updated = { ...ex }
    if (ex.load_pct_1rm) {
      const pct = parseFloat(ex.load_pct_1rm)
      if (!isNaN(pct)) updated.load_kg = calcLoad(pr1rm.max_weight, pct)
    }
    if (ex.load_pct_1rm_to) {
      const pct = parseFloat(ex.load_pct_1rm_to)
      if (!isNaN(pct)) updated.load_kg_to = calcLoad(pr1rm.max_weight, pct)
    }
    onChange(updated)
  }

  const durStr = fmtDuration(ex.duration_min, ex.duration_sec)
  const loadDisplay = ex.load_kg && ex.load_kg_to
    ? `${ex.load_kg}–${ex.load_kg_to}kg`
    : ex.load_kg ? `${ex.load_kg}kg` : ''
  const summary = [
    ex.sets && ex.reps
      ? (ex.reps.includes('-') ? `${ex.sets}× (${ex.reps})` : `${ex.sets}×${ex.reps}`)
      : ex.sets ? `${ex.sets} sets`
      : ex.reps ? ex.reps
      : '',
    durStr,
    loadDisplay,
    ex.rpe ? `RPE ${ex.rpe}` : '',
  ].filter(Boolean).join(' · ')

  const inp = 'w-full bg-graphite border border-white/10 rounded-xl px-3 py-2 text-soft-white text-sm text-center focus:outline-none focus:border-lime/40 placeholder-muted-gray/25'

  return (
    <div className="bg-graphite rounded-xl border border-white/8 overflow-hidden">
      <div className="flex items-center">
        <span
          className="text-muted-gray/25 cursor-grab active:cursor-grabbing select-none pl-3 pr-1 py-3"
          style={{ fontSize: 14 }}
          {...dragHandleProps}
        >
          ⠿
        </span>
        <button
          className="flex-1 flex items-center gap-3 pr-3 py-3 text-left"
          onClick={() => setExpanded(e => !e)}
        >
          <div className="w-1.5 h-1.5 rounded-full bg-lime/60 shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="text-soft-white text-sm font-semibold leading-tight truncate">{ex.movement_name}</p>
            {summary ? (
              <p className="text-muted-gray/60 text-xs mt-0.5">{summary}</p>
            ) : (
              <p className="text-muted-gray/30 text-xs mt-0.5 italic">Configure…</p>
            )}
          </div>
          {pr1rm && !expanded && <PRBadge kg={pr1rm.max_weight} />}
          <svg className={`w-4 h-4 text-muted-gray/40 transition-transform ${expanded ? 'rotate-180' : ''}`}
            fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      </div>

      {expanded && (
        <div className="px-3 pb-3 space-y-3 border-t border-white/5 pt-3">
          {pr1rm && (
            <div className="flex items-center gap-2 bg-lime/8 border border-lime/20 rounded-xl px-3 py-2">
              <span className="text-lime text-xs font-bold">Athlete 1RM: {pr1rm.max_weight}kg</span>
            </div>
          )}

          <div className="grid grid-cols-3 gap-2">
            <div>
              <p className="text-[10px] text-muted-gray/50 uppercase tracking-wider mb-1">Sets</p>
              <input type="number" value={ex.sets} onChange={e => field('sets', e.target.value)}
                placeholder="ex: 3" min={1} className={inp} />
            </div>
            <div>
              <p className="text-[10px] text-muted-gray/50 uppercase tracking-wider mb-1">Reps / Scheme</p>
              <input type="text" value={ex.reps} onChange={e => field('reps', e.target.value)}
                placeholder="ex: 10 ou 21-15-9" className={inp} />
            </div>
            <div>
              <p className="text-[10px] text-muted-gray/50 uppercase tracking-wider mb-1">Time</p>
              <div className="flex items-center gap-1">
                <input type="number" value={ex.duration_min} onChange={e => field('duration_min', e.target.value)}
                  placeholder="0" min={0} max={99}
                  className="w-full bg-graphite border border-white/10 rounded-xl px-2 py-2 text-soft-white text-sm text-center focus:outline-none focus:border-lime/40 placeholder-muted-gray/25" />
                <span className="text-muted-gray/40 text-xs shrink-0">:</span>
                <input type="number" value={ex.duration_sec} onChange={e => field('duration_sec', e.target.value)}
                  placeholder="00" min={0} max={59}
                  className="w-full bg-graphite border border-white/10 rounded-xl px-2 py-2 text-soft-white text-sm text-center focus:outline-none focus:border-lime/40 placeholder-muted-gray/25" />
              </div>
              {fmtDuration(ex.duration_min, ex.duration_sec) && (
                <p className="text-muted-gray/40 text-[10px] text-center mt-1">
                  {fmtDuration(ex.duration_min, ex.duration_sec)}
                </p>
              )}
            </div>
          </div>

          {weighted && (
            <div className="space-y-2">
              <p className="text-[10px] text-muted-gray/50 uppercase tracking-wider">Load</p>
              {/* kg range */}
              <div className="flex items-center gap-1.5">
                <div className="flex items-center bg-graphite border border-white/10 rounded-xl overflow-hidden flex-1">
                  <input type="number" value={ex.load_kg}
                    onChange={e => field('load_kg', e.target.value)}
                    placeholder="ex: 60"
                    className="flex-1 bg-transparent px-3 py-2.5 text-soft-white text-sm focus:outline-none min-w-0 placeholder-muted-gray/25" />
                  <span className="text-muted-gray/50 text-xs pr-3">kg</span>
                </div>
                <span className="text-muted-gray/30 text-xs shrink-0">–</span>
                <div className="flex items-center bg-graphite border border-white/10 rounded-xl overflow-hidden flex-1">
                  <input type="number" value={ex.load_kg_to}
                    onChange={e => field('load_kg_to', e.target.value)}
                    placeholder="to"
                    className="flex-1 bg-transparent px-3 py-2.5 text-soft-white text-sm focus:outline-none min-w-0 placeholder-muted-gray/25" />
                  <span className="text-muted-gray/50 text-xs pr-3">kg</span>
                </div>
              </div>
              {/* % range + calc */}
              <div className="flex items-center gap-1.5">
                <div className="flex items-center bg-graphite border border-white/10 rounded-xl overflow-hidden flex-1">
                  <input type="number" value={ex.load_pct_1rm}
                    onChange={e => field('load_pct_1rm', e.target.value)}
                    placeholder="%" min={1} max={100}
                    className="flex-1 bg-transparent px-2 py-2.5 text-soft-white text-sm focus:outline-none text-center placeholder-muted-gray/25 min-w-0" />
                  <span className="text-muted-gray/50 text-xs pr-2">%</span>
                </div>
                <span className="text-muted-gray/30 text-xs shrink-0">–</span>
                <div className="flex items-center bg-graphite border border-white/10 rounded-xl overflow-hidden flex-1">
                  <input type="number" value={ex.load_pct_1rm_to}
                    onChange={e => field('load_pct_1rm_to', e.target.value)}
                    placeholder="%" min={1} max={100}
                    className="flex-1 bg-transparent px-2 py-2.5 text-soft-white text-sm focus:outline-none text-center placeholder-muted-gray/25 min-w-0" />
                  <span className="text-muted-gray/50 text-xs pr-2">%</span>
                </div>
                {pr1rm && (ex.load_pct_1rm || ex.load_pct_1rm_to) && (
                  <button onClick={applyPct}
                    className="bg-lime/15 border border-lime/30 text-lime text-xs font-bold px-2.5 py-2.5 rounded-xl whitespace-nowrap shrink-0">
                    Calc
                  </button>
                )}
              </div>
              {pr1rm && ex.load_pct_1rm && (
                <p className="text-muted-gray/50 text-xs">
                  {ex.load_pct_1rm_to
                    ? <>
                        {ex.load_pct_1rm}%–{ex.load_pct_1rm_to}% of {pr1rm.max_weight}kg ={' '}
                        <span className="text-soft-white font-semibold">
                          {calcLoad(pr1rm.max_weight, parseFloat(ex.load_pct_1rm))}kg to {calcLoad(pr1rm.max_weight, parseFloat(ex.load_pct_1rm_to))}kg
                        </span>
                      </>
                    : <>{ex.load_pct_1rm}% of {pr1rm.max_weight}kg = <span className="text-soft-white font-semibold">{calcLoad(pr1rm.max_weight, parseFloat(ex.load_pct_1rm))}kg</span></>
                  }
                </p>
              )}
            </div>
          )}

          <div className="grid grid-cols-2 gap-2">
            <div>
              <p className="text-[10px] text-muted-gray/50 uppercase tracking-wider mb-1">
                Effort · RPE
                <span className="ml-1 normal-case tracking-normal font-normal text-muted-gray/30">(1=easy, 10=max)</span>
              </p>
              <input type="number" value={ex.rpe} onChange={e => field('rpe', e.target.value)}
                placeholder="ex: 8" min={1} max={10} className={inp} />
            </div>
            <div>
              <p className="text-[10px] text-muted-gray/50 uppercase tracking-wider mb-1">Rest (s)</p>
              <input type="number" value={ex.rest_seconds} onChange={e => field('rest_seconds', e.target.value)}
                placeholder="ex: 90" className={inp} />
            </div>
          </div>

          <div>
            <p className="text-[10px] text-muted-gray/50 uppercase tracking-wider mb-1">Notes</p>
            <input type="text" value={ex.notes} onChange={e => field('notes', e.target.value)}
              placeholder="Execution tips, rest, etc."
              className="w-full bg-graphite border border-white/10 rounded-xl px-3 py-2 text-soft-white text-sm focus:outline-none focus:border-lime/40 placeholder-muted-gray/25" />
          </div>

          <button onClick={onDelete}
            className="w-full text-center text-warning/70 text-xs py-1.5 hover:text-warning transition-colors">
            Remove exercise
          </button>
        </div>
      )}
    </div>
  )
}

// ── Add exercise sheet ───────────────────────────────────────────────

function AddExerciseSheet({ sectionType, focuses, prs, onAdd, onClose }: {
  sectionType: SectionType
  focuses: TrainingFocus[]
  prs: AthletePR[]
  onAdd: (name: string) => void
  onClose: () => void
}) {
  const [search, setSearch] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => { inputRef.current?.focus() }, [])

  const suggestions = getSuggestions(sectionType, focuses)
  const filtered = search
    ? suggestions.filter(s => s.toLowerCase().includes(search.toLowerCase()))
    : suggestions

  const hasPR = (name: string) =>
    prs.some(p => p.movement_name.toLowerCase() === name.toLowerCase())

  function addCustom() {
    if (search.trim()) { onAdd(search.trim()); onClose() }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60" />
      <div
        className="relative w-full bg-graphite border-t border-white/10 rounded-t-3xl flex flex-col"
        style={{ height: '82dvh' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Drag handle + title */}
        <div className="px-5 shrink-0">
          <div className="w-10 h-1 bg-white/20 rounded-full mx-auto mt-3 mb-3" />
          <h3 className="text-soft-white font-bold text-base mb-0.5">
            Add exercise
          </h3>
          <p className="text-muted-gray/50 text-xs mb-2">{SECTION_LABELS[sectionType]}</p>
        </div>

        {/* Results — scroll above the search input */}
        <div className="flex-1 overflow-y-auto px-5 pt-1 pb-2 space-y-1">
          {filtered.length === 0 && (
            <p className="text-center text-muted-gray/50 text-sm py-6">
              No suggestions. Use "+ Create" to add one.
            </p>
          )}
          {filtered.map(name => (
            <button key={name}
              onClick={() => { onAdd(name); onClose() }}
              className="w-full flex items-center justify-between gap-2 px-4 py-3 rounded-xl bg-card border border-white/5 text-left active:border-lime/20 transition-colors">
              <span className="text-soft-white text-sm">{name}</span>
              {hasPR(name) && (
                <PRBadge kg={prs.find(p => p.movement_name.toLowerCase() === name.toLowerCase() && p.reps === 1)?.max_weight ?? 0} />
              )}
            </button>
          ))}
        </div>

        {/* Search input — anchored at bottom so it stays near the keyboard */}
        <div className="px-5 pt-2 pb-8 shrink-0 border-t border-white/8">
          <div className="flex gap-2">
            <input
              ref={inputRef}
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search or type a custom name…"
              autoComplete="off" autoCorrect="off" autoCapitalize="off" spellCheck={false}
              className="flex-1 bg-card border border-white/10 rounded-2xl px-4 py-3 text-soft-white placeholder-muted-gray/30 text-sm focus:outline-none focus:border-lime/40 transition-colors"
            />
            {search.trim() && !filtered.some(f => f.toLowerCase() === search.toLowerCase()) && (
              <button onClick={addCustom}
                className="shrink-0 bg-lime/15 border border-lime/30 text-lime text-xs font-bold px-3 py-2 rounded-xl">
                + Create
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Date strip ───────────────────────────────────────────────────────

const PT_BR_SHORT2 = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

function getWeekDays(): Date[] {
  const today = new Date()
  const dow = today.getDay()
  const monday = new Date(today)
  monday.setDate(today.getDate() - (dow === 0 ? 6 : dow - 1))
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday)
    d.setDate(monday.getDate() + i)
    return d
  })
}

function toDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function DateStrip({ selected, onSelect }: { selected: string; onSelect: (d: string) => void }) {
  const today = toDateStr(new Date())
  const days = getWeekDays()
  const [custom, setCustom] = useState('')

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-7 gap-1">
        {days.map(d => {
          const str = toDateStr(d)
          const isSelected = str === selected
          const isToday = str === today
          return (
            <button key={str} onClick={() => onSelect(str)}
              className={`flex flex-col items-center py-2 rounded-xl transition-all ${isSelected ? 'bg-lime' : 'bg-white/5'}`}>
              <span className={`text-[9px] font-semibold uppercase ${isSelected ? 'text-graphite' : 'text-muted-gray/60'}`}>
                {PT_BR_SHORT2[d.getDay()]}
              </span>
              <span className={`text-sm font-black mt-0.5 ${isSelected ? 'text-graphite' : isToday ? 'text-lime' : 'text-soft-white'}`}>
                {d.getDate()}
              </span>
            </button>
          )
        })}
      </div>
      <input type="date" value={custom}
        onChange={e => { setCustom(e.target.value); if (e.target.value) onSelect(e.target.value) }}
        className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-muted-gray text-sm focus:outline-none focus:border-lime/40" />
    </div>
  )
}

// ── Format picker ────────────────────────────────────────────────────

const FORMAT_OPTIONS: { value: FormatType; label: string }[] = [
  { value: 'LIVRE',    label: 'Free' },
  { value: 'AMRAP',    label: 'AMRAP' },
  { value: 'FOR_TIME', label: 'For Time' },
  { value: 'EMOM',     label: 'EMOM' },
  { value: 'TABATA',   label: 'Tabata' },
  { value: 'ROUNDS',   label: 'Rounds' },
  { value: 'INTERVAL', label: 'Interval' },
  { value: 'UNBROKEN', label: 'Unbroken' },
]

function FormatPicker({ section, onChange }: {
  section: DraftSection
  onChange: (patch: Partial<DraftSection>) => void
}) {
  const f = section.format_type
  const inp = 'w-full bg-graphite border border-white/10 rounded-xl px-3 py-2 text-soft-white text-sm text-center focus:outline-none focus:border-lime/40 placeholder-muted-gray/25'

  return (
    <div className="px-4 py-3 border-b border-white/5 space-y-3">
      {/* Format chips */}
      <div className="flex flex-wrap gap-1.5">
        {FORMAT_OPTIONS.map(opt => (
          <button key={opt.value}
            onClick={() => onChange({ format_type: opt.value })}
            className={`text-[11px] font-bold px-2.5 py-1 transition-all ${
              f === opt.value ? 'bg-lime text-graphite' : 'bg-white/5 text-muted-gray border border-white/10'
            }`}>
            {opt.label}
          </button>
        ))}
      </div>

      {/* AMRAP: duration + optional rounds */}
      {f === 'AMRAP' && (
        <div className="grid grid-cols-2 gap-2">
          <div>
            <p className="text-[10px] text-muted-gray/50 uppercase tracking-wider mb-1">Duration (min)</p>
            <input type="number" value={section.format_minutes} min={1}
              onChange={e => onChange({ format_minutes: e.target.value })}
              placeholder="ex: 12" className={inp} />
          </div>
          <div>
            <p className="text-[10px] text-muted-gray/50 uppercase tracking-wider mb-1">Rounds (optional)</p>
            <input type="number" value={section.format_rounds} min={1}
              onChange={e => onChange({ format_rounds: e.target.value })}
              placeholder="— open" className={inp} />
          </div>
        </div>
      )}

      {/* FOR TIME: rounds (optional) + time cap (optional) */}
      {f === 'FOR_TIME' && (
        <div className="grid grid-cols-2 gap-2">
          <div>
            <p className="text-[10px] text-muted-gray/50 uppercase tracking-wider mb-1">Rounds (optional)</p>
            <input type="number" value={section.format_rounds} min={1}
              onChange={e => onChange({ format_rounds: e.target.value })}
              placeholder="ex: 3 rounds" className={inp} />
          </div>
          <div>
            <p className="text-[10px] text-muted-gray/50 uppercase tracking-wider mb-1">Time cap (min)</p>
            <input type="number" value={section.format_time_cap} min={1}
              onChange={e => onChange({ format_time_cap: e.target.value })}
              placeholder="ex: 20 min" className={inp} />
          </div>
        </div>
      )}

      {/* EMOM: duration + interval (default 60s) */}
      {f === 'EMOM' && (
        <div className="grid grid-cols-2 gap-2">
          <div>
            <p className="text-[10px] text-muted-gray/50 uppercase tracking-wider mb-1">Duration (min)</p>
            <input type="number" value={section.format_minutes} min={1}
              onChange={e => onChange({ format_minutes: e.target.value })}
              placeholder="ex: 20 min" className={inp} />
          </div>
          <div>
            <p className="text-[10px] text-muted-gray/50 uppercase tracking-wider mb-1">Interval (s)</p>
            <input type="number" value={section.format_interval_seconds} min={1}
              onChange={e => onChange({ format_interval_seconds: e.target.value })}
              placeholder="default: 60s" className={inp} />
          </div>
        </div>
      )}

      {/* TABATA */}
      {f === 'TABATA' && (
        <div className="grid grid-cols-3 gap-2">
          <div>
            <p className="text-[10px] text-muted-gray/50 uppercase tracking-wider mb-1">Sets</p>
            <input type="number" value={section.format_rounds} min={1}
              onChange={e => onChange({ format_rounds: e.target.value })}
              placeholder="ex: 8" className={inp} />
          </div>
          <div>
            <p className="text-[10px] text-muted-gray/50 uppercase tracking-wider mb-1">Work (s)</p>
            <input type="number" value={section.format_work_seconds} min={1}
              onChange={e => onChange({ format_work_seconds: e.target.value })}
              placeholder="ex: 20s" className={inp} />
          </div>
          <div>
            <p className="text-[10px] text-muted-gray/50 uppercase tracking-wider mb-1">Rest (s)</p>
            <input type="number" value={section.format_rest_seconds} min={1}
              onChange={e => onChange({ format_rest_seconds: e.target.value })}
              placeholder="ex: 10s" className={inp} />
          </div>
        </div>
      )}

      {/* ROUNDS: rounds + rest between rounds */}
      {f === 'ROUNDS' && (
        <div className="grid grid-cols-2 gap-2">
          <div>
            <p className="text-[10px] text-muted-gray/50 uppercase tracking-wider mb-1">Rounds</p>
            <input type="number" value={section.format_rounds} min={1}
              onChange={e => onChange({ format_rounds: e.target.value })}
              placeholder="ex: 5" className={inp} />
          </div>
          <div>
            <p className="text-[10px] text-muted-gray/50 uppercase tracking-wider mb-1">Rest between rounds (s)</p>
            <input type="number" value={section.format_rest_between_rounds} min={0}
              onChange={e => onChange({ format_rest_between_rounds: e.target.value })}
              placeholder="ex: 120s" className={inp} />
          </div>
        </div>
      )}

      {/* INTERVAL */}
      {f === 'INTERVAL' && (
        <div className="grid grid-cols-3 gap-2">
          <div>
            <p className="text-[10px] text-muted-gray/50 uppercase tracking-wider mb-1">Rounds</p>
            <input type="number" value={section.format_rounds} min={1}
              onChange={e => onChange({ format_rounds: e.target.value })}
              placeholder="ex: 6" className={inp} />
          </div>
          <div>
            <p className="text-[10px] text-muted-gray/50 uppercase tracking-wider mb-1">Work (s)</p>
            <input type="number" value={section.format_work_seconds} min={1}
              onChange={e => onChange({ format_work_seconds: e.target.value })}
              placeholder="ex: 40s" className={inp} />
          </div>
          <div>
            <p className="text-[10px] text-muted-gray/50 uppercase tracking-wider mb-1">Rest (s)</p>
            <input type="number" value={section.format_rest_seconds} min={1}
              onChange={e => onChange({ format_rest_seconds: e.target.value })}
              placeholder="ex: 20s" className={inp} />
          </div>
        </div>
      )}

      {/* UNBROKEN: info only */}
      {f === 'UNBROKEN' && (
        <p className="text-muted-gray/40 text-xs italic px-1">
          All exercises must be performed without pausing or dropping the bar.
        </p>
      )}

      {/* Section modality tags */}
      <div>
        <p className="text-[10px] text-muted-gray/40 uppercase tracking-wider mb-1.5">Modality</p>
        <div className="flex flex-wrap gap-1.5">
          {SECTION_MODALITY_TAGS.map(tag => {
            const active = section.modality_tags.includes(tag)
            return (
              <button key={tag}
                onClick={() => {
                  const next = active
                    ? section.modality_tags.filter(t => t !== tag)
                    : [...section.modality_tags, tag]
                  onChange({ modality_tags: next })
                }}
                className={`text-[11px] font-bold px-2.5 py-1 transition-all ${
                  active ? 'bg-lime/20 text-lime border border-lime/40' : 'bg-white/5 text-muted-gray/50 border border-white/8'
                }`}>
                {tag}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// ── Draft preview ────────────────────────────────────────────────────

function buildFormatLineDraft(section: DraftSection): string | null {
  const f = section.format_type
  if (f === 'LIVRE') return null

  const m = section.format_minutes
  const r = section.format_rounds
  const ws = section.format_work_seconds
  const rs = section.format_rest_seconds
  const rbr = section.format_rest_between_rounds
  const iv = section.format_interval_seconds
  const cap = section.format_time_cap

  switch (f) {
    case 'AMRAP': {
      const parts = ['AMRAP']
      if (m) parts.push(`${m}:00`)
      if (r) parts.push(`${r} ROUNDS`)
      return parts.join(' · ')
    }
    case 'FOR_TIME': {
      const parts = ['FOR TIME']
      if (r) parts.push(`${r} ROUNDS`)
      if (cap) parts.push(`CAP ${cap}:00`)
      return parts.join(' · ')
    }
    case 'EMOM': {
      const parts = ['EMOM']
      if (m) parts.push(`${m}:00`)
      if (iv && iv !== '60') parts.push(`A CADA ${iv}S`)
      return parts.join(' · ')
    }
    case 'TABATA': {
      const parts = ['TABATA']
      if (r) parts.push(`${r} SETS`)
      const w = ws || '20', d = rs || '10'
      parts.push(`${w}s/${d}s`)
      return parts.join(' · ')
    }
    case 'ROUNDS': {
      const parts = ['ROUNDS']
      if (r) parts.push(`${r}×`)
      if (rbr) parts.push(`${rbr}s rest`)
      return parts.join(' · ')
    }
    case 'INTERVAL': {
      const parts = ['INTERVAL']
      if (r) parts.push(`${r}×`)
      if (ws && rs) parts.push(`${ws}s/${rs}s`)
      return parts.join(' · ')
    }
    case 'UNBROKEN':
      return 'UNBROKEN'
    default:
      return null
  }
}

function DraftPreview({ sections, workoutNotes, studentNote, focus, workoutTags, date, athleteName }: {
  sections: DraftSection[]
  workoutNotes: string
  studentNote: string
  focus: TrainingFocus[]
  workoutTags: WorkoutTag[]
  date: string
  athleteName: string
}) {
  const FOCUS_LABELS_DISPLAY: Record<string, string> = {
    superior: 'Upper Body', inferior: 'Lower Body', full_body: 'Full Body',
    core: 'Core', cardio: 'Cardio', mobilidade: 'Mobility',
    forca: 'Strength', tecnica: 'Technique', crossfit: 'CrossFit',
  }

  const allTags = [...focus.map(f => FOCUS_LABELS_DISPLAY[f] ?? f), ...workoutTags]

  if (sections.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3">
        <p className="text-muted-gray/30 text-sm">No sections added yet.</p>
        <p className="text-muted-gray/20 text-xs">Go back to "Edit" and build the workout.</p>
      </div>
    )
  }

  return (
    <div className="px-4 space-y-3 pt-4">
      {/* Header card */}
      <div className="bg-card rounded-2xl border border-white/5 px-4 pt-4 pb-3">
        <p className="text-muted-gray/60 text-xs font-semibold">
          {dayName(date)}, {formatDate(date)}
        </p>
        <p className="text-soft-white font-bold text-base mt-0.5">{athleteName}</p>
        {allTags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-2">
            {allTags.map(t => (
              <span key={t} className="text-[11px] font-bold px-2.5 py-0.5 bg-white/6 border border-white/10 text-muted-gray">
                {t}
              </span>
            ))}
          </div>
        )}
        <p className="text-muted-gray/30 text-[11px] mt-2">
          {sections.length} section{sections.length !== 1 ? 's' : ''} · {sections.reduce((a, s) => a + s.exercises.length, 0)} exercise{sections.reduce((a, s) => a + s.exercises.length, 0) !== 1 ? 's' : ''}
        </p>
      </div>

      {/* Student note (observação) */}
      {studentNote && (
        <div className="bg-lime/5 border border-lime/15 rounded-2xl px-4 py-3">
          <p className="text-[9px] font-black text-lime/50 uppercase tracking-widest mb-1">Note for the athlete</p>
          <p className="text-soft-white/80 text-[13px] leading-relaxed">{studentNote}</p>
        </div>
      )}

      {/* Sections */}
      {sections.map(section => {
        const formatLine = buildFormatLineDraft(section)
        return (
          <div key={section.tempId} className="bg-card rounded-2xl border border-white/8 px-3.5 py-3.5 space-y-3">
            {/* Section header */}
            <div>
              <p className="text-[10px] font-black tracking-[0.14em] uppercase leading-none">
                <span className="text-lime">{section.section_type.replace(/_/g, ' ')}</span>
                <span className="text-white/30 mx-1">·</span>
                <span className="text-white/55 normal-case tracking-normal font-semibold">{section.label}</span>
                {section.modality_tags.length > 0 && (
                  <span className="ml-2 text-white/25 normal-case font-normal tracking-normal">
                    · {section.modality_tags.join(', ')}
                  </span>
                )}
              </p>
              {formatLine && (
                <p className="text-white/35 text-[11px] font-semibold tracking-wider mt-1.5 pl-0.5">
                  {formatLine}
                </p>
              )}
            </div>

            {section.exercises.length === 0 && (
              <p className="text-muted-gray/25 text-xs italic">No exercises yet.</p>
            )}

            {/* Exercises */}
            <div className="space-y-3">
              {section.exercises.map(ex => {
                const lines: string[] = []
                const main: string[] = []
                const isScheme = ex.reps && ex.reps.includes('-')
                if (isScheme) {
                  main.push(ex.reps)
                  if (ex.sets) main.push(`${ex.sets} ROUNDS`)
                } else {
                  if (ex.sets && ex.reps)    main.push(`${ex.sets} × ${ex.reps} REPS`)
                  else if (ex.sets)          main.push(`${ex.sets} SETS`)
                  else if (ex.reps)          main.push(`${ex.reps} REPS`)
                }
                const durDisplay = fmtDuration(ex.duration_min, ex.duration_sec)
                if (durDisplay) main.push(durDisplay)
                if (main.length) lines.push(main.join(' · '))
                const load: string[] = []
                if (ex.load_kg && ex.load_kg_to)             load.push(`@ ${ex.load_kg}–${ex.load_kg_to}KG`)
                else if (ex.load_kg)                         load.push(`@ ${ex.load_kg}KG`)
                if (ex.load_pct_1rm && ex.load_pct_1rm_to)  load.push(`@ ${ex.load_pct_1rm}%–${ex.load_pct_1rm_to}% 1RM`)
                else if (ex.load_pct_1rm)                    load.push(`@ ${ex.load_pct_1rm}% 1RM`)
                if (ex.rpe)                                  load.push(`RPE ${ex.rpe}/10`)
                if (load.length)     lines.push(load.join(' · '))
                if (ex.rest_seconds) {
                  const rs = parseInt(ex.rest_seconds)
                  const mm = Math.floor(rs / 60), ss = rs % 60
                  lines.push(`*REST ${mm > 0 && ss === 0 ? `${mm}:00` : mm > 0 ? `${mm}:${String(ss).padStart(2,'0')}` : `${rs}s`} BETWEEN SETS`)
                }

                return (
                  <div key={ex.tempId}>
                    {/* Exercise name */}
                    <p className="text-soft-white font-bold text-[14px] leading-snug">
                      {ex.movement_name || <span className="text-muted-gray/30">Unnamed exercise</span>}
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
                      <p className="text-muted-gray/30 text-[11px] italic mt-0.5">{ex.notes}</p>
                    )}
                  </div>
                )
              })}
            </div>

            {/* Section notes */}
            {section.notes && (
              <p className="text-muted-gray/50 text-xs italic border-t border-white/5 pt-2">
                {section.notes}
              </p>
            )}
          </div>
        )
      })}

      {workoutNotes && (
        <div className="bg-card rounded-2xl border border-white/5 px-4 py-3">
          <p className="text-[10px] font-bold text-muted-gray/40 uppercase tracking-widest mb-1">General notes</p>
          <p className="text-muted-gray/70 text-sm leading-relaxed">{workoutNotes}</p>
        </div>
      )}
    </div>
  )
}

// ── Main page ────────────────────────────────────────────────────────

export default function PersonalWorkout() {
  const [params] = useSearchParams()
  const navigate  = useNavigate()
  const location  = useLocation()

  const athleteId    = params.get('a') ?? ''
  const workoutDate  = params.get('d') ?? ''
  const editWorkoutId = params.get('w') ?? null

  const editWorkout = (location.state as { workout?: PrescribedWorkoutData } | null)?.workout ?? null
  const isEditMode  = editWorkoutId != null

  const [athleteName, setAthleteName]   = useState('')
  const [prs, setPRs]                   = useState<AthletePR[]>([])
  const [focus, setFocus]               = useState<TrainingFocus[]>([])
  const [workoutTags, setWorkoutTags]   = useState<WorkoutTag[]>([])
  const [sections, setSections]         = useState<DraftSection[]>([])
  const [workoutNotes, setWorkoutNotes] = useState('')
  const [studentNote, setStudentNote]   = useState('')
  const [saving, setSaving]             = useState(false)
  const [loading, setLoading]           = useState(true)
  const [date, setDate]                 = useState(editWorkout?.workout_date ?? workoutDate)
  const [showDatePicker, setShowDatePicker] = useState(false)
  const [activeTab, setActiveTab]       = useState<'edit' | 'preview'>('edit')

  // Sheet state
  const [addExSheet, setAddExSheet] = useState<{ sectionTempId: string; sectionType: SectionType } | null>(null)
  const [addSectionOpen, setAddSectionOpen] = useState(false)

  // Drag state for section reordering
  const [dragSectionIndex, setDragSectionIndex] = useState<number | null>(null)
  const [dragOverSectionIndex, setDragOverSectionIndex] = useState<number | null>(null)

  // Suggestion state
  const [suggestOpen, setSuggestOpen] = useState(false)
  const [pendingSuggestion, setPendingSuggestion] = useState<{ sections: DraftSection[]; note: string | null } | null>(null)

  // Drag state for exercise reordering within section
  const [dragExState, setDragExState] = useState<{ sectionId: string; fromIdx: number } | null>(null)
  const [dragOverExState, setDragOverExState] = useState<{ sectionId: string; toIdx: number } | null>(null)

  // Persist draft to sessionStorage (new workout only, after loading)
  useEffect(() => {
    if (isEditMode || !athleteId || loading) return
    const draft = { sections, focus, workoutTags, workoutNotes, date }
    sessionStorage.setItem(`pw-draft-${athleteId}`, JSON.stringify(draft))
  }, [sections, focus, workoutTags, workoutNotes, date, athleteId, isEditMode, loading]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!athleteId) return
    async function loadAthlete() {
      const [summaryRes, prRes] = await Promise.all([
        supabase.rpc('personal_get_athletes_summary'),
        supabase.rpc('get_athlete_prs', { p_athlete_id: athleteId }),
      ])
      const summary = (summaryRes.data ?? []).find(
        (a: { user_id: string; name: string | null; username: string | null }) => a.user_id === athleteId
      )
      setAthleteName(summary?.name ?? summary?.username ?? 'Athlete')
      setPRs(prRes.data ?? [])
      if (editWorkout) {
        setSections(workoutToDraft(editWorkout))
        const { focus: f, workoutTags: wt } = splitFocus(editWorkout.focus)
        setFocus(f)
        setWorkoutTags(wt)
        setWorkoutNotes(editWorkout.notes ?? '')
      } else {
        // Restore draft from sessionStorage if available
        try {
          const saved = sessionStorage.getItem(`pw-draft-${athleteId}`)
          if (saved) {
            const draft = JSON.parse(saved)
            if (draft.sections?.length) setSections(draft.sections)
            if (draft.focus?.length) setFocus(draft.focus)
            if (draft.workoutTags?.length) setWorkoutTags(draft.workoutTags)
            if (draft.workoutNotes) setWorkoutNotes(draft.workoutNotes)
            if (draft.date) setDate(draft.date)
          }
        } catch {}
      }
      setLoading(false)
    }
    loadAthlete()
  }, [athleteId]) // eslint-disable-line react-hooks/exhaustive-deps

  function toggleFocus(f: TrainingFocus) {
    setFocus(prev => prev.includes(f) ? prev.filter(x => x !== f) : [...prev, f])
  }

  function toggleWorkoutTag(tag: WorkoutTag) {
    setWorkoutTags(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag])
  }

  function addSection(type: SectionType) {
    setSections(prev => [...prev, emptySection(type)])
    setAddSectionOpen(false)
  }

  function removeSection(tempId: string) {
    setSections(prev => prev.filter(s => s.tempId !== tempId))
  }

  function handleSuggestion(suggested: DraftSection[], note: string | null, additive: boolean = false) {
    if (additive) {
      // Single-section mode: always append, never replace
      setSections(prev => [...prev, ...suggested])
    } else if (sections.length > 0) {
      setPendingSuggestion({ sections: suggested, note })
    } else {
      setSections(suggested)
      setStudentNote(note ?? '')
    }
  }

  function moveSectionByIndex(fromIdx: number, toIdx: number) {
    if (fromIdx === toIdx) return
    setSections(prev => {
      const next = [...prev]
      const [removed] = next.splice(fromIdx, 1)
      next.splice(toIdx, 0, removed)
      return next
    })
  }

  function updateSection(tempId: string, patch: Partial<DraftSection>) {
    setSections(prev => prev.map(s => s.tempId === tempId ? { ...s, ...patch } : s))
  }

  function addExercise(sectionTempId: string, name: string) {
    setSections(prev => prev.map(s =>
      s.tempId === sectionTempId
        ? { ...s, exercises: [...s.exercises, emptyExercise(name)] }
        : s
    ))
  }

  function updateExercise(sectionTempId: string, ex: DraftExercise) {
    setSections(prev => prev.map(s =>
      s.tempId === sectionTempId
        ? { ...s, exercises: s.exercises.map(e => e.tempId === ex.tempId ? ex : e) }
        : s
    ))
  }

  function removeExercise(sectionTempId: string, exTempId: string) {
    setSections(prev => prev.map(s =>
      s.tempId === sectionTempId
        ? { ...s, exercises: s.exercises.filter(e => e.tempId !== exTempId) }
        : s
    ))
  }

  function moveExercise(sectionTempId: string, fromIdx: number, toIdx: number) {
    if (fromIdx === toIdx) return
    setSections(prev => prev.map(s => {
      if (s.tempId !== sectionTempId) return s
      const next = [...s.exercises]
      const [removed] = next.splice(fromIdx, 1)
      next.splice(toIdx, 0, removed)
      return { ...s, exercises: next }
    }))
  }

  async function handleSave() {
    if (!sections.length) {
      return
    }
    setSaving(true)
    try {
      const allFocus = [...focus, ...workoutTags.map(t => t.toLowerCase().replace(' ', '_'))]

      const sectionsJson = sections.map((s, si) => {
        let format_config: Record<string, number | string[] | null> | null = null
        if (s.format_type !== 'LIVRE') {
          format_config = {}
          if (s.format_minutes)             format_config.time_minutes              = parseFloat(s.format_minutes)
          if (s.format_rounds)              format_config.rounds                    = parseInt(s.format_rounds)
          if (s.format_work_seconds)        format_config.work_seconds              = parseInt(s.format_work_seconds)
          if (s.format_rest_seconds)        format_config.rest_seconds              = parseInt(s.format_rest_seconds)
          if (s.format_rest_between_rounds) format_config.rest_between_rounds_seconds = parseInt(s.format_rest_between_rounds)
          if (s.format_interval_seconds)    format_config.interval_seconds          = parseInt(s.format_interval_seconds)
          if (s.format_time_cap)            format_config.time_cap_minutes          = parseFloat(s.format_time_cap)
          if (s.modality_tags.length > 0)   format_config.modality_tags            = s.modality_tags
          if (Object.keys(format_config).length === 0) format_config = null
        } else if (s.modality_tags.length > 0) {
          format_config = { modality_tags: s.modality_tags }
        }

        return {
          section_type: s.section_type,
          label: s.label,
          position: si,
          notes: s.notes || null,
          format_type: s.format_type !== 'LIVRE' ? s.format_type : null,
          format_config,
          modality_tags: s.modality_tags.length > 0 ? s.modality_tags : null,
          exercises: s.exercises.map((e, ei) => ({
            movement_name: e.movement_name,
            sets:              e.sets ? parseInt(e.sets) : null,
            reps:              e.reps && /^\d+$/.test(e.reps.trim()) ? parseInt(e.reps) : null,
            duration_seconds:  durationToSeconds(e.duration_min, e.duration_sec),
            load_kg:           e.load_kg           ? parseFloat(e.load_kg)          : null,
            load_kg_to:        e.load_kg_to        ? parseFloat(e.load_kg_to)       : null,
            load_pct_1rm:      e.load_pct_1rm      ? parseInt(e.load_pct_1rm)       : null,
            load_pct_1rm_to:   e.load_pct_1rm_to   ? parseInt(e.load_pct_1rm_to)    : null,
            rpe:               e.rpe               ? parseInt(e.rpe)               : null,
            rest_seconds:      e.rest_seconds      ? parseInt(e.rest_seconds)      : null,
            notes: (() => {
              const scheme = e.reps && !/^\d+$/.test(e.reps.trim()) ? e.reps.trim() : null
              return scheme ? (e.notes ? `${scheme}\n${e.notes}` : scheme) : (e.notes || null)
            })(),
            position: ei,
          })),
        }
      })

      if (isEditMode && editWorkoutId) {
        const { error: delErr } = await supabase.rpc('admin_delete_workout', { p_workout_id: editWorkoutId })
        if (delErr) throw delErr
      }

      const { error } = await supabase.rpc('personal_save_workout', {
        p_athlete_id: athleteId,
        p_workout_date: date,
        p_focus: allFocus,
        p_notes: workoutNotes || null,
        p_sections: sectionsJson,
      })

      if (error) throw error

      // Save student note if set
      if (studentNote.trim()) {
        await supabase.rpc('personal_set_workout_student_note', {
          p_athlete_id:   athleteId,
          p_workout_date: date,
          p_student_note: studentNote.trim(),
        })
      }

      sessionStorage.removeItem(`pw-draft-${athleteId}`)
      navigate(-1)
    } catch (err) {
      console.error(err)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-graphite flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-lime border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  const FOCUS_OPTIONS: TrainingFocus[] = [
    'superior', 'inferior', 'full_body', 'core',
    'cardio', 'mobilidade', 'forca', 'tecnica', 'crossfit',
  ]

  const ALL_SECTIONS: SectionType[] = [
    'mobility', 'warm_up', 'strength', 'skill', 'conditioning', 'wod', 'accessories', 'cool_down',
  ]

  return (
    <div className="min-h-screen bg-graphite pb-32 safe-top">
      {/* Add exercise sheet */}
      {addExSheet && (
        <AddExerciseSheet
          sectionType={addExSheet.sectionType}
          focuses={focus}
          prs={prs}
          onAdd={name => addExercise(addExSheet.sectionTempId, name)}
          onClose={() => setAddExSheet(null)}
        />
      )}

      {/* Suggest sheet */}
      <SuggestSheet
        open={suggestOpen}
        athleteId={athleteId}
        currentFocus={focus}
        onResult={handleSuggestion}
        onClose={() => setSuggestOpen(false)}
      />

      {/* Confirm replace suggestion */}
      {pendingSuggestion && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-6" onClick={() => setPendingSuggestion(null)}>
          <div className="absolute inset-0 bg-black/70" />
          <div
            className="relative bg-graphite border border-white/10 rounded-2xl p-6 w-full max-w-sm space-y-4"
            onClick={e => e.stopPropagation()}
          >
            <h3 className="text-soft-white font-black text-base">Workout already has sections</h3>
            <p className="text-muted-gray/60 text-sm">What do you want to do with the generated suggestion?</p>
            <div className="space-y-2">
              <button
                onClick={() => {
                  setSections(pendingSuggestion.sections)
                  setStudentNote(pendingSuggestion.note ?? '')
                  setPendingSuggestion(null)
                }}
                className="w-full bg-lime text-graphite font-bold text-sm py-3 rounded-xl"
              >
                Replace all
              </button>
              <button
                onClick={() => {
                  setSections(prev => [...prev, ...pendingSuggestion!.sections])
                  if (pendingSuggestion.note && !studentNote) setStudentNote(pendingSuggestion.note)
                  setPendingSuggestion(null)
                }}
                className="w-full bg-white/8 border border-white/10 text-soft-white font-bold text-sm py-3 rounded-xl"
              >
                Add below current sections
              </button>
              <button
                onClick={() => setPendingSuggestion(null)}
                className="w-full text-muted-gray/50 text-sm py-2"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add section sheet */}
      {addSectionOpen && (
        <div className="fixed inset-0 z-50 flex items-end" onClick={() => setAddSectionOpen(false)}>
          <div className="absolute inset-0 bg-black/60" />
          <div
            className="relative w-full bg-graphite border-t border-white/10 rounded-t-3xl p-5 pb-10 space-y-2"
            onClick={e => e.stopPropagation()}
          >
            <div className="w-10 h-1 bg-white/20 rounded-full mx-auto mb-4" />
            <p className="text-[11px] font-bold text-muted-gray uppercase tracking-widest mb-3">Add section</p>
            {ALL_SECTIONS.map(type => (
              <button key={type} onClick={() => addSection(type)}
                className="w-full flex items-center justify-between px-4 py-3.5 rounded-2xl border border-white/8 bg-card active:border-lime/20 text-left transition-all">
                <span className="text-soft-white text-sm font-semibold">{SECTION_LABELS[type]}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Header */}
      <div className="px-5 pt-6 pb-4">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)}
            className="w-10 h-10 rounded-xl bg-card border border-white/8 flex items-center justify-center shrink-0">
            <svg className="w-5 h-5 text-muted-gray" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div className="flex-1 min-w-0">
            <button onClick={() => setShowDatePicker(p => !p)} className="flex items-center gap-1.5 group">
              <p className="text-muted-gray text-[10px] uppercase tracking-widest group-hover:text-lime transition-colors">
                {isEditMode ? 'Editing · ' : ''}{dayName(date)} · {formatDate(date)}
              </p>
              <svg className="w-3 h-3 text-muted-gray/50 group-hover:text-lime transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            <h1 className="text-base font-black text-soft-white truncate">{athleteName}</h1>
          </div>
          <Avatar name={athleteName} />
        </div>

        {showDatePicker && (
          <div className="mt-3 bg-card border border-white/10 rounded-2xl p-3">
            <DateStrip selected={date} onSelect={d => { setDate(d); setShowDatePicker(false) }} />
          </div>
        )}
      </div>

      {/* Tab bar: Edit | Preview */}
      <div className="flex border-b border-white/8 mx-0 mb-1">
        {([['edit', 'Edit'], ['preview', 'Preview']] as const).map(([t, label]) => (
          <button key={t} onClick={() => setActiveTab(t)}
            className={`flex-1 py-3 text-xs font-bold uppercase tracking-widest transition-colors border-b-2 ${
              activeTab === t
                ? 'text-lime border-lime'
                : 'text-muted-gray/50 border-transparent'
            }`}>
            {label}
            {t === 'preview' && sections.length > 0 && (
              <span className="ml-1.5 text-[9px] bg-lime/20 text-lime px-1 py-0.5 rounded-sm">
                {sections.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ── PREVIEW MODE ── */}
      {activeTab === 'preview' && (
        <DraftPreview
          sections={sections}
          workoutNotes={workoutNotes}
          studentNote={studentNote}
          focus={focus}
          workoutTags={workoutTags}
          date={date}
          athleteName={athleteName}
        />
      )}

      {/* ── EDIT MODE ── */}
      {activeTab === 'edit' && (
        <div className="px-4 space-y-4">

          {/* Focus chips */}
          <div className="bg-card rounded-2xl border border-white/5 p-4">
            <p className="text-[11px] font-bold text-muted-gray uppercase tracking-widest mb-3">Workout focus</p>
            <div className="flex flex-wrap gap-2">
              {FOCUS_OPTIONS.map(f => (
                <button key={f} onClick={() => toggleFocus(f)}
                  className={`text-xs font-bold px-3 py-1.5 transition-all ${
                    focus.includes(f) ? 'bg-lime text-graphite' : 'bg-white/5 text-muted-gray border border-white/10'
                  }`}>
                  {FOCUS_LABELS[f]}
                </button>
              ))}
            </div>

            {/* Workout-level tags */}
            <div className="mt-3 pt-3 border-t border-white/5">
              <p className="text-[10px] font-bold text-muted-gray/40 uppercase tracking-widest mb-2">Workout modality</p>
              <div className="flex flex-wrap gap-2">
                {WORKOUT_TAGS.map(tag => (
                  <button key={tag} onClick={() => toggleWorkoutTag(tag)}
                    className={`text-xs font-bold px-3 py-1.5 transition-all ${
                      workoutTags.includes(tag) ? 'bg-lime/20 text-lime border border-lime/40' : 'bg-white/5 text-muted-gray/50 border border-white/8'
                    }`}>
                    {tag}
                  </button>
                ))}
              </div>
            </div>
          </div>


          {/* PR summary */}
          {prs.length > 0 && (
            <details className="bg-card rounded-2xl border border-white/5 overflow-hidden">
              <summary className="px-4 py-3 flex items-center justify-between cursor-pointer list-none">
                <p className="text-[11px] font-bold text-muted-gray uppercase tracking-widest">
                  Athlete PRs ({prs.length})
                </p>
                <svg className="w-4 h-4 text-muted-gray/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </summary>
              <div className="px-4 pb-4 space-y-1.5">
                {prs.map(p => (
                  <div key={`${p.movement_name}-${p.reps}`} className="flex justify-between items-center">
                    <span className="text-muted-gray text-sm">{p.movement_name} · {p.reps}RM</span>
                    <span className="text-soft-white text-sm font-semibold">{p.max_weight}kg</span>
                  </div>
                ))}
              </div>
            </details>
          )}

          {/* Sections */}
          {sections.length === 0 && (
            <div className="text-center py-8 space-y-3">
              <p className="text-muted-gray/50 text-sm">No sections added yet</p>
              <button
                onClick={() => setSuggestOpen(true)}
                className="w-full bg-lime text-graphite font-black text-sm py-4 rounded-2xl flex items-center justify-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                Suggest workout
              </button>
              <button onClick={() => setAddSectionOpen(true)}
                className="w-full bg-white/5 border border-white/10 text-muted-gray text-sm font-bold py-3 rounded-2xl">
                Add section manually
              </button>
            </div>
          )}

          {sections.map((section, si) => {
            const isDragging = dragSectionIndex === si
            const isOver = dragOverSectionIndex === si && dragSectionIndex !== si
            return (
            <div
              key={section.tempId}
              draggable
              onDragStart={e => {
                setDragSectionIndex(si)
                e.dataTransfer.effectAllowed = 'move'
              }}
              onDragOver={e => {
                e.preventDefault()
                e.dataTransfer.dropEffect = 'move'
                setDragOverSectionIndex(si)
              }}
              onDrop={e => {
                e.preventDefault()
                if (dragSectionIndex !== null) moveSectionByIndex(dragSectionIndex, si)
                setDragSectionIndex(null)
                setDragOverSectionIndex(null)
              }}
              onDragEnd={() => {
                setDragSectionIndex(null)
                setDragOverSectionIndex(null)
              }}
              className="bg-card rounded-2xl border overflow-hidden transition-all"
              style={{
                opacity: isDragging ? 0.4 : 1,
                borderColor: isOver ? '#D4FF3A' : 'rgba(255,255,255,0.05)',
              }}
            >
              <div className="px-4 py-3 flex items-center gap-2 border-b border-white/5">
                {/* Drag handle */}
                <span
                  className="text-muted-gray/25 cursor-grab active:cursor-grabbing select-none shrink-0"
                  style={{ fontSize: 16, letterSpacing: 1 }}
                  title="Drag to reorder"
                >
                  ⠿
                </span>
                <p className="text-soft-white font-bold text-sm flex-1">{section.label}</p>
                <button onClick={() => removeSection(section.tempId)}
                  className="text-muted-gray/40 hover:text-warning transition-colors p-1">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <FormatPicker section={section} onChange={patch => updateSection(section.tempId, patch)} />

              <div className="p-3 space-y-2">
                {section.exercises.map((ex, ei) => {
                  const isDraggingEx = dragExState?.sectionId === section.tempId && dragExState.fromIdx === ei
                  const isOverEx = dragOverExState?.sectionId === section.tempId && dragOverExState.toIdx === ei && dragExState?.fromIdx !== ei
                  return (
                    <div
                      key={ex.tempId}
                      onDragOver={e => { e.preventDefault(); setDragOverExState({ sectionId: section.tempId, toIdx: ei }) }}
                      onDrop={e => {
                        e.preventDefault()
                        if (dragExState?.sectionId === section.tempId) moveExercise(section.tempId, dragExState.fromIdx, ei)
                        setDragExState(null)
                        setDragOverExState(null)
                      }}
                      onDragEnd={() => { setDragExState(null); setDragOverExState(null) }}
                      style={{
                        opacity: isDraggingEx ? 0.4 : 1,
                        borderTop: isOverEx ? '2px solid #D4FF3A' : '2px solid transparent',
                        transition: 'opacity 0.15s',
                      }}
                    >
                      <ExerciseRow
                        ex={ex}
                        prs={prs}
                        onChange={updated => updateExercise(section.tempId, updated)}
                        onDelete={() => removeExercise(section.tempId, ex.tempId)}
                        dragHandleProps={{
                          draggable: true,
                          onDragStart: e => {
                            e.stopPropagation()
                            setDragExState({ sectionId: section.tempId, fromIdx: ei })
                            e.dataTransfer.effectAllowed = 'move'
                          },
                        }}
                      />
                    </div>
                  )
                })}

                <input
                  type="text"
                  value={section.notes}
                  onChange={e => updateSection(section.tempId, { notes: e.target.value })}
                  placeholder="Section notes…"
                  className="w-full bg-graphite border border-white/8 rounded-xl px-3 py-2 text-muted-gray text-xs focus:outline-none focus:border-lime/30 placeholder-muted-gray/25 transition-colors"
                />

                <button
                  onClick={() => setAddExSheet({ sectionTempId: section.tempId, sectionType: section.section_type })}
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-dashed border-white/15 text-muted-gray/50 text-xs font-medium hover:border-lime/30 hover:text-lime transition-colors">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Add exercise
                </button>
              </div>
            </div>
          )
          })}

          {sections.length > 0 && (
            <div className="flex gap-2">
              <button onClick={() => setAddSectionOpen(true)}
                className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl border border-dashed border-white/15 text-muted-gray/50 text-sm font-medium hover:border-lime/30 hover:text-lime transition-colors">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Add section
              </button>
              <button
                onClick={() => setSuggestOpen(true)}
                className="flex items-center gap-1.5 px-4 py-3 rounded-2xl border border-lime/25 bg-lime/8 text-lime text-sm font-bold hover:bg-lime/15 transition-colors"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                Suggest
              </button>
            </div>
          )}

          {/* Student note (observação gerada pela sugestão, editável) */}
          {studentNote !== undefined && (
            <div className="bg-card rounded-2xl border border-white/5 p-4">
              <div className="flex items-center gap-2 mb-2">
                <p className="text-[11px] font-bold text-lime/70 uppercase tracking-widest flex-1">Note for the athlete</p>
                {studentNote && (
                  <button onClick={() => setStudentNote('')}
                    className="text-[10px] text-muted-gray/40 underline underline-offset-2">
                    Clear
                  </button>
                )}
              </div>
              <textarea
                value={studentNote}
                onChange={e => setStudentNote(e.target.value)}
                placeholder='Ex: "We reduced the load a bit today because in the last workout you noted it was too heavy."'
                rows={3}
                className="w-full bg-graphite border border-white/8 rounded-xl px-3 py-2.5 text-soft-white text-sm focus:outline-none focus:border-lime/30 placeholder-muted-gray/20 transition-colors resize-none"
              />
              <p className="text-muted-gray/30 text-[10px] mt-1.5">
                Visible to the athlete when they open the workout. Can be left blank.
              </p>
            </div>
          )}

          {/* Workout notes */}
          <div className="bg-card rounded-2xl border border-white/5 p-4">
            <p className="text-[11px] font-bold text-muted-gray uppercase tracking-widest mb-2">General notes</p>
            <textarea
              value={workoutNotes}
              onChange={e => setWorkoutNotes(e.target.value)}
              placeholder="General guidance, warnings, or messages for the athlete…"
              rows={3}
              className="w-full bg-graphite border border-white/8 rounded-xl px-3 py-2.5 text-soft-white text-sm focus:outline-none focus:border-lime/30 placeholder-muted-gray/25 transition-colors resize-none"
            />
          </div>

        </div>
      )}

      {/* Save button */}
      <div className="fixed bottom-0 left-0 right-0 z-50 px-4 pb-8 pt-3 bg-gradient-to-t from-graphite via-graphite/95 to-transparent">
        <button
          onClick={handleSave}
          disabled={saving || sections.length === 0}
          className="w-full bg-lime disabled:opacity-40 text-graphite font-black text-base py-4 rounded-2xl flex items-center justify-center gap-2 transition-colors">
          {saving && <div className="w-5 h-5 border-2 border-graphite/40 border-t-graphite rounded-full animate-spin" />}
          {saving ? 'Saving…' : isEditMode ? 'Save changes' : 'Save workout'}
        </button>
      </div>
    </div>
  )
}

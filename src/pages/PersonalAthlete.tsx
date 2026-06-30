import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { useProfile } from '@/hooks/useProfile'
import type { AthleteSummary, PrescribedWorkoutData } from '@/types'
import WorkoutCard from '@/components/WorkoutCard'

interface AthletePR { movement_name: string; reps: number; max_weight: number }
interface AthleteProfile {
  name: string | null; username: string | null; date_of_birth: string | null
  body_weight_kg: number | null; height_cm: number | null; gender: string | null
  experience_level: string | null; training_frequency: number | null; main_goals: string[] | null
}

// ── Helpers ───────────────────────────────────────────────────────────

function toLocalDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function formatDate(s: string | null | undefined): string {
  if (!s) return '—'
  const str = s.includes('T') ? s.split('T')[0] : s
  const [y, m, d] = str.split('-')
  return `${d}/${m}/${y}`
}

function calcAge(dob: string | null): number | null {
  if (!dob) return null
  return Math.floor((Date.now() - new Date(dob).getTime()) / (365.25 * 86400000))
}

function Avatar({ name }: { name: string }) {
  const initials = name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() || '?'
  const colors = ['#B8FF3B', '#46C2FF', '#FFB84D', '#C084FC', '#F87171', '#34D399']
  const color = colors[name.charCodeAt(0) % colors.length]
  return (
    <div className="w-14 h-14 rounded-2xl flex items-center justify-center font-black text-base shrink-0"
      style={{ background: color + '20', color }}>
      {initials}
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────

export default function PersonalAthlete() {
  const { id: athleteId } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()
  const { profile: myProfile } = useProfile(user?.id)
  const isAdmin    = myProfile?.roles?.includes('admin')    ?? false
  const isPersonal = myProfile?.roles?.includes('personal') ?? false
  const isIAUser   = myProfile?.roles?.includes('ai')       ?? false

  const [athlete, setAthlete] = useState<AthleteProfile | null>(null)
  const [prs, setPRs] = useState<AthletePR[]>([])
  const [workouts, setWorkouts] = useState<PrescribedWorkoutData[]>([])
  const [loading, setLoading] = useState(true)
  const [showPRs, setShowPRs] = useState(false)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)

  async function handleDeleteWorkout(workoutId: string) {
    const { error } = await supabase.rpc('admin_delete_workout', { p_workout_id: workoutId })
    if (error) {
      console.error(error)
      return
    }
    setConfirmDeleteId(null)
    setWorkouts(prev => prev.filter(w => w.id !== workoutId))
  }

  useEffect(() => {
    if (!athleteId) return
    async function load() {
      const [summaryRes, profileRes, prRes, workoutsRes] = await Promise.all([
        supabase.rpc('personal_get_athletes_summary'),
        supabase.from('profiles').select('height_cm,main_goals').eq('user_id', athleteId).maybeSingle(),
        supabase.rpc('get_athlete_prs', { p_athlete_id: athleteId }),
        supabase.rpc('personal_get_athlete_workouts', { p_athlete_id: athleteId }),
      ])
      const summary: AthleteSummary | undefined = (summaryRes.data ?? []).find(
        (a: AthleteSummary) => a.user_id === athleteId
      )
      const extra = profileRes.data
      if (summary) {
        setAthlete({
          name:               summary.name,
          username:           summary.username,
          date_of_birth:      summary.date_of_birth,
          body_weight_kg:     summary.body_weight_kg,
          height_cm:          extra?.height_cm ?? null,
          gender:             summary.gender,
          experience_level:   summary.experience_level,
          training_frequency: summary.training_frequency,
          main_goals:         extra?.main_goals ?? null,
        })
      }
      setPRs(prRes.data ?? [])
      setWorkouts(workoutsRes.data ?? [])
      setLoading(false)
    }
    load()
  }, [athleteId])

  if (loading) {
    return (
      <div className="min-h-screen bg-graphite flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-lime border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  const name  = athlete?.name ?? athlete?.username ?? 'Athlete'
  const age   = calcAge(athlete?.date_of_birth ?? null)
  const today = toLocalDateStr(new Date())
  const canModify = (date: string) => date >= today

  const upcomingWorkouts = workouts.filter(w => w.workout_date >= today)
    .sort((a, b) => a.workout_date.localeCompare(b.workout_date))
  const pastWorkouts = workouts.filter(w => w.workout_date < today)
    .sort((a, b) => b.workout_date.localeCompare(a.workout_date))

  const EXP_LABELS: Record<string, string> = {
    beginner: 'Beginner', intermediate: 'Intermediate', advanced: 'Advanced', athlete: 'Athlete',
  }
  const GOAL_LABELS: Record<string, string> = {
    strength: 'Strength', crossfit: 'CrossFit', hypertrophy: 'Hypertrophy',
    performance: 'Performance', fat_loss: 'Fat loss', health: 'General health',
  }

  return (
    <div className="min-h-screen bg-graphite pb-32 safe-top">
      {/* Header */}
      <div className="px-5 pt-6 pb-4">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/athlete/personal')}
            className="w-10 h-10 rounded-xl bg-card border border-white/8 flex items-center justify-center shrink-0">
            <svg className="w-5 h-5 text-muted-gray" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div className="flex-1 min-w-0">
            <p className="text-muted-gray text-[10px] uppercase tracking-widest">Personal Trainer</p>
            <h1 className="text-lg font-black text-soft-white truncate">{name}</h1>
          </div>
          <Avatar name={name} />
        </div>
        {isIAUser && (
          <>
            <button
              onClick={() => navigate(`/athlete/report/${athleteId}`)}
              className="mt-3 w-full flex items-center justify-between px-3.5 py-2.5 border border-lime/30 bg-lime/[0.06] text-lime text-[11px] font-black uppercase tracking-widest"
            >
              <span>View monthly report</span>
              <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7"/></svg>
            </button>
            <button
              onClick={() => navigate(`/athlete/wrapped/${athleteId}`)}
              className="mt-2 w-full flex items-center justify-between px-3.5 py-2.5 border border-lime/30 bg-lime/[0.06] text-lime text-[11px] font-black uppercase tracking-widest"
            >
              <span>View Wrapped</span>
              <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7"/></svg>
            </button>
          </>
        )}
      </div>

      <div className="px-4 space-y-4">
        {/* Athlete info */}
        <div className="bg-card rounded-2xl border border-white/5 p-4">
          <p className="text-[11px] font-bold text-muted-gray uppercase tracking-widest mb-3">Profile</p>
          <div className="grid grid-cols-2 gap-y-3 gap-x-4">
            {[
              { label: 'Age', value: age != null ? `${age} y.o.` : null },
              { label: 'Weight', value: athlete?.body_weight_kg ? `${athlete.body_weight_kg} kg` : null },
              { label: 'Height', value: athlete?.height_cm ? `${athlete.height_cm} cm` : null },
              { label: 'Frequency', value: athlete?.training_frequency ? `${athlete.training_frequency}×/wk` : null },
              { label: 'Level', value: athlete?.experience_level ? EXP_LABELS[athlete.experience_level] ?? athlete.experience_level : null },
            ].map(({ label, value }) => (
              <div key={label}>
                <p className="text-muted-gray/40 text-[10px] uppercase tracking-wider">{label}</p>
                <p className="text-soft-white text-sm font-semibold mt-0.5">{value ?? '—'}</p>
              </div>
            ))}
          </div>
          {athlete?.main_goals?.length ? (
            <div className="mt-3 pt-3 border-t border-white/5">
              <p className="text-muted-gray/40 text-[10px] uppercase tracking-wider mb-1.5">Goals</p>
              <div className="flex flex-wrap gap-1.5">
                {athlete.main_goals.map(g => (
                  <span key={g} className="text-xs bg-white/8 text-muted-gray px-2.5 py-1">
                    {GOAL_LABELS[g] ?? g}
                  </span>
                ))}
              </div>
            </div>
          ) : null}
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-2">
          <div className="bg-card rounded-2xl border border-white/5 p-3 text-center">
            <p className="text-2xl font-black text-soft-white">{workouts.length}</p>
            <p className="text-muted-gray/50 text-[10px] mt-0.5">workouts</p>
          </div>
          <div className="bg-card rounded-2xl border border-white/5 p-3 text-center">
            <p className="text-2xl font-black text-lime">{upcomingWorkouts.length}</p>
            <p className="text-muted-gray/50 text-[10px] mt-0.5">scheduled</p>
          </div>
          <div className="bg-card rounded-2xl border border-white/5 p-3 text-center">
            <p className="text-2xl font-black text-soft-white">{prs.length}</p>
            <p className="text-muted-gray/50 text-[10px] mt-0.5">PRs</p>
          </div>
        </div>

        {/* PRs (collapsed, grouped by movement) */}
        {prs.length > 0 && (() => {
          const byMovement = prs.reduce<Record<string, AthletePR[]>>((acc, pr) => {
            ;(acc[pr.movement_name] ??= []).push(pr)
            return acc
          }, {})
          const movements = Object.keys(byMovement).sort()
          return (
            <div className="bg-card rounded-2xl border border-white/5 overflow-hidden">
              <button
                className="w-full flex items-center justify-between px-4 py-3"
                onClick={() => setShowPRs(p => !p)}
              >
                <p className="text-[11px] font-bold text-muted-gray uppercase tracking-widest">
                  Athlete PRs · {movements.length} exercise{movements.length !== 1 ? 's' : ''}
                </p>
                <svg className={`w-4 h-4 text-muted-gray/40 transition-transform ${showPRs ? 'rotate-180' : ''}`}
                  fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {showPRs && (
                <div className="px-4 pb-4 space-y-3 border-t border-white/5 pt-3">
                  {movements.map(movement => {
                    const movPRs = byMovement[movement].slice().sort((a, b) => a.reps - b.reps)
                    return (
                      <div key={movement}>
                        <p className="text-soft-white text-sm font-semibold leading-tight">{movement}</p>
                        <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1">
                          {movPRs.map(p => (
                            <span key={p.reps} className="text-xs text-muted-gray/60">
                              <span className="text-lime font-bold">{p.reps}RM</span> {p.max_weight}kg
                            </span>
                          ))}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })()}

        {/* Upcoming workouts */}
        {upcomingWorkouts.length > 0 && (
          <div>
            <p className="text-[11px] font-bold text-muted-gray uppercase tracking-widest px-1 mb-2">
              Upcoming workouts ({upcomingWorkouts.length})
            </p>
            <div className="space-y-2">
              {upcomingWorkouts.map(w => (
                <WorkoutCard
                  key={w.id} workout={w}
                  onEdit={isPersonal && canModify(w.workout_date) ? () => navigate(`/athlete/personal/new?a=${athleteId}&d=${w.workout_date}&w=${w.id}`, { state: { workout: w } }) : undefined}
                  onDelete={(isAdmin || isPersonal) && canModify(w.workout_date) ? () => setConfirmDeleteId(w.id) : undefined}
                />
              ))}
            </div>
          </div>
        )}

        {/* Past workouts */}
        {pastWorkouts.length > 0 && (
          <div>
            <p className="text-[11px] font-bold text-muted-gray uppercase tracking-widest px-1 mb-2">
              History ({pastWorkouts.length})
            </p>
            <div className="space-y-2">
              {pastWorkouts.map(w => (
                <WorkoutCard key={w.id} workout={w} isCoachView />
              ))}
            </div>
          </div>
        )}

        {workouts.length === 0 && (
          <div className="text-center py-10 space-y-2">
            <p className="text-soft-white font-semibold">Nenhum treino criado ainda</p>
            <p className="text-muted-gray/50 text-sm">Crie o primeiro treino para {name}</p>
          </div>
        )}
      </div>

      {/* Confirm delete workout */}
      {confirmDeleteId && (
        <div className="fixed inset-0 z-50 flex items-end" style={{ background: 'rgba(0,0,0,0.7)' }} onClick={() => setConfirmDeleteId(null)}>
          <div className="w-full" style={{ background: '#111111', borderTop: '2px solid #FF3B30', padding: '24px 20px 32px' }} onClick={e => e.stopPropagation()}>
            <p style={{ fontFamily: 'JetBrains Mono, monospace', fontWeight: 700, fontSize: 10, letterSpacing: '0.16em', textTransform: 'uppercase', color: '#FF3B30', marginBottom: 16 }}>
              DELETE WORKOUT? THIS ACTION CANNOT BE UNDONE.
            </p>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={() => handleDeleteWorkout(confirmDeleteId)}
                style={{ flex: 1, padding: '13px 0', background: '#FF3B30', border: 'none', fontFamily: 'JetBrains Mono, monospace', fontWeight: 900, fontSize: 11, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#0A0A0A', cursor: 'pointer' }}
              >
                YES, DELETE
              </button>
              <button
                onClick={() => setConfirmDeleteId(null)}
                style={{ flex: 1, padding: '13px 0', background: 'transparent', border: '1px solid #2A2A2A', fontFamily: 'JetBrains Mono, monospace', fontWeight: 700, fontSize: 11, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#6B6B68', cursor: 'pointer' }}
              >
                CANCEL
              </button>
            </div>
          </div>
        </div>
      )}

      {/* FAB */}
      <div className="fixed bottom-6 right-4">
        <button
          onClick={() => navigate(`/athlete/personal/new?a=${athleteId}&d=${toLocalDateStr(new Date())}`)}
          className="bg-lime text-graphite font-black text-sm px-5 py-3.5 rounded-2xl shadow-lg flex items-center gap-2 active:scale-95 transition-transform"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          New workout
        </button>
      </div>
    </div>
  )
}

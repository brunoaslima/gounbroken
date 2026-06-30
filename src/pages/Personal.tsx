import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { useProfile } from '@/hooks/useProfile'
import type { AthleteSummary, Profile } from '@/types'
import Drawer from '@/components/Drawer'

function toLocalDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function formatDate(s: string | null): string {
  if (!s) return '—'
  const [y, m, d] = s.split('T')[0].split('-')
  return `${d}/${m}/${y}`
}

function calcAge(dob: string | null): number | null {
  if (!dob) return null
  return Math.floor((Date.now() - new Date(dob).getTime()) / (365.25 * 86400000))
}

function Avatar({ name, size = 'md' }: { name: string; size?: 'sm' | 'md' | 'lg' }) {
  const initials = name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() || '?'
  const colors = ['#B8FF3B', '#46C2FF', '#FFB84D', '#C084FC', '#F87171', '#34D399']
  const color = colors[name.charCodeAt(0) % colors.length]
  const cls = { sm: 'w-8 h-8 text-xs', md: 'w-12 h-12 text-sm', lg: 'w-14 h-14 text-base' }[size]
  return (
    <div className={`${cls} rounded-xl flex items-center justify-center font-black shrink-0`}
      style={{ background: color + '20', color }}>
      {initials}
    </div>
  )
}

export default function Personal() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { profile, loading: profileLoading } = useProfile(user?.id)

  const [athletes, setAthletes] = useState<AthleteSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [drawerOpen, setDrawerOpen] = useState(false)

  // Add athlete sheet
  const [showAdd, setShowAdd] = useState(false)
  const [allUsers, setAllUsers] = useState<Profile[]>([])
  const [userSearch, setUserSearch] = useState('')
  const [loadingUsers, setLoadingUsers] = useState(false)
  const [adding, setAdding] = useState<string | null>(null)

  const loadAthletes = useCallback(async () => {
    if (!user) return
    setLoading(true)
    const { data, error } = await supabase.rpc('personal_get_athletes_summary')
    if (error) console.error('personal_get_athletes_summary error:', error)
    setAthletes(data ?? [])
    setLoading(false)
  }, [user])

  useEffect(() => {
    if (!profileLoading) loadAthletes()
  }, [profileLoading, loadAthletes])

  async function loadAllUsers() {
    setLoadingUsers(true)
    const { data } = await supabase.rpc('personal_get_all_users')
    const existing = new Set(athletes.map(a => a.user_id))
    setAllUsers(
      (data ?? []).filter((u: Profile) => u.user_id !== user?.id && !existing.has(u.user_id))
    )
    setLoadingUsers(false)
  }

  useEffect(() => {
    if (showAdd) loadAllUsers()
  }, [showAdd])

  const filteredUsers = allUsers.filter(u =>
    !userSearch ||
    (u.name ?? '').toLowerCase().includes(userSearch.toLowerCase()) ||
    (u.username ?? '').toLowerCase().includes(userSearch.toLowerCase())
  )

  async function handleAddAthlete(athleteId: string, athleteName: string) {
    setAdding(athleteId)
    const { error } = await supabase
      .from('trainer_athletes')
      .upsert({ trainer_id: user!.id, athlete_id: athleteId }, { onConflict: 'trainer_id,athlete_id' })

    if (error) {
      console.error('trainer_athletes upsert error:', error)
      setAdding(null)
      return
    }

    setAdding(null)
    setShowAdd(false)
    setUserSearch('')
    await loadAthletes()
  }

  if (profileLoading) {
    return (
      <div className="min-h-screen bg-graphite flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-lime border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!profile?.roles?.includes('personal') && !profile?.roles?.includes('admin')) {
    return (
      <div className="min-h-screen bg-graphite flex flex-col items-center justify-center gap-4 px-6 text-center">
        <div className="w-16 h-16 rounded-2xl bg-warning/10 border border-warning/20 flex items-center justify-center">
          <span className="text-3xl">🔒</span>
        </div>
        <h2 className="text-xl font-bold text-soft-white">Restricted access</h2>
        <p className="text-muted-gray text-sm">This area is exclusive to Personal Trainers.</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-graphite pb-24 md:pb-8 safe-top">
      <Drawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />

      {/* Add athlete sheet */}
      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-end" onClick={() => { setShowAdd(false); setUserSearch('') }}>
          <div className="absolute inset-0 bg-black/60" />
          <div
            className="relative w-full bg-graphite border-t border-white/10 rounded-t-3xl flex flex-col"
            style={{ maxHeight: '82vh' }}
            onClick={e => e.stopPropagation()}
          >
            <div className="w-10 h-1 bg-white/20 rounded-full mx-auto mt-3 mb-1 shrink-0" />
            <div className="px-5 pt-3 pb-3 shrink-0 border-b border-white/5">
              <h3 className="text-soft-white font-bold text-base mb-1">Add student</h3>
              <p className="text-muted-gray/60 text-xs mb-3">Select a user to link as your student</p>
              <input
                type="text"
                value={userSearch}
                onChange={e => setUserSearch(e.target.value)}
                placeholder="Search by name or @username..."
                className="w-full bg-card border border-white/10 rounded-2xl px-4 py-3 text-soft-white placeholder-muted-gray/40 text-sm focus:outline-none focus:border-lime/40 transition-colors"
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="off"
                spellCheck={false}
              />
            </div>
            <div className="flex-1 overflow-y-auto px-5 py-3 pb-10 space-y-2">
              {loadingUsers ? (
                <div className="flex justify-center py-8">
                  <div className="w-6 h-6 border-2 border-lime border-t-transparent rounded-full animate-spin" />
                </div>
              ) : filteredUsers.length === 0 ? (
                <p className="text-center text-muted-gray/50 text-sm py-8">
                  {userSearch ? 'No users found' : 'All users are already your students'}
                </p>
              ) : (
                filteredUsers.map(u => (
                  <div key={u.user_id} className="flex items-center gap-3 bg-card rounded-2xl border border-white/5 p-3">
                    <Avatar name={u.name ?? u.username ?? '?'} size="sm" />
                    <div className="flex-1 min-w-0">
                      <p className="text-soft-white text-sm font-semibold truncate">{u.name ?? 'No name'}</p>
                      {u.username && <p className="text-muted-gray/50 text-xs">@{u.username}</p>}
                    </div>
                    <button
                      onClick={() => handleAddAthlete(u.user_id, u.name ?? u.username ?? 'Athlete')}
                      disabled={adding === u.user_id}
                      className="shrink-0 bg-lime/15 border border-lime/30 text-lime text-xs font-bold px-3 py-2 rounded-xl disabled:opacity-50 transition-colors active:scale-95"
                    >
                      {adding === u.user_id
                        ? <span className="w-4 h-4 border-2 border-lime/40 border-t-lime rounded-full animate-spin inline-block" />
                        : 'Add'}
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="px-5 pt-6 pb-4">
        <div className="flex items-center justify-between">
          <button onClick={() => setDrawerOpen(true)}
            className="w-10 h-10 rounded-xl bg-card border border-white/8 flex items-center justify-center">
            <svg className="w-5 h-5 text-muted-gray" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <div className="text-center">
            <p className="text-muted-gray text-[10px] uppercase tracking-widest">Personal Trainer</p>
            <h1 className="text-lg font-black text-soft-white">My Athletes</h1>
          </div>
          <button
            onClick={() => setShowAdd(true)}
            className="w-10 h-10 rounded-xl bg-lime/15 border border-lime/30 flex items-center justify-center active:scale-95 transition-transform"
          >
            <svg className="w-5 h-5 text-lime" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          </button>
        </div>
      </div>

      <div className="px-4 space-y-3">
        {loading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-28 bg-card rounded-2xl border border-white/5 animate-pulse" />
          ))
        ) : athletes.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-4 text-center">
            <div className="w-16 h-16 rounded-2xl bg-lime/10 border border-lime/20 flex items-center justify-center">
              <span className="text-3xl">👥</span>
            </div>
            <div>
              <p className="text-soft-white font-bold">No athletes linked</p>
              <p className="text-muted-gray text-sm mt-1">Tap + to add your first athlete</p>
            </div>
            <button
              onClick={() => setShowAdd(true)}
              className="bg-lime text-graphite text-sm font-bold px-6 py-3 rounded-2xl active:scale-95 transition-transform"
            >
              Add athlete
            </button>
          </div>
        ) : (
          athletes.map(a => {
            const age = calcAge(a.date_of_birth)
            const name = a.name ?? a.username ?? 'No name'
            return (
              <div key={a.user_id} className="bg-card rounded-2xl border border-white/5 overflow-hidden">
                {/* Card header — click to open athlete detail */}
                <button
                  className="w-full flex items-center gap-3 p-4 text-left active:bg-white/3 transition-colors"
                  onClick={() => navigate(`/athlete/personal/athlete/${a.user_id}`)}
                >
                  <Avatar name={name} />
                  <div className="flex-1 min-w-0">
                    <p className="text-soft-white font-bold truncate">{name}</p>
                    <div className="flex gap-2 flex-wrap mt-0.5">
                      {a.username && <span className="text-muted-gray/50 text-xs">@{a.username}</span>}
                      {age != null && <span className="text-muted-gray/60 text-xs">{age} y.o.</span>}
                      {a.body_weight_kg && <span className="text-muted-gray/60 text-xs">{a.body_weight_kg}kg</span>}
                    </div>
                  </div>
                  <svg className="w-4 h-4 text-muted-gray/30 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>

                {/* Stats strip */}
                <div className="grid grid-cols-3 border-t border-white/5">
                  <div className="px-3 py-2.5 text-center border-r border-white/5">
                    <p className="text-soft-white font-black text-base leading-none">{a.workout_count}</p>
                    <p className="text-muted-gray/50 text-[10px] mt-0.5">workouts</p>
                  </div>
                  <div className="px-3 py-2.5 text-center border-r border-white/5">
                    <p className="text-soft-white font-bold text-xs leading-tight">{formatDate(a.last_workout_date)}</p>
                    <p className="text-muted-gray/50 text-[10px] mt-0.5">last</p>
                  </div>
                  <div className="px-3 py-2.5 text-center">
                    <p className={`font-bold text-xs leading-tight ${a.next_workout_date ? 'text-lime' : 'text-soft-white'}`}>
                      {formatDate(a.next_workout_date)}
                    </p>
                    <p className="text-muted-gray/50 text-[10px] mt-0.5">next</p>
                  </div>
                </div>

                {/* Action row */}
                <div className="px-3 py-2.5 border-t border-white/5 flex gap-2">
                  <button
                    onClick={() => navigate(`/athlete/personal/athlete/${a.user_id}`)}
                    className="flex-1 bg-white/5 text-muted-gray text-xs font-semibold py-2 rounded-xl transition-colors"
                  >
                    View details
                  </button>
                  <button
                    onClick={() => navigate(`/athlete/personal/new?a=${a.user_id}&d=${toLocalDateStr(new Date())}`)}
                    className="flex-1 bg-lime/15 border border-lime/25 text-lime text-xs font-bold py-2 rounded-xl transition-colors active:scale-95"
                  >
                    + New workout
                  </button>
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}

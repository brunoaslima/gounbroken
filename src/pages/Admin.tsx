import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { useProfile } from '@/hooks/useProfile'
import { supabase } from '@/lib/supabase'
import type { Profile } from '@/types'
import { posthogConfigured } from '@/lib/posthog'

const ROLE_LABELS: Record<string, string> = {
  admin: 'Admin', personal: 'Personal', box_admin: 'Box Admin', user: 'User', ai: 'AI',
}
const ROLE_COLORS: Record<string, string> = {
  admin: '#D4FF3A', personal: '#4DA3FF', box_admin: '#FF8A00', user: '#A8A8A4', ai: '#A8A8A4',
}

interface ActivityData {
  user_id: string; score_count: number
  last_training_date: string | null; last_login_at: string | null
}
interface AiUsageRow {
  id: string; function_name: string; triggered_by: string | null; triggered_name: string | null
  athlete_id: string | null; athlete_name: string | null; model: string
  input_tokens: number; output_tokens: number; cost_usd: number; created_at: string
}
interface AiByUser {
  user_id: string | null; user_name: string | null; calls: number; cost_usd: number
}
interface UserRow extends Profile {
  score_count?: number; last_training_date?: string | null; last_login_at?: string | null
}
interface Demographics {
  total_users: number; new_last_7d: number; new_last_30d: number
  gender_male: number; gender_female: number; gender_other: number; gender_unknown: number
  avg_age: number | null; min_age: number | null; max_age: number | null
  age_under_18: number; age_18_24: number; age_25_34: number
  age_35_44: number; age_45_54: number; age_55_plus: number
  avg_weight: number | null; avg_height: number | null; avg_bmi: number | null
  users_with_prs: number; total_prs: number
  avg_prs_per_user: number | null; top_movement: string | null
}

function timeAgo(d: string | null | undefined) {
  if (!d) return '—'
  const days = Math.floor((Date.now() - new Date(d).getTime()) / 86400000)
  if (days === 0) return 'today'
  if (days === 1) return 'yesterday'
  if (days < 7) return `${days}d`
  if (days < 30) return `${Math.floor(days / 7)}w`
  return `${Math.floor(days / 30)}mo`
}
function shortDate(s: string | null | undefined) {
  if (!s) return '—'
  const [y, m, d] = s.split('T')[0].split('-')
  return `${d}/${m}/${y.slice(2)}`
}

function Lbl({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <span style={{
      fontFamily: '"JetBrains Mono", monospace', fontSize: 10, fontWeight: 700,
      letterSpacing: '0.12em', textTransform: 'uppercase', color: '#6B6B68', lineHeight: 1,
      ...style,
    }}>{children}</span>
  )
}

function Sparkline({ values, w = 60, h = 20 }: { values: number[]; w?: number; h?: number }) {
  if (values.length < 2) return null
  const min = Math.min(...values), max = Math.max(...values)
  const range = max - min || 1
  const pts = values.map((v, i) => {
    const x = (i / (values.length - 1)) * w
    const y = h - ((v - min) / range) * (h - 2) - 1
    return `${x.toFixed(1)},${y.toFixed(1)}`
  }).join(' ')
  return (
    <svg width={w} height={h} style={{ display: 'block', flexShrink: 0 }}>
      <polyline points={pts} fill="none" stroke="#D4FF3A" strokeWidth="1.5" />
    </svg>
  )
}

function StatCard({ eyebrow, value, deltaLabel, sparkline }: {
  eyebrow: string; value: string; deltaLabel?: string; sparkline?: number[]
}) {
  return (
    <div style={{ background: '#141414', border: '1px solid #2A2A2A', padding: 16, display: 'flex', flexDirection: 'column', gap: 10, minHeight: 120 }}>
      <Lbl>{eyebrow}</Lbl>
      <span style={{ fontFamily: '"JetBrains Mono", monospace', fontWeight: 800, fontSize: 28, letterSpacing: '-0.01em', color: '#F5F5F0', lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>
        {value}
      </span>
      <div style={{ marginTop: 'auto', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        {deltaLabel && <Lbl style={{ color: '#3D3D3B', fontSize: 9 }}>{deltaLabel}</Lbl>}
        {sparkline && <Sparkline values={sparkline} />}
      </div>
    </div>
  )
}

function StatusBadge({ isActive }: { isActive: boolean }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 7px', flexShrink: 0,
      border: `1px solid ${isActive ? '#D4FF3A' : '#2A2A2A'}`,
      color: isActive ? '#D4FF3A' : '#6B6B68',
      fontFamily: '"JetBrains Mono", monospace', fontWeight: 700, fontSize: 9, letterSpacing: '0.12em', textTransform: 'uppercase' as const,
    }}>
      <span style={{ width: 5, height: 5, background: isActive ? '#D4FF3A' : '#6B6B68', borderRadius: 99 }} />
      {isActive ? 'Active' : 'Inactive'}
    </span>
  )
}

function UserDetailSheet({ u, currentUserId, adminEmail, onClose, onToggleRole, onToggleActive, onDeleteUser, updatingId }: {
  u: UserRow; currentUserId?: string; adminEmail?: string; onClose: () => void
  onToggleRole: (id: string, role: string) => void
  onToggleActive: (id: string, current: boolean) => void
  onDeleteUser: (userId: string, password: string) => Promise<string | null>
  updatingId: string | null
}) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deletePassword, setDeletePassword] = useState('')
  const [deleteError, setDeleteError] = useState('')
  const [deleting, setDeleting] = useState(false)
  const bmi = u.body_weight_kg && u.height_cm
    ? Math.round((u.body_weight_kg / Math.pow(u.height_cm / 100, 2)) * 10) / 10
    : null
  const age = u.date_of_birth
    ? Math.floor((Date.now() - new Date(u.date_of_birth).getTime()) / (365.25 * 86400000))
    : null
  const isActive = u.is_active !== false
  const isUpdating = updatingId === u.user_id
  const isMe = u.user_id === currentUserId
  const initials = (u.name ?? u.username ?? '?').split(' ').map((w: string) => w[0]).slice(0, 2).join('').toUpperCase()

  const GENDER_LABELS: Record<string, string> = { male: 'Male', female: 'Female', other: 'Other' }

  const rows = [
    { label: 'Age', value: age != null ? `${age} yrs` : '—' },
    { label: 'Gender', value: u.gender ? (GENDER_LABELS[u.gender] ?? u.gender) : '—' },
    { label: 'Weight', value: u.body_weight_kg ? `${u.body_weight_kg} kg` : '—' },
    { label: 'Height', value: u.height_cm ? `${u.height_cm} cm` : '—' },
    { label: 'BMI', value: bmi ? String(bmi) : '—' },
    { label: 'Scores', value: u.score_count != null ? String(u.score_count) : '—' },
    { label: 'Last workout', value: shortDate(u.last_training_date) },
    { label: 'Last login', value: timeAgo(u.last_login_at) },
    { label: 'Joined', value: shortDate(u.created_at) },
  ]

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center md:justify-center" onClick={onClose}>
      <div className="absolute inset-0" style={{ background: 'rgba(0,0,0,0.75)' }} />
      <div
        className="relative w-full overflow-y-auto md:max-w-[540px] md:max-h-[80vh] md:border md:border-[#2A2A2A]"
        style={{ background: '#0A0A0A', borderTop: '1px solid #2A2A2A', maxHeight: '88vh' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ padding: '18px 20px 16px', borderBottom: '1px solid #2A2A2A', display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ width: 44, height: 44, background: '#1F1F1F', border: '1px solid #2A2A2A', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <span style={{ fontFamily: '"JetBrains Mono", monospace', fontWeight: 800, fontSize: 14, color: '#F5F5F0', letterSpacing: '0.04em' }}>{initials}</span>
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontFamily: '"Space Grotesk", sans-serif', fontSize: 16, fontWeight: 700, color: '#F5F5F0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {u.name ?? u.username ?? 'No name'}
            </div>
            {u.username && (
              <div style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: 11, color: '#6B6B68', marginTop: 2 }}>@{u.username}</div>
            )}
          </div>
          <button
            onClick={onClose}
            style={{ background: 'transparent', border: '1px solid #2A2A2A', color: '#6B6B68', width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontFamily: '"JetBrains Mono", monospace', fontWeight: 700, fontSize: 12, flexShrink: 0 }}
          >✕</button>
        </div>

        {/* Status + Roles controls */}
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #2A2A2A', display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Lbl>Status</Lbl>
            <button
              onClick={() => onToggleActive(u.user_id, isActive)}
              disabled={isUpdating || isMe}
              style={{
                background: 'transparent', border: `1px solid ${isActive ? '#D4FF3A' : '#2A2A2A'}`,
                color: isActive ? '#D4FF3A' : '#6B6B68',
                padding: '6px 12px', display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer',
                fontFamily: '"JetBrains Mono", monospace', fontWeight: 700, fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase' as const,
                opacity: isUpdating || isMe ? 0.4 : 1,
              }}
            >
              <span style={{ width: 5, height: 5, background: isActive ? '#D4FF3A' : '#6B6B68', borderRadius: 99 }} />
              {isActive ? 'Active' : 'Inactive'}
            </button>
          </div>

          <div>
            <Lbl style={{ display: 'block', marginBottom: 10 }}>Roles</Lbl>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {(['user', 'personal', 'box_admin', 'admin', 'ai'] as const).map(role => {
                const hasRole = u.roles?.includes(role)
                return (
                  <button
                    key={role}
                    onClick={() => onToggleRole(u.user_id, role)}
                    disabled={isUpdating || (isMe && role === 'admin')}
                    style={{
                      padding: '6px 10px', background: 'transparent',
                      border: `1px solid ${hasRole ? ROLE_COLORS[role] : '#2A2A2A'}`,
                      color: hasRole ? ROLE_COLORS[role] : '#6B6B68',
                      fontFamily: '"JetBrains Mono", monospace', fontWeight: 700, fontSize: 10,
                      letterSpacing: '0.1em', textTransform: 'uppercase' as const, cursor: 'pointer',
                      opacity: isUpdating ? 0.5 : 1,
                    }}
                  >
                    {hasRole ? '✓ ' : ''}{ROLE_LABELS[role]}
                  </button>
                )
              })}
            </div>
          </div>
        </div>

        {/* Data rows */}
        {rows.map(({ label, value }) => (
          <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '11px 20px', borderBottom: '1px solid #2A2A2A' }}>
            <Lbl>{label}</Lbl>
            <span style={{ fontFamily: '"Space Grotesk", sans-serif', fontSize: 13, color: '#F5F5F0' }}>{value}</span>
          </div>
        ))}

        {/* Delete user — only for non-self */}
        {!isMe && !showDeleteConfirm && (
          <div style={{ padding: '20px 20px 8px', display: 'flex', justifyContent: 'center' }}>
            <button
              onClick={() => { setDeletePassword(''); setDeleteError(''); setShowDeleteConfirm(true) }}
              disabled={isUpdating}
              style={{
                background: 'transparent', border: 0, padding: 0,
                fontFamily: '"JetBrains Mono", monospace', fontWeight: 700, fontSize: 10,
                letterSpacing: '0.14em', textTransform: 'uppercase' as const,
                color: '#3A3A38', cursor: 'pointer', opacity: isUpdating ? 0.4 : 1,
              }}
            >
              Delete user
            </button>
          </div>
        )}

        {/* Delete confirm inline */}
        {!isMe && showDeleteConfirm && (
          <div style={{ margin: '16px 20px 8px', border: '1px solid #3A1A1A', padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
            <span style={{ fontFamily: '"JetBrains Mono", monospace', fontWeight: 700, fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase' as const, color: '#8B3030' }}>
              Confirm deletion
            </span>
            <p style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: 10, color: '#6B6B68', lineHeight: 1.6, margin: 0 }}>
              This will permanently delete <strong style={{ color: '#A8A8A4' }}>{u.name ?? u.username ?? 'this user'}</strong>'s account and all associated data.
              Type your password to confirm.
            </p>
            <input
              type="password"
              value={deletePassword}
              onChange={e => { setDeletePassword(e.target.value); setDeleteError('') }}
              onKeyDown={e => { if (e.key === 'Enter' && deletePassword.trim()) handleDelete() }}
              placeholder="Your password"
              disabled={deleting}
              autoComplete="current-password"
              style={{
                background: '#0A0A0A', border: `1px solid ${deleteError ? '#8B3030' : '#2A2A2A'}`,
                color: '#F5F5F0', fontFamily: '"JetBrains Mono", monospace', fontSize: 13,
                padding: '10px 12px', outline: 'none', width: '100%', boxSizing: 'border-box' as const,
                opacity: deleting ? 0.5 : 1,
              }}
            />
            {deleteError && (
              <span style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: 10, color: '#f87171' }}>{deleteError}</span>
            )}
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={() => { setShowDeleteConfirm(false); setDeletePassword(''); setDeleteError('') }}
                disabled={deleting}
                style={{
                  flex: 1, background: 'transparent', border: '1px solid #2A2A2A',
                  color: '#6B6B68', fontFamily: '"JetBrains Mono", monospace', fontWeight: 700,
                  fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase' as const,
                  padding: '10px 0', cursor: 'pointer', opacity: deleting ? 0.4 : 1,
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting || !deletePassword.trim()}
                style={{
                  flex: 1, background: 'transparent', border: '1px solid #8B3030',
                  color: '#f87171', fontFamily: '"JetBrains Mono", monospace', fontWeight: 700,
                  fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase' as const,
                  padding: '10px 0', cursor: 'pointer', opacity: (deleting || !deletePassword.trim()) ? 0.4 : 1,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                }}
              >
                {deleting
                  ? <><div style={{ width: 10, height: 10, border: '1px solid #f87171', borderTopColor: 'transparent', borderRadius: 99, animation: 'spin 0.7s linear infinite' }} />Deleting…</>
                  : 'Confirm'}
              </button>
            </div>
          </div>
        )}

        <div style={{ height: 32 }} />
      </div>
    </div>
  )

  async function handleDelete() {
    if (!deletePassword.trim()) return
    setDeleting(true)
    setDeleteError('')
    const err = await onDeleteUser(u.user_id, deletePassword)
    if (err) {
      setDeleteError(err)
      setDeleting(false)
    }
    // on success, parent closes the sheet and removes the user from list
  }
}

export default function Admin() {
  const { user } = useAuth()
  const { profile, loading: profileLoading } = useProfile(user?.id)
  const navigate = useNavigate()
  const [users, setUsers] = useState<UserRow[]>([])
  const [demo, setDemo] = useState<Demographics | null>(null)
  const [loading, setLoading] = useState(true)
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [filterRole, setFilterRole] = useState<string>('all')
  const [tab, setTab] = useState<'overview' | 'users' | 'analytics' | 'ai'>('overview')
  const [selectedUser, setSelectedUser] = useState<UserRow | null>(null)
  const [aiStats, setAiStats] = useState<Record<string, number> | null>(null)
  const [aiRecent, setAiRecent] = useState<AiUsageRow[]>([])
  const [aiByUser, setAiByUser] = useState<AiByUser[]>([])
  const [aiLoading, setAiLoading] = useState(false)

  async function loadAiData() {
    setAiLoading(true)
    const [statsRes, recentRes, byUserRes] = await Promise.all([
      supabase.rpc('admin_get_ai_usage_stats'),
      supabase.rpc('admin_get_ai_usage_recent', { p_limit: 50 }),
      supabase.rpc('admin_get_ai_usage_by_user'),
    ])
    setAiStats(statsRes.data ?? null)
    setAiRecent(recentRes.data ?? [])
    setAiByUser(byUserRes.data ?? [])
    setAiLoading(false)
  }

  async function loadData() {
    const [profilesRes, activityRes, demoRes] = await Promise.all([
      supabase.rpc('admin_get_all_profiles'),
      supabase.rpc('admin_get_user_activity'),
      supabase.rpc('admin_get_demographics'),
    ])
    const profiles: Profile[] = profilesRes.data ?? []
    const activity: ActivityData[] = activityRes.data ?? []
    const actMap = Object.fromEntries(activity.map(a => [a.user_id, a]))
    setUsers(profiles.map(p => ({
      ...p,
      score_count: actMap[p.user_id]?.score_count ?? 0,
      last_training_date: actMap[p.user_id]?.last_training_date ?? null,
      last_login_at: actMap[p.user_id]?.last_login_at ?? null,
    })))
    setDemo(demoRes.data ?? null)
    setLoading(false)
  }

  useEffect(() => {
    if (profileLoading) return
    if (!profile?.roles?.includes('admin')) { setLoading(false); return }
    loadData()
  }, [profile, profileLoading])

  async function toggleRole(userId: string, role: string) {
    setUpdatingId(userId)
    await supabase.rpc('admin_toggle_user_role', { p_user_id: userId, p_role: role })
    setUsers(prev => prev.map(u => {
      if (u.user_id !== userId) return u
      const has = u.roles?.includes(role)
      const next = has ? (u.roles ?? []).filter(r => r !== role) : [...(u.roles ?? []), role]
      return { ...u, roles: next.length > 0 ? next : ['user'] }
    }))
    setUpdatingId(null)
    if (selectedUser?.user_id === userId) {
      setSelectedUser(prev => {
        if (!prev) return null
        const has = prev.roles?.includes(role)
        const next = has ? (prev.roles ?? []).filter(r => r !== role) : [...(prev.roles ?? []), role]
        return { ...prev, roles: next.length > 0 ? next : ['user'] }
      })
    }
  }

  async function deleteUser(userId: string, password: string): Promise<string | null> {
    if (!user?.email) return 'Error: admin email not found'
    // 1. Re-authenticate admin
    const { error: authError } = await supabase.auth.signInWithPassword({ email: user.email, password })
    if (authError) return 'Incorrect password. Please try again.'
    // 2. Delete via SECURITY DEFINER function
    const { error: delError } = await supabase.rpc('admin_delete_user', { p_user_id: userId })
    if (delError) return 'Failed to delete user.'
    // 3. Close sheet and reload all data (refreshes metrics + user count)
    setSelectedUser(null)
    await loadData()
    return null
  }

  async function toggleActive(userId: string, current: boolean) {
    setUpdatingId(userId)
    await supabase.rpc('admin_toggle_user_active', { p_user_id: userId, p_is_active: !current })
    setUsers(prev => prev.map(u => u.user_id === userId ? { ...u, is_active: !current } : u))
    if (selectedUser?.user_id === userId) {
      setSelectedUser(prev => prev ? { ...prev, is_active: !current } : null)
    }
    setUpdatingId(null)
  }

  if (profileLoading || loading) {
    return (
      <div style={{ minHeight: '100vh', background: '#0A0A0A' }} className="safe-top">
        <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 20px', height: 52, borderBottom: '1px solid #2A2A2A' }}>
          <div style={{ width: 40 }} />
          <Lbl style={{ fontSize: 11, letterSpacing: '0.18em' }}>Admin</Lbl>
          <div style={{ width: 40 }} />
        </header>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 60 }}>
          <div className="w-5 h-5 border-2 border-[#D4FF3A] border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    )
  }

  if (!profile?.roles?.includes('admin')) {
    return (
      <div style={{ minHeight: '100vh', background: '#0A0A0A', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, padding: '0 24px', textAlign: 'center' }}>
        <div style={{ border: '1px solid #2A2A2A', padding: '16px 24px' }}>
          <Lbl>Restricted access</Lbl>
        </div>
        <p style={{ fontFamily: '"Space Grotesk", sans-serif', fontSize: 13, color: '#6B6B68' }}>
          This area is for administrators only.
        </p>
      </div>
    )
  }

  const d = demo
  const totalUsers = users.length
  const activeUsers = users.filter(u => u.is_active !== false).length
  const inactiveUsers = totalUsers - activeUsers

  const filtered = users.filter(u => {
    const matchSearch = !search ||
      (u.name ?? '').toLowerCase().includes(search.toLowerCase()) ||
      (u.username ?? '').toLowerCase().includes(search.toLowerCase())
    const matchRole = filterRole === 'all' || u.roles?.includes(filterRole)
    return matchSearch && matchRole
  })

  // Cumulative user count per month (last 12)
  const now = new Date()
  const monthlyTotals = Array.from({ length: 12 }, (_, i) => {
    const cutoff = new Date(now.getFullYear(), now.getMonth() - 11 + i + 1, 0)
    return users.filter(u => u.created_at && new Date(u.created_at) <= cutoff).length
  })

  const recentSignups = users
    .slice()
    .sort((a, b) => new Date(b.created_at ?? 0).getTime() - new Date(a.created_at ?? 0).getTime())
    .slice(0, 6)

  return (
    <div style={{ minHeight: '100vh', background: '#0A0A0A', paddingBottom: 40 }} className="safe-top">
      {selectedUser && (
        <UserDetailSheet
          u={selectedUser}
          currentUserId={user?.id}
          adminEmail={user?.email}
          onClose={() => setSelectedUser(null)}
          onToggleRole={toggleRole}
          onToggleActive={toggleActive}
          onDeleteUser={deleteUser}
          updatingId={updatingId}
        />
      )}

      <div className="max-w-screen-xl mx-auto w-full">

      {/* TopBar */}
      <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 20px', height: 52, borderBottom: '1px solid #2A2A2A' }}>
        <button
          onClick={() => navigate('/athlete/profile')}
          style={{ width: 40, height: 40, marginLeft: -8, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'transparent', border: 0, color: '#6B6B68', cursor: 'pointer' }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>
        <Lbl style={{ fontSize: 11, letterSpacing: '0.18em' }}>Admin</Lbl>
        <div style={{ width: 40 }} />
      </header>

      {/* Tab selector */}
      <div style={{ display: 'flex', borderBottom: '1px solid #2A2A2A' }}>
        {(['overview', 'users', 'analytics', 'ai'] as const).map(t => (
          <button
            key={t}
            onClick={() => {
              setTab(t)
              if (t === 'ai' && !aiStats && !aiLoading) loadAiData()
            }}
            style={{
              flex: 1, padding: '13px 0', background: 'transparent', border: 0,
              borderBottom: `2px solid ${tab === t ? '#D4FF3A' : 'transparent'}`,
              color: tab === t ? '#F5F5F0' : '#6B6B68',
              fontFamily: '"JetBrains Mono", monospace', fontWeight: 700, fontSize: 11,
              letterSpacing: '0.12em', textTransform: 'uppercase' as const, cursor: 'pointer',
              marginBottom: -1, transition: 'color 0.15s',
            }}
          >
            {t === 'overview' ? 'Overview' : t === 'users' ? `Users · ${totalUsers}` : t === 'analytics' ? 'Analytics' : 'Claude'}
          </button>
        ))}
      </div>

      {/* ── OVERVIEW TAB ── */}
      {tab === 'overview' && (
        <>
          {/* Stat cards — 2 cols mobile, 4 cols desktop */}
          <div className="grid grid-cols-2 md:grid-cols-4">
            {([
              { eyebrow: 'Total users',     value: String(d?.total_users ?? totalUsers), deltaLabel: `+${d?.new_last_7d ?? 0} this week`, sparkline: monthlyTotals },
              { eyebrow: 'Active · 30d',    value: String(activeUsers),   deltaLabel: `${totalUsers > 0 ? Math.round((activeUsers / totalUsers) * 100) : 0}% of total` },
              { eyebrow: 'Inactive · 30d',  value: String(inactiveUsers), deltaLabel: 'no recent workout' },
              { eyebrow: 'New · 7d',        value: String(d?.new_last_7d ?? 0), deltaLabel: `${d?.new_last_30d ?? 0} this month` },
            ] as const).map((c, i) => (
              <div key={i} style={{ marginTop: i < 2 ? 0 : -1, marginLeft: i % 2 === 0 ? 0 : -1 }} className="md:mt-0 md:ml-[-1px]">
                <StatCard {...c} />
              </div>
            ))}
          </div>

          {/* 2-col grid on desktop: Left = Role dist + Physical avgs, Right = Recent signups + Engagement */}
          <div className="md:grid md:grid-cols-2 md:items-start md:border-t md:border-[#2A2A2A]">
            {/* Left column */}
            <div className="md:border-r md:border-[#2A2A2A]">
              {/* Role distribution */}
              <div style={{ background: '#141414', border: '1px solid #2A2A2A', padding: 20, marginTop: -1 }} className="md:mt-0">
                <Lbl style={{ display: 'block', marginBottom: 16 }}>Role distribution</Lbl>
                {totalUsers > 0 && (() => {
                  const roleData = (['user', 'personal', 'box_admin', 'admin', 'ai'] as const)
                    .map(role => ({ role, count: users.filter(u => u.roles?.includes(role)).length, color: ROLE_COLORS[role] }))
                    .filter(r => r.count > 0)
                  return (
                    <>
                      <div style={{ display: 'flex', height: 8, marginBottom: 16 }}>
                        {roleData.map((r, i) => (
                          <span key={r.role} style={{ width: `${(r.count / totalUsers) * 100}%`, background: r.color, marginLeft: i === 0 ? 0 : 1 }} />
                        ))}
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 11 }}>
                        {roleData.map(r => (
                          <div key={r.role} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <span style={{ width: 8, height: 8, background: r.color, flexShrink: 0 }} />
                            <span style={{ flex: 1, fontFamily: '"Space Grotesk", sans-serif', fontSize: 13, fontWeight: 600, color: '#F5F5F0' }}>{ROLE_LABELS[r.role]}</span>
                            <span style={{ fontFamily: '"JetBrains Mono", monospace', fontWeight: 700, fontSize: 12, color: '#F5F5F0', fontVariantNumeric: 'tabular-nums' }}>{r.count}</span>
                            <span style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: 10, color: '#6B6B68', width: 40, textAlign: 'right' }}>{((r.count / totalUsers) * 100).toFixed(1)}%</span>
                          </div>
                        ))}
                      </div>
                    </>
                  )
                })()}
              </div>

              {/* Physical averages */}
              {(d?.avg_weight || d?.avg_height) && (
                <div style={{ background: '#141414', border: '1px solid #2A2A2A', padding: 20, marginTop: -1 }}>
                  <Lbl style={{ display: 'block', marginBottom: 16 }}>Physical averages</Lbl>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr' }}>
                    {[
                      { label: 'kg', value: d?.avg_weight ? String(d.avg_weight) : '—' },
                      { label: 'cm', value: d?.avg_height ? String(d.avg_height) : '—' },
                      { label: 'IMC', value: d?.avg_bmi ? String(d.avg_bmi) : '—' },
                    ].map((item, i) => (
                      <div key={item.label} style={{ padding: '10px 0', textAlign: 'center', borderLeft: i === 0 ? 'none' : '1px solid #2A2A2A' }}>
                        <div style={{ fontFamily: '"JetBrains Mono", monospace', fontWeight: 800, fontSize: 22, color: '#F5F5F0', fontVariantNumeric: 'tabular-nums' }}>{item.value}</div>
                        <Lbl style={{ fontSize: 9, marginTop: 4, display: 'block' }}>{item.label}</Lbl>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Right column */}
            <div>
              {/* Recent signups */}
              <div style={{ background: '#141414', border: '1px solid #2A2A2A', marginTop: -1 }} className="md:mt-0">
                <div style={{ padding: '14px 20px', borderBottom: '1px solid #2A2A2A', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Lbl>Recent signups</Lbl>
                  <button
                    onClick={() => setTab('users')}
                    style={{ background: 'transparent', border: 0, color: '#A8A8A4', fontFamily: '"JetBrains Mono", monospace', fontWeight: 700, fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', cursor: 'pointer', padding: 0 }}
                  >
                    View all →
                  </button>
                </div>
                {recentSignups.map((u, i) => {
                  const initials = (u.name ?? u.username ?? '?').split(' ').map((w: string) => w[0]).slice(0, 2).join('').toUpperCase()
                  const specialRoles = (u.roles ?? []).filter(r => r !== 'user')
                  return (
                    <div
                      key={u.user_id}
                      style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 20px', borderTop: i === 0 ? 'none' : '1px solid #2A2A2A', cursor: 'pointer' }}
                      onClick={() => setSelectedUser(u)}
                    >
                      <div style={{ width: 32, height: 32, background: '#1F1F1F', border: '1px solid #2A2A2A', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <span style={{ fontFamily: '"JetBrains Mono", monospace', fontWeight: 700, fontSize: 11, color: '#F5F5F0', letterSpacing: '0.04em' }}>{initials}</span>
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontFamily: '"Space Grotesk", sans-serif', fontSize: 13, fontWeight: 600, color: '#F5F5F0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {u.name ?? u.username ?? 'No name'}
                        </div>
                        {specialRoles.length > 0 && (
                          <Lbl style={{ color: ROLE_COLORS[specialRoles[0]] ?? '#6B6B68', fontSize: 9 }}>
                            {ROLE_LABELS[specialRoles[0]] ?? specialRoles[0]}
                          </Lbl>
                        )}
                      </div>
                      <Lbl style={{ color: '#3D3D3B', whiteSpace: 'nowrap', fontSize: 9 }}>{shortDate(u.created_at)}</Lbl>
                    </div>
                  )
                })}
              </div>

              {/* Engagement */}
              <div style={{ background: '#141414', border: '1px solid #2A2A2A', marginTop: -1 }}>
                <div style={{ padding: '14px 20px', borderBottom: '1px solid #2A2A2A' }}>
                  <Lbl>Engagement</Lbl>
                </div>
                {[
                  { label: 'Total PRs', value: String(d?.total_prs ?? 0) },
                  { label: 'Avg PRs / user', value: d?.avg_prs_per_user != null ? String(d.avg_prs_per_user) : '—' },
                  { label: 'Users with PRs', value: String(d?.users_with_prs ?? 0) },
                  { label: 'Top movement', value: d?.top_movement ?? '—' },
                ].map(({ label, value }) => (
                  <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 20px', borderBottom: '1px solid #2A2A2A' }}>
                    <Lbl>{label}</Lbl>
                    <span style={{ fontFamily: '"JetBrains Mono", monospace', fontWeight: 700, fontSize: 13, color: '#F5F5F0', fontVariantNumeric: 'tabular-nums' }}>{value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}

      {/* ── USERS TAB ── */}
      {tab === 'users' && (
        <>
          {/* Quick stats strip */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr' }}>
            {[
              { l: 'Total',   v: totalUsers,   sub: 'all-time' },
              { l: 'Active',   v: activeUsers,  sub: '30d' },
              { l: 'Inactive', v: inactiveUsers, sub: '> 14d' },
              { l: 'New',      v: d?.new_last_7d ?? 0, sub: '7d' },
            ].map((s, i) => (
              <div key={s.l} style={{ background: '#141414', border: '1px solid #2A2A2A', padding: '12px 10px', marginLeft: i === 0 ? 0 : -1, display: 'flex', flexDirection: 'column', gap: 5 }}>
                <Lbl style={{ fontSize: 9 }}>{s.l}</Lbl>
                <span style={{ fontFamily: '"JetBrains Mono", monospace', fontWeight: 800, fontSize: 20, color: '#F5F5F0', fontVariantNumeric: 'tabular-nums' }}>{s.v}</span>
                <Lbl style={{ color: '#3D3D3B', fontSize: 8 }}>{s.sub}</Lbl>
              </div>
            ))}
          </div>

          {/* Search + filter */}
          <div style={{ background: '#141414', border: '1px solid #2A2A2A', padding: 12, marginTop: -1, display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#1F1F1F', border: '1px solid #2A2A2A', padding: '10px 12px' }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#6B6B68" strokeWidth="2">
                <circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/>
              </svg>
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search by name or username…"
                autoComplete="off" autoCorrect="off" autoCapitalize="off" spellCheck={false}
                style={{ flex: 1, background: 'transparent', border: 0, outline: 'none', color: '#F5F5F0', fontFamily: '"Space Grotesk", sans-serif', fontSize: 13 }}
              />
              {search && (
                <button onClick={() => setSearch('')} style={{ background: 'transparent', border: 0, color: '#6B6B68', cursor: 'pointer', fontFamily: '"JetBrains Mono", monospace', fontSize: 10, fontWeight: 700 }}>
                  CLEAR
                </button>
              )}
            </div>
            <div style={{ display: 'flex', gap: 5, overflowX: 'auto', paddingBottom: 2 }}>
              {(['all', 'admin', 'personal', 'box_admin', 'user', 'ai'] as const).map(role => (
                <button
                  key={role}
                  onClick={() => setFilterRole(role)}
                  style={{
                    flexShrink: 0, padding: '5px 10px',
                    background: filterRole === role ? '#D4FF3A' : 'transparent',
                    border: `1px solid ${filterRole === role ? '#D4FF3A' : '#2A2A2A'}`,
                    color: filterRole === role ? '#0A0A0A' : '#6B6B68',
                    fontFamily: '"JetBrains Mono", monospace', fontWeight: 700, fontSize: 10,
                    letterSpacing: '0.1em', textTransform: 'uppercase' as const, cursor: 'pointer',
                  }}
                >
                  {role === 'all' ? 'All' : ROLE_LABELS[role]}
                </button>
              ))}
            </div>
          </div>

          {/* Result count */}
          <div style={{ padding: '9px 16px', borderBottom: '1px solid #2A2A2A', background: '#0A0A0A' }}>
            <Lbl>{filtered.length} user{filtered.length !== 1 ? 's' : ''}</Lbl>
          </div>

          {filtered.length === 0 && (
            <div style={{ padding: '48px 20px', textAlign: 'center', color: '#6B6B68', fontFamily: '"Space Grotesk", sans-serif', fontSize: 13 }}>
              No users found
            </div>
          )}

          {/* User cards */}
          <div className="md:grid md:grid-cols-2">
          {filtered.map(u => {
            const isActive = u.is_active !== false
            const isMe = u.user_id === user?.id
            const initials = (u.name ?? u.username ?? '?').split(' ').map((w: string) => w[0]).slice(0, 2).join('').toUpperCase()
            return (
              <div
                key={u.user_id}
                style={{ background: '#141414', borderBottom: '1px solid #2A2A2A', padding: '14px 16px', cursor: 'pointer' }}
                onClick={() => setSelectedUser(u)}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ width: 36, height: 36, background: '#1F1F1F', border: '1px solid #2A2A2A', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <span style={{ fontFamily: '"JetBrains Mono", monospace', fontWeight: 800, fontSize: 12, color: '#F5F5F0', letterSpacing: '0.04em' }}>{initials}</span>
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                      <span style={{ fontFamily: '"Space Grotesk", sans-serif', fontSize: 14, fontWeight: 600, color: '#F5F5F0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {u.name ?? u.username ?? 'No name'}
                      </span>
                      {isMe && <Lbl style={{ color: '#D4FF3A', fontSize: 8, flexShrink: 0 }}>You</Lbl>}
                    </div>
                    {u.username && (
                      <div style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: 10, color: '#6B6B68', marginTop: 2 }}>@{u.username}</div>
                    )}
                  </div>
                  <StatusBadge isActive={isActive} />
                </div>

                {/* Roles */}
                <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                  <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                    {(u.roles ?? ['user']).map(role => (
                      <span key={role} style={{
                        padding: '3px 6px',
                        border: `1px solid ${ROLE_COLORS[role] ?? '#2A2A2A'}`,
                        color: ROLE_COLORS[role] ?? '#6B6B68',
                        fontFamily: '"JetBrains Mono", monospace', fontWeight: 700, fontSize: 9,
                        letterSpacing: '0.1em', textTransform: 'uppercase' as const,
                      }}>
                        {ROLE_LABELS[role] ?? role}
                      </span>
                    ))}
                  </div>
                  <Lbl style={{ whiteSpace: 'nowrap', fontSize: 9 }}>{u.score_count ?? 0} PRs</Lbl>
                </div>

                <div style={{ marginTop: 6 }}>
                  <Lbl style={{ fontSize: 9, color: '#3D3D3B' }}>
                    Login {timeAgo(u.last_login_at)} · Joined {shortDate(u.created_at)}
                  </Lbl>
                </div>
              </div>
            )
          })}
          </div>
        </>
      )}

      {/* ── ANALYTICS TAB ── */}
      {tab === 'analytics' && (() => {
        const now = Date.now()
        const daysSince = (d: string | null | undefined) =>
          d ? Math.floor((now - new Date(d).getTime()) / 86400000) : Infinity

        const total      = totalUsers
        const onboarded  = users.filter(u => u.onboarding_completed).length
        const withPRs    = d?.users_with_prs ?? 0
        const withHabit  = users.filter(u => (u.score_count ?? 0) >= 5).length
        const active7    = users.filter(u => daysSince(u.last_training_date) <= 7).length
        const active30   = users.filter(u => daysSince(u.last_training_date) <= 30).length

        // Engagement segments
        const seg0   = users.filter(u => (u.score_count ?? 0) === 0).length
        const seg1_4 = users.filter(u => { const s = u.score_count ?? 0; return s >= 1 && s <= 4 }).length
        const seg5p  = users.filter(u => (u.score_count ?? 0) >= 5).length

        const pct = (n: number, base: number) =>
          base === 0 ? 0 : Math.round((n / base) * 100)
        const pctStr = (n: number, base: number) =>
          base === 0 ? '—' : `${pct(n, base)}%`

        // Activation funnel steps
        const funnelSteps = [
          { label: 'Signed up',           value: total,     prev: total,    context: 'all-time' },
          { label: 'Onboarding complete', value: onboarded, prev: total,    context: 'of signups' },
          { label: 'Logged 1st PR',       value: withPRs,   prev: onboarded, context: 'of onboarding' },
          { label: 'Habit · 5+ PRs',      value: withHabit, prev: withPRs,  context: 'of logged' },
        ]

        // Diagnose biggest bottleneck
        const activationRate  = pct(onboarded, total)
        const conversionRate  = pct(withPRs, onboarded)
        const engagementRate  = pct(withHabit, withPRs)
        const retentionRate   = pct(active30, total)

        const worstRate = Math.min(
          activationRate, conversionRate, engagementRate, retentionRate
        )

        let diagnosis: { label: string; color: string; action: string }
        if (total === 0) {
          diagnosis = { label: 'No data yet', color: '#6B6B68', action: 'Waiting for first users.' }
        } else if (activationRate === worstRate && activationRate < 70) {
          diagnosis = {
            label: 'Bottleneck: Activation',
            color: '#f87171',
            action: `${total - onboarded} users signed up but did not complete onboarding. Simplify the flow or add a reminder.`,
          }
        } else if (conversionRate === worstRate && conversionRate < 60) {
          diagnosis = {
            label: 'Bottleneck: Post-onboarding',
            color: '#FF8A00',
            action: `${onboarded - withPRs} users completed onboarding but never logged a PR. The app is not communicating the next step.`,
          }
        } else if (engagementRate === worstRate && engagementRate < 50) {
          diagnosis = {
            label: 'Bottleneck: Engagement',
            color: '#FF8A00',
            action: `${withPRs - withHabit} users logged at least 1 PR but did not form a habit (5+). Missing retention — consider streaks, notifications, or challenges.`,
          }
        } else {
          diagnosis = {
            label: 'Healthy funnel',
            color: '#D4FF3A',
            action: `30d retention rate: ${retentionRate}%. Focus now on growing the top of the funnel (more users).`,
          }
        }

        const barColor = (rate: number) =>
          rate >= 65 ? '#D4FF3A' : rate >= 40 ? '#FF8A00' : '#f87171'

        return (
          <div style={{ padding: '20px 20px 40px', display: 'flex', flexDirection: 'column', gap: 20 }}>

            {/* ── Diagnosis ── */}
            <div style={{ background: '#141414', border: `1px solid ${diagnosis.color}`, padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ width: 7, height: 7, background: diagnosis.color, flexShrink: 0 }} />
                <Lbl style={{ color: diagnosis.color, fontSize: 11 }}>{diagnosis.label}</Lbl>
              </div>
              <p style={{ fontFamily: '"Space Grotesk", sans-serif', fontSize: 13, color: '#A8A8A4', lineHeight: 1.6, margin: 0 }}>
                {diagnosis.action}
              </p>
            </div>

            {/* ── Activation funnel ── */}
            <div style={{ background: '#141414', border: '1px solid #2A2A2A' }}>
              <div style={{ padding: '14px 20px', borderBottom: '1px solid #2A2A2A', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Lbl>Activation funnel</Lbl>
                <Lbl style={{ color: '#3D3D3B', fontSize: 9 }}>{total} users total</Lbl>
              </div>

              {funnelSteps.map((step, i) => {
                const rate    = pct(step.value, total)
                const stepPct = pct(step.value, step.prev)
                const dropoff = step.prev - step.value
                const color   = i === 0 ? '#D4FF3A' : barColor(stepPct)
                const isLast  = i === funnelSteps.length - 1

                return (
                  <div key={step.label}>
                    <div style={{ padding: '14px 20px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {/* Row: step name + numbers */}
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <span style={{
                            fontFamily: '"JetBrains Mono", monospace', fontSize: 9, fontWeight: 700,
                            color: '#3D3D3B', width: 16,
                          }}>
                            {String(i + 1).padStart(2, '0')}
                          </span>
                          <span style={{ fontFamily: '"Space Grotesk", sans-serif', fontSize: 13, fontWeight: 600, color: '#F5F5F0' }}>
                            {step.label}
                          </span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                          {i > 0 && (
                            <Lbl style={{ fontSize: 9, color: color }}>
                              {pctStr(step.value, step.prev)} {step.context}
                            </Lbl>
                          )}
                          <span style={{
                            fontFamily: '"JetBrains Mono", monospace', fontWeight: 800,
                            fontSize: 20, color: '#F5F5F0', fontVariantNumeric: 'tabular-nums',
                          }}>
                            {step.value}
                          </span>
                        </div>
                      </div>

                      {/* Bar */}
                      <div style={{ height: 4, background: '#2A2A2A' }}>
                        <div style={{ height: 4, width: `${rate}%`, background: color, transition: 'width 0.4s' }} />
                      </div>
                    </div>

                    {/* Drop-off indicator between steps */}
                    {!isLast && dropoff > 0 && (
                      <div style={{ padding: '6px 20px 6px 46px', borderTop: '1px solid #1A1A1A', borderBottom: '1px solid #1A1A1A', background: '#0F0F0F', display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ color: '#3D3D3B', fontSize: 10 }}>↓</span>
                        <Lbl style={{ fontSize: 9, color: '#3D3D3B' }}>
                          {dropoff} {dropoff === 1 ? 'user dropped off' : 'users dropped off'} here
                          {step.prev > 0 ? ` · ${pctStr(dropoff, step.prev)} drop` : ''}
                        </Lbl>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>

            {/* ── Retention ── */}
            <div style={{ background: '#141414', border: '1px solid #2A2A2A' }}>
              <div style={{ padding: '14px 20px', borderBottom: '1px solid #2A2A2A' }}>
                <Lbl>Retention</Lbl>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr' }}>
                {[
                  { label: 'Active · 7d',  value: active7,  rate: pct(active7, total) },
                  { label: 'Active · 30d', value: active30, rate: pct(active30, total) },
                ].map((item, i) => (
                  <div key={item.label} style={{ padding: '16px 20px', borderLeft: i === 0 ? 'none' : '1px solid #2A2A2A', display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <Lbl style={{ fontSize: 9 }}>{item.label}</Lbl>
                    <span style={{ fontFamily: '"JetBrains Mono", monospace', fontWeight: 800, fontSize: 28, color: '#F5F5F0', fontVariantNumeric: 'tabular-nums', lineHeight: 1 }}>
                      {item.value}
                    </span>
                    <div style={{ height: 3, background: '#2A2A2A' }}>
                      <div style={{ height: 3, width: `${item.rate}%`, background: barColor(item.rate) }} />
                    </div>
                    <Lbl style={{ fontSize: 9, color: barColor(item.rate) }}>{item.rate}% of total</Lbl>
                  </div>
                ))}
              </div>
            </div>

            {/* ── Engagement segmentation ── */}
            <div style={{ background: '#141414', border: '1px solid #2A2A2A' }}>
              <div style={{ padding: '14px 20px', borderBottom: '1px solid #2A2A2A' }}>
                <Lbl>Segmentation · logging habit</Lbl>
              </div>
              <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 12 }}>
                {/* Distribution bar */}
                {total > 0 && (
                  <div style={{ display: 'flex', height: 8 }}>
                    <div style={{ width: `${pct(seg0, total)}%`,   background: '#f87171', transition: 'width 0.4s' }} />
                    <div style={{ width: `${pct(seg1_4, total)}%`, background: '#FF8A00', transition: 'width 0.4s', marginLeft: seg0 > 0 ? 1 : 0 }} />
                    <div style={{ width: `${pct(seg5p, total)}%`,  background: '#D4FF3A', transition: 'width 0.4s', marginLeft: seg1_4 > 0 ? 1 : 0 }} />
                  </div>
                )}

                {/* Legend */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 0 }}>
                  {[
                    { label: 'Never logged',  value: seg0,   color: '#f87171', sub: '0 PRs' },
                    { label: 'Testing',       value: seg1_4, color: '#FF8A00', sub: '1 to 4 PRs' },
                    { label: 'Habit',         value: seg5p,  color: '#D4FF3A', sub: '5+ PRs' },
                  ].map((seg, i) => (
                    <div key={seg.label} style={{ padding: '12px 16px', borderLeft: i === 0 ? 'none' : '1px solid #2A2A2A' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                        <span style={{ width: 6, height: 6, background: seg.color, flexShrink: 0 }} />
                        <Lbl style={{ fontSize: 9 }}>{seg.sub}</Lbl>
                      </div>
                      <div style={{ fontFamily: '"JetBrains Mono", monospace', fontWeight: 800, fontSize: 22, color: '#F5F5F0', fontVariantNumeric: 'tabular-nums', lineHeight: 1 }}>
                        {seg.value}
                      </div>
                      <Lbl style={{ fontSize: 9, color: seg.color, marginTop: 4, display: 'block' }}>
                        {pctStr(seg.value, total)} · {seg.label}
                      </Lbl>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* PostHog link */}
            {posthogConfigured && (
              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <a
                  href="https://us.posthog.com"
                  target="_blank"
                  rel="noreferrer"
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: 6,
                    fontFamily: '"JetBrains Mono", monospace', fontWeight: 700, fontSize: 10,
                    letterSpacing: '0.12em', textTransform: 'uppercase' as const,
                    color: '#3D3D3B', textDecoration: 'none',
                  }}
                >
                  <span style={{ width: 5, height: 5, background: '#D4FF3A', borderRadius: 99 }} />
                  PostHog active · View behavior →
                </a>
              </div>
            )}

          </div>
        )
      })()}

      {/* ── AI TAB ── */}
      {tab === 'ai' && (() => {
        const fmtUsd = (v: number) => v < 0.001 ? `${(v * 100).toFixed(4)}¢` : `$${v.toFixed(4)}`
        const fmtUsdBig = (v: number) => `$${Number(v).toFixed(4)}`
        const fmtNum = (v: number) => Number(v).toLocaleString('en-US')
        const fnLabel = (fn: string) => fn === 'suggest-workout' ? 'Suggest' : 'Generate'
        const fnColor = (fn: string) => fn === 'suggest-workout' ? '#D4FF3A' : '#4DA3FF'

        const shortTs = (s: string) => {
          const d = new Date(s)
          return `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`
        }

        if (aiLoading) return (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 200 }}>
            <div style={{ width: 24, height: 24, border: '2px solid #D4FF3A', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
          </div>
        )

        if (!aiStats) return (
          <div style={{ padding: '40px 20px', textAlign: 'center' }}>
            <Lbl style={{ color: '#3D3D3B' }}>No data yet. Calls will appear here after the first use.</Lbl>
          </div>
        )

        const totalCalls    = aiStats.total_calls    ?? 0
        const monthCost     = aiStats.month_cost_usd ?? 0
        const totalCost     = aiStats.total_cost_usd ?? 0
        const suggestCalls  = aiStats.suggest_calls  ?? 0
        const generateCalls = aiStats.generate_calls ?? 0
        const suggestCost   = aiStats.suggest_cost_usd   ?? 0
        const generateCost  = aiStats.generate_cost_usd  ?? 0
        const avgCost       = aiStats.avg_cost_usd   ?? 0
        const weekCost      = aiStats.week_cost_usd  ?? 0
        const monthCalls    = aiStats.month_calls    ?? 0
        const todayCalls    = aiStats.today_calls    ?? 0

        return (
          <div style={{ padding: '20px 20px 48px', display: 'flex', flexDirection: 'column', gap: 20 }}>

            {/* ── Top stats ── */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1, background: '#2A2A2A' }}>
              {[
                { label: 'Month cost',     value: fmtUsdBig(monthCost),  sub: `${monthCalls} call${monthCalls !== 1 ? 's' : ''}` },
                { label: 'Total all-time', value: fmtUsdBig(totalCost),  sub: `${fmtNum(totalCalls)} call${totalCalls !== 1 ? 's' : ''}` },
                { label: 'This week',      value: fmtUsdBig(weekCost),    sub: `${aiStats.week_calls ?? 0} calls` },
                { label: 'Avg per call',   value: fmtUsd(avgCost),        sub: `Today: ${todayCalls} call${todayCalls !== 1 ? 's' : ''}` },
              ].map(s => (
                <div key={s.label} style={{ background: '#0A0A0A', padding: '16px 18px' }}>
                  <Lbl>{s.label}</Lbl>
                  <div style={{ fontFamily: '"JetBrains Mono", monospace', fontWeight: 800, fontSize: 22, color: '#D4FF3A', fontVariantNumeric: 'tabular-nums', lineHeight: 1, marginTop: 8 }}>
                    {s.value}
                  </div>
                  <Lbl style={{ fontSize: 9, color: '#3D3D3B', marginTop: 6, display: 'block' }}>{s.sub}</Lbl>
                </div>
              ))}
            </div>

            {/* ── Breakdown by function ── */}
            <div style={{ background: '#141414', border: '1px solid #2A2A2A' }}>
              <div style={{ padding: '12px 16px', borderBottom: '1px solid #2A2A2A' }}>
                <Lbl>By function</Lbl>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0 }}>
                {[
                  { fn: 'suggest-workout',  label: 'Suggest workout', calls: suggestCalls,  cost: suggestCost },
                  { fn: 'generate-workout', label: 'Generate plan',   calls: generateCalls, cost: generateCost },
                ].map((row, i) => (
                  <div key={row.fn} style={{ padding: '14px 16px', borderLeft: i > 0 ? '1px solid #2A2A2A' : 'none' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                      <span style={{ width: 6, height: 6, background: fnColor(row.fn), flexShrink: 0 }} />
                      <Lbl style={{ color: fnColor(row.fn) }}>{row.label}</Lbl>
                    </div>
                    <div style={{ fontFamily: '"JetBrains Mono", monospace', fontWeight: 800, fontSize: 20, color: '#F5F5F0', fontVariantNumeric: 'tabular-nums', lineHeight: 1 }}>
                      {fmtUsdBig(row.cost)}
                    </div>
                    <Lbl style={{ fontSize: 9, color: '#6B6B68', marginTop: 4, display: 'block' }}>
                      {row.calls} call{row.calls !== 1 ? 's' : ''} · avg {row.calls > 0 ? fmtUsd(row.cost / row.calls) : '$0'}
                    </Lbl>
                  </div>
                ))}
              </div>
            </div>

            {/* ── Top users ── */}
            {aiByUser.length > 0 && (
              <div style={{ background: '#141414', border: '1px solid #2A2A2A' }}>
                <div style={{ padding: '12px 16px', borderBottom: '1px solid #2A2A2A' }}>
                  <Lbl>Top users by cost</Lbl>
                </div>
                <div>
                  {aiByUser.map((u, i) => (
                    <div key={u.user_id ?? i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 16px', borderBottom: '1px solid #1A1A1A' }}>
                      <Lbl style={{ color: '#3D3D3B', fontSize: 9, width: 16, textAlign: 'right' as const, flexShrink: 0 }}>{i + 1}</Lbl>
                      <span style={{ fontFamily: '"JetBrains Mono", monospace', fontWeight: 600, fontSize: 12, color: '#A8A8A4', flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {u.user_name ?? '—'}
                      </span>
                      <Lbl style={{ fontSize: 9, color: '#6B6B68', flexShrink: 0 }}>{u.calls} call{u.calls !== 1 ? 's' : ''}</Lbl>
                      <span style={{ fontFamily: '"JetBrains Mono", monospace', fontWeight: 700, fontSize: 13, color: '#D4FF3A', flexShrink: 0, fontVariantNumeric: 'tabular-nums' }}>
                        {fmtUsdBig(u.cost_usd)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ── Recent log ── */}
            {aiRecent.length > 0 && (
              <div style={{ background: '#141414', border: '1px solid #2A2A2A' }}>
                <div style={{ padding: '12px 16px', borderBottom: '1px solid #2A2A2A', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Lbl>Recent calls</Lbl>
                  <Lbl style={{ color: '#3D3D3B', fontSize: 9 }}>last {aiRecent.length}</Lbl>
                </div>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid #2A2A2A' }}>
                        {['Date', 'Function', 'Coach', 'Athlete', 'Tokens in', 'Tokens out', 'Cost'].map(h => (
                          <th key={h} style={{ padding: '8px 12px', fontFamily: '"JetBrains Mono", monospace', fontWeight: 700, fontSize: 9, letterSpacing: '0.1em', textTransform: 'uppercase' as const, color: '#6B6B68', textAlign: 'left' as const, whiteSpace: 'nowrap' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {aiRecent.map(row => (
                        <tr key={row.id} style={{ borderBottom: '1px solid #1A1A1A' }}>
                          <td style={{ padding: '8px 12px', fontFamily: '"JetBrains Mono", monospace', fontSize: 10, color: '#6B6B68', whiteSpace: 'nowrap' }}>{shortTs(row.created_at)}</td>
                          <td style={{ padding: '8px 12px', whiteSpace: 'nowrap' }}>
                            <span style={{ fontFamily: '"JetBrains Mono", monospace', fontWeight: 700, fontSize: 10, color: fnColor(row.function_name) }}>{fnLabel(row.function_name)}</span>
                          </td>
                          <td style={{ padding: '8px 12px', fontFamily: '"JetBrains Mono", monospace', fontSize: 10, color: '#A8A8A4', maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{row.triggered_name ?? '—'}</td>
                          <td style={{ padding: '8px 12px', fontFamily: '"JetBrains Mono", monospace', fontSize: 10, color: '#6B6B68', maxWidth: 100, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{row.athlete_name ?? '—'}</td>
                          <td style={{ padding: '8px 12px', fontFamily: '"JetBrains Mono", monospace', fontSize: 10, color: '#6B6B68', textAlign: 'right' as const, whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>{fmtNum(row.input_tokens)}</td>
                          <td style={{ padding: '8px 12px', fontFamily: '"JetBrains Mono", monospace', fontSize: 10, color: '#6B6B68', textAlign: 'right' as const, whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>{fmtNum(row.output_tokens)}</td>
                          <td style={{ padding: '8px 12px', fontFamily: '"JetBrains Mono", monospace', fontWeight: 700, fontSize: 11, color: '#D4FF3A', textAlign: 'right' as const, whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>{fmtUsd(row.cost_usd)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

          </div>
        )
      })()}

      </div>
    </div>
  )
}

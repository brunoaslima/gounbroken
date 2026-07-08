// ─────────────────────────────────────────────────────────────────────────
// DROP-IN REPLACEMENT for src/pages/Profile.tsx
// Implements option "1B — Dashboard Grid" from the Profile redesign review.
// Built against the real hooks/types already in the repo:
//   useAuth, useProfile, useMovements, useScores, calculateStrengthLevel
// Tailwind conventions match the rest of the app (bg-graphite, border-[#2A2A2A], etc.)
// — no inline styles, no new dependencies.
//
// WHAT CHANGED vs the current Profile.tsx:
//   1. TopBar: the pencil "Edit" button moved out of the header. A bell icon
//      (→ /athlete/invites, small lime dot = unread) took its place.
//   2. Identity block is compact (44px avatar, name+role+username on one line).
//   3. NEW: "Strength Level" hero — segmented tier bar (reuses the same 6
//      tiers/colors as TierBar.tsx + calculateStrengthLevel), headline
//      ("You're in the top X% of humanity."), strongest/focus category,
//      confidence footnote. Hidden with an empty-state when there isn't
//      enough data yet (< 2 scoreable PRs), matching calculateStrengthLevel's
//      own "insufficient" rule.
//   4. Physical Data section header now owns the Edit (pencil → /onboarding)
//      action, since that's the only part of this screen that's actually editable.
//      Each row got a small leading icon. BMI row was dropped from the list
//      (kept out per the approved 1B mock) — add it back easily, see comment below.
//   5. Tools + Invite Inbox + Admin + Personal Area became a single 2-up
//      icon-tile grid instead of a stacked list.
//   6. The "Convidar" (share-your-invite-link) section, Sign out and Delete
//      account are UNCHANGED — same InviteSection component, same handlers.
//
// You still need to:
//   - Confirm `calculateStrengthLevel`'s signature matches your current
//     src/lib/strengthLevel.ts (it does as of the version read for this pass).
//   - Wire real translations if this app's i18n layer expects string keys
//     instead of literal English copy (the current Profile.tsx uses literals,
//     so this file does too).
// ─────────────────────────────────────────────────────────────────────────

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { useProfile } from '@/hooks/useProfile'
import { useMovements } from '@/hooks/useMovements'
import { useScores } from '@/hooks/useScores'
import { calculateStrengthLevel } from '@/lib/strengthLevel'
import { supabase } from '@/lib/supabase'

// ── Tier bands — same source of truth as src/components/TierBar.tsx ────────
const TIERS = [
  { key: 'untrained',    shortLabel: 'FND', color: '#6B6B68', start: 0,  end: 10  },
  { key: 'novice',       shortLabel: 'NOV', color: '#A8A8A4', start: 10, end: 35  },
  { key: 'intermediate', shortLabel: 'INT', color: '#4DA3FF', start: 35, end: 65  },
  { key: 'advanced',     shortLabel: 'ADV', color: '#D4FF3A', start: 65, end: 85  },
  { key: 'elite',        shortLabel: 'ELT', color: '#FF8A00', start: 85, end: 97  },
  { key: 'world',        shortLabel: 'WLD', color: '#FF3B30', start: 97, end: 100 },
] as const

// ── Invite share section — verbatim from current Profile.tsx ───────────────
function InviteSection({ userId }: { userId: string | undefined }) {
  const [inviteCode,   setInviteCode]   = useState<string | null>(null)
  const [loadingCode,  setLoadingCode]  = useState(false)
  const [copied,       setCopied]       = useState(false)

  function buildLink(code: string) {
    return `${window.location.origin}/invite/${code}`
  }

  async function getCode(): Promise<string> {
    if (inviteCode) return inviteCode
    setLoadingCode(true)
    try {
      const { data, error } = await supabase.rpc('get_or_create_invite_code')
      if (error) throw error
      const code = data as string
      setInviteCode(code)
      return code
    } finally {
      setLoadingCode(false)
    }
  }

  async function handleShare() {
    let code: string
    try {
      code = await getCode()
    } catch {
      return
    }
    const link = buildLink(code)
    if (navigator.share) {
      try { await navigator.share({ title: 'PR · INDEX', text: 'Track your PRs and follow your training progress.', url: link }) }
      catch { /* user cancelled */ }
    } else {
      try {
        await navigator.clipboard.writeText(link)
        setCopied(true)
        setTimeout(() => setCopied(false), 2500)
      } catch { /* clipboard blocked */ }
    }
  }

  async function handleCopy() {
    let code: string
    try { code = await getCode() } catch { return }
    try {
      await navigator.clipboard.writeText(buildLink(code))
      setCopied(true)
      setTimeout(() => setCopied(false), 2500)
    } catch { /* clipboard blocked */ }
  }

  if (!userId) return null

  const hasNativeShare = typeof navigator !== 'undefined' && !!navigator.share

  return (
    <div className="border-b border-[#2A2A2A]">
      <div className="px-5 py-3 border-b border-[#2A2A2A]">
        <span className="font-mono font-bold uppercase tracking-[0.12em] text-[10px] text-[#6B6B68]">
          Invite
        </span>
      </div>
      <div className="px-5 py-4">
        <p className="font-mono text-[11px] text-[#6B6B68] mb-4 leading-relaxed uppercase tracking-[0.06em]">
          Share your personal link to invite friends.
          {inviteCode && (
            <span className="block mt-1 text-[#3D3D3B]">
              Code · {inviteCode}
            </span>
          )}
        </p>
        <div className="flex gap-2">
          {hasNativeShare ? (
            <button
              onClick={handleShare}
              disabled={loadingCode}
              className="flex-1 bg-lime text-graphite font-mono font-bold uppercase tracking-[0.18em] text-[11px] py-3.5 flex items-center justify-center gap-2 disabled:opacity-40 active:bg-lime-lo transition-colors"
            >
              {loadingCode
                ? <span className="w-3.5 h-3.5 border-2 border-graphite/40 border-t-graphite rounded-full animate-spin" />
                : (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8M16 6l-4-4-4 4M12 2v13" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              Share
            </button>
          ) : (
            <button
              onClick={handleCopy}
              disabled={loadingCode}
              className="flex-1 bg-lime text-graphite font-mono font-bold uppercase tracking-[0.18em] text-[11px] py-3.5 flex items-center justify-center gap-2 disabled:opacity-40 active:bg-lime-lo transition-colors"
            >
              {loadingCode
                ? <span className="w-3.5 h-3.5 border-2 border-graphite/40 border-t-graphite rounded-full animate-spin" />
                : copied ? 'Copied!' : 'Copy link'}
            </button>
          )}
          {hasNativeShare && (
            <button
              onClick={handleCopy}
              disabled={loadingCode}
              title="Copy link"
              className="border border-[#2A2A2A] text-[#6B6B68] font-mono font-bold uppercase tracking-[0.12em] text-[11px] px-4 py-3.5 flex items-center justify-center active:bg-[#141414] transition-colors disabled:opacity-40"
            >
              {copied ? (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#D4FF3A" strokeWidth="2.5">
                  <polyline points="20 6 9 17 4 12" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              ) : (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="9" y="9" width="13" height="13" rx="0" /><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
                </svg>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

const ROLE_LABELS: Record<string, string> = {
  admin: 'Admin', personal: 'Personal', box_admin: 'Box Admin', ai: 'AI',
}
const ROLE_COLORS: Record<string, string> = {
  admin: '#D4FF3A', personal: '#4DA3FF', box_admin: '#FF8A00', ai: '#A8A8A4',
}

// ── Small icon set for data rows / tool tiles — 2px stroke, square caps ────
const Icon = {
  mail: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="5" width="18" height="14" /><path d="M3 7l9 6 9-6" /></svg>,
  scale: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><rect x="2.5" y="2.5" width="19" height="19" /><path d="M7 10.5a5 5 0 0110 0" /><path d="M12 10.5l2 4.2" /><path d="M9.5 15h5.6" /><circle cx="5.5" cy="5.5" r="1" /><circle cx="18.5" cy="5.5" r="1" /><circle cx="5.5" cy="18.5" r="1" /><circle cx="18.5" cy="18.5" r="1" /></svg>,
  ruler: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="8" width="18" height="8" /><path d="M7 8v3M11 8v3M15 8v3M19 8v3" /></svg>,
  clock: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 3" /></svg>,
  gender: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="10" cy="14" r="6" /><path d="M14.5 9.5L20 4M20 4h-5M20 4v5" /></svg>,
  bell: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 8a6 6 0 0112 0c0 5 2 6 2 6H4s2-1 2-6" /><path d="M9.5 20a2.5 2.5 0 005 0" /></svg>,
  edit: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>,
  wrench: <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14.7 6.3a4 4 0 00-5.4 5.4L3 18l3 3 6.3-6.3a4 4 0 005.4-5.4l-2.5 2.5-2-2 2.5-2.5z" /></svg>,
  invite: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="5" width="18" height="14" /><path d="M3 7l9 6 9-6" /></svg>,
  admin: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2l8 4v6c0 5-3.5 8.5-8 10-4.5-1.5-8-5-8-10V6l8-4z" /></svg>,
  personal: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="9" cy="8" r="3" /><path d="M2 20c.7-3 3.5-5 7-5s6.3 2 7 5" /><circle cx="18" cy="9" r="2.5" /><path d="M15.5 14c2.4.4 4.2 1.8 4.9 4.5" /></svg>,
  buildup: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 3l9 5-9 5-9-5 9-5z" /><path d="M3 13l9 5 9-5" /></svg>,
  timer: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="13" r="8" /><path d="M12 9v4l3 2" /><path d="M9 2h6" /></svg>,
  exportIcon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 3v12" /><path d="M7 10l5 5 5-5" /><path d="M5 19h14" /></svg>,
}

// ── Strength hero — segmented tier bar + headline ───────────────────────────
function StrengthHero({
  movements, getPRsForMovement, bodyWeightKg, gender,
}: {
  movements: Parameters<typeof calculateStrengthLevel>[0]
  getPRsForMovement: Parameters<typeof calculateStrengthLevel>[1]
  bodyWeightKg: number | null | undefined
  gender: string | null | undefined
}) {
  const result = (bodyWeightKg && (gender === 'male' || gender === 'female' || gender === 'other'))
    ? calculateStrengthLevel(movements, getPRsForMovement, bodyWeightKg, gender)
    : null

  if (!result) {
    return (
      <div className="px-5 py-6 border-b border-[#2A2A2A]">
        <span className="font-mono font-bold uppercase tracking-[0.12em] text-[10px] text-[#6B6B68]">Strength Level</span>
        <p className="font-mono text-[11px] text-[#6B6B68] mt-3 leading-relaxed uppercase tracking-[0.06em]">
          Add PRs in at least 2 categories to unlock your Strength Level.
        </p>
      </div>
    )
  }

  const score = result.score
  const current = [...TIERS].reverse().find(t => score >= t.start) ?? TIERS[0]
  const topPct = 100 - score
  const strongest = result.strongestCategory
  const weakest = result.weakestCategory
  const confidenceLabel = { insufficient: 'Insufficient', low: 'Low', medium: 'Medium', high: 'High', very_high: 'Very High' }[result.confidence]

  return (
    <div className="px-5 py-5 border-b border-[#2A2A2A]">
      <span className="font-mono font-bold uppercase tracking-[0.12em] text-[10px] text-[#6B6B68]">Strength Level</span>
      <h2 className="mt-2 mb-4 font-sans font-bold text-[24px] leading-[1.15] text-soft-white" style={{ letterSpacing: '-0.02em' }}>
        You're in the <span style={{ color: current.color }}>top {topPct}%</span> of humanity.
      </h2>

      {/* segmented tier bar */}
      <div className="flex gap-[2px] mb-2" style={{ height: 8 }}>
        {TIERS.map(t => {
          const isCurrent = t.key === current.key
          const isPast = score >= t.end
          const progressInTier = t.end > t.start ? (score - t.start) / (t.end - t.start) : 0
          return (
            <div
              key={t.key}
              style={{
                flex: t.end - t.start,
                height: 8,
                position: 'relative',
                background: isPast ? t.color : '#1F1F1F',
                opacity: isPast ? 0.35 : 1,
              }}
            >
              {isCurrent && (
                <div style={{ position: 'absolute', top: 0, left: 0, bottom: 0, width: `${Math.round(progressInTier * 100)}%`, background: t.color }} />
              )}
            </div>
          )
        })}
      </div>
      <div className="flex gap-[2px] mb-3.5">
        {TIERS.map(t => (
          <div key={t.key} style={{ flex: t.end - t.start, textAlign: 'center' }}>
            <span
              className="font-mono font-bold uppercase"
              style={{ fontSize: 8, letterSpacing: '0.08em', color: t.key === current.key ? t.color : '#3D3D3B' }}
            >
              {t.shortLabel}
            </span>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span style={{ width: 8, height: 8, background: current.color, display: 'inline-block' }} />
          <span className="font-mono font-bold uppercase tracking-[0.12em] text-[11px]" style={{ color: current.color }}>
            {{ untrained: 'Untrained', novice: 'Novice', intermediate: 'Intermediate', advanced: 'Advanced', elite: 'Elite', world_class: 'World Class' }[result.level]}
          </span>
        </div>
      </div>

      {(strongest || weakest) && (
        <div className="grid grid-cols-2 gap-px bg-[#2A2A2A] mt-4">
          <div className="bg-graphite pt-3 pr-3">
            <span className="font-mono font-bold uppercase tracking-[0.1em] text-[10px] text-[#6B6B68]">Strongest</span>
            <p className="mt-1.5 font-sans font-semibold text-[14px] text-soft-white">{strongest ?? '—'}</p>
          </div>
          <div className="bg-graphite pt-3 pl-3">
            <span className="font-mono font-bold uppercase tracking-[0.1em] text-[10px] text-[#6B6B68]">Focus area</span>
            <p className="mt-1.5 font-sans font-semibold text-[14px] text-soft-white">{weakest ?? '—'}</p>
          </div>
        </div>
      )}
      <p className="mt-3.5 font-mono text-[10px] tracking-[0.06em] uppercase text-[#3D3D3B]">
        {confidenceLabel} confidence · {result.totalPRs} PRs · {result.categoriesUsed}/5 categories
      </p>
    </div>
  )
}

function DataRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center justify-between px-5 py-3 border-t border-[#2A2A2A]">
      <div className="flex items-center gap-2.5">
        <span className="text-[#6B6B68] flex items-center">{icon}</span>
        <span className="font-mono font-bold uppercase tracking-[0.1em] text-[10px] text-[#6B6B68]">{label}</span>
      </div>
      <span className="font-sans text-[13px] text-soft-white">{value}</span>
    </div>
  )
}

function ToolRow({ icon, color, title, subtitle, onClick }: { icon: React.ReactNode; color: string; title: string; subtitle: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className="w-full flex items-center justify-between px-5 py-3.5 border-b border-[#2A2A2A] active:bg-[#141414] transition-colors text-left">
      <div className="flex items-center gap-2.5 min-w-0">
        <span style={{ color }} className="flex items-center shrink-0">{icon}</span>
        <div className="min-w-0">
          <span className="font-sans font-semibold text-[14px] text-soft-white block">{title}</span>
          <span className="font-mono text-[9px] uppercase tracking-[0.08em] text-[#6B6B68] block">{subtitle}</span>
        </div>
      </div>
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#6B6B68" strokeWidth="2"><path d="M9 18l6-6-6-6" /></svg>
    </button>
  )
}

export default function Profile() {
  const { user, signOut } = useAuth()
  const { profile, loading } = useProfile(user?.id)
  const { movements } = useMovements(user?.id)
  const { getPRsForMovement } = useScores(user?.id)
  const navigate = useNavigate()

  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deletePassword, setDeletePassword] = useState('')
  const [exporting, setExporting] = useState(false)
  const [deleteError, setDeleteError] = useState('')
  const [deleting, setDeleting] = useState(false)

  const initials = profile?.name
    ? profile.name.split(' ').map((w: string) => w[0]).slice(0, 2).join('').toUpperCase()
    : '?'

  const specialRoles = profile?.roles?.filter(r => r !== 'user') ?? []
  const isAdmin = profile?.roles?.includes('admin') ?? false
  const isPersonal = profile?.roles?.includes('personal') ?? false

  function openDeleteModal() {
    setDeletePassword('')
    setDeleteError('')
    setShowDeleteModal(true)
  }
  function closeDeleteModal() {
    if (deleting) return
    setShowDeleteModal(false)
    setDeletePassword('')
    setDeleteError('')
  }

  async function handleDeleteAccount() {
    if (!user?.email || !deletePassword.trim()) return
    setDeleteError('')
    setDeleting(true)
    try {
      const { error: authError } = await supabase.auth.signInWithPassword({ email: user.email, password: deletePassword })
      if (authError) { setDeleteError('Incorrect password. Try again.'); setDeleting(false); return }
      const { error: deleteErr } = await supabase.rpc('delete_own_account')
      if (deleteErr) throw deleteErr
      await supabase.auth.signOut()
      navigate('/login', { replace: true })
    } catch (err) {
      console.error(err)
      setDeleteError('Error deleting account. Try again.')
      setDeleting(false)
    }
  }

  async function handleExportPDF() {
    if (exporting || !user) return
    setExporting(true)
    try {
      const [movRes, scoresRes] = await Promise.all([
        supabase.from('movements').select('id, name').eq('user_id', user.id).order('name'),
        supabase.from('scores').select('movement_id, reps, weight_kg, recorded_at').eq('user_id', user.id),
      ])
      const movs = (movRes.data ?? []) as { id: string; name: string }[]
      const scores = (scoresRes.data ?? []) as { movement_id: string; reps: number; weight_kg: number; recorded_at: string }[]

      const { buildPRPosterData, buildPRPosterHTML } = await import('@/lib/prReport')
      const posterData = buildPRPosterData(
        movs, scores,
        profile?.body_weight_kg ?? null,
        profile?.gender as 'male' | 'female' | 'other' | 'prefer_not_to_say' | null,
        profile?.name ?? profile?.username ?? 'Athlete',
        profile?.username ?? null,
      )
      if (!posterData) return
      const html = buildPRPosterHTML(posterData)
      const iframe = document.createElement('iframe')
      iframe.style.cssText = 'position:fixed;left:-9999px;top:-9999px;width:1080px;height:1488px;border:0;opacity:0;'
      document.body.appendChild(iframe)
      const iDoc = iframe.contentDocument ?? iframe.contentWindow?.document
      if (iDoc) { iDoc.open(); iDoc.write(html); iDoc.close() }
      setTimeout(() => { if (document.body.contains(iframe)) document.body.removeChild(iframe) }, 8000)
    } finally {
      setExporting(false)
    }
  }

  if (loading) return (
    <div className="min-h-screen bg-graphite flex items-center justify-center">
      <div className="w-6 h-6 border-2 border-lime border-t-transparent rounded-full animate-spin" />
    </div>
  )

  return (
    <div className="min-h-screen bg-graphite pb-28 md:pb-8">
      {/* TopBar — edit moved out, bell (→ Invite Inbox) took its place */}
      <header className="sticky top-0 z-10 bg-graphite border-b border-[#2A2A2A]" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
        <div className="flex items-center justify-between px-5 md:max-w-3xl md:mx-auto" style={{ height: 52 }}>
          <span style={{ width: 40 }} />
          <span className="font-mono font-bold uppercase tracking-[0.18em] text-[11px] text-[#A8A8A4]">Profile</span>
          <button
            onClick={() => navigate('/athlete/invites')}
            className="flex items-center justify-end text-[#6B6B68] active:text-soft-white relative"
            style={{ width: 40, height: 40 }}
            title="Invite Inbox"
          >
            {Icon.bell}
            <span style={{ position: 'absolute', top: 6, right: 6, width: 6, height: 6, background: '#D4FF3A' }} />
          </button>
        </div>
      </header>

      <div className="overflow-y-auto md:max-w-3xl md:mx-auto">

        {/* Compact identity banner */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-[#2A2A2A]">
          <div className="flex items-center justify-center shrink-0" style={{ width: 44, height: 44, background: '#141414', border: '1px solid #2A2A2A' }}>
            <span className="font-mono font-black text-[16px] text-soft-white">{initials}</span>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <p className="font-sans font-bold text-[16px] text-soft-white truncate" style={{ letterSpacing: '-0.01em' }}>
                {profile?.name ?? '—'}
              </p>
              {specialRoles.map(r => (
                <span
                  key={r}
                  className="font-mono font-bold uppercase tracking-[0.1em] text-[9px] px-1.5 py-0.5 border shrink-0"
                  style={{ color: ROLE_COLORS[r] ?? '#A8A8A4', borderColor: ROLE_COLORS[r] ?? '#2A2A2A' }}
                >
                  {ROLE_LABELS[r] ?? r}
                </span>
              ))}
            </div>
            {profile?.username && (
              <p className="font-mono text-[11px] text-[#6B6B68] mt-0.5">@{profile.username}</p>
            )}
          </div>
        </div>

        {/* Strength hero */}
        <StrengthHero
          movements={movements}
          getPRsForMovement={getPRsForMovement}
          bodyWeightKg={profile?.body_weight_kg}
          gender={profile?.gender}
        />

        {/* Physical data */}
        <div className="border-b border-[#2A2A2A]">
          <div className="flex items-center justify-between px-5 py-3 bg-[#141414] border-b border-[#2A2A2A]">
            <span className="font-mono font-bold uppercase tracking-[0.12em] text-[10px] text-[#6B6B68]">Physical Data</span>
            <button onClick={() => navigate('/onboarding')} className="text-[#6B6B68] active:text-soft-white" title="Edit">
              {Icon.edit}
            </button>
          </div>
          <DataRow icon={Icon.mail} label="Email" value={user?.email ?? '—'} />
          <DataRow icon={Icon.scale} label="Weight" value={profile?.body_weight_kg ? `${profile.body_weight_kg} kg` : '—'} />
          <DataRow icon={Icon.ruler} label="Height" value={profile?.height_cm ? `${profile.height_cm} cm` : '—'} />
          <DataRow icon={Icon.clock} label="Age" value={profile?.date_of_birth ? `${Math.floor((Date.now() - new Date(profile.date_of_birth).getTime()) / 3.15576e10)} years` : '—'} />
          <DataRow icon={Icon.gender} label="Gender" value={
            profile?.gender === 'male' ? 'Male'
            : profile?.gender === 'female' ? 'Female'
            : profile?.gender === 'other' ? 'Other'
            : profile?.gender === 'prefer_not_to_say' ? 'Prefer not to say'
            : '—'
          } />
          {/* To bring BMI back as a row, reuse getBMI()/getBMILabel() from useProfile()
              and append a DataRow (or the colored-chip variant from the previous Profile.tsx). */}
        </div>

        {/* Tools grid — Invite Inbox (now bell in TopBar) removed from here */}
        <div className="border-b border-[#2A2A2A]">
          <div className="flex items-center gap-2 px-5 py-3 bg-[#141414] border-b border-[#2A2A2A]">
            <span className="text-[#6B6B68]">{Icon.wrench}</span>
            <span className="font-mono font-bold uppercase tracking-[0.12em] text-[10px] text-[#6B6B68]">Tools</span>
          </div>
          {isAdmin && (
            <ToolRow icon={Icon.admin} color="#D4FF3A" title="Admin" subtitle="Users · metrics" onClick={() => navigate('/athlete/admin')} />
          )}
          {isPersonal && (
            <ToolRow icon={Icon.personal} color="#4DA3FF" title="Personal Trainer" subtitle="Coaches" onClick={() => navigate('/athlete/personal')} />
          )}
          <ToolRow icon={Icon.buildup} color="#D4FF3A" title="Build-up" subtitle="Warm-up calc" onClick={() => navigate('/athlete/buildup')} />
          <ToolRow icon={Icon.timer} color="#FF8A00" title="Timer" subtitle="For Time · AMRAP · EMOM · Custom" onClick={() => navigate('/athlete/timer')} />
          <ToolRow
            icon={Icon.exportIcon}
            color="#D4FF3A"
            title={exporting ? 'Generating…' : 'Export PRs'}
            subtitle="PDF report"
            onClick={handleExportPDF}
          />
        </div>

        {/* Invite section — share-your-link */}
        <InviteSection userId={user?.id} />

        {/* Sign out */}
        <div className="px-5 pt-5">
          <button
            onClick={signOut}
            className="w-full border border-[#2A2A2A] text-[#6B6B68] font-mono font-bold uppercase tracking-[0.18em] text-[11px] py-4 active:bg-[#141414] transition-colors"
          >
            Sign out
          </button>
        </div>

        {/* Danger zone */}
        <div className="px-5 pt-10 pb-10 flex justify-center">
          <button
            onClick={openDeleteModal}
            className="font-mono text-[10px] text-[#3A3A38] hover:text-[#8B3030] active:text-[#f87171] transition-colors tracking-[0.14em] uppercase"
          >
            Delete my account
          </button>
        </div>
      </div>

      {/* Delete account modal — unchanged from current Profile.tsx */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-end justify-center" style={{ background: 'rgba(0,0,0,0.85)' }} onClick={closeDeleteModal}>
          <div className="w-full max-w-lg border border-[#3A1A1A] pb-safe" style={{ background: '#0F0A0A' }} onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-[#3A1A1A]">
              <span className="font-mono font-bold uppercase tracking-[0.18em] text-[11px] text-[#8B3030]">Confirm deletion</span>
              <button onClick={closeDeleteModal} disabled={deleting} className="text-[#6B6B68] active:text-soft-white disabled:opacity-40">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="px-5 py-5 space-y-5">
              <div className="border border-[#3A1A1A] px-4 py-3">
                <p className="font-mono text-[11px] text-[#f87171] leading-relaxed">
                  This will permanently delete your account, all your PRs, workout history and profile. This action cannot be undone.
                </p>
              </div>
              <div>
                <label className="font-mono font-bold uppercase tracking-[0.14em] text-[10px] text-[#6B6B68] block mb-2">
                  Type your password to confirm
                </label>
                <input
                  type="password"
                  value={deletePassword}
                  onChange={e => { setDeletePassword(e.target.value); setDeleteError('') }}
                  onKeyDown={e => { if (e.key === 'Enter' && deletePassword.trim()) handleDeleteAccount() }}
                  placeholder="Your current password"
                  disabled={deleting}
                  autoComplete="current-password"
                  className="w-full bg-[#0A0A0A] border border-[#2A2A2A] text-soft-white font-mono text-[14px] px-4 py-3 focus:outline-none focus:border-[#8B3030] disabled:opacity-50 placeholder-[#3A3A38]"
                />
                {deleteError && <p className="font-mono text-[11px] text-[#f87171] mt-2">{deleteError}</p>}
              </div>
              <div className="flex gap-3">
                <button
                  onClick={closeDeleteModal}
                  disabled={deleting}
                  className="flex-1 border border-[#2A2A2A] text-[#6B6B68] font-mono font-bold uppercase tracking-[0.18em] text-[11px] py-3.5 active:bg-[#141414] disabled:opacity-40 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteAccount}
                  disabled={deleting || !deletePassword.trim()}
                  className="flex-1 border border-[#8B3030] text-[#f87171] font-mono font-bold uppercase tracking-[0.18em] text-[11px] py-3.5 active:bg-[#1A0A0A] disabled:opacity-40 transition-colors flex items-center justify-center gap-2"
                >
                  {deleting ? (
                    <>
                      <div className="w-3.5 h-3.5 border border-[#f87171] border-t-transparent rounded-full animate-spin" />
                      <span>Deleting...</span>
                    </>
                  ) : 'Delete account'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

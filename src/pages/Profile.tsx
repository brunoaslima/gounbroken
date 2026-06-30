import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { useProfile } from '@/hooks/useProfile'
import { supabase } from '@/lib/supabase'

// ── Invite share section ─────────────────────────────────────
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
      return // RPC failed — spinner already reset by finally
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
          Convidar
        </span>
      </div>
      <div className="px-5 py-4">
        <p className="font-mono text-[11px] text-[#6B6B68] mb-4 leading-relaxed uppercase tracking-[0.06em]">
          Compartilhe seu link pessoal para convidar amigos.
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
              Compartilhar
            </button>
          ) : (
            <button
              onClick={handleCopy}
              disabled={loadingCode}
              className="flex-1 bg-lime text-graphite font-mono font-bold uppercase tracking-[0.18em] text-[11px] py-3.5 flex items-center justify-center gap-2 disabled:opacity-40 active:bg-lime-lo transition-colors"
            >
              {loadingCode
                ? <span className="w-3.5 h-3.5 border-2 border-graphite/40 border-t-graphite rounded-full animate-spin" />
                : copied
                  ? 'Copiado!'
                  : 'Copiar link'}
            </button>
          )}
          {/* Always show copy button alongside native share */}
          {hasNativeShare && (
            <button
              onClick={handleCopy}
              disabled={loadingCode}
              title="Copiar link"
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
  admin: 'Admin', personal: 'Personal', box_admin: 'Box Admin', ai: 'IA',
}
const ROLE_COLORS: Record<string, string> = {
  admin: '#D4FF3A', personal: '#4DA3FF', box_admin: '#FF8A00', ai: '#A8A8A4',
}

export default function Profile() {
  const { user, signOut } = useAuth()
  const { profile, loading, getAge, getBMI, getBMILabel } = useProfile(user?.id)
  const navigate = useNavigate()

  // Delete account modal state
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deletePassword, setDeletePassword] = useState('')
  const [exporting, setExporting] = useState(false)
  const [deleteError, setDeleteError] = useState('')
  const [deleting, setDeleting] = useState(false)

  const age = getAge()
  const bmi = getBMI()
  const bmiInfo = bmi ? getBMILabel(bmi) : null
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
      // 1. Re-authenticate to confirm identity
      const { error: authError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: deletePassword,
      })
      if (authError) {
        setDeleteError('Incorrect password. Try again.')
        setDeleting(false)
        return
      }

      // 2. Call SECURITY DEFINER function — deletes auth.users row + all cascades
      const { error: deleteError } = await supabase.rpc('delete_own_account')
      if (deleteError) throw deleteError

      // 3. Sign out locally and go to login
      await supabase.auth.signOut()
      navigate('/login', { replace: true })
    } catch (err) {
      console.error(err)
      setDeleteError('Erro ao deletar conta. Tente novamente.')
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
      const movements = (movRes.data ?? []) as { id: string; name: string }[]
      const scores    = (scoresRes.data ?? []) as { movement_id: string; reps: number; weight_kg: number; recorded_at: string }[]

      const { buildPRPosterData, buildPRPosterHTML } = await import('@/lib/prReport')
      const posterData = buildPRPosterData(
        movements, scores,
        profile?.body_weight_kg ?? null,
        profile?.gender as 'male' | 'female' | 'other' | 'prefer_not_to_say' | null,
        profile?.name ?? profile?.username ?? 'Atleta',
        profile?.username ?? null,
      )
      if (!posterData) return

      const html = buildPRPosterHTML(posterData)
      const iframe = document.createElement('iframe')
      iframe.style.cssText = 'position:fixed;left:-9999px;top:-9999px;width:1080px;height:1488px;border:0;opacity:0;'
      document.body.appendChild(iframe)
      const iDoc = iframe.contentDocument ?? iframe.contentWindow?.document
      if (iDoc) {
        iDoc.open()
        iDoc.write(html)
        iDoc.close()
      }
      // script inside the HTML calls window.print() after fonts load; clean up after
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
    <div className="min-h-screen bg-graphite pb-28 md:pb-8 safe-top">
      {/* TopBar */}
      <header className="sticky top-0 z-10 bg-graphite border-b border-[#2A2A2A]" style={{ height: 52 }}>
        <div className="flex items-center justify-between px-5 h-full md:max-w-3xl md:mx-auto">
          <span className="font-mono font-bold uppercase tracking-[0.18em] text-[11px] text-[#A8A8A4]">
            Profile
          </span>
          <button
            onClick={() => navigate('/onboarding')}
            className="flex items-center gap-2 text-[#6B6B68] active:text-soft-white"
            style={{ height: 40 }}
            title="Edit"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            <span className="hidden md:inline font-mono text-[11px] uppercase tracking-[0.12em]">Edit</span>
          </button>
        </div>
      </header>

      <div className="overflow-y-auto md:max-w-3xl md:mx-auto">

        {/* Identity block */}
        <div className="px-5 pt-5 pb-5 border-b border-[#2A2A2A]">
          <div className="flex items-center gap-4">
            <div
              className="flex items-center justify-center shrink-0"
              style={{ width: 56, height: 56, background: '#141414', border: '1px solid #2A2A2A' }}
            >
              <span className="font-mono font-black text-[20px] text-soft-white">{initials}</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-sans font-bold text-[18px] text-soft-white truncate" style={{ letterSpacing: '-0.01em' }}>
                {profile?.name ?? '—'}
              </p>
              {profile?.username && (
                <p className="font-mono text-[12px] text-[#6B6B68] mt-0.5">@{profile.username}</p>
              )}
            </div>
          </div>

          {/* Role badges */}
          {specialRoles.length > 0 && (
            <div className="flex gap-2 mt-3">
              {specialRoles.map(r => (
                <span
                  key={r}
                  className="font-mono font-bold uppercase tracking-[0.12em] text-[10px] px-2 py-1 border"
                  style={{ color: ROLE_COLORS[r] ?? '#A8A8A4', borderColor: ROLE_COLORS[r] ?? '#2A2A2A' }}
                >
                  {ROLE_LABELS[r] ?? r}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Physical data */}
        <div className="border-b border-[#2A2A2A]">
          <div className="px-5 py-3 border-b border-[#2A2A2A]">
            <span className="font-mono font-bold uppercase tracking-[0.12em] text-[10px] text-[#6B6B68]">
              Physical data
            </span>
          </div>
          <DataRow label="Email" value={user?.email ?? '—'} />
          <DataRow label="Body weight" value={profile?.body_weight_kg ? `${profile.body_weight_kg} kg` : '—'} />
          <DataRow label="Height" value={profile?.height_cm ? `${profile.height_cm} cm` : '—'} />
          <DataRow label="Age" value={age != null ? `${age} years` : '—'} />
          <DataRow label="Gender" value={
            profile?.gender === 'male' ? 'Male'
            : profile?.gender === 'female' ? 'Female'
            : profile?.gender === 'other' ? 'Other'
            : profile?.gender === 'prefer_not_to_say' ? 'Prefer not to say'
            : '—'
          } />
          {bmi && bmiInfo && (
            <div className="flex items-center justify-between px-5 py-3.5 border-t border-[#2A2A2A]">
              <span className="font-mono font-bold uppercase tracking-[0.1em] text-[10px] text-[#6B6B68]">BMI</span>
              <div className="flex items-center gap-2">
                <span className="font-mono font-bold text-[13px] text-soft-white">{bmi}</span>
                <span
                  className="font-mono font-bold uppercase tracking-[0.1em] text-[10px] px-2 py-0.5 border"
                  style={{ color: bmiInfo.color, borderColor: bmiInfo.color }}
                >
                  {bmiInfo.label}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Caixa de Convites */}
        <div className="border-b border-[#2A2A2A]">
          <button
            onClick={() => navigate('/athlete/invites')}
            className="w-full flex items-center justify-between px-5 py-4 border-b border-[#2A2A2A] active:bg-[#141414] transition-colors"
          >
            <div className="flex items-center gap-3">
              <span style={{ width: 4, height: 32, background: '#4DA3FF', display: 'block', flexShrink: 0 }} />
              <div>
                <span className="font-sans font-semibold text-[15px] text-soft-white block">
                  Invite Inbox
                </span>
                <span className="font-mono text-[10px] uppercase tracking-widest text-[#6B6B68]">
                  Judge · teams · history
                </span>
              </div>
            </div>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6B6B68" strokeWidth="2">
              <path d="M9 18l6-6-6-6" />
            </svg>
          </button>
        </div>

        {/* Admin & Personal shortcuts — only visible with those roles */}
        {(isAdmin || isPersonal) && (
          <div className="border-b border-[#2A2A2A]">
            <div className="px-5 py-3 border-b border-[#2A2A2A]">
              <span className="font-mono font-bold uppercase tracking-[0.12em] text-[10px] text-[#6B6B68]">
                Tools
              </span>
            </div>

            {isAdmin && (
              <button
                onClick={() => navigate('/athlete/admin')}
                className="w-full flex items-center justify-between px-5 py-4 border-b border-[#2A2A2A] active:bg-[#141414] transition-colors"
              >
                <div className="flex items-center gap-3">
                  <span
                    style={{ width: 4, height: 32, background: '#D4FF3A', display: 'block', flexShrink: 0 }}
                  />
                  <div>
                    <span className="font-sans font-semibold text-[15px] text-soft-white block">
                      Admin Dashboard
                    </span>
                    <span className="font-mono text-[10px] uppercase tracking-widest text-[#6B6B68]">
                      Users · metrics · activity
                    </span>
                  </div>
                </div>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6B6B68" strokeWidth="2">
                  <path d="M9 18l6-6-6-6" />
                </svg>
              </button>
            )}

            {isPersonal && (
              <button
                onClick={() => navigate('/athlete/personal')}
                className="w-full flex items-center justify-between px-5 py-4 border-b border-[#2A2A2A] active:bg-[#141414] transition-colors"
              >
                <div className="flex items-center gap-3">
                  <span
                    style={{ width: 4, height: 32, background: '#4DA3FF', display: 'block', flexShrink: 0 }}
                  />
                  <div>
                    <span className="font-sans font-semibold text-[15px] text-soft-white block">
                      Personal Area
                    </span>
                    <span className="font-mono text-[10px] uppercase tracking-widest text-[#6B6B68]">
                      Athletes · prescriptions
                    </span>
                  </div>
                </div>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6B6B68" strokeWidth="2">
                  <path d="M9 18l6-6-6-6" />
                </svg>
              </button>
            )}
          </div>
        )}

        {/* Calculadoras */}
        <div className="border-b border-[#2A2A2A]">
          <div className="px-5 py-3 border-b border-[#2A2A2A]">
            <span className="font-mono font-bold uppercase tracking-[0.12em] text-[10px] text-[#6B6B68]">
              Calculators
            </span>
          </div>
          <button
            onClick={() => navigate('/athlete/buildup')}
            className="w-full flex items-center justify-between px-5 py-4 border-b border-[#2A2A2A] active:bg-[#141414] transition-colors"
          >
            <div className="flex items-center gap-3">
              <span style={{ width: 4, height: 32, background: '#D4FF3A', display: 'block', flexShrink: 0 }} />
              <div>
                <span className="font-sans font-semibold text-[15px] text-soft-white block">
                  Build-up
                </span>
                <span className="font-mono text-[10px] uppercase tracking-widest text-[#6B6B68]">
                  Warm-up · plates · load per side
                </span>
              </div>
            </div>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6B6B68" strokeWidth="2">
              <path d="M9 18l6-6-6-6" />
            </svg>
          </button>
          <button
            onClick={handleExportPDF}
            disabled={exporting}
            className="w-full flex items-center justify-between px-5 py-4 border-b border-[#2A2A2A] active:bg-[#141414] transition-colors disabled:opacity-60"
          >
            <div className="flex items-center gap-3">
              <span style={{ width: 4, height: 32, background: '#D4FF3A', display: 'block', flexShrink: 0 }} />
              <div>
                <span className="font-sans font-semibold text-[15px] text-soft-white block">
                  {exporting ? 'Generating PDF...' : 'Export PRs'}
                </span>
                <span className="font-mono text-[10px] uppercase tracking-widest text-[#6B6B68]">
                  Complete PDF report
                </span>
              </div>
            </div>
            {exporting
              ? <span className="w-3.5 h-3.5 border-2 border-[#6B6B68] border-t-transparent rounded-full animate-spin" />
              : <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6B6B68" strokeWidth="2"><path d="M9 18l6-6-6-6" /></svg>
            }
          </button>
        </div>

        {/* Invite section */}
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

        {/* Danger zone — discrete */}
        <div className="px-5 pt-10 pb-10 flex justify-center">
          <button
            onClick={openDeleteModal}
            className="font-mono text-[10px] text-[#3A3A38] hover:text-[#8B3030] active:text-[#f87171] transition-colors tracking-[0.14em] uppercase"
          >
            Delete my account
          </button>
        </div>

      </div>

      {/* Delete account modal */}
      {showDeleteModal && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center"
          style={{ background: 'rgba(0,0,0,0.85)' }}
          onClick={closeDeleteModal}
        >
          <div
            className="w-full max-w-lg border border-[#3A1A1A] pb-safe"
            style={{ background: '#0F0A0A' }}
            onClick={e => e.stopPropagation()}
          >
            {/* Modal header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-[#3A1A1A]">
              <span className="font-mono font-bold uppercase tracking-[0.18em] text-[11px] text-[#8B3030]">
                Confirm deletion
              </span>
              <button
                onClick={closeDeleteModal}
                disabled={deleting}
                className="text-[#6B6B68] active:text-soft-white disabled:opacity-40"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="px-5 py-5 space-y-5">
              {/* Warning message */}
              <div className="border border-[#3A1A1A] px-4 py-3">
                <p className="font-mono text-[11px] text-[#f87171] leading-relaxed">
                  This will permanently delete your account, all your PRs, workout history and profile. This action cannot be undone.
                </p>
              </div>

              {/* Password input */}
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
                {deleteError && (
                  <p className="font-mono text-[11px] text-[#f87171] mt-2">{deleteError}</p>
                )}
              </div>

              {/* Action buttons */}
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

function DataRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between px-5 py-3.5 border-t border-[#2A2A2A]">
      <span className="font-mono font-bold uppercase tracking-[0.1em] text-[10px] text-[#6B6B68]">{label}</span>
      <span className="font-sans text-[14px] text-soft-white">{value}</span>
    </div>
  )
}

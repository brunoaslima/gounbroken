import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase } from '@/lib/supabase'

interface InviterProfile {
  name: string
  username: string
  roles: string[]
}

function getRoleLabel(roles: string[]): string | null {
  if (roles.includes('personal')) return 'PERSONAL TRAINER'
  if (roles.includes('admin'))    return 'ADMIN'
  if (roles.includes('box_admin')) return 'BOX ADMIN'
  return null
}

// Brutalist horizontal rule
function HR() {
  return <div className="h-px bg-[#2A2A2A] w-full" />
}

export default function Invite() {
  const { code } = useParams<{ code: string }>()
  const navigate  = useNavigate()

  const [inviter,  setInviter]  = useState<InviterProfile | null>(null)
  const [loading,  setLoading]  = useState(true)

  useEffect(() => {
    if (!code) { setLoading(false); return }
    supabase
      .rpc('get_inviter_profile', { p_code: code.toUpperCase() })
      .then(({ data }) => {
        if (data) setInviter(data as InviterProfile)
        setLoading(false)
      })
  }, [code])

  const roleLabel = inviter ? getRoleLabel(inviter.roles) : null

  function handleJoin() {
    navigate(`/login?ref=${code?.toUpperCase() ?? ''}&tab=signup`)
  }
  function handleLogin() {
    navigate(`/login?ref=${code?.toUpperCase() ?? ''}`)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-graphite flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-lime border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-graphite flex flex-col safe-top safe-bottom relative overflow-hidden">

      {/* Background grid lines — purely decorative */}
      <div className="absolute inset-0 pointer-events-none select-none" aria-hidden>
        <div className="h-full flex flex-col justify-around opacity-[0.18]">
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="h-px bg-[#F5F5F0] w-full" />
          ))}
        </div>
        {/* Vertical guide */}
        <div
          className="absolute top-0 bottom-0"
          style={{ left: '50%', width: 1, background: '#F5F5F0', opacity: 0.06 }}
        />
      </div>

      {/* ── Top bar ─────────────────────────────────────────── */}
      <div className="relative z-10 px-5 pt-5 pb-3 flex items-center justify-between">
        <span className="font-mono font-bold uppercase tracking-[0.18em] text-[10px] text-[#3D3D3B]">
          PR · INDEX
        </span>
        <span className="font-mono font-bold uppercase tracking-[0.12em] text-[10px] text-[#3D3D3B]">
          CONVITE
        </span>
      </div>

      <HR />

      {/* ── Hero ────────────────────────────────────────────── */}
      <div className="relative z-10 flex-1 flex flex-col justify-center px-5 py-8">

        {/* Lime marker */}
        <div style={{ width: 52, height: 5, background: '#D4FF3A', marginBottom: 28 }} />

        {/* Big headline */}
        <div
          className="font-sans font-black text-soft-white leading-none select-none mb-1"
          style={{ fontSize: 'clamp(56px, 16vw, 88px)', letterSpacing: '-0.035em', lineHeight: 0.88 }}
        >
          YOU
        </div>
        <div
          className="font-sans font-black text-soft-white leading-none select-none mb-1"
          style={{ fontSize: 'clamp(56px, 16vw, 88px)', letterSpacing: '-0.035em', lineHeight: 0.88 }}
        >
          HAVE
        </div>
        <div
          className="font-sans font-black leading-none select-none"
          style={{ fontSize: 'clamp(56px, 16vw, 88px)', letterSpacing: '-0.035em', lineHeight: 0.88, color: '#D4FF3A' }}
        >
          AN INVITE
        </div>

        {/* Ruler */}
        <div className="flex justify-between items-end mt-5 mb-5" style={{ height: 14 }}>
          {Array.from({ length: 33 }).map((_, i) => (
            <span
              key={i}
              style={{
                width: 1.5,
                height: i % 4 === 0 ? 14 : 7,
                background: i % 4 === 0 ? '#F5F5F0' : '#3D3D3B',
                display: 'block',
              }}
            />
          ))}
        </div>

        {/* Inviter card */}
        <div className="border border-[#2A2A2A] bg-[#141414] px-4 py-4 mb-7">
          <span className="font-mono font-bold uppercase tracking-[0.12em] text-[9px] text-[#6B6B68] block mb-2">
            Convite de
          </span>
          {inviter ? (
            <div className="flex items-center justify-between">
              <div>
                <p
                  className="font-sans font-bold text-soft-white"
                  style={{ fontSize: 18, letterSpacing: '-0.01em' }}
                >
                  {inviter.name}
                </p>
                <p className="font-mono text-[11px] text-[#6B6B68] mt-0.5">
                  @{inviter.username}
                </p>
              </div>
              {roleLabel && (
                <span
                  className="font-mono font-bold uppercase tracking-[0.1em] text-[9px] px-2 py-1 border border-[#4DA3FF] text-[#4DA3FF] shrink-0 ml-3"
                >
                  {roleLabel}
                </span>
              )}
            </div>
          ) : (
            <p className="font-sans text-[#6B6B68] text-[14px]">
              Um membro da comunidade PR · INDEX
            </p>
          )}
        </div>

        {/* Value props */}
        <div className="mb-8 space-y-2.5">
          {[
            'Track your 1RMs, 3RMs, 5RMs',
            'Follow your progress over time',
            'Discover your real strength level',
          ].map((text, i) => (
            <div key={i} className="flex items-center gap-3">
              <div
                style={{ width: 6, height: 6, background: '#D4FF3A', flexShrink: 0 }}
              />
              <span className="font-mono text-[10px] text-[#A8A8A4] uppercase tracking-[0.08em] leading-relaxed">
                {text}
              </span>
            </div>
          ))}
        </div>

        {/* CTAs */}
        <button
          onClick={handleJoin}
          className="w-full bg-lime text-graphite font-mono font-bold uppercase tracking-[0.18em] text-[13px] py-4 active:bg-lime-lo transition-colors"
        >
          Create my account →
        </button>

        <button
          onClick={handleLogin}
          className="w-full mt-3 py-3.5 font-mono font-bold uppercase tracking-[0.12em] text-[11px] text-[#6B6B68] border border-[#2A2A2A] active:bg-[#141414] transition-colors"
        >
          Already have an account — Sign in
        </button>
      </div>

      {/* ── Bottom bar ──────────────────────────────────────── */}
      <HR />
      <div className="relative z-10 px-5 py-4 flex items-center justify-between">
        <span className="font-mono text-[9px] text-[#3D3D3B] uppercase tracking-widest">
          Go · Unbroken · Log
        </span>
        <span className="font-mono text-[9px] text-[#3D3D3B] uppercase tracking-widest">
          V{__APP_VERSION__}
        </span>
      </div>

    </div>
  )
}

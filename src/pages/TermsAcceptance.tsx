import { useEffect, useRef, useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase'
import { CURRENT_TERMS_VERSION } from '@/lib/terms'

export default function TermsAcceptance() {
  const { user } = useAuth()
  const pageRef  = useRef<HTMLDivElement>(null)

  const [scrollPct, setScrollPct]       = useState(0)
  const [scrolledToEnd, setScrolledToEnd] = useState(false)
  const [checked, setChecked]           = useState(false)
  const [loading, setLoading]           = useState(false)
  const [error, setError]               = useState<string | null>(null)

  function checkScroll() {
    const el = pageRef.current
    if (!el) return
    const max = el.scrollHeight - el.clientHeight
    const pct = max <= 0 ? 100 : Math.min(100, Math.round((el.scrollTop / max) * 100))
    setScrollPct(pct)
    if (pct >= 98) setScrolledToEnd(true)
  }

  useEffect(() => {
    checkScroll()
    window.addEventListener('resize', checkScroll)
    return () => window.removeEventListener('resize', checkScroll)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  async function handleAccept() {
    if (!checked || !user) return
    setLoading(true)
    setError(null)
    const { error: err } = await supabase
      .from('profiles')
      .update({
        terms_accepted_at: new Date().toISOString(),
        terms_version: CURRENT_TERMS_VERSION,
      })
      .eq('user_id', user.id)
    if (err) {
      setError('Something went wrong. Please try again.')
      setLoading(false)
      return
    }
    // Full reload so RequireAuth re-fetches profile with updated terms_version
    window.location.replace('/athlete')
  }

  return (
    <div
      ref={pageRef}
      onScroll={checkScroll}
      className="h-screen overflow-y-auto bg-[#0A0A0A] flex flex-col"
    >
      {/* Sticky header + progress */}
      <div className="sticky top-0 z-10 bg-[#0A0A0A]">
        <div className="border-b border-[#2A2A2A] px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 bg-lime flex items-center justify-center flex-shrink-0">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M7 1L13 12H1L7 1Z" fill="#0A0A0A" />
              </svg>
            </div>
            <span className="font-mono font-bold uppercase tracking-[0.14em] text-[10px] text-white">
              Terms &amp; Privacy — v{CURRENT_TERMS_VERSION}
            </span>
          </div>
          <span className={`font-mono font-bold uppercase tracking-[0.12em] text-[9px] transition-colors ${
            scrolledToEnd ? 'text-lime' : 'text-[#3D3D3B]'
          }`}>
            {scrolledToEnd ? 'Read' : 'Scroll to read'}
          </span>
        </div>

        {/* Progress bar */}
        <div className="h-[2px] bg-[#1A1A1A]">
          <div
            className="h-full bg-lime transition-all duration-75"
            style={{ width: `${scrollPct}%` }}
          />
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 px-5 pt-8 pb-10 max-w-lg w-full mx-auto flex flex-col gap-0">

        <h1 className="font-sans font-black text-[#F5F5F0] mb-2 leading-none"
          style={{ fontSize: 32, letterSpacing: '-0.02em' }}>
          Before you <span style={{ color: '#D4FF3A' }}>continue.</span>
        </h1>
        <p className="font-mono text-[11px] text-[#3D3D3B] mb-10 uppercase tracking-[0.1em]">
          Read everything below — the checkbox unlocks at the end.
        </p>

        {CLAUSES.map((c, i) => (
          <div key={i}>
            {i > 0 && <div className="border-t border-[#1A1A1A] my-6" />}
            <p className="font-mono font-bold uppercase tracking-[0.14em] text-[10px] text-[#F5F5F0] mb-2">
              {String(i + 1).padStart(2, '0')} — {c.title}
            </p>
            <p className="font-sans text-[14px] text-[#6B6B68] leading-relaxed">{c.body}</p>
          </div>
        ))}

        {/* Checkbox */}
        <div className="mt-12">
          <button
            type="button"
            disabled={!scrolledToEnd}
            onClick={() => scrolledToEnd && setChecked(v => !v)}
            className={`w-full flex items-start gap-3 p-4 border text-left transition-colors ${
              checked
                ? 'border-lime bg-[#0D0D0D]'
                : scrolledToEnd
                ? 'border-[#2A2A2A] bg-[#0D0D0D]'
                : 'border-[#1A1A1A] bg-[#0D0D0D] cursor-not-allowed'
            }`}
          >
            <div
              className="flex-shrink-0 flex items-center justify-center mt-0.5 transition-colors"
              style={{
                width: 18, height: 18,
                border: `1px solid ${checked ? '#D4FF3A' : scrolledToEnd ? '#555' : '#2A2A2A'}`,
                background: checked ? '#D4FF3A' : 'transparent',
              }}
            >
              {checked && (
                <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                  <path d="M1 4L3.5 6.5L9 1" stroke="#0A0A0A" strokeWidth="2" strokeLinecap="square" />
                </svg>
              )}
            </div>
            <span className={`text-[13px] leading-relaxed transition-colors ${
              scrolledToEnd ? 'text-[#A8A8A4]' : 'text-[#2A2A2A]'
            }`}>
              I have read and agree to the{' '}
              <strong className={scrolledToEnd ? 'text-[#F5F5F0]' : 'text-[#2A2A2A]'}>Terms of Use</strong>
              {' '}and{' '}
              <strong className={scrolledToEnd ? 'text-[#F5F5F0]' : 'text-[#2A2A2A]'}>Privacy Policy</strong>
              {' '}of Go Unbroken.
            </span>
          </button>
        </div>

        {error && (
          <p className="font-mono text-[10px] text-red-400 uppercase tracking-[0.12em] mt-3">{error}</p>
        )}

        <button
          onClick={handleAccept}
          disabled={!checked || loading}
          className="w-full mt-4 py-4 font-mono font-bold uppercase tracking-[0.18em] text-[12px] transition-opacity disabled:opacity-25"
          style={{ background: '#D4FF3A', color: '#0A0A0A' }}
        >
          {loading ? 'Saving…' : "Enter the app →"}
        </button>

        <p className="text-center font-mono text-[10px] text-[#2A2A2A] tracking-[0.1em] mt-6">
          v{CURRENT_TERMS_VERSION} · jun 2026
        </p>
      </div>
    </div>
  )
}

const CLAUSES = [
  {
    title: 'What we collect',
    body: 'Name, email address, workout data (WODs, scores, personal records), and app usage data. We do not collect government IDs, payment card numbers, or financial information.',
  },
  {
    title: 'How we use it',
    body: 'To display your training history, generate leaderboards, and allow comparison with other athletes in your box. Your data is never sold to third parties.',
  },
  {
    title: 'AI features',
    body: 'When you use the Personal Trainer, your workout data is sent to our AI provider to generate personalised suggestions. No personally identifiable information (name, email) is shared with that provider.',
  },
  {
    title: 'Your rights',
    body: 'You may access, correct, or delete your data at any time in Settings → My account. We honour data protection requests under applicable laws (including GDPR, LGPD, CCPA, and similar). Questions: privacy@gounbroken.app',
  },
  {
    title: 'Retention',
    body: 'Your data is stored for as long as your account is active. When you delete your account, all personal data is permanently removed within 30 days.',
  },
  {
    title: 'Security',
    body: 'Data is encrypted in transit (TLS 1.3) and at rest. Database access is enforced via Row Level Security — no user can access another user\'s records.',
  },
  {
    title: 'Changes to these terms',
    body: 'If we make material changes, we will notify you in-app and ask for your acceptance again before you continue using Go Unbroken.',
  },
]

import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase'
import { CURRENT_TERMS_VERSION } from '@/lib/terms'

export default function TermsAcceptance() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const scrollRef = useRef<HTMLDivElement>(null)

  const [scrolledToEnd, setScrolledToEnd] = useState(false)
  const [scrollPctState, setScrollPctState] = useState(0)
  const [checked, setChecked] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function checkScroll() {
    const el = scrollRef.current
    if (!el) return
    const max = el.scrollHeight - el.clientHeight
    const pct = max <= 0 ? 100 : Math.min(100, Math.round((el.scrollTop / max) * 100))
    setScrollPctState(pct)
    if (pct >= 98 && !scrolledToEnd) setScrolledToEnd(true)
  }

  function handleScroll() { checkScroll() }

  useEffect(() => {
    // Check on mount and on resize (in case content fits without scrolling)
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
    navigate('/athlete', { replace: true })
  }

  const scrollPct = scrollPctState

  return (
    <div className="min-h-screen bg-[#0A0A0A] flex flex-col">
      {/* Header */}
      <div className="border-b border-[#2A2A2A] px-5 py-4 flex items-center gap-3">
        <div className="w-7 h-7 bg-lime flex items-center justify-center flex-shrink-0">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M7 1L13 12H1L7 1Z" fill="#0A0A0A" />
          </svg>
        </div>
        <span className="font-mono font-bold uppercase tracking-[0.14em] text-[10px] text-white">
          Go Unbroken
        </span>
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col px-5 py-5 gap-4 max-w-lg w-full mx-auto min-h-0">
        <div className="flex-shrink-0">
          <h1 className="text-[22px] font-bold text-white leading-tight">
            Before you <span className="text-lime">continue</span>
          </h1>
          <p className="text-[12px] text-[#666] mt-1.5 leading-relaxed">
            Read everything below. The checkbox unlocks once you reach the end.
          </p>
        </div>

        {/* Terms box */}
        <div className="border border-[#2A2A2A] bg-[#111] flex flex-col flex-1 min-h-0">
          <div className="font-mono font-bold uppercase tracking-[0.14em] text-[10px] text-lime px-3.5 py-2.5 border-b border-[#2A2A2A] flex-shrink-0">
            Terms &amp; Privacy — v{CURRENT_TERMS_VERSION}
          </div>

          {/* Progress bar */}
          <div className="flex items-center gap-2 px-3.5 py-1.5 border-b border-[#1A1A1A] flex-shrink-0">
            <div className="flex-1 h-[2px] bg-[#222] overflow-hidden">
              <div
                className="h-full bg-lime transition-all duration-100"
                style={{ width: `${scrollPct}%` }}
              />
            </div>
            <span
              className={`font-mono font-bold uppercase tracking-[0.12em] text-[9px] transition-colors ${
                scrolledToEnd ? 'text-lime' : 'text-[#444]'
              }`}
            >
              {scrolledToEnd ? 'Read' : 'Scroll to read'}
            </span>
          </div>

          <div
            ref={scrollRef}
            onScroll={handleScroll}
            className="overflow-y-auto p-3.5 flex flex-col gap-3 flex-1 min-h-0"
          >
            {CLAUSES.map((c, i) => (
              <div key={i}>
                {i > 0 && <div className="border-t border-[#1E1E1E] mb-3" />}
                <p className="font-mono font-bold uppercase tracking-[0.14em] text-[10px] text-white mb-1">
                  {String(i + 1).padStart(2, '0')} — {c.title}
                </p>
                <p className="text-[12px] text-[#888] leading-relaxed">{c.body}</p>
              </div>
            ))}
            <div className="h-1" />
          </div>
        </div>

        {/* Checkbox */}
        <button
          type="button"
          disabled={!scrolledToEnd}
          onClick={() => scrolledToEnd && setChecked(v => !v)}
          className={`flex items-start gap-3 p-3.5 border text-left transition-colors flex-shrink-0 ${
            checked
              ? 'border-lime'
              : scrolledToEnd
              ? 'border-[#2A2A2A] hover:border-[#3A3A3A]'
              : 'border-[#2A2A2A] cursor-not-allowed'
          } bg-[#111]`}
        >
          <div
            className={`w-[18px] h-[18px] border flex-shrink-0 mt-0.5 flex items-center justify-center transition-colors ${
              checked ? 'border-lime bg-lime' : scrolledToEnd ? 'border-[#555]' : 'border-[#2A2A2A]'
            }`}
          >
            {checked && (
              <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                <path d="M1 4L3.5 6.5L9 1" stroke="#0A0A0A" strokeWidth="2" strokeLinecap="square" />
              </svg>
            )}
          </div>
          <span
            className={`text-[12px] leading-relaxed transition-colors ${
              checked ? 'text-[#ccc]' : scrolledToEnd ? 'text-[#888]' : 'text-[#444]'
            }`}
          >
            I have read and agree to the{' '}
            <strong className={checked ? 'text-white' : scrolledToEnd ? 'text-white' : 'text-[#444]'}>
              Terms of Use
            </strong>{' '}
            and{' '}
            <strong className={checked ? 'text-white' : scrolledToEnd ? 'text-white' : 'text-[#444]'}>
              Privacy Policy
            </strong>{' '}
            of Go Unbroken.
          </span>
        </button>

        {error && (
          <p className="font-mono text-[10px] text-red-400 uppercase tracking-[0.12em] flex-shrink-0">{error}</p>
        )}

        <button
          onClick={handleAccept}
          disabled={!checked || loading}
          className={`w-full py-3.5 font-mono font-bold uppercase tracking-[0.14em] text-[11px] transition-opacity flex-shrink-0 ${
            checked && !loading
              ? 'bg-lime text-[#0A0A0A] opacity-100 cursor-pointer'
              : 'bg-lime text-[#0A0A0A] opacity-25 cursor-not-allowed'
          }`}
        >
          {loading ? 'Saving…' : 'Enter the app'}
        </button>

        <p className="text-center font-mono text-[10px] text-[#2A2A2A] tracking-[0.1em] flex-shrink-0">
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

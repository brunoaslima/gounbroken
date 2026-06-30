import { FormEvent, useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase'
import { suggestEmail } from '@/lib/utils'
import { phCapture } from '@/lib/posthog'

type Tab = 'login' | 'signup'

const USERNAME_RE = /^[a-z0-9_.]+$/

const Ruler = () => (
  <div className="flex justify-between items-end" style={{ height: 12 }}>
    {Array.from({ length: 41 }).map((_, i) => (
      <span
        key={i}
        style={{
          width: 1.5,
          height: i % 5 === 0 ? 12 : 6,
          background: i % 5 === 0 ? '#F5F5F0' : '#3D3D3B',
          display: 'block',
        }}
      />
    ))}
  </div>
)

const Label = ({ children, className = '' }: { children: React.ReactNode; className?: string }) => (
  <span className={`font-mono font-bold uppercase tracking-[0.12em] text-[10px] text-[#6B6B68] ${className}`}>
    {children}
  </span>
)

// ── Email confirmation screen ────────────────────────────────────────────

function EmailConfirmSent({ email, onBack }: { email: string; onBack: () => void }) {
  return (
    <div className="flex-1 px-5 pt-6 pb-8 flex flex-col gap-6">
      <div className="border border-[#2A2A2A] bg-[#141414] p-5">
        <div className="w-8 h-8 border border-[#D4FF3A] flex items-center justify-center mb-4">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#D4FF3A" strokeWidth="2">
            <path d="M4 4h16v16H4z" /><path d="M4 4l8 8 8-8" strokeLinecap="round" />
          </svg>
        </div>
        <p className="font-mono font-bold uppercase tracking-[0.12em] text-[10px] text-[#D4FF3A] mb-2">
          Check your email
        </p>
        <p className="font-sans text-[#A8A8A4] text-[14px] leading-relaxed">
          We sent a confirmation link to <strong className="text-[#F5F5F0]">{email}</strong>.
          Click the link to activate your account and continue onboarding.
        </p>
      </div>
      <p className="font-mono text-[10px] text-[#3D3D3B] text-center uppercase tracking-wider">
        Didn't receive it? Check your spam folder.
      </p>
      <button
        type="button"
        onClick={onBack}
        className="font-mono font-bold uppercase tracking-[0.12em] text-[11px] text-[#6B6B68] border border-[#2A2A2A] py-3 active:bg-[#141414] transition-colors"
      >
        ← Back
      </button>
    </div>
  )
}

// ── Main page ────────────────────────────────────────────────────────────

export default function Login() {
  const { signIn, signUpBasic, user } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  // Invite-link params
  const refCode = searchParams.get('ref')?.toUpperCase() ?? null
  const tabParam = searchParams.get('tab')

  const [tab, setTab] = useState<Tab>(tabParam === 'signup' ? 'signup' : 'login')
  const [showPass, setShowPass] = useState(false)

  // Login fields
  const [loginId, setLoginId] = useState('')
  const [loginPass, setLoginPass] = useState('')

  // Signup fields
  const [firstName, setFirstName]           = useState('')
  const [lastName, setLastName]             = useState('')
  const [username, setUsername]             = useState('')
  const [email, setEmail]                   = useState('')
  const [password, setPassword]             = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [usernameError, setUsernameError]   = useState('')
  const [emailError, setEmailError]         = useState('')
  const [passwordError, setPasswordError]   = useState('')
  const [emailSuggestion, setEmailSuggestion] = useState<string | null>(null)

  // Email confirmation flow
  const [emailConfirmSent, setEmailConfirmSent] = useState(false)

  const [error, setError]     = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (user && tab === 'login') navigate('/athlete', { replace: true })
  }, [user])

  function handleUsernameChange(val: string) {
    const lower = val.toLowerCase().replace(/\s/g, '')
    setUsername(lower)
    setUsernameError(lower && !USERNAME_RE.test(lower) ? 'Only lowercase letters, numbers, _ and .' : '')
  }

  function switchTab(t: Tab) {
    setTab(t)
    setError('')
    setUsernameError('')
    setEmailError('')
    setPasswordError('')
    setEmailConfirmSent(false)
  }

  async function handleLogin(e: FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await signIn(loginId, loginPass)
      phCapture('user_signed_in')
    }
    catch (err: unknown) { setError(err instanceof Error ? err.message : 'Sign in error') }
    finally { setLoading(false) }
  }

  async function handleSignup(e: FormEvent) {
    e.preventDefault()
    setError('')
    setUsernameError('')
    setEmailError('')
    setPasswordError('')

    if (!USERNAME_RE.test(username)) {
      setUsernameError('Only lowercase letters, numbers, _ and .')
      return
    }
    if (password.length < 6) {
      setPasswordError('Minimum 6 characters')
      return
    }
    if (password !== confirmPassword) {
      setPasswordError("Passwords don't match")
      return
    }

    setLoading(true)
    try {
      // AC10: check username uniqueness before hitting auth
      const { data: isTaken } = await supabase.rpc('is_username_taken', { p_username: username })
      if (isTaken) {
        setUsernameError('Username already taken')
        return
      }

      const { emailConfirmationRequired } = await signUpBasic({
        email,
        password,
        name: `${firstName.trim()} ${lastName.trim()}`.trim(),
        username,
      })

      if (emailConfirmationRequired) {
        // AC6: auth succeeded — don't show an error, show "check email" screen
        phCapture('user_signed_up', { email_confirmation_required: true, via_invite: !!refCode })
        // Store invite code so it can be accepted once the session is established
        if (refCode) sessionStorage.setItem('pending_invite', refCode)
        setEmailConfirmSent(true)
        return
      }

      // Accept invite immediately (fire-and-forget — failure is non-fatal)
      const codeToAccept = refCode ?? sessionStorage.getItem('pending_invite')
      if (codeToAccept) {
        sessionStorage.removeItem('pending_invite')
        supabase.rpc('accept_invite', { p_code: codeToAccept }).then(() => { /* ignore */ }, () => { /* ignore */ })
      }

      // AC1: account created → go to onboarding
      phCapture('user_signed_up', { email_confirmation_required: false, via_invite: !!refCode })
      navigate('/onboarding', { replace: true })
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Account creation failed'

      if (msg === 'EMAIL_EXISTS') {
        // AC7: guide user to log in instead of showing a generic error
        setEmailError(
          'This email is already registered. Use the Sign In tab.'
        )
        return
      }

      // AC8: specific error based on what actually failed
      const lower = msg.toLowerCase()
      if (lower.includes('email') || lower.includes('already registered') || lower.includes('already exists')) {
        setEmailError('This email is already registered. Use the Sign In tab.')
      } else {
        // Auth itself failed — show the real message
        setError(`Account creation failed: ${msg}`)
      }
    } finally {
      setLoading(false)
    }
  }

  // ── Render ──────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-graphite flex flex-col safe-top safe-bottom md:items-center md:justify-center md:py-10">
      <div className="w-full flex flex-col flex-1 md:flex-none md:max-w-[480px] md:border md:border-[#2A2A2A] md:overflow-y-auto md:max-h-[90vh]">
      {/* Top chrome */}
      <div className="px-5 pt-5 flex items-center justify-between">
        <Label>PR · INDEX</Label>
        <Label>V{__APP_VERSION__}</Label>
      </div>

      {/* Brand block */}
      <div className="px-5 pt-4 pb-0">
        <div className="select-none leading-none" style={{ lineHeight: 0.88 }}>
          <div
            className="font-sans font-black text-soft-white"
            style={{ fontSize: 88, letterSpacing: '-0.04em' }}
          >
            GO
          </div>
          <div className="my-2" style={{ width: 52, height: 6, background: '#D4FF3A' }} />
          <div
            className="font-sans font-black text-soft-white"
            style={{ fontSize: 72, letterSpacing: '-0.04em' }}
          >
            UNBROKEN
          </div>
        </div>
        <div className="mt-4">
          <Ruler />
          <div className="flex items-center justify-between mt-1.5">
            <Label>Go · Unbroken · Log</Label>
            <Label>001</Label>
          </div>
        </div>
      </div>

      {/* Form area */}
      <div className="flex-1 px-5 pt-6 pb-8 overflow-y-auto">
        {/* Invite banner */}
        {refCode && (
          <div className="border border-[#D4FF3A]/30 bg-[#D4FF3A]/5 px-4 py-3 mb-5 flex items-center gap-3">
            <div style={{ width: 4, height: 32, background: '#D4FF3A', flexShrink: 0 }} />
            <div>
              <span className="font-mono font-bold uppercase tracking-[0.12em] text-[9px] text-[#D4FF3A] block">
                Invite
              </span>
              <span className="font-mono text-[11px] text-[#A8A8A4] leading-snug block mt-0.5">
                Create your account to continue
              </span>
            </div>
          </div>
        )}

        {/* Tab selector */}
        <div className="flex border border-[#2A2A2A] mb-6">
          {(['login', 'signup'] as const).map((t, i) => (
            <button
              key={t}
              type="button"
              onClick={() => switchTab(t)}
              className={`flex-1 py-2.5 font-mono font-bold uppercase tracking-[0.12em] text-[11px] transition-colors ${
                tab === t ? 'bg-soft-white text-graphite' : 'text-[#6B6B68]'
              } ${i === 0 ? '' : 'border-l border-[#2A2A2A]'}`}
            >
              {t === 'login' ? 'Sign In' : 'Create Account'}
            </button>
          ))}
        </div>

        {/* ── Login ── */}
        {tab === 'login' && (
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <div className="mb-1.5"><Label>Email or username</Label></div>
              <div className="border border-[#2A2A2A] bg-[#141414]">
                <input
                  type="text" required value={loginId}
                  onChange={e => setLoginId(e.target.value)}
                  className="w-full bg-transparent px-4 py-3.5 text-soft-white placeholder-[#3D3D3B] focus:outline-none text-[15px]"
                  placeholder="email@domain.com or username"
                  autoComplete="username"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <Label>Password</Label>
                <button type="button" onClick={() => setShowPass(v => !v)}
                  className="font-mono font-bold uppercase tracking-[0.12em] text-[10px] text-[#A8A8A4]">
                  {showPass ? 'Hide' : 'Show'}
                </button>
              </div>
              <div className="border border-[#2A2A2A] bg-[#141414]">
                <input
                  type={showPass ? 'text' : 'password'} required value={loginPass}
                  onChange={e => setLoginPass(e.target.value)}
                  className="w-full bg-transparent px-4 py-3.5 text-soft-white placeholder-[#3D3D3B] focus:outline-none text-[15px]"
                  placeholder="••••••••" autoComplete="current-password"
                />
              </div>
            </div>

            {error && (
              <p className="font-mono text-[11px] text-warning border border-warning/30 bg-warning/8 px-3 py-2.5">{error}</p>
            )}

            <button type="submit" disabled={loading}
              className="w-full bg-lime text-graphite font-mono font-bold uppercase tracking-[0.18em] text-[12px] py-4 flex items-center justify-center gap-2 disabled:opacity-40 active:bg-lime-lo transition-colors mt-2">
              {loading && <span className="w-3.5 h-3.5 border-2 border-graphite/40 border-t-graphite rounded-full animate-spin" />}
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>
        )}

        {/* ── Signup: email confirmation sent ── */}
        {tab === 'signup' && emailConfirmSent && (
          <EmailConfirmSent email={email} onBack={() => setEmailConfirmSent(false)} />
        )}

        {/* ── Signup: form ── */}
        {tab === 'signup' && !emailConfirmSent && (
          <form onSubmit={handleSignup} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <div className="mb-1.5"><Label>First Name</Label></div>
                <div className="border border-[#2A2A2A] bg-[#141414]">
                  <input type="text" required value={firstName} onChange={e => setFirstName(e.target.value)}
                    className="w-full bg-transparent px-4 py-3.5 text-soft-white placeholder-[#3D3D3B] focus:outline-none text-[15px]"
                    placeholder="First Name" autoComplete="given-name" />
                </div>
              </div>
              <div>
                <div className="mb-1.5"><Label>Last Name</Label></div>
                <div className="border border-[#2A2A2A] bg-[#141414]">
                  <input type="text" required value={lastName} onChange={e => setLastName(e.target.value)}
                    className="w-full bg-transparent px-4 py-3.5 text-soft-white placeholder-[#3D3D3B] focus:outline-none text-[15px]"
                    placeholder="Last Name" autoComplete="family-name" />
                </div>
              </div>
            </div>

            <div>
              <div className="mb-1.5"><Label>Username</Label></div>
              <div className={`border bg-[#141414] ${usernameError ? 'border-warning/60' : 'border-[#2A2A2A]'}`}>
                <input type="text" required value={username} onChange={e => handleUsernameChange(e.target.value)}
                  className="w-full bg-transparent px-4 py-3.5 text-soft-white placeholder-[#3D3D3B] focus:outline-none text-[15px]"
                  placeholder="username" autoComplete="off" />
              </div>
              {usernameError && <p className="font-mono text-[10px] text-warning mt-1 px-0.5">{usernameError}</p>}
            </div>

            <div>
              <div className="mb-1.5"><Label>Email</Label></div>
              <div className={`border bg-[#141414] ${emailError ? 'border-warning/60' : 'border-[#2A2A2A]'}`}>
                <input type="email" required value={email}
                  onChange={e => { setEmail(e.target.value); setEmailSuggestion(null); setEmailError('') }}
                  onBlur={() => setEmailSuggestion(suggestEmail(email))}
                  className="w-full bg-transparent px-4 py-3.5 text-soft-white placeholder-[#3D3D3B] focus:outline-none text-[15px]"
                  placeholder="email@domain.com" autoComplete="email" />
              </div>
              {emailError && (
                <div className="flex items-center justify-between border border-warning/30 bg-warning/8 px-3 py-2 mt-1.5">
                  <p className="font-mono text-[10px] text-warning">{emailError}</p>
                  {emailError.includes('Sign In') && (
                    <button type="button" onClick={() => switchTab('login')}
                      className="font-mono font-bold text-[10px] text-warning uppercase tracking-widest ml-3 whitespace-nowrap">
                      Sign In →
                    </button>
                  )}
                </div>
              )}
              {!emailError && emailSuggestion && (
                <div className="flex items-center justify-between border border-warning/30 bg-warning/8 px-3 py-2 mt-1.5">
                  <span className="font-mono text-[10px] text-warning">Did you mean <strong>{emailSuggestion}</strong>?</span>
                  <button type="button" onClick={() => { setEmail(emailSuggestion); setEmailSuggestion(null) }}
                    className="font-mono font-bold text-[10px] text-warning uppercase tracking-widest ml-3">Fix</button>
                </div>
              )}
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <Label>Password</Label>
                <span className="font-mono text-[10px] text-[#3D3D3B]">min. 6 characters</span>
              </div>
              <div className={`border bg-[#141414] ${passwordError ? 'border-warning/60' : 'border-[#2A2A2A]'}`}>
                <input type="password" required value={password}
                  onChange={e => { setPassword(e.target.value); setPasswordError('') }}
                  className="w-full bg-transparent px-4 py-3.5 text-soft-white placeholder-[#3D3D3B] focus:outline-none text-[15px]"
                  placeholder="••••••••" autoComplete="new-password" />
              </div>
            </div>

            <div>
              <div className="mb-1.5"><Label>Confirm Password</Label></div>
              <div className={`border bg-[#141414] ${passwordError ? 'border-warning/60' : 'border-[#2A2A2A]'}`}>
                <input type="password" required value={confirmPassword}
                  onChange={e => { setConfirmPassword(e.target.value); setPasswordError('') }}
                  className="w-full bg-transparent px-4 py-3.5 text-soft-white placeholder-[#3D3D3B] focus:outline-none text-[15px]"
                  placeholder="••••••••" autoComplete="new-password" />
              </div>
              {passwordError && <p className="font-mono text-[10px] text-warning mt-1 px-0.5">{passwordError}</p>}
            </div>

            {error && (
              <p className="font-mono text-[11px] text-warning border border-warning/30 bg-warning/8 px-3 py-2.5">{error}</p>
            )}

            <button type="submit" disabled={loading}
              className="w-full bg-lime text-graphite font-mono font-bold uppercase tracking-[0.18em] text-[12px] py-4 flex items-center justify-center gap-2 disabled:opacity-40 active:bg-lime-lo transition-colors mt-2">
              {loading && <span className="w-3.5 h-3.5 border-2 border-graphite/40 border-t-graphite rounded-full animate-spin" />}
              {loading ? 'Creating account...' : 'Continue →'}
            </button>
          </form>
        )}
      </div>
      </div>
    </div>
  )
}

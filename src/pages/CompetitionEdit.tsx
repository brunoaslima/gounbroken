import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { useProfile } from '@/hooks/useProfile'
import { DatePicker } from '@/components/DatePicker'
import StickyFooter from '@/components/StickyFooter'
import {
  FieldBlock,
  FocusInput,
  FocusTextarea,
  SlotsStepper,
  formatDivisionLabel,
} from '@/components/CompetitionFormFields'
import type { Competition, CompetitionDivision } from '@/types'

function today(): string {
  return new Date().toISOString().slice(0, 10)
}

export default function CompetitionEdit() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()
  const { profile } = useProfile(user?.id)

  const [loading, setLoading] = useState(true)
  const [comp, setComp] = useState<Competition | null>(null)
  const [divisions, setDivisions] = useState<CompetitionDivision[]>([])
  const [myRole, setMyRole] = useState<string | null>(null)

  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [venue, setVenue] = useState('')
  const [startDate, setStartDate] = useState('')
  const [deadline, setDeadline] = useState('')
  const [divMaxTeams, setDivMaxTeams] = useState<Record<string, number | null>>({})

  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!id || !user) return
    ;(async () => {
      setLoading(true)
      const [compRes, divRes, roleRes] = await Promise.all([
        supabase.from('competitions').select('*').eq('id', id).single(),
        supabase.from('competition_divisions').select('*').eq('competition_id', id).order('created_at'),
        supabase.from('competition_roles').select('role').eq('competition_id', id).eq('user_id', user.id),
      ])
      const c = compRes.data as Competition | null
      const divs = (divRes.data ?? []) as CompetitionDivision[]
      setComp(c)
      setDivisions(divs)
      setMyRole(roleRes.data?.[0]?.role ?? null)
      if (c) {
        setName(c.name)
        setDescription(c.description ?? '')
        setVenue(c.venue ?? '')
        setStartDate(c.start_date)
        setDeadline(c.registration_deadline.slice(0, 10))
      }
      setDivMaxTeams(Object.fromEntries(divs.map(d => [d.id, d.max_teams])))
      setLoading(false)
    })()
  }, [id, user])

  const isAdmin = profile?.roles?.includes('admin') ?? false
  const isHeadJudge = myRole === 'head_judge'
  const canManage = isAdmin || isHeadJudge

  const deadlineValid = !!(deadline && startDate && deadline <= startDate)
  const canSubmit = name.trim().length > 0 && startDate && deadline && deadlineValid && !saving

  async function handleSubmit() {
    if (!canSubmit || !comp) return
    setSaving(true)
    setError(null)

    const { error: rpcErr } = await supabase.rpc('update_competition', {
      p_competition_id: comp.id,
      p_name: name.trim(),
      p_description: description.trim(),
      p_venue: venue.trim(),
      p_start_date: startDate,
      p_registration_deadline: deadline,
      p_divisions: divisions.map(d => ({ id: d.id, max_teams: divMaxTeams[d.id] ?? null })),
    })

    setSaving(false)
    if (rpcErr) {
      setError(rpcErr.message)
      return
    }

    navigate(`/athlete/competitions/${comp.id}`)
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#0A0A0A' }}>
        <div className="w-6 h-6 border-2 animate-spin" style={{ borderColor: '#D4FF3A', borderTopColor: 'transparent' }} />
      </div>
    )
  }

  if (!comp || !canManage) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4" style={{ background: '#0A0A0A', color: '#F5F5F0' }}>
        <span className="font-mono font-bold uppercase" style={{ fontSize: 11, letterSpacing: '0.14em', color: '#FF3B30' }}>
          ACCESS DENIED
        </span>
        <button
          onClick={() => navigate(-1)}
          className="font-mono font-bold uppercase"
          style={{ fontSize: 10, letterSpacing: '0.14em', color: '#6B6B68' }}
        >
          ← BACK
        </button>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ background: '#0A0A0A', color: '#F5F5F0' }}>

      {/* Topbar */}
      <header
        className="sticky top-0 z-10 flex items-center justify-between border-b border-[#2A2A2A]"
        style={{ height: 52, padding: '8px 16px', background: '#0A0A0A' }}
      >
        <button
          onClick={() => navigate(-1)}
          className="flex items-center justify-center text-[#6B6B68] active:text-[#F5F5F0]"
          style={{ width: 36, height: 36, background: 'transparent', border: 0 }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M19 12H5M12 5l-7 7 7 7" />
          </svg>
        </button>
        <span
          className="font-mono font-black uppercase"
          style={{ fontSize: 11, letterSpacing: '0.22em', color: '#F5F5F0' }}
        >
          EDIT COMPETITION
        </span>
        <div style={{ width: 36 }} />
      </header>

      {/* Form */}
      <div className="flex-1" style={{ paddingBottom: 100 }}>

        {/* Section: Identidade */}
        <div
          className="font-mono font-bold uppercase border-b border-[#2A2A2A]"
          style={{ fontSize: 9, letterSpacing: '0.18em', color: '#D4FF3A', padding: '10px 20px', background: '#0D0D0D' }}
        >
          01 · IDENTITY
        </div>

        <FieldBlock label="Competition name" required>
          <FocusInput
            type="text"
            placeholder="Ex: Open Box Pinheiros 2025"
            value={name}
            onChange={e => setName(e.target.value)}
            maxLength={80}
          />
          <span
            className="font-mono block mt-1.5"
            style={{ fontSize: 9, letterSpacing: '0.12em', color: name.length > 60 ? '#FFB800' : '#3D3D3B' }}
          >
            {name.length}/80
          </span>
        </FieldBlock>

        <FieldBlock label="Description">
          <FocusTextarea
            placeholder="General rules, divisions, format..."
            value={description}
            onChange={e => setDescription(e.target.value)}
            maxLength={500}
            rows={3}
          />
        </FieldBlock>

        <FieldBlock label="Venue">
          <FocusInput
            type="text"
            placeholder="Ex: CF Pinheiros · SP"
            value={venue}
            onChange={e => setVenue(e.target.value)}
            maxLength={80}
          />
        </FieldBlock>

        {/* Section: Datas */}
        <div
          className="font-mono font-bold uppercase border-b border-[#2A2A2A]"
          style={{ fontSize: 9, letterSpacing: '0.18em', color: '#D4FF3A', padding: '10px 20px', background: '#0D0D0D', marginTop: 8 }}
        >
          02 · DATES
        </div>

        <FieldBlock label="Event date" required>
          <DatePicker
            value={startDate}
            min={today()}
            onChange={setStartDate}
          />
        </FieldBlock>

        <FieldBlock label="Registration deadline" required>
          <DatePicker
            value={deadline}
            min={today()}
            max={startDate || undefined}
            invalid={!!(deadline && startDate && !deadlineValid)}
            onChange={setDeadline}
          />
          <span
            className="font-mono block mt-1.5"
            style={{ fontSize: 9, letterSpacing: '0.12em', color: deadline && startDate && !deadlineValid ? '#FF3B30' : '#3D3D3B' }}
          >
            Must be on or before the event date
          </span>
        </FieldBlock>

        {/* Section: Slots by division */}
        {divisions.length > 0 && (
          <>
            <div
              className="font-mono font-bold uppercase border-b border-[#2A2A2A]"
              style={{ fontSize: 9, letterSpacing: '0.18em', color: '#D4FF3A', padding: '10px 20px', background: '#0D0D0D', marginTop: 8 }}
            >
              03 · SLOTS BY DIVISION
            </div>
            {divisions.map(d => (
              <div key={d.id} className="border-b border-[#2A2A2A]" style={{ padding: '16px 20px' }}>
                <span
                  className="font-mono font-bold uppercase inline-block transition-colors duration-150 hover:text-[#D4FF3A] hover:border-[#D4FF3A]"
                  style={{ fontSize: 9, letterSpacing: '0.18em', color: '#6B6B68', border: '1px solid #2A2A2A', padding: '4px 8px', marginBottom: 8 }}
                >
                  {formatDivisionLabel(d)}
                </span>
                <SlotsStepper
                  value={divMaxTeams[d.id] ?? null}
                  onChange={v => setDivMaxTeams(prev => ({ ...prev, [d.id]: v }))}
                />
              </div>
            ))}
          </>
        )}

        {/* Error */}
        {error && (
          <div
            className="font-mono font-bold uppercase"
            style={{ fontSize: 10, letterSpacing: '0.14em', color: '#FF3B30', padding: '12px 20px', borderBottom: '1px solid #2A2A2A' }}
          >
            {error}
          </div>
        )}

      </div>

      <StickyFooter variant="fixed" style={{ paddingTop: 12, paddingLeft: 16, paddingRight: 16 }}>
        <button
          onClick={handleSubmit}
          disabled={!canSubmit}
          className="w-full flex items-center justify-between px-5 py-4 active:opacity-80 transition-opacity"
          style={{
            background: canSubmit ? '#D4FF3A' : '#1A1A1A',
            border: canSubmit ? 'none' : '1px solid #2A2A2A',
          }}
        >
          <span
            className="font-mono font-black uppercase"
            style={{ fontSize: 11, letterSpacing: '0.2em', color: canSubmit ? '#0A0A0A' : '#3D3D3B' }}
          >
            {saving ? 'SAVING...' : 'SAVE CHANGES'}
          </span>
          {!saving && (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={canSubmit ? '#0A0A0A' : '#3D3D3B'} strokeWidth="2.5">
              <path d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          )}
          {saving && (
            <div
              className="w-4 h-4 border-2 animate-spin"
              style={{ borderColor: '#0A0A0A', borderTopColor: 'transparent' }}
            />
          )}
        </button>
      </StickyFooter>
    </div>
  )
}

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import type { DivisionFormat, DivisionComposition, CompetitionDivision } from '@/types'
import { DatePicker } from '@/components/DatePicker'

// ─── helpers ─────────────────────────────────────────────────────────────────

function today(): string {
  return new Date().toISOString().slice(0, 10)
}

function todayPlus(days: number): string {
  const d = new Date()
  d.setDate(d.getDate() + days)
  return d.toISOString().slice(0, 10)
}

// ─── FieldBlock ───────────────────────────────────────────────────────────────

function FieldBlock({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div className="border-b border-[#2A2A2A]" style={{ padding: '16px 20px' }}>
      <span
        className="font-mono font-bold uppercase block"
        style={{ fontSize: 9, letterSpacing: '0.18em', color: '#6B6B68', marginBottom: 8 }}
      >
        {label}{required && <span style={{ color: '#D4FF3A', marginLeft: 4 }}>*</span>}
      </span>
      {children}
    </div>
  )
}

const INPUT_STYLE: React.CSSProperties = {
  width: '100%',
  background: '#111111',
  border: '1px solid #2A2A2A',
  borderRadius: 0,
  color: '#F5F5F0',
  fontFamily: 'inherit',
  fontSize: 15,
  padding: '10px 12px',
  outline: 'none',
}

const INPUT_FOCUSED_STYLE: React.CSSProperties = {
  ...INPUT_STYLE,
  border: '1px solid #D4FF3A',
}

// ─── FocusInput ───────────────────────────────────────────────────────────────

function FocusInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  const [focused, setFocused] = useState(false)
  return (
    <input
      {...props}
      style={focused ? INPUT_FOCUSED_STYLE : INPUT_STYLE}
      onFocus={e => { setFocused(true); props.onFocus?.(e) }}
      onBlur={e => { setFocused(false); props.onBlur?.(e) }}
    />
  )
}

function FocusTextarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const [focused, setFocused] = useState(false)
  return (
    <textarea
      {...props}
      style={{
        ...(focused ? INPUT_FOCUSED_STYLE : INPUT_STYLE),
        resize: 'none',
        minHeight: 72,
      }}
      onFocus={e => { setFocused(true); props.onFocus?.(e) }}
      onBlur={e => { setFocused(false); props.onBlur?.(e) }}
    />
  )
}

/**
 * Renders a numeric stepper with decrement and increment controls.
 *
 * @param value - The current number to display
 * @param min - The lowest selectable value
 * @param max - The highest selectable value
 * @param onChange - Called with the updated value
 */

function Stepper({ value, min, max, onChange }: { value: number; min: number; max: number; onChange: (v: number) => void }) {
  return (
    <div className="flex items-center" style={{ gap: 0 }}>
      <button
        type="button"
        onClick={() => onChange(Math.max(min, value - 1))}
        style={{
          width: 36, height: 36,
          background: '#111111', border: '1px solid #2A2A2A',
          color: value <= min ? '#3D3D3B' : '#F5F5F0',
          fontSize: 18, fontWeight: 700,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}
      >
        −
      </button>
      <div
        className="font-mono font-black flex items-center justify-center"
        style={{
          width: 44, height: 36,
          background: '#111111',
          borderTop: '1px solid #2A2A2A',
          borderBottom: '1px solid #2A2A2A',
          fontSize: 15,
          color: '#F5F5F0',
        }}
      >
        {value}
      </div>
      <button
        type="button"
        onClick={() => onChange(Math.min(max, value + 1))}
        style={{
          width: 36, height: 36,
          background: '#111111', border: '1px solid #2A2A2A',
          color: value >= max ? '#3D3D3B' : '#D4FF3A',
          fontSize: 18, fontWeight: 700,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}
      >
        +
      </button>
    </div>
  )
}

// ─── division helpers ────────────────────────────────────────────────────────

const FORMAT_OPTIONS: { value: DivisionFormat; label: string }[] = [
  { value: 'individual', label: 'IND' },
  { value: 'pair',       label: 'PAIR' },
  { value: 'team3',      label: 'TEAM 3' },
  { value: 'team4',      label: 'TEAM 4' },
]

const COMPOSITION_OPTIONS: { value: DivisionComposition; label: string }[] = [
  { value: 'male',   label: 'MALE' },
  { value: 'female', label: 'FEMALE' },
  { value: 'mixed',  label: 'MIXED' },
]

const CATEGORY_PRESETS = ['SCALED', 'INTERMEDIATE', 'RX', 'ELITE']

type PendingDivision = { format: DivisionFormat; composition: DivisionComposition; category: string }

/**
 * Builds a unique key for a division.
 *
 * @param d - The pending division to key
 * @returns A key composed of the format, composition, and lowercased category
 */
function divisionKey(d: PendingDivision): string {
  return `${d.format}|${d.composition}|${d.category.toLowerCase()}`
}

/**
 * Formats a display label for a division.
 *
 * @param d - The division details to format
 * @returns A label in the form `FORMAT · COMPOSITION · CATEGORY`
 */
function formatDivisionLabel(d: PendingDivision): string {
  const fmtMap: Record<DivisionFormat, string> = { individual: 'IND', pair: 'PAIR', team3: 'TEAM 3', team4: 'TEAM 4' }
  return `${fmtMap[d.format]} · ${d.composition.toUpperCase()} · ${d.category.toUpperCase()}`
}

/**
 * Renders the competition creation page.
 *
 * Displays form fields for competition details, event dates, and division configuration, then creates the competition and its divisions on submission.
 *
 * @returns The competition creation page.
 */

export default function CompetitionCreate() {
  const navigate = useNavigate()

  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [venue, setVenue] = useState('')
  const [startDate, setStartDate] = useState(todayPlus(30))
  const [deadline, setDeadline] = useState(todayPlus(20))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Divisions
  const [divisions, setDivisions] = useState<PendingDivision[]>([])
  const [divFormat, setDivFormat] = useState<DivisionFormat>('team4')
  const [divComposition, setDivComposition] = useState<DivisionComposition>('mixed')
  const [divCategory, setDivCategory] = useState<string>('RX')
  const [divCustomCategory, setDivCustomCategory] = useState('')

  const mixedBlocked = divFormat === 'individual' || divFormat === 'team3'

  /**
   * Adds the selected division to the list of pending divisions.
   *
   * Uses the custom category when provided, otherwise the preset category, and skips duplicates.
   */
  function addDivision() {
    const cat = (divCustomCategory.trim() || divCategory).toLowerCase()
    if (!cat) return
    const comp: DivisionComposition = (mixedBlocked && divComposition === 'mixed') ? 'male' : divComposition
    const pending: PendingDivision = { format: divFormat, composition: comp, category: cat }
    if (divisions.some(d => divisionKey(d) === divisionKey(pending))) return
    setDivisions(prev => [...prev, pending])
    setDivCustomCategory('')
  }

  /**
   * Removes a division from the pending list.
   *
   * @param key - The division key to remove
   */
  function removeDivision(key: string) {
    setDivisions(prev => prev.filter(d => divisionKey(d) !== key))
  }

  const deadlineValid = !!(deadline && startDate && deadline < startDate)
  const canSubmit = name.trim().length > 0 && startDate && deadline && deadlineValid && !saving

  /**
   * Creates the competition and saves any added divisions.
   *
   * Submits the competition details to the backend, stores the pending divisions for the created competition, and then navigates to the competition page. If creation fails, the error message is shown and saving stops.
   */
  async function handleSubmit() {
    if (!canSubmit) return
    setSaving(true)
    setError(null)

    const { data, error: rpcErr } = await supabase.rpc('create_competition', {
      p_name: name.trim(),
      p_description: description.trim(),
      p_venue: venue.trim(),
      p_start_date: startDate,
      p_registration_deadline: new Date(deadline + 'T23:59:59').toISOString(),
    })

    if (rpcErr) {
      setError(rpcErr.message)
      setSaving(false)
      return
    }

    const competitionId = data as string

    if (divisions.length > 0) {
      await supabase.from('competition_divisions').insert(
        divisions.map(d => ({
          competition_id: competitionId,
          format: d.format,
          composition: d.composition,
          category: d.category,
        }))
      )
    }

    navigate(`/athlete/competitions/${competitionId}`)
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
          NEW COMPETITION
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

        <FieldBlock label="Local / Venue">
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
            Must be before the event date
          </span>
        </FieldBlock>

        {/* Section: Divisions */}
        <div
          className="font-mono font-bold uppercase border-b border-[#2A2A2A]"
          style={{ fontSize: 9, letterSpacing: '0.18em', color: '#D4FF3A', padding: '10px 20px', background: '#0D0D0D', marginTop: 8 }}
        >
          03 · DIVISIONS
        </div>

        {/* Added divisions list */}
        {divisions.length > 0 && (
          <div className="border-b border-[#2A2A2A]" style={{ padding: '12px 20px' }}>
            <div className="flex flex-col" style={{ gap: 8 }}>
              {divisions.map(d => (
                <div
                  key={divisionKey(d)}
                  className="flex items-center justify-between"
                  style={{ border: '1px solid #2A2A2A', padding: '10px 12px' }}
                >
                  <span className="font-mono font-bold uppercase" style={{ fontSize: 10, letterSpacing: '0.14em', color: '#D4FF3A' }}>
                    {formatDivisionLabel(d)}
                  </span>
                  <button
                    type="button"
                    onClick={() => removeDivision(divisionKey(d))}
                    style={{ background: 'transparent', border: 'none', color: '#6B6B68', cursor: 'pointer', padding: '2px 6px' }}
                  >
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="square">
                      <path d="M1 1l10 10M11 1L1 11" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Add division form */}
        <div className="border-b border-[#2A2A2A]" style={{ padding: '16px 20px' }}>

          <div className="flex items-center" style={{ gap: 6, marginBottom: 8 }}>
            <span style={{ width: 3, height: 10, background: '#D4FF3A', display: 'inline-block', flexShrink: 0 }} />
            <span className="font-mono font-bold uppercase" style={{ fontSize: 10, letterSpacing: '0.18em', color: '#F5F5F0' }}>
              Format
            </span>
          </div>
          <div className="grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)', gap: 1, background: '#2A2A2A', marginBottom: 16 }}>
            {FORMAT_OPTIONS.map(opt => (
              <button
                key={opt.value}
                type="button"
                onClick={() => {
                  setDivFormat(opt.value)
                  if ((opt.value === 'individual' || opt.value === 'team3') && divComposition === 'mixed') {
                    setDivComposition('male')
                  }
                }}
                className="font-mono font-black uppercase"
                style={{
                  fontSize: 10, letterSpacing: '0.14em',
                  padding: '10px 4px',
                  background: divFormat === opt.value ? '#F5F5F0' : '#1A1A1A',
                  color: divFormat === opt.value ? '#0A0A0A' : '#A8A8A4',
                  border: 'none', cursor: 'pointer',
                }}
              >
                {opt.label}
              </button>
            ))}
          </div>

          <div className="flex items-center" style={{ gap: 6, marginBottom: 8 }}>
            <span style={{ width: 3, height: 10, background: '#D4FF3A', display: 'inline-block', flexShrink: 0 }} />
            <span className="font-mono font-bold uppercase" style={{ fontSize: 10, letterSpacing: '0.18em', color: '#F5F5F0' }}>
              Composition
            </span>
          </div>
          <div className="grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)', gap: 1, background: '#2A2A2A', marginBottom: 16 }}>
            {COMPOSITION_OPTIONS.map(opt => {
              const disabled = opt.value === 'mixed' && mixedBlocked
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => !disabled && setDivComposition(opt.value)}
                  className="font-mono font-black uppercase"
                  style={{
                    fontSize: 10, letterSpacing: '0.14em',
                    padding: '10px 4px',
                    background: divComposition === opt.value && !disabled ? '#F5F5F0' : '#1A1A1A',
                    color: disabled ? '#333333' : divComposition === opt.value ? '#0A0A0A' : '#A8A8A4',
                    border: 'none', cursor: disabled ? 'not-allowed' : 'pointer',
                  }}
                >
                  {opt.label}
                </button>
              )
            })}
          </div>

          <div className="flex items-center" style={{ gap: 6, marginBottom: 8 }}>
            <span style={{ width: 3, height: 10, background: '#D4FF3A', display: 'inline-block', flexShrink: 0 }} />
            <span className="font-mono font-bold uppercase" style={{ fontSize: 10, letterSpacing: '0.18em', color: '#F5F5F0' }}>
              Category
            </span>
          </div>
          <div style={{ marginBottom: 12 }}>
            <div className="grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)', gap: 1, background: '#2A2A2A' }}>
              {CATEGORY_PRESETS.map(cat => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => { setDivCategory(cat); setDivCustomCategory('') }}
                  className="font-mono font-black uppercase"
                  style={{
                    fontSize: 10, letterSpacing: '0.14em',
                    padding: '10px 4px',
                    background: divCategory === cat && !divCustomCategory ? '#F5F5F0' : '#1A1A1A',
                    color: divCategory === cat && !divCustomCategory ? '#0A0A0A' : '#A8A8A4',
                    border: 'none', cursor: 'pointer',
                  }}
                >
                  {cat}
                </button>
              ))}
            </div>
            <div className="flex items-center" style={{ gap: 8, margin: '10px 0' }}>
              <div style={{ flex: 1, height: 1, background: '#2A2A2A' }} />
              <span className="font-mono font-bold uppercase" style={{ fontSize: 9, letterSpacing: '0.18em', color: '#444442' }}>or</span>
              <div style={{ flex: 1, height: 1, background: '#2A2A2A' }} />
            </div>
            <div style={{ background: divCustomCategory ? '#F5F5F0' : '#1A1A1A' }}>
              <input
                type="text"
                placeholder="e.g. ATHX PRO"
                value={divCustomCategory}
                maxLength={50}
                onChange={e => setDivCustomCategory(e.target.value)}
                style={{
                  width: '100%',
                  background: 'transparent',
                  border: 'none',
                  outline: 'none',
                  color: divCustomCategory ? '#0A0A0A' : '#A8A8A4',
                  fontFamily: 'inherit',
                  fontSize: 10,
                  letterSpacing: '0.14em',
                  fontWeight: 900,
                  textTransform: 'uppercase',
                  padding: '10px 12px',
                  boxSizing: 'border-box',
                }}
              />
            </div>
          </div>

          {/* Preview label */}
          {(divCustomCategory.trim() || divCategory) && (
            <div className="font-mono font-bold" style={{ fontSize: 10, letterSpacing: '0.14em', color: '#D4FF3A', marginBottom: 10 }}>
              {formatDivisionLabel({
                format: divFormat,
                composition: (mixedBlocked && divComposition === 'mixed') ? 'male' : divComposition,
                category: divCustomCategory.trim() || divCategory,
              })}
            </div>
          )}

          <button
            type="button"
            onClick={addDivision}
            className="w-full font-mono font-black uppercase flex items-center justify-center gap-2"
            style={{
              fontSize: 11, letterSpacing: '0.14em',
              background: 'transparent',
              border: '1px solid #D4FF3A',
              color: '#D4FF3A',
              padding: '10px 16px',
              cursor: 'pointer',
            }}
          >
            <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
              <path d="M6 1v10M1 6h10" stroke="currentColor" strokeWidth="1.8" strokeLinecap="square" />
            </svg>
            ADD DIVISION
          </button>
        </div>

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

      {/* Sticky CTA */}
      <div
        className="fixed bottom-0 left-0 right-0 md:relative"
        style={{ background: '#0A0A0A', borderTop: '1px solid #2A2A2A', padding: '12px 16px', paddingBottom: 'max(env(safe-area-inset-bottom, 12px), 12px)' }}
      >
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
            {saving ? 'CREATING...' : 'CREATE COMPETITION'}
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
      </div>
    </div>
  )
}

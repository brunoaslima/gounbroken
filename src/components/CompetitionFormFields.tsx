import { useState } from 'react'
import type { DivisionFormat, DivisionComposition } from '@/types'

// ─── FieldBlock ───────────────────────────────────────────────────────────────

export function FieldBlock({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
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

export const INPUT_STYLE: React.CSSProperties = {
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

export const INPUT_FOCUSED_STYLE: React.CSSProperties = {
  ...INPUT_STYLE,
  border: '1px solid #D4FF3A',
}

// ─── FocusInput ───────────────────────────────────────────────────────────────

export function FocusInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
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

export function FocusTextarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
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

// ─── StepperButton ────────────────────────────────────────────────────────────

export function Stepper({ value, min, max, onChange }: { value: number; min: number; max: number; onChange: (v: number) => void }) {
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

export const FORMAT_OPTIONS: { value: DivisionFormat; label: string }[] = [
  { value: 'individual', label: 'IND' },
  { value: 'pair',       label: 'PAIR' },
  { value: 'team3',      label: 'TEAM 3' },
  { value: 'team4',      label: 'TEAM 4' },
]

export const COMPOSITION_OPTIONS: { value: DivisionComposition; label: string }[] = [
  { value: 'male',   label: 'MALE' },
  { value: 'female', label: 'FEMALE' },
  { value: 'mixed',  label: 'MIXED' },
]

export const CATEGORY_PRESETS = ['SCALED', 'INTERMEDIATE', 'RX', 'ELITE']

export type PendingDivision = { format: DivisionFormat; composition: DivisionComposition; category: string; maxTeams: number | null }

export function divisionKey(d: PendingDivision): string {
  return `${d.format}|${d.composition}|${d.category.toLowerCase()}`
}

export function formatDivisionLabel(d: Pick<PendingDivision, 'format' | 'composition' | 'category'>): string {
  const fmtMap: Record<DivisionFormat, string> = { individual: 'IND', pair: 'PAIR', team3: 'TEAM 3', team4: 'TEAM 4' }
  return `${fmtMap[d.format]} · ${d.composition.toUpperCase()} · ${d.category.toUpperCase()}`
}

// Stepper de vagas com estado "—" (null = ilimitado); nunca zero, nunca input livre
export function SlotsStepper({ value, onChange }: { value: number | null; onChange: (v: number | null) => void }) {
  const dec = () => onChange(value === null ? null : value <= 1 ? null : value - 1)
  const inc = () => onChange(value === null ? 10 : Math.min(999, value + 1))
  const btnStyle: React.CSSProperties = {
    width: 44, background: '#1A1A1A', border: 'none',
    color: '#F5F5F0', fontSize: 18, cursor: 'pointer', flexShrink: 0, padding: '8px 0',
  }
  return (
    <div>
      <div className="flex items-stretch" style={{ gap: 1, background: '#2A2A2A' }}>
        <button type="button" onClick={dec} style={btnStyle}>−</button>
        <div
          className="flex-1 flex items-center justify-center font-mono font-black"
          style={{ background: '#1A1A1A', fontSize: 14, letterSpacing: '0.1em', color: value === null ? '#6B6B68' : '#F5F5F0' }}
        >
          {value === null ? '—' : value}
        </div>
        <button type="button" onClick={inc} style={btnStyle}>+</button>
      </div>
      <span className="font-mono block mt-1.5" style={{ fontSize: 9, letterSpacing: '0.12em', color: '#3D3D3B' }}>
        {value === null ? 'ILIMITADO · TOQUE + PARA DEFINIR LIMITE' : `${value} VAGA${value === 1 ? '' : 'S'} NESTA DIVISÃO`}
      </span>
    </div>
  )
}

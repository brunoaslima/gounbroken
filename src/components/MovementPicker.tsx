import { useEffect, useMemo, useRef, useState } from 'react'
import type { Movement } from '@/types'

interface Props {
  movements: Movement[]
  value: string        // movement id currently selected
  onChange: (id: string) => void
  required?: boolean
}

export default function MovementPicker({ movements, value, onChange, required }: Props) {
  const [open, setOpen]     = useState(false)
  const [search, setSearch] = useState('')
  const inputRef            = useRef<HTMLInputElement>(null)

  const selected = movements.find(m => m.id === value)

  // Filter by search query
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return movements
    return movements.filter(m => m.name.toLowerCase().includes(q))
  }, [movements, search])

  // Focus search input when overlay opens — desktop only.
  // On touch devices (iOS/Android) programmatic focus triggers scroll/zoom,
  // so we skip it and let the user tap the field themselves.
  useEffect(() => {
    if (open) {
      const isTouch = ('ontouchstart' in window) || navigator.maxTouchPoints > 0
      if (!isTouch) {
        const id = setTimeout(() => inputRef.current?.focus(), 60)
        return () => clearTimeout(id)
      }
    } else {
      setSearch('')
    }
  }, [open])

  // Close on back gesture (popstate)
  useEffect(() => {
    if (!open) return
    const handler = () => setOpen(false)
    window.addEventListener('popstate', handler)
    return () => window.removeEventListener('popstate', handler)
  }, [open])

  function select(id: string) {
    onChange(id)
    setOpen(false)
  }

  return (
    <>
      {/* ── Trigger button ───────────────────────────────────────────── */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="w-full border border-[#2A2A2A] bg-[#141414] px-4 py-4 flex items-center justify-between active:bg-[#1A1A1A] transition-colors"
        // satisfies native required semantics visually — actual required is on hidden input below
      >
        <span className={`font-sans text-[16px] leading-tight ${selected ? 'text-soft-white' : 'text-[#3D3D3B]'}`}>
          {selected ? selected.name : 'Selecionar…'}
        </span>
        <svg className="w-4 h-4 text-[#6B6B68] shrink-0 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Hidden native input so `required` validation still works */}
      <input
        type="text"
        value={value}
        onChange={() => {}}
        required={required}
        tabIndex={-1}
        aria-hidden
        className="sr-only"
      />

      {/* ── Full-screen overlay ───────────────────────────────────────── */}
      {open && (
        <div className="fixed inset-0 z-50 flex flex-col bg-graphite" style={{ paddingTop: 'env(safe-area-inset-top)', paddingBottom: 'env(safe-area-inset-bottom)' }}>

          {/* Header row */}
          <div className="flex items-center gap-3 px-4 border-b border-[#2A2A2A]" style={{ height: 52, flexShrink: 0 }}>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="font-mono font-bold uppercase tracking-[0.12em] text-[11px] text-[#A8A8A4] active:text-soft-white shrink-0"
            >
              Cancelar
            </button>

            {/* Search field */}
            <div className="flex-1 relative">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#3D3D3B] pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
              </svg>
              <input
                ref={inputRef}
                type="search"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search exercise…"
                autoComplete="off"
                autoCorrect="off"
                spellCheck={false}
                className="w-full bg-[#141414] border border-[#2A2A2A] pl-9 pr-9 py-2 text-soft-white font-sans text-[14px] focus:outline-none focus:border-lime placeholder-[#3D3D3B]"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#6B6B68] active:text-soft-white text-[14px] leading-none"
                >
                  ✕
                </button>
              )}
            </div>
          </div>

          {/* Count line */}
          <div className="px-5 py-2 border-b border-[#1F1F1F] shrink-0">
            <span className="font-mono font-bold uppercase tracking-[0.1em] text-[9px] text-[#3D3D3B]">
              {filtered.length} {filtered.length === 1 ? 'exercise' : 'exercises'}
              {search ? ` · "${search}"` : ' · A–Z'}
            </span>
          </div>

          {/* Scrollable list */}
          <div className="flex-1 overflow-y-auto overscroll-contain">
            {filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 gap-2">
                <span className="font-mono font-bold uppercase tracking-[0.12em] text-[11px] text-[#3D3D3B]">
                  Nenhum resultado
                </span>
                <span className="font-mono text-[10px] text-[#2A2A2A] uppercase tracking-widest">
                  tente outro termo
                </span>
              </div>
            ) : (
              filtered.map(m => {
                const isSelected = m.id === value
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => select(m.id)}
                    className="w-full text-left px-5 py-4 border-b border-[#1F1F1F] active:bg-[#141414] transition-colors flex items-center justify-between gap-3"
                  >
                    <span className={`font-sans text-[15px] leading-tight ${isSelected ? 'text-lime font-semibold' : 'text-soft-white'}`}>
                      {m.name}
                    </span>
                    {isSelected && (
                      <svg className="w-4 h-4 text-lime shrink-0" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    )}
                  </button>
                )
              })
            )}
          </div>
        </div>
      )}
    </>
  )
}

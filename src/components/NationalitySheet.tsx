import { useEffect, useRef, useState } from 'react'
import type { Country } from '@/lib/countries'
import { COUNTRIES, POPULAR_COUNTRIES } from '@/lib/countries'

interface Props {
  value: string | null
  onChange: (country: Country) => void
  error?: boolean
}

export function NationalitySheet({ value, onChange, error = false }: Props) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const searchRef = useRef<HTMLInputElement>(null)

  const allCountries = [...POPULAR_COUNTRIES, ...COUNTRIES]
  const selected = allCountries.find(c => c.code === value) ?? null

  useEffect(() => {
    if (open) {
      const t = setTimeout(() => searchRef.current?.focus(), 80)
      return () => clearTimeout(t)
    }
    setSearch('')
  }, [open])

  const searchLower = search.toLowerCase()
  const filtered = search
    ? COUNTRIES.filter(c =>
        c.name.toLowerCase().includes(searchLower) ||
        c.code.toLowerCase().includes(searchLower)
      )
    : null

  function select(country: Country) {
    onChange(country)
    setOpen(false)
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="w-full flex items-center px-4 gap-3"
        style={{
          height: 56,
          background: '#141414',
          border: `1px solid ${error ? 'rgba(255,59,48,0.6)' : '#2A2A2A'}`,
        }}
      >
        {selected ? (
          <>
            <span style={{ fontSize: 20, lineHeight: 1 }}>{selected.flag}</span>
            <span className="text-[#F5F5F0] text-[15px]">{selected.name}</span>
          </>
        ) : (
          <span className="font-mono font-bold uppercase tracking-[0.12em] text-[11px] text-[#3D3D3B]">
            Select Nationality
          </span>
        )}
        <svg className="ml-auto shrink-0" width="12" height="12" viewBox="0 0 24 24" fill="none"
          stroke="#3D3D3B" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex flex-col justify-end"
          style={{ background: 'rgba(0,0,0,0.75)' }}
          onClick={e => { if (e.target === e.currentTarget) setOpen(false) }}
        >
          <div
            className="w-full flex flex-col"
            style={{ background: '#111111', maxHeight: '82vh', borderTop: '1px solid #2A2A2A' }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-[#2A2A2A] shrink-0">
              <span className="font-mono font-bold uppercase tracking-[0.14em] text-[10px] text-[#6B6B68]">
                Nationality
              </span>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="font-mono font-bold uppercase tracking-[0.12em] text-[11px] text-[#6B6B68] active:text-[#F5F5F0]"
              >
                Cancel
              </button>
            </div>

            {/* Search */}
            <div className="px-5 py-3 border-b border-[#2A2A2A] shrink-0">
              <div className="border border-[#2A2A2A] bg-[#141414]">
                <input
                  ref={searchRef}
                  type="text"
                  placeholder="Search country..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="w-full bg-transparent px-4 py-3 text-[#F5F5F0] placeholder-[#3D3D3B] focus:outline-none text-[14px]"
                  autoCapitalize="off"
                  autoCorrect="off"
                />
              </div>
            </div>

            {/* List */}
            <div className="overflow-y-auto flex-1 overscroll-contain">
              {!search && (
                <>
                  <div className="px-5 pt-4 pb-2">
                    <span className="font-mono font-bold uppercase tracking-[0.14em] text-[9px] text-[#3D3D3B]">
                      Popular
                    </span>
                  </div>
                  {POPULAR_COUNTRIES.map(country => (
                    <CountryRow
                      key={'pop-' + country.code}
                      country={country}
                      selected={value === country.code}
                      onSelect={select}
                    />
                  ))}
                  <div className="px-5 pt-4 pb-2">
                    <span className="font-mono font-bold uppercase tracking-[0.14em] text-[9px] text-[#3D3D3B]">
                      All Countries
                    </span>
                  </div>
                </>
              )}
              {(filtered ?? COUNTRIES).map(country => (
                <CountryRow
                  key={country.code}
                  country={country}
                  selected={value === country.code}
                  onSelect={select}
                />
              ))}
              {filtered?.length === 0 && (
                <p className="px-5 py-8 font-mono text-[11px] text-[#3D3D3B] text-center uppercase tracking-widest">
                  No results
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}

function CountryRow({ country, selected, onSelect }: {
  country: Country
  selected: boolean
  onSelect: (c: Country) => void
}) {
  return (
    <button
      type="button"
      onClick={() => onSelect(country)}
      className="w-full flex items-center gap-3 active:bg-[#1A1A1A]"
      style={{
        height: 48,
        paddingLeft: '1.25rem',
        paddingRight: '1.25rem',
        borderLeft: `4px solid ${selected ? '#D4FF3A' : 'transparent'}`,
      }}
    >
      <span style={{ fontSize: 20, lineHeight: 1, flexShrink: 0 }}>{country.flag}</span>
      <span
        className="text-[15px] font-sans text-left"
        style={{ color: selected ? '#F5F5F0' : '#A8A8A4', fontWeight: selected ? 700 : 400 }}
      >
        {country.name}
      </span>
    </button>
  )
}

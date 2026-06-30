// Tier progress bar — matches colors-tiers.html design reference
// 6 tiers: Foundation / Novice / Intermediate / Advanced / Elite / World-class
// score (0–100) maps to the global percentile bands from the design system

interface TierSegment {
  key: string
  label: string
  shortLabel: string
  color: string
  start: number // percentile band start
  end: number   // percentile band end
}

const TIERS: TierSegment[] = [
  { key: 'untrained',    label: 'Foundation',   shortLabel: 'FND', color: '#6B6B68', start: 0,  end: 10  },
  { key: 'novice',       label: 'Novice',        shortLabel: 'NOV', color: '#A8A8A4', start: 10, end: 35  },
  { key: 'intermediate', label: 'Intermediate',  shortLabel: 'INT', color: '#4DA3FF', start: 35, end: 65  },
  { key: 'advanced',     label: 'Advanced',      shortLabel: 'ADV', color: '#D4FF3A', start: 65, end: 85  },
  { key: 'elite',        label: 'Elite',         shortLabel: 'ELT', color: '#FF8A00', start: 85, end: 97  },
  { key: 'world',        label: 'World-class',   shortLabel: 'WLD', color: '#FF3B30', start: 97, end: 100 },
]

interface Props {
  score: number          // 0–100 percentile (from analyzeStrength)
  kgToNextLevel: number | null
  nextLevelLabel: string | null
}

export default function TierBar({ score, kgToNextLevel, nextLevelLabel }: Props) {
  const clamped = Math.min(100, Math.max(0, score))

  const currentTier = [...TIERS].reverse().find((t: TierSegment) => clamped >= t.start) ?? TIERS[0]
  const progressInTier = currentTier.end > currentTier.start
    ? (clamped - currentTier.start) / (currentTier.end - currentTier.start)
    : 0

  return (
    <div>
      {/* ── Segmented bar ── */}
      <div className="relative" style={{ height: 8, display: 'flex', gap: 2, marginBottom: 10 }}>
        {TIERS.map(tier => {
          const width = tier.end - tier.start // proportional to percentile range
          const isPast    = clamped >= tier.end
          const isCurrent = tier.key === currentTier.key
          const isFuture  = clamped < tier.start

          return (
            <div
              key={tier.key}
              style={{
                flex: width,
                height: 8,
                position: 'relative',
                background: isFuture ? '#1F1F1F' : isPast ? tier.color : '#1F1F1F',
                opacity: isPast ? 0.35 : 1,
              }}
            >
              {/* Fill within current tier */}
              {isCurrent && (
                <div
                  style={{
                    position: 'absolute',
                    top: 0, left: 0, bottom: 0,
                    width: `${Math.round(progressInTier * 100)}%`,
                    background: tier.color,
                  }}
                />
              )}
            </div>
          )
        })}

        {/* Position marker — white rect dot at exact score% */}
        <div
          style={{
            position: 'absolute',
            top: -3,
            left: `calc(${clamped}% - 4px)`,
            width: 8,
            height: 14,
            background: '#F5F5F0',
            pointerEvents: 'none',
          }}
        />
      </div>

      {/* ── Tier labels ── */}
      <div style={{ display: 'flex', gap: 2 }}>
        {TIERS.map(tier => {
          const width = tier.end - tier.start
          const isCurrent = tier.key === currentTier.key
          return (
            <div
              key={tier.key}
              style={{ flex: width, textAlign: 'center' }}
            >
              <span
                className="font-mono font-bold uppercase"
                style={{
                  fontSize: 8,
                  letterSpacing: '0.08em',
                  color: isCurrent ? tier.color : '#3D3D3B',
                  display: 'block',
                  lineHeight: 1,
                }}
              >
                {tier.shortLabel}
              </span>
            </div>
          )
        })}
      </div>

      {/* ── Current tier + next level hint ── */}
      <div className="flex items-center justify-between mt-3">
        <div className="flex items-center gap-2">
          <span
            style={{
              display: 'inline-block',
              width: 8,
              height: 8,
              background: currentTier.color,
              flexShrink: 0,
            }}
          />
          <span
            className="font-mono font-bold uppercase tracking-[0.12em]"
            style={{ fontSize: 11, color: currentTier.color }}
          >
            {currentTier.label}
          </span>
        </div>
        {kgToNextLevel != null && nextLevelLabel && (
          <span className="font-mono text-[10px] uppercase tracking-widest text-[#6B6B68]">
            +{kgToNextLevel}kg → {nextLevelLabel}
          </span>
        )}
      </div>
    </div>
  )
}

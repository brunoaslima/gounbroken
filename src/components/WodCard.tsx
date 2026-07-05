import type { BenchmarkWod } from '@/lib/benchmarkWods'

interface Props {
  wod: BenchmarkWod
  className?: string
}

export default function WodCard({ wod, className = '' }: Props) {
  const allSameReps = wod.movements.length > 1 &&
    wod.movements.every(mv => mv.reps === wod.movements[0].reps)

  return (
    <div className={`bg-[#111] border border-[#2A2A2A] px-4 py-3 ${className}`}>
      {/* Type tag */}
      <span
        className="font-mono font-bold uppercase tracking-[0.14em] text-[10px] inline-block mb-2.5 px-2 py-0.5"
        style={{ border: '1px solid #2A2A2A', color: '#A8A8A4' }}
      >
        {wod.description}
      </span>

      {allSameReps ? (
        <>
          <span
            className="font-mono font-bold block mb-1.5"
            style={{ color: '#D4FF3A', fontSize: 20, fontVariantNumeric: 'tabular-nums', letterSpacing: '0.01em' }}
          >
            {wod.movements[0].reps}
          </span>
          <div>
            {wod.movements.map((mv) => (
              <span key={mv.name} className="font-sans text-[14px] font-semibold text-soft-white block leading-tight">
                {mv.name}
              </span>
            ))}
          </div>
        </>
      ) : (
        <div>
          {wod.movements.map((mv) => (
            <div key={`${mv.reps}-${mv.name}`} className="flex items-baseline gap-3 leading-tight">
              <span
                className="font-mono font-bold text-[13px] shrink-0"
                style={{ color: '#D4FF3A', minWidth: 52, fontVariantNumeric: 'tabular-nums' }}
              >
                {mv.reps}
              </span>
              <span className="font-sans text-[14px] font-semibold text-soft-white">
                {mv.name}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

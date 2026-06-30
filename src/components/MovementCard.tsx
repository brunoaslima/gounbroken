import type { Movement } from '@/types'
import { formatDate, formatDateShort } from '@/lib/utils'
import RMBadge from './RMBadge'

interface Props {
  movement: Movement
  prs: Record<number, number>
  primaryRM: number | null
  delta: { delta: number; prevDate: string } | null
  lastRecordedAt: string | null
  onClick: () => void
}

export default function MovementCard({ movement, prs, primaryRM, delta, lastRecordedAt, onClick }: Props) {
  const hasScores = primaryRM !== null
  const currentWeight = primaryRM ? prs[primaryRM] : null

  if (!hasScores) return null

  return (
    <button
      onClick={onClick}
      className="w-full text-left active:scale-[0.98] transition-transform group"
    >
      <div className="relative bg-card rounded-2xl overflow-hidden border border-white/5 group-active:border-lime/20">
        {/* Lime left accent */}
        <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-lime" />

        <div className="flex items-center gap-4 px-4 py-4 pl-5">
          {/* Left: name + meta */}
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-soft-white text-[15px] leading-tight truncate">
              {movement.name}
            </h3>
            <div className="flex items-center gap-2 mt-1.5">
              {primaryRM && <RMBadge reps={primaryRM} active />}
              {lastRecordedAt && (
                <span className="text-[11px] text-muted-gray">{formatDate(lastRecordedAt)}</span>
              )}
            </div>
          </div>

          {/* Right: weight + delta */}
          <div className="text-right shrink-0">
            <div className="text-[28px] font-black text-soft-white leading-none tracking-tight">
              {currentWeight}
              <span className="text-sm font-normal text-muted-gray ml-1">kg</span>
            </div>
            {delta !== null && (
              <div className={`text-xs mt-1 flex items-center justify-end gap-1 ${
                delta.delta > 0 ? 'text-success' : delta.delta < 0 ? 'text-red-400' : 'text-muted-gray'
              }`}>
                <span>{delta.delta > 0 ? '↑' : delta.delta < 0 ? '↓' : '='}</span>
                <span className="font-semibold">{Math.abs(delta.delta)}kg</span>
                <span className="text-muted-gray">vs {formatDateShort(delta.prevDate)}</span>
              </div>
            )}
          </div>

          <svg className="w-4 h-4 text-muted-gray/30 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </div>
      </div>
    </button>
  )
}

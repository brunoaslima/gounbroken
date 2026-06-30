export function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse bg-white/6 rounded-xl ${className}`} />
}

export function SkeletonCard({ lines = 3, className = '' }: { lines?: number; className?: string }) {
  return (
    <div className={`bg-card rounded-2xl border border-white/5 p-4 space-y-3 ${className}`}>
      <Skeleton className="h-4 w-2/3" />
      {Array.from({ length: lines - 1 }).map((_, i) => (
        <Skeleton key={i} className={`h-3 ${i % 2 === 0 ? 'w-full' : 'w-4/5'}`} />
      ))}
    </div>
  )
}

export function SkeletonStatStrip({ cols = 4 }: { cols?: number }) {
  return (
    <div className={`grid gap-2`} style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}>
      {Array.from({ length: cols }).map((_, i) => (
        <div key={i} className="bg-card rounded-2xl border border-white/5 px-2 py-3 flex flex-col items-center gap-2">
          <Skeleton className="h-6 w-8" />
          <Skeleton className="h-2 w-10" />
        </div>
      ))}
    </div>
  )
}

export function SkeletonList({ rows = 4 }: { rows?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: rows }).map((_, i) => (
        <SkeletonCard key={i} lines={3} />
      ))}
    </div>
  )
}

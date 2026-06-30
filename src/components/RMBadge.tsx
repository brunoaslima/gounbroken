interface Props { reps: number; active?: boolean }

export default function RMBadge({ reps, active }: Props) {
  return (
    <span className={`inline-flex items-center text-[11px] font-bold px-2 py-0.5 ${
      active
        ? 'bg-lime/20 text-lime border border-lime/30'
        : 'bg-white/8 text-muted-gray border border-white/10'
    }`}>
      {reps}RM
    </span>
  )
}

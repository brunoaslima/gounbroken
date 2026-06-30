interface Props {
  variant?: 'pr' | 'new-pr'
}

export default function PRBadge({ variant = 'pr' }: Props) {
  if (variant === 'new-pr') {
    return (
      <span className="inline-flex items-center gap-1 bg-success/20 text-success text-[11px] font-bold px-2 py-0.5 border border-success/30">
        NOVO PR
      </span>
    )
  }
  return (
    <span className="inline-flex items-center bg-success/15 text-success text-[11px] font-semibold px-2 py-0.5">
      PR
    </span>
  )
}

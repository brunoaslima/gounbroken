import type { DivisionFormat, DivisionComposition } from '@/types'

const FORMAT_LABELS: Record<DivisionFormat, string> = {
  individual: 'IND',
  pair: 'PAIR',
  team3: 'TEAM 3',
  team4: 'TEAM 4',
}

interface Props {
  format: DivisionFormat
  composition: DivisionComposition
  category: string
  dim?: boolean
}

/**
 * Displays a division badge with the format label, composition, and category.
 *
 * @param format - Division format used to select the badge label.
 * @param composition - Division composition displayed in uppercase.
 * @param category - Category displayed in uppercase.
 * @param dim - Uses the dimmed badge color when set.
 */
export default function DivisionBadge({ format, composition, category, dim }: Props) {
  return (
    <span
      className="font-mono font-bold uppercase"
      style={{
        fontSize: 10,
        letterSpacing: '0.14em',
        color: dim ? '#6B6B68' : '#D4FF3A',
      }}
    >
      {FORMAT_LABELS[format]} · {composition.toUpperCase()} · {category.toUpperCase()}
    </span>
  )
}

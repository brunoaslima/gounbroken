import { useCallback, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { PRESET_MOVEMENTS, PRESET_MOVEMENTS_BY_CATEGORY } from '@/lib/presetMovements'
import type { Movement, MovementCategory, MovementScoreType } from '@/types'

const CATEGORY_SCORE_TYPE: Record<MovementCategory, MovementScoreType> = {
  weightlifting:  'weight',
  gymnastics:     'weight',
  monostructural: 'weight',
  girls:          'time',
  heroes:         'time',
}

/** Alphabetical sort — used everywhere movements are listed */
function sortAlpha(movements: Movement[]): Movement[] {
  return [...movements].sort((a, b) =>
    a.name.localeCompare(b.name, 'pt-BR', { sensitivity: 'base' })
  )
}

// Prevents double-seeding in React StrictMode (double effect invocation)
const seeded = new Set<string>()

export function useMovements(userId: string | undefined) {
  const [movements, setMovements] = useState<Movement[]>([])
  const [loading, setLoading] = useState(true)

  const fetch = useCallback(async () => {
    if (!userId) return
    setLoading(true)

    const { data } = await supabase.from('movements').select('*')

    if (!data || data.length === 0) {
      if (!seeded.has(userId)) {
        seeded.add(userId)
        await seedAllCategories(userId)
      }
      const { data: seededData } = await supabase.from('movements').select('*')
      setMovements(sortAlpha(seededData ?? []))
    } else {
      // Seed any missing preset movements for existing users (all categories)
      if (!seeded.has(userId)) {
        seeded.add(userId)
        const existingNames = new Set(data.map((m: Movement) => m.name))
        const allPresets = Object.entries(PRESET_MOVEMENTS_BY_CATEGORY) as [MovementCategory, string[]][]
        const missingByCategory = allPresets
          .map(([cat, names]) => ({ cat, names: names.filter(n => !existingNames.has(n)) }))
          .filter(({ names }) => names.length > 0)
        if (missingByCategory.length > 0) {
          await Promise.all(missingByCategory.map(({ cat, names }) => seedMovements(userId, names, cat)))
          const { data: updated } = await supabase.from('movements').select('*')
          setMovements(sortAlpha(updated ?? []))
          setLoading(false)
          return
        }
      }
      setMovements(sortAlpha(data))
    }

    setLoading(false)
  }, [userId])

  useEffect(() => { fetch() }, [fetch])

  return { movements, loading, refetch: fetch }
}

async function seedMovements(userId: string, names: string[], category: MovementCategory = 'weightlifting') {
  const score_type = CATEGORY_SCORE_TYPE[category]
  const rows = names.map(name => ({ name, user_id: userId, category, score_type }))
  await supabase.from('movements').upsert(rows, { onConflict: 'user_id,name', ignoreDuplicates: true })
}

async function seedAllCategories(userId: string) {
  const entries = Object.entries(PRESET_MOVEMENTS_BY_CATEGORY) as [MovementCategory, string[]][]
  await Promise.all(entries.map(([cat, names]) => seedMovements(userId, names, cat)))
}


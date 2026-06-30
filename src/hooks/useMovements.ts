import { useCallback, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { PRESET_MOVEMENTS } from '@/lib/presetMovements'
import type { Movement } from '@/types'

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
        await seedMovements(userId, PRESET_MOVEMENTS)
      }
      const { data: seededData } = await supabase.from('movements').select('*')
      setMovements(sortAlpha(seededData ?? []))
    } else {
      // Seed any missing preset movements for existing users
      if (!seeded.has(userId)) {
        seeded.add(userId)
        const existingNames = new Set(data.map((m: Movement) => m.name))
        const missing = PRESET_MOVEMENTS.filter(name => !existingNames.has(name))
        if (missing.length > 0) {
          await seedMovements(userId, missing)
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

async function seedMovements(userId: string, names: string[]) {
  const rows = names.map(name => ({ name, user_id: userId }))
  await supabase.from('movements').upsert(rows, { onConflict: 'user_id,name', ignoreDuplicates: true })
}


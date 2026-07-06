import { useCallback, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { UnbrokenSet } from '@/types'

export interface UnbrokenPR {
  reps: number
  time_seconds: number
  created_at: string
}

export function useUnbrokenSets(userId: string | undefined) {
  const [sets, setSets] = useState<UnbrokenSet[]>([])
  const [loading, setLoading] = useState(true)

  const fetch = useCallback(async () => {
    if (!userId) return
    setLoading(true)
    const { data } = await supabase
      .from('unbroken_sets')
      .select('*')
      .order('created_at', { ascending: false })
    setSets(data ?? [])
    setLoading(false)
  }, [userId])

  useEffect(() => { fetch() }, [fetch])

  /** Returns the set with highest reps for a given movement (PR), or null */
  function getPRForMovement(movementId: string): UnbrokenPR | null {
    const movSets = sets.filter(s => s.movement_id === movementId)
    if (!movSets.length) return null
    return movSets.reduce<UnbrokenSet>((best, s) => s.reps > best.reps ? s : best, movSets[0])
  }

  /** Returns all sets for a movement, newest first */
  function getSetsForMovement(movementId: string): UnbrokenSet[] {
    return sets.filter(s => s.movement_id === movementId)
  }

  async function addSet(movementId: string, reps: number, timeSeconds: number): Promise<{ error: string | null }> {
    const { error } = await supabase
      .from('unbroken_sets')
      .insert({ movement_id: movementId, reps, time_seconds: timeSeconds })
    if (error) return { error: error.message }
    await fetch()
    return { error: null }
  }

  async function deleteSet(setId: string): Promise<{ error: string | null }> {
    const { error } = await supabase.from('unbroken_sets').delete().eq('id', setId)
    if (error) return { error: error.message }
    await fetch()
    return { error: null }
  }

  return { sets, loading, getPRForMovement, getSetsForMovement, addSet, deleteSet, refetch: fetch }
}

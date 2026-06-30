import { useCallback, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { Score } from '@/types'

export function getPR(scores: Score[], movementId: string, reps: number): number | null {
  const matching = scores.filter(s => s.movement_id === movementId && s.reps === reps)
  if (!matching.length) return null
  return Math.max(...matching.map(s => s.weight_kg))
}

export function isNewPR(newWeight: number, currentPR: number | null): boolean {
  return currentPR === null || newWeight > currentPR
}

export function useScores(userId: string | undefined) {
  const [scores, setScores] = useState<Score[]>([])
  const [loading, setLoading] = useState(true)

  const fetch = useCallback(async () => {
    if (!userId) return
    setLoading(true)
    const { data } = await supabase
      .from('scores')
      .select('*')
      .order('recorded_at', { ascending: false })
    setScores(data ?? [])
    setLoading(false)
  }, [userId])

  useEffect(() => { fetch() }, [fetch])

  async function addScore(
    movementId: string,
    reps: number,
    weightKg: number,
    recordedAt: string,
    notes?: string,
  ): Promise<{ score: Score; newPR: boolean }> {
    const currentPR = getPR(scores, movementId, reps)
    const { data, error } = await supabase
      .from('scores')
      .insert({
        user_id: userId,
        movement_id: movementId,
        reps,
        weight_kg: weightKg,
        recorded_at: recordedAt,
        notes: notes || null,
      })
      .select()
      .single()
    if (error) throw error
    setScores(prev => [data, ...prev])
    return { score: data, newPR: isNewPR(weightKg, currentPR) }
  }

  async function deleteScore(id: string) {
    await supabase.from('scores').delete().eq('id', id)
    setScores(prev => prev.filter(s => s.id !== id))
  }

  function getScoresForMovement(movementId: string): Score[] {
    return scores.filter(s => s.movement_id === movementId)
  }

  function getPRsForMovement(movementId: string): Record<number, number> {
    const prs: Record<number, number> = {}
    for (let r = 1; r <= 10; r++) {
      const pr = getPR(scores, movementId, r)
      if (pr !== null) prs[r] = pr
    }
    return prs
  }

  function getLastRecordedAt(movementId: string): string | null {
    const ms = getScoresForMovement(movementId)
    if (!ms.length) return null
    return ms.reduce((latest, s) =>
      s.recorded_at > latest ? s.recorded_at : latest, ms[0].recorded_at)
  }

  // Returns delta kg vs previous entry for same movement+reps, and that entry's date
  function getDelta(movementId: string, reps: number): { delta: number; prevDate: string } | null {
    const sorted = scores
      .filter(s => s.movement_id === movementId && s.reps === reps)
      .sort((a, b) => b.recorded_at.localeCompare(a.recorded_at))
    if (sorted.length < 2) return null
    return {
      delta: sorted[0].weight_kg - sorted[1].weight_kg,
      prevDate: sorted[1].recorded_at,
    }
  }

  // Primary RM to highlight per movement: prefer 1RM, else lowest available
  function getPrimaryRM(movementId: string): number | null {
    const prs = getPRsForMovement(movementId)
    const keys = Object.keys(prs).map(Number).sort((a, b) => a - b)
    if (!keys.length) return null
    return keys.includes(1) ? 1 : keys[0]
  }

  return {
    scores,
    loading,
    addScore,
    deleteScore,
    getScoresForMovement,
    getPRsForMovement,
    getLastRecordedAt,
    getDelta,
    getPrimaryRM,
    refetch: fetch,
  }
}

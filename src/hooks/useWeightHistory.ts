import { useCallback, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { WeightEntry } from '@/types'

export function useWeightHistory(userId: string | undefined) {
  const [history, setHistory] = useState<WeightEntry[]>([])
  const [loading, setLoading] = useState(true)

  const fetch = useCallback(async () => {
    if (!userId) return
    setLoading(true)
    const { data } = await supabase
      .from('weight_history')
      .select('*')
      .eq('user_id', userId)
      .order('recorded_at', { ascending: true })
    setHistory(data ?? [])
    setLoading(false)
  }, [userId])

  useEffect(() => { fetch() }, [fetch])

  return { history, loading, refetch: fetch }
}

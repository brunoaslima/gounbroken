import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { Profile } from '@/types'

export function useAthletes(trainerId: string | undefined) {
  const [athletes, setAthletes] = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)

  async function load() {
    if (!trainerId) { setLoading(false); return }

    const { data: links } = await supabase
      .from('trainer_athletes')
      .select('athlete_id')
      .eq('trainer_id', trainerId)

    if (!links?.length) { setAthletes([]); setLoading(false); return }

    const ids = links.map((r: { athlete_id: string }) => r.athlete_id)
    const { data: profiles } = await supabase
      .from('profiles')
      .select('*')
      .in('user_id', ids)
      .order('name', { ascending: true })

    setAthletes(profiles ?? [])
    setLoading(false)
  }

  useEffect(() => { load() }, [trainerId])

  async function addAthlete(athleteId: string) {
    await supabase
      .from('trainer_athletes')
      .upsert({ trainer_id: trainerId, athlete_id: athleteId }, { onConflict: 'trainer_id,athlete_id' })
    await load()
  }

  async function removeAthlete(athleteId: string) {
    await supabase
      .from('trainer_athletes')
      .delete()
      .eq('trainer_id', trainerId!)
      .eq('athlete_id', athleteId)
    setAthletes(prev => prev.filter(a => a.user_id !== athleteId))
  }

  return { athletes, loading, addAthlete, removeAthlete, reload: load }
}

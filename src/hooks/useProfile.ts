import { useCallback, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { Profile } from '@/types'

export type ExperienceLevel = 'beginner' | 'intermediate' | 'advanced' | 'athlete'
export type MainGoal = 'strength' | 'hypertrophy' | 'crossfit' | 'fat_loss' | 'health' | 'performance'

/**
 * Loads and manages the current user's profile data and related profile actions.
 *
 * @param userId - The current user's identifier.
 * @returns The current profile state, loading state, and profile management helpers.
 */
export function useProfile(userId: string | undefined) {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)

  const fetch = useCallback(async () => {
    if (!userId) return
    setLoading(true)
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle()
    setProfile(data ?? null)
    setLoading(false)
  }, [userId])

  useEffect(() => { fetch() }, [fetch])

  /**
   * Upserts physical + goal profile data.
   * `name` and `username` are optional identity fields — pass them when the
   * profile row may not exist yet (e.g. if signup's profile insert was blocked
   * by RLS due to email confirmation being enabled on the Supabase project).
   */
  async function saveProfile(data: {
    date_of_birth: string
    body_weight_kg: number
    height_cm: number
    gender: 'male' | 'female' | 'other' | 'prefer_not_to_say'
    experience_level?: ExperienceLevel | null
    training_frequency?: number | null
    training_types?: string[] | null
    main_goals?: string[] | null
    body_fat_pct?: number | null
    // Identity fields — required only for the initial profile insert
    name?: string | null
    username?: string | null
  }) {
    if (data.body_weight_kg && profile && data.body_weight_kg !== profile.body_weight_kg) {
      await supabase.from('weight_history').insert({
        user_id: userId,
        weight_kg: data.body_weight_kg,
        recorded_at: new Date().toISOString().split('T')[0],
      })
    }

    const { name, username, ...physicalData } = data
    const payload: Record<string, unknown> = {
      ...physicalData,
      user_id: userId,
      updated_at: new Date().toISOString(),
    }

    // Include identity only when doing a potential initial insert (profile missing)
    if (!profile) {
      if (name  != null) payload.name     = name
      if (username != null) payload.username = username
      payload.roles = ['user']
      payload.onboarding_completed = false
    }

    let result = await supabase.from('profiles').upsert(payload, { onConflict: 'user_id' }).select().single()

    if (result.error) {
      // Fallback: strip optional columns the DB schema might not have yet
      const { experience_level, training_frequency, training_types, main_goals, body_fat_pct, ...base } = payload
      void experience_level; void training_frequency; void training_types; void main_goals; void body_fat_pct
      result = await supabase.from('profiles').upsert(base, { onConflict: 'user_id' }).select().single()
    }

    if (result.error) throw result.error
    setProfile(result.data)
    return result.data
  }

  /**
   * Marks onboarding as complete. Call this from the final onboarding step
   * and from any "skip all" path so users aren't redirected back after login.
   */
  async function completeOnboarding() {
    if (!userId) return
    const { data, error } = await supabase
      .from('profiles')
      .update({ onboarding_completed: true, updated_at: new Date().toISOString() })
      .eq('user_id', userId)
      .select()
      .single()
    if (error) throw error
    setProfile(prev => prev ? { ...prev, onboarding_completed: true } : data)
  }

  async function updateProfile(updates: {
    name?: string
    username?: string
    body_weight_kg?: number
    height_cm?: number
    gender?: 'male' | 'female'
  }) {
    if (updates.body_weight_kg && profile && updates.body_weight_kg !== profile.body_weight_kg) {
      await supabase.from('weight_history').insert({
        user_id: userId,
        weight_kg: updates.body_weight_kg,
        recorded_at: new Date().toISOString().split('T')[0],
      })
    }
    const { data: saved, error } = await supabase
      .from('profiles')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('user_id', userId)
      .select()
      .single()
    if (error) throw error
    setProfile(saved)
    return saved
  }

  function getAge(): number | null {
    if (!profile) return null
    const dob = new Date(profile.date_of_birth)
    const today = new Date()
    let age = today.getFullYear() - dob.getFullYear()
    const m = today.getMonth() - dob.getMonth()
    if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) age--
    return age
  }

  function getBMI(): number | null {
    if (!profile || !profile.height_cm) return null
    const heightM = profile.height_cm / 100
    return Math.round((profile.body_weight_kg / (heightM * heightM)) * 10) / 10
  }

  function getBMILabel(bmi: number): { label: string; color: string } {
    if (bmi < 18.5) return { label: 'Abaixo do peso', color: '#46C2FF' }
    if (bmi < 25)   return { label: 'Peso normal',    color: '#20C997' }
    if (bmi < 30)   return { label: 'Sobrepeso',      color: '#FFB84D' }
    return             { label: 'Obesidade',          color: '#f87171' }
  }

  return { profile, loading, saveProfile, completeOnboarding, updateProfile, getAge, getBMI, getBMILabel, refetch: fetch }
}

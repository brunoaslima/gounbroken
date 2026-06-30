import { useEffect, useState } from 'react'
import type { User } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import { phIdentify, phReset } from '@/lib/posthog'

export function useAuth() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setUser(data.session?.user ?? null)
      setLoading(false)
    })

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      const u = session?.user ?? null
      setUser(u)
      if (u) {
        phIdentify(u.id, {
          name: u.user_metadata?.name as string | undefined,
          username: u.user_metadata?.username as string | undefined,
        })
      } else {
        phReset()
      }
    })

    return () => listener.subscription.unsubscribe()
  }, [])

  async function signIn(emailOrUsername: string, password: string) {
    if (emailOrUsername.includes('@')) {
      const { error } = await supabase.auth.signInWithPassword({ email: emailOrUsername, password })
      if (error) throw error
    } else {
      // Username login: email lookup happens server-side — never exposed to the client
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/login-by-username`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
          },
          body: JSON.stringify({ username: emailOrUsername, password }),
        }
      )
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Invalid username or password')
      const { error } = await supabase.auth.setSession({
        access_token: data.access_token,
        refresh_token: data.refresh_token,
      })
      if (error) throw error
    }
  }

  /**
   * Phase 1 of account creation: creates the auth user and attempts the initial
   * profile row. Never throws if the profile insert fails — the user is
   * authenticated and Onboarding will upsert the full profile.
   *
   * Returns `emailConfirmationRequired: true` when Supabase requires the user to
   * click a confirmation link before they have a session (project setting).
   */
  async function signUpBasic(data: {
    email: string
    password: string
    name: string
    username: string
  }): Promise<{ emailConfirmationRequired: boolean }> {
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: data.email,
      password: data.password,
      options: {
        data: { name: data.name, username: data.username },
        emailRedirectTo: window.location.origin,
      },
    })

    if (authError) {
      // Re-surface auth errors with a clear prefix so Login can show the right message
      if (
        authError.message.toLowerCase().includes('already registered') ||
        authError.message.toLowerCase().includes('already exists')
      ) {
        throw new Error('EMAIL_EXISTS')
      }
      throw authError
    }

    const userId = authData.user?.id
    if (!userId) throw new Error('Failed to create user')

    // When email confirmation is required, there is no session yet.
    // We still try to insert the profile (it may succeed via a SECURITY DEFINER
    // trigger or RPC on the server), but we never block signup on failure.
    const emailConfirmationRequired = !authData.session

    // Best-effort profile row creation.
    // Errors are intentionally swallowed — Onboarding upserts the full profile.
    await supabase.from('profiles').insert({
      user_id: userId,
      name: data.name,
      username: data.username,
      roles: ['user'],
      date_of_birth: '2000-01-01',
      body_weight_kg: 0,
      height_cm: 0,
      gender: 'other',
      onboarding_completed: false,
      updated_at: new Date().toISOString(),
    })

    return { emailConfirmationRequired }
  }

  async function signUpWithProfile(data: {
    email: string
    password: string
    name: string
    username: string
    date_of_birth: string
    body_weight_kg: number
    height_cm: number
    gender: 'male' | 'female' | 'other'
  }): Promise<void> {
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: data.email,
      password: data.password,
    })
    if (authError) throw authError
    const userId = authData.user?.id
    if (!userId) throw new Error('Failed to create user')

    const { error: profileError } = await supabase.from('profiles').insert({
      user_id: userId,
      name: data.name,
      username: data.username,
      date_of_birth: data.date_of_birth,
      body_weight_kg: data.body_weight_kg,
      height_cm: data.height_cm,
      gender: data.gender,
      roles: ['user'],
      onboarding_completed: true,
      updated_at: new Date().toISOString(),
    })
    if (profileError) throw profileError

    await supabase.from('weight_history').insert({
      user_id: userId,
      weight_kg: data.body_weight_kg,
      recorded_at: new Date().toISOString().split('T')[0],
    })
  }

  async function signInWithGoogle() {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin },
    })
    if (error) throw error
  }

  async function signOut() {
    await supabase.auth.signOut()
  }

  return { user, loading, signIn, signUpBasic, signUpWithProfile, signInWithGoogle, signOut }
}

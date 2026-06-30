import posthog from 'posthog-js'

const key  = import.meta.env.VITE_POSTHOG_KEY  as string | undefined
const host = (import.meta.env.VITE_POSTHOG_HOST as string | undefined) ?? 'https://us.i.posthog.com'

export const posthogConfigured = Boolean(key)

export function initPostHog() {
  if (!key) return
  posthog.init(key, {
    api_host: host,
    person_profiles: 'identified_only',
    capture_pageview: true,   // auto page_view on route change
    capture_pageleave: true,
    autocapture: false,       // manual tracking only — precision over noise
  })
}

/** Identify the logged-in user so events are tied to a person. */
export function phIdentify(userId: string, props?: Record<string, unknown>) {
  if (!key) return
  posthog.identify(userId, props)
}

/** Track a named event with optional properties. */
export function phCapture(event: AnalyticsEvent, props?: Record<string, unknown>) {
  if (!key) return
  posthog.capture(event, props)
}

/** Reset identity on sign-out. */
export function phReset() {
  if (!key) return
  posthog.reset()
}

// ── Typed event catalogue ─────────────────────────────────────────────────
export type AnalyticsEvent =
  | 'user_signed_in'
  | 'user_signed_up'
  | 'onboarding_step_completed'
  | 'onboarding_completed'
  | 'onboarding_skipped'
  | 'pr_logged'
  | 'movement_created'
  | 'page_viewed'

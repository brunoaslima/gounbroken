import type { CSSProperties, ReactNode } from 'react'

interface StickyFooterProps {
  children: ReactNode
  className?: string
  style?: CSSProperties
  /**
   * 'in-flow' (default): sticky within the page's own scroll container —
   * respects the parent's overflow, sits just above BottomNav automatically.
   * Use for pages rendered inside TabLayout's normal document flow.
   *
   * 'fixed': position:fixed relative to the viewport, for pages that render
   * as a fullscreen overlay (JudgePanel, Leaderboard, CompetitionCreate,
   * PersonalWorkout). Deliberately covers BottomNav (z-50 > BottomNav's
   * z-30) — that's the existing, intentional convention.
   *
   * Either way the z-index is baked in here so a page can never forget it
   * and get hidden behind BottomNav again.
   */
  variant?: 'in-flow' | 'fixed'
}

export default function StickyFooter({ children, className = '', style, variant = 'in-flow' }: StickyFooterProps) {
  const positionClass = variant === 'fixed' ? 'fixed bottom-0 left-0 right-0 z-50' : 'sticky bottom-0 z-40'
  return (
    <div
      className={`${positionClass} border-t border-[#2A2A2A] bg-[#0A0A0A] ${className}`}
      style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 16px)', ...style }}
    >
      {children}
    </div>
  )
}

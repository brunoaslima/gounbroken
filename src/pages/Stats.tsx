import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { useProfile } from '@/hooks/useProfile'
import { useMovements } from '@/hooks/useMovements'
import { useScores } from '@/hooks/useScores'
import { analyzeStrength, getLevelProgress, hasStrengthStandard } from '@/lib/strengthStandards'
import Drawer from '@/components/Drawer'
import ProfilePanel from '@/components/ProfilePanel'
import { formatDate } from '@/lib/utils'
import { SkeletonCard, SkeletonStatStrip } from '@/components/Skeleton'

export default function Stats() {
  const { user } = useAuth()
  const { profile, loading: loadingProfile, getAge, getBMI, getBMILabel } = useProfile(user?.id)
  const { movements } = useMovements(user?.id)
  const { scores, getPRsForMovement, getScoresForMovement } = useScores(user?.id)
  const navigate = useNavigate()
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [profilePanelOpen, setProfilePanelOpen] = useState(false)

  const loading = loadingProfile

  if (loading) return (
    <div className="min-h-screen bg-graphite pb-24 md:pb-8 safe-top">
      <div className="px-4 pt-6 space-y-4">
        <SkeletonStatStrip cols={3} />
        <SkeletonCard lines={4} />
        <SkeletonCard lines={3} />
        <SkeletonCard lines={5} />
      </div>
    </div>
  )

  if (!profile) return (
    <div className="min-h-screen bg-graphite safe-top">
      <Drawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />
      <div className="flex flex-col items-center justify-center min-h-screen px-6 text-center gap-4">
        <svg className="w-10 h-10 text-muted-gray/40 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
        <h2 className="text-xl font-bold text-soft-white">Incomplete profile</h2>
        <p className="text-muted-gray text-sm">Complete your profile to see personalized analysis</p>
        <button onClick={() => navigate('/onboarding')} className="bg-lime text-graphite font-bold px-6 py-3 rounded-2xl">
          Complete profile
        </button>
      </div>
    </div>
  )

  if (scores.length === 0) return (
    <div className="min-h-screen bg-graphite safe-top">
      <Drawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />
      <ProfilePanel open={profilePanelOpen} onClose={() => setProfilePanelOpen(false)} />
      <div className="px-5 pt-6 pb-4 flex items-center justify-between">
        <button onClick={() => setDrawerOpen(true)} className="w-10 h-10 rounded-xl bg-card border border-white/8 flex items-center justify-center">
          <svg className="w-5 h-5 text-muted-gray" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
        <h1 className="text-base font-bold text-soft-white">Status</h1>
        <button onClick={() => setProfilePanelOpen(true)} className="w-10 h-10 rounded-xl bg-card border border-white/8 flex items-center justify-center">
          <span className="text-soft-white font-bold text-xs">{profile.name?.split(' ')[0]?.[0] ?? '?'}</span>
        </button>
      </div>
      <div className="flex flex-col items-center justify-center px-6 text-center gap-4 py-20">
        <div className="w-20 h-20 bg-lime/10 border border-lime/20 flex items-center justify-center mb-2">
          <svg className="w-10 h-10 text-lime/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
        </div>
        <h2 className="text-xl font-bold text-soft-white">No PRs recorded yet</h2>
        <p className="text-muted-gray text-sm max-w-xs">Record your first PR to start tracking your progress.</p>
        <button onClick={() => navigate('/athlete/add')} className="bg-lime text-graphite font-bold px-8 py-3.5 mt-2 uppercase tracking-widest text-sm">
          + Record PR
        </button>
      </div>
    </div>
  )

  // ── Computations ──────────────────────────────────────────────

  // All scores that are current PRs for their movement+reps
  const allPRScores = scores.filter(s => {
    const prs = getPRsForMovement(s.movement_id)
    return prs[s.reps] === s.weight_kg
  })

  // Last PR recorded
  const lastPRScore = [...allPRScores].sort((a, b) =>
    b.created_at.localeCompare(a.created_at)
  )[0]
  const lastPRMovement = lastPRScore
    ? movements.find(m => m.id === lastPRScore.movement_id)
    : null

  // PRs in last 30 days
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
  const recentPRs = allPRScores.filter(s => new Date(s.recorded_at + 'T00:00:00') >= thirtyDaysAgo)

  // PRs in previous 30 days (for comparison)
  const sixtyDaysAgo = new Date()
  sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60)
  const prevMonthPRs = allPRScores.filter(s => {
    const d = new Date(s.recorded_at + 'T00:00:00')
    return d >= sixtyDaysAgo && d < thirtyDaysAgo
  })

  // Best body weight ratio (1RM)
  let bestRatio: { name: string; ratio: number; weight: number; movementId: string } | null = null
  for (const m of movements) {
    const pr1rm = getPRsForMovement(m.id)[1]
    if (!pr1rm) continue
    const ratio = Math.round((pr1rm / profile.body_weight_kg) * 100) / 100
    if (!bestRatio || ratio > bestRatio.ratio) {
      bestRatio = { name: m.name, ratio, weight: pr1rm, movementId: m.id }
    }
  }

  // Best evolution last 90 days (1RM)
  const ninetyDaysAgo = new Date()
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90)
  let bestEvolution: { name: string; pct: number; from: number; to: number; movementId: string } | null = null
  for (const m of movements) {
    const ms = getScoresForMovement(m.id)
      .filter(s => s.reps === 1)
      .sort((a, b) => a.recorded_at.localeCompare(b.recorded_at))
    if (ms.length < 2) continue
    const inWindow = ms.filter(s => new Date(s.recorded_at + 'T00:00:00') >= ninetyDaysAgo)
    if (inWindow.length < 1) continue
    const before = ms.find(s => new Date(s.recorded_at + 'T00:00:00') < ninetyDaysAgo)
    const base = before ?? ms[0]
    const latest = ms[ms.length - 1]
    if (base === latest) continue
    const pct = Math.round(((latest.weight_kg - base.weight_kg) / base.weight_kg) * 100)
    if (pct > 0 && (!bestEvolution || pct > bestEvolution.pct)) {
      bestEvolution = { name: m.name, pct, from: base.weight_kg, to: latest.weight_kg, movementId: m.id }
    }
  }

  // Strength analyses for movements with 1RM + standard defined
  const strengthAnalyses = movements
    .map(m => {
      const pr1rm = getPRsForMovement(m.id)[1]
      if (!pr1rm || !hasStrengthStandard(m.name)) return null
      const analysis = analyzeStrength(m.name, pr1rm, profile.body_weight_kg, profile.gender)
      if (!analysis) return null
      return { movement: m, analysis, pr1rm }
    })
    .filter(Boolean) as { movement: { id: string; name: string }; analysis: NonNullable<ReturnType<typeof analyzeStrength>>; pr1rm: number }[]

  // Above average movements (intermediate+)
  const aboveAvg = strengthAnalyses.filter(a =>
    ['intermediate', 'advanced', 'elite'].includes(a.analysis.level)
  )

  const bmi = getBMI()
  const bmiInfo = bmi ? getBMILabel(bmi) : null
  const age = getAge()

  // ── Render ────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-graphite pb-24 md:pb-8 safe-top">
      <Drawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />
      <ProfilePanel open={profilePanelOpen} onClose={() => setProfilePanelOpen(false)} />

      <header className="sticky top-0 bg-graphite border-b border-white/5 z-10">
        <div className="px-5 py-4 flex items-center justify-between md:max-w-5xl md:mx-auto">
          <button
            onClick={() => setDrawerOpen(true)}
            className="w-9 h-9 bg-card border border-white/10 flex items-center justify-center text-muted-gray md:hidden"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <h1 className="text-base font-bold text-soft-white font-mono uppercase tracking-[0.14em] text-[12px]">PRs &amp; Insights</h1>
          <button onClick={() => setProfilePanelOpen(true)} className="w-9 h-9 bg-lime/15 flex items-center justify-center md:hidden">
            <span className="text-lime font-bold text-xs">GU</span>
          </button>
        </div>
      </header>

      <div className="px-4 pt-5 space-y-3 md:px-8 md:max-w-5xl md:mx-auto">

        {/* ── Last PR — full width hero card ── */}
        {lastPRScore && lastPRMovement && (
          <button
            onClick={() => navigate(`/athlete/movement/${lastPRMovement.id}`)}
            className="w-full text-left bg-card rounded-2xl overflow-hidden border border-white/5 active:scale-[0.98] transition-transform"
          >
            <div className="h-1 bg-lime w-full" />
            <div className="p-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-[11px] font-bold text-lime uppercase tracking-widest">Last PR</span>
                <span className="text-xs text-muted-gray">{formatDate(lastPRScore.recorded_at)}</span>
              </div>
              <div className="flex items-end justify-between">
                <div>
                  <p className="text-muted-gray text-sm mb-1">{lastPRScore.reps}RM · {lastPRMovement.name}</p>
                  <p className="text-[42px] font-black text-soft-white leading-none tracking-tight">
                    {lastPRScore.weight_kg}
                    <span className="text-xl font-normal text-muted-gray ml-1">kg</span>
                  </p>
                </div>
                <svg className="w-5 h-5 text-muted-gray/40 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </div>
          </button>
        )}

        {/* ── 2-col row: PRs/month + best ratio ── */}
        <div className="grid grid-cols-2 gap-3">

          {/* PRs this month */}
          <div className="bg-card rounded-2xl p-4 border border-white/5">
            <p className="text-[11px] font-bold text-muted-gray uppercase tracking-widest mb-3">Last 30 days</p>
            <p className="text-[36px] font-black text-soft-white leading-none">{recentPRs.length}</p>
            <p className="text-muted-gray text-xs mt-1">PRs beaten</p>
            {prevMonthPRs.length > 0 && (
              <p className={`text-xs mt-2 font-semibold ${recentPRs.length >= prevMonthPRs.length ? 'text-success' : 'text-muted-gray'}`}>
                {recentPRs.length >= prevMonthPRs.length ? '↑' : '↓'} vs previous month
              </p>
            )}
          </div>

          {/* Best body weight ratio */}
          {bestRatio && (
            <button
              onClick={() => navigate(`/athlete/movement/${bestRatio!.movementId}`)}
              className="bg-card rounded-2xl p-4 border border-white/5 text-left active:scale-[0.98] transition-transform"
            >
              <p className="text-[11px] font-bold text-muted-gray uppercase tracking-widest mb-3">Best ratio</p>
              <p className="text-[36px] font-black text-perf-blue leading-none">{bestRatio.ratio}x</p>
              <p className="text-muted-gray text-xs mt-1 truncate">{bestRatio.name}</p>
              <p className="text-muted-gray/60 text-[11px] mt-0.5">of body weight</p>
            </button>
          )}
        </div>

        {/* ── Best evolution ── */}
        {bestEvolution && (
          <button
            onClick={() => navigate(`/athlete/movement/${bestEvolution!.movementId}`)}
            className="w-full text-left bg-card rounded-2xl p-4 border border-white/5 active:scale-[0.98] transition-transform"
          >
            <p className="text-[11px] font-bold text-muted-gray uppercase tracking-widest mb-3">Greatest improvement (90 days)</p>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-soft-white font-bold text-base">{bestEvolution.name}</p>
                <p className="text-muted-gray text-sm mt-0.5">
                  {bestEvolution.from}kg → {bestEvolution.to}kg
                </p>
              </div>
              <div className="text-right">
                <p className="text-3xl font-black text-success">+{bestEvolution.pct}%</p>
                <p className="text-muted-gray/60 text-[11px]">no 1RM</p>
              </div>
            </div>
          </button>
        )}

        {/* ── Personalized comparison ── */}
        {aboveAvg.length > 0 && (
          <div className="bg-card rounded-2xl p-4 border border-white/5">
            <p className="text-[11px] font-bold text-muted-gray uppercase tracking-widest mb-3">
              Above average for your profile
            </p>
            <div className="space-y-2">
              {aboveAvg.slice(0, 3).map(({ movement, analysis }) => (
                <button
                  key={movement.id}
                  onClick={() => navigate(`/athlete/movement/${movement.id}`)}
                  className="w-full flex items-center justify-between py-1.5"
                >
                  <span className="text-soft-white text-sm font-medium">{movement.name}</span>
                  <span
                    className="text-xs font-bold px-2.5 py-0.5"
                    style={{ color: analysis.levelColor, background: analysis.levelColor + '20' }}
                  >
                    {analysis.levelLabel}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ── Profile + BMI ── */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-card rounded-2xl p-4 border border-white/5">
            <p className="text-[11px] font-bold text-muted-gray uppercase tracking-widest mb-3">Seu perfil</p>
            <p className="text-2xl font-black text-soft-white">{age}</p>
            <p className="text-muted-gray text-xs mt-0.5">anos</p>
            <p className="text-soft-white font-semibold text-sm mt-2">{profile.body_weight_kg}kg · {profile.height_cm}cm</p>
          </div>
          {bmi && bmiInfo && (
            <div className="bg-card rounded-2xl p-4 border border-white/5">
              <p className="text-[11px] font-bold text-muted-gray uppercase tracking-widest mb-3">IMC</p>
              <p className="text-2xl font-black text-soft-white">{bmi}</p>
              <span
                className="inline-block text-xs font-bold px-2 py-0.5 mt-2"
                style={{ color: bmiInfo.color, background: bmiInfo.color + '20' }}
              >
                {bmiInfo.label}
              </span>
            </div>
          )}
        </div>

        {/* ── Strength levels ── */}
        {strengthAnalyses.length > 0 && (
          <div className="bg-card rounded-2xl p-4 border border-white/5">
            <p className="text-[11px] font-bold text-muted-gray uppercase tracking-widest mb-4">
              Strength status
            </p>
            <div className="space-y-4">
              {strengthAnalyses.map(({ movement, analysis, pr1rm }) => (
                <button
                  key={movement.id}
                  onClick={() => navigate(`/athlete/movement/${movement.id}`)}
                  className="w-full text-left"
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-soft-white text-sm font-medium">{movement.name}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-muted-gray text-xs">{pr1rm}kg</span>
                      <span
                        className="text-[11px] font-bold px-2 py-0.5"
                        style={{ color: analysis.levelColor, background: analysis.levelColor + '20' }}
                      >
                        {analysis.levelLabel}
                      </span>
                    </div>
                  </div>
                  <div className="h-1.5 bg-white/8 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${getLevelProgress(analysis.level)}%`, background: analysis.levelColor }}
                    />
                  </div>
                  {analysis.kgToNextLevel && (
                    <p className="text-muted-gray/50 text-[11px] mt-1">
                      +{analysis.kgToNextLevel}kg para {
                        analysis.nextLevel === 'novice' ? 'Novato' :
                        analysis.nextLevel === 'intermediate' ? 'Intermediate' :
                        analysis.nextLevel === 'advanced' ? 'Advanced' : 'Elite'
                      }
                    </p>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}

        <p className="text-muted-gray/30 text-[10px] text-center pb-2">
          References: ExRx.net · Symmetric Strength · NSCA
        </p>
      </div>

      {/* FAB */}
      <button
        onClick={() => navigate('/athlete/add')}
        className="fixed bottom-6 right-5 bg-lime w-14 h-14 flex items-center justify-center z-10 active:scale-95 transition-transform"
      >
        <svg className="w-7 h-7 text-graphite" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
        </svg>
      </button>
    </div>
  )
}

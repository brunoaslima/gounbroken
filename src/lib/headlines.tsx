import type { ReactNode } from 'react'

const LIME    = '#D4FF3A'
const BLUE    = '#46C2FF'
const GREEN   = '#20C997'
const ORANGE  = '#FFB84D'

const TIER_COLOR: Record<string, string> = {
  beginner:     BLUE,
  novice:       BLUE,
  intermediate: ORANGE,
  advanced:     GREEN,
  elite:        LIME,
}

const TIER_NEXT: Record<string, string> = {
  beginner:     'Novice',
  novice:       'Intermediate',
  intermediate: 'Advanced',
  advanced:     'Elite',
  elite:        'Elite',
}

function cap(s: string) { return s.charAt(0).toUpperCase() + s.slice(1) }

function ac(content: ReactNode, color: string): ReactNode {
  return <span style={{ color }}>{content}</span>
}

function pick<T>(arr: T[], seed: number): T {
  return arr[((seed % arr.length) + arr.length) % arr.length]
}

export interface HeadlineCtx {
  seed: number
  allAnalyses: Array<{
    movement: { name: string }
    analysis: { score: number; level: string }
    weight: number
    rm: number
  }>
  heroPR: {
    movement: { name: string }
    analysis: { score: number; level: string }
    weight: number
    rm: number
  } | null
  scores: Array<{ recorded_at: string; weight_kg: number | null; reps: number }>
  weekNum: number
  totalVolumeKg: number
  profile: { body_weight_kg: number | null } | null
}

export function pickHeadline(ctx: HeadlineCtx): ReactNode {
  const { allAnalyses, heroPR, scores, weekNum, totalVolumeKg, profile, seed } = ctx

  if (allAnalyses.length === 0) return philosophical(seed)

  const tier       = heroPR?.analysis.level ?? 'beginner'
  const tierColor  = TIER_COLOR[tier] ?? LIME
  const nextTier   = TIER_NEXT[tier] ?? 'Elite'
  const movName    = heroPR?.movement.name ?? ''
  const heroWeight = heroPR?.weight ?? 0
  const pct        = Math.round(100 - (heroPR?.analysis.score ?? 0))
  const scoreInBand = (heroPR?.analysis.score ?? 0) % 20

  const bwr = profile?.body_weight_kg && heroWeight
    ? Math.round((heroWeight / profile.body_weight_kg) * 10) / 10
    : null

  const todayStr = new Date().toISOString().slice(0, 10)
  const prToday  = scores.some(s => s.recorded_at?.startsWith(todayStr))

  const thirtyAgo = new Date(); thirtyAgo.setDate(thirtyAgo.getDate() - 30)
  const prCountMonth = scores.filter(s =>
    new Date(s.recorded_at + 'T00:00:00') >= thirtyAgo
  ).length

  const eliteCount        = allAnalyses.filter(a => a.analysis.level === 'elite').length
  const advancedPlusCount = allAnalyses.filter(a =>
    a.analysis.level === 'advanced' || a.analysis.level === 'elite'
  ).length
  const closeToNext = scoreInBand >= 14 && tier !== 'elite'

  const volT = totalVolumeKg >= 1000
    ? `${(totalVolumeKg / 1000).toFixed(1)}t`
    : `${Math.round(totalVolumeKg)}kg`

  // ── A. PR today (10 variants) ────────────────────────────────────────────
  if (prToday && heroPR) {
    return pick([
      <>New PR on {ac(movName, tierColor)}. {ac(`${heroWeight}kg`, LIME)}.</>,
      <>You just hit {ac(`${heroWeight}kg`, LIME)} on {ac(movName, tierColor)}. That's the job.</>,
      <>{ac(movName, tierColor)}: {ac(`${heroWeight}kg`, LIME)}. Today was a good day.</>,
      <>PR logged. {ac(movName, tierColor)} → {ac(`${heroWeight}kg`, LIME)}. Keep the data clean.</>,
      <>New high on {ac(movName, tierColor)}. {ac(`${heroWeight}kg`, LIME)} recorded.</>,
      <>{ac(`${heroWeight}kg`, LIME)} on {ac(movName, tierColor)}. Week {weekNum} delivers.</>,
      <>PR day. {ac(movName, tierColor)}: {ac(`${heroWeight}kg`, LIME)}.</>,
      <>You lifted more than ever on {ac(movName, tierColor)} today.</>,
      <>{ac(movName, tierColor)} PR. {ac(`${heroWeight}kg`, LIME)}. Numbers don't lie.</>,
      <>Today: {ac(`${heroWeight}kg`, LIME)} on {ac(movName, tierColor)}.</>,
    ], seed)
  }

  // ── B. Close to next tier (8 variants) ──────────────────────────────────
  if (closeToNext && heroPR) {
    return pick([
      <>One strong session from {ac(nextTier, LIME)} on {ac(movName, tierColor)}.</>,
      <>{ac(movName, tierColor)}: {ac(cap(tier), tierColor)} → {ac(nextTier, LIME)} is close.</>,
      <>You're right on the edge of {ac(nextTier, LIME)} on {ac(movName, tierColor)}.</>,
      <>Next tier on {ac(movName, tierColor)} is within reach. Push it.</>,
      <>{ac(nextTier, LIME)} on {ac(movName, tierColor)}. Almost.</>,
      <>You're tracking toward {ac(nextTier, LIME)} on {ac(movName, tierColor)}.</>,
      <>The gap to {ac(nextTier, LIME)} on {ac(movName, tierColor)} is smaller than it looks.</>,
      <>{ac(movName, tierColor)}: almost {ac(nextTier, LIME)}. One session away.</>,
    ], seed + 1)
  }

  // ── C. Multiple PRs this month (8 variants) ──────────────────────────────
  if (prCountMonth >= 3) {
    return pick([
      <>{ac(prCountMonth, LIME)} PRs this month. Momentum is real.</>,
      <>You've hit {ac(prCountMonth, LIME)} new records this month.</>,
      <>{ac(prCountMonth, LIME)} PRs in the last 30 days. This is what building looks like.</>,
      <>{ac(prCountMonth, LIME)} records broken this month. Keep going.</>,
      <>Week {ac(weekNum, LIME)}: {ac(prCountMonth, LIME)} PRs logged.</>,
      <>{ac(prCountMonth, LIME)} movements improved this month. That's progress.</>,
      <>This month: {ac(prCountMonth, LIME)} new bests. The bar keeps moving.</>,
      <>{ac(prCountMonth, LIME)} PRs in 30 days. More than most athletes ever track.</>,
    ], seed + 2)
  }

  // ── D. Elite status (6 variants) ─────────────────────────────────────────
  if (eliteCount >= 1) {
    return pick([
      <>{ac('Elite', LIME)} on {ac(eliteCount, LIME)} {eliteCount === 1 ? 'movement' : 'movements'}. Not many get here.</>,
      <>You've reached {ac('Elite', LIME)} on {ac(movName, LIME)}. That took work.</>,
      <>{ac('Elite', LIME)} on {ac(movName, LIME)}. Top {ac(`${pct}%`, LIME)} globally.</>,
      <>Top {ac(`${pct}%`, LIME)} on {ac(movName, LIME)}. Elite territory.</>,
      <>{ac('Elite', LIME)} athlete. Week {weekNum}. Stay there.</>,
      <>{ac(eliteCount, LIME)} {eliteCount === 1 ? 'movement' : 'movements'} at {ac('Elite', LIME)}. The log confirms it.</>,
    ], seed + 3)
  }

  // ── E. Volume milestone (6 variants) ─────────────────────────────────────
  if (totalVolumeKg >= 5000) {
    return pick([
      <>You've moved {ac(volT, LIME)} this month.</>,
      <>Total volume: {ac(volT, LIME)}. The body notices.</>,
      <>{ac(volT, LIME)} lifted in the last 30 days.</>,
      <>Volume: {ac(volT, LIME)}. Compounding.</>,
      <>{ac(volT, LIME)} this month. The log proves it.</>,
      <>Last 30 days: {ac(volT, LIME)} moved.</>,
    ], seed + 4)
  }

  // ── F. Body weight ratio (10 variants) ───────────────────────────────────
  if (bwr !== null && bwr >= 1.0) {
    return pick([
      <>{ac(movName, tierColor)}: {ac(`${bwr}×`, LIME)} bodyweight.</>,
      <>You're moving {ac(`${bwr}×`, LIME)} your bodyweight on {ac(movName, tierColor)}.</>,
      <>{ac(`${bwr}×`, LIME)} BW on {ac(movName, tierColor)}. {ac(cap(tier), tierColor)} standard.</>,
      <>Body weight ratio on {ac(movName, tierColor)}: {ac(`${bwr}×`, LIME)}.</>,
      <>Relative strength: {ac(`${bwr}×`, LIME)} BW on {ac(movName, tierColor)}.</>,
      <>{ac(movName, tierColor)} at {ac(`${bwr}×`, LIME)} bodyweight. Solid.</>,
      <>Pound-for-pound: {ac(`${bwr}×`, LIME)} on {ac(movName, tierColor)}.</>,
      <>{ac(`${bwr}×`, LIME)} your bodyweight on {ac(movName, tierColor)}. That's {ac(cap(tier), tierColor)}.</>,
      <>Weight-relative strength: {ac(`${bwr}×`, LIME)} on {ac(movName, tierColor)}.</>,
      <>{ac(movName, tierColor)}: {ac(`${bwr}×`, LIME)} BW. Week {weekNum}.</>,
    ], seed + 5)
  }

  // ── G. Advanced spread (6 variants) ──────────────────────────────────────
  if (advancedPlusCount >= 2) {
    return pick([
      <>Advanced on {ac(advancedPlusCount, LIME)} movements. Building the full picture.</>,
      <>You're {ac(cap(tier), tierColor)} on {ac(advancedPlusCount, LIME)} lifts. Rare.</>,
      <>{ac(advancedPlusCount, LIME)} movements at {ac('Advanced', GREEN)} or above.</>,
      <>Solid across {ac(advancedPlusCount, LIME)} movements. Balanced athlete.</>,
      <>{ac(cap(tier), tierColor)} profile. Week {weekNum}.</>,
      <>Cross-movement strength: {ac(advancedPlusCount, LIME)} at {ac('Advanced', GREEN)}+.</>,
    ], seed + 6)
  }

  // ── H. Tier / standing (12 variants) ─────────────────────────────────────
  return pick([
    <>You're in the top {ac(`${pct}%`, tierColor)} on {ac(movName, tierColor)}.</>,
    <>Top {ac(`${pct}%`, tierColor)} on {ac(movName, tierColor)}. That took work.</>,
    <>{ac(cap(tier), tierColor)} on {ac(movName, tierColor)}. Week {weekNum}.</>,
    <>Your best PR puts you in the top {ac(`${pct}%`, tierColor)} globally.</>,
    <>{ac(`${pct}%`, tierColor)} of athletes lift less than you on {ac(movName, tierColor)}.</>,
    <>Top {ac(`${pct}%`, tierColor)} on {ac(movName, tierColor)}. Week {weekNum}.</>,
    <>You've earned {ac(cap(tier), tierColor)} on {ac(movName, tierColor)}.</>,
    <>{ac(cap(tier), tierColor)} athlete. Week {weekNum}.</>,
    <>Global top {ac(`${pct}%`, tierColor)} on {ac(movName, tierColor)}. Verified.</>,
    <>Strength tier: {ac(cap(tier), tierColor)}. Week {weekNum}.</>,
    <>You're in the top {ac(`${pct}%`, tierColor)} of humanity.</>,
    <>{ac(movName, tierColor)}: top {ac(`${pct}%`, tierColor)} globally.</>,
  ], seed + 7)
}

// ── Philosophical fallback (36 variants — no data yet) ─────────────────────
function philosophical(seed: number): ReactNode {
  return pick([
    <>Most people don't track. {ac('You do.', LIME)} That's the edge.</>,
    <>The bar doesn't care about your excuses. {ac('Neither do you.', LIME)}</>,
    <>You showed up. That already puts you {ac('ahead.', LIME)}</>,
    <>Strength is earned. {ac("You're earning it.", LIME)}</>,
    <>Progress is invisible until {ac("it isn't.", LIME)}</>,
    <>Every set is data. {ac("You're collecting.", LIME)}</>,
    <>You don't have to be the strongest. {ac('Just stronger than yesterday.', LIME)}</>,
    <>Consistency is the only cheat code. {ac('You found it.', LIME)}</>,
    <>The only athlete you're racing is {ac("last week's you.", LIME)}</>,
    <>Numbers don't lie. {ac('Yours are moving.', LIME)}</>,
    <>The log is open. {ac('Keep writing.', LIME)}</>,
    <>Effort logged. {ac("That's what matters.", LIME)}</>,
    <>Strong isn't a destination. {ac("It's a direction.", LIME)}</>,
    <>What gets measured {ac('gets improved.', LIME)}</>,
    <>You track because you're serious. {ac('That shows.', LIME)}</>,
    <>PRs don't happen by accident. {ac('Neither do yours.', LIME)}</>,
    <>The data is clear. {ac("You're building something.", LIME)}</>,
    <>Quiet work. {ac('Loud results.', LIME)}</>,
    <>Every rep counted. {ac('The log confirms it.', LIME)}</>,
    <>The bar has no memory. {ac('You do.', LIME)}</>,
    <>Showing up is 80% of the battle. {ac("You're here.", LIME)}</>,
    <>Strength compounds. {ac("You're proof.", LIME)}</>,
    <>The record exists. {ac('Now beat it.', LIME)}</>,
    <>Data first. {ac('Ego later.', LIME)}</>,
    <>You're not just lifting. You're tracking. {ac("That's different.", LIME)}</>,
    <>The numbers tell a story. {ac('Keep writing it.', LIME)}</>,
    <>Hard work is quiet. {ac('Data is loud.', LIME)}</>,
    <>Most people estimate their strength. {ac('You measure it.', LIME)}</>,
    <>You track what others guess. {ac("That's the edge.", LIME)}</>,
    <>Strong today. {ac('Stronger tomorrow.', LIME)}</>,
    <>The numbers are on your side. {ac('Keep adding to them.', LIME)}</>,
    <>Benchmarks exist for a reason. {ac("You're using them.", LIME)}</>,
    <>The average athlete guesses. {ac('You know.', LIME)}</>,
    <>This is how champions train. {ac('One PR at a time.', LIME)}</>,
    <>The scoreboard is internal. {ac("You're winning.", LIME)}</>,
    <>Record it. Improve it. {ac('Repeat.', LIME)}</>,
  ], seed)
}

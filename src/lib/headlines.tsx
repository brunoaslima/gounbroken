import type { ReactNode } from 'react'

const LIME = '#D4FF3A'

function ac(content: ReactNode, color: string): ReactNode {
  return <span style={{ color }}>{content}</span>
}

function pick<T>(arr: T[], seed: number): T {
  return arr[((seed % arr.length) + arr.length) % arr.length]
}

// Real-world weight references — vivid, universally known
const WEIGHT_REFS = [
  { kg: 75,  label: 'a lightweight boxing champion' },
  { kg: 100, label: 'an NFL quarterback' },
  { kg: 130, label: 'an NFL linebacker' },
  { kg: 160, label: 'a professional sumo wrestler' },
  { kg: 180, label: 'an adult male gorilla' },
  { kg: 190, label: 'an adult male lion' },
  { kg: 230, label: 'a grizzly bear' },
  { kg: 300, label: 'a baby grand piano' },
  { kg: 450, label: 'a polar bear' },
  { kg: 480, label: 'a concert grand piano' },
]

function closestRef(kg: number) {
  return WEIGHT_REFS.reduce((best, ref) =>
    Math.abs(ref.kg - kg) < Math.abs(best.kg - kg) ? ref : best
  )
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

  const heroWeight = heroPR?.weight ?? 0
  const bw         = profile?.body_weight_kg ?? null
  const bwr        = bw && heroWeight > 0 ? Math.round((heroWeight / bw) * 10) / 10 : null
  const prCount    = scores.length
  const hasData    = allAnalyses.length > 0
  const eliteCount = allAnalyses.filter(a => a.analysis.level === 'elite').length
  const advCount   = allAnalyses.filter(a =>
    a.analysis.level === 'advanced' || a.analysis.level === 'elite'
  ).length

  const pool: ReactNode[] = []

  // ── Real-world weight comparisons ─────────────────────────────────────────
  if (heroWeight >= 60) {
    const ref = closestRef(heroWeight)
    pool.push(<>{ac(`${heroWeight}kg`, LIME)}. That's {ref.label}.</>)
    pool.push(<>You're lifting {ref.label} off the floor.</>)
    if (heroWeight > ref.kg) {
      pool.push(<>Your PR is heavier than {ref.label}. Just saying.</>)
    }
  }

  // ── Volume comparisons (elephant = ~5,000kg; double-decker bus = ~12,000kg) ─
  if (totalVolumeKg >= 1000) {
    const tStr = `${(totalVolumeKg / 1000).toFixed(1)}t`
    const elephants = Math.floor(totalVolumeKg / 5000)

    if (elephants >= 2) {
      pool.push(<>This month you moved the weight of {ac(elephants, LIME)} elephants.</>)
    } else if (elephants === 1) {
      pool.push(<>This month you moved the weight of {ac('an elephant', LIME)}.</>)
    } else {
      pool.push(<>You've moved {ac(tStr, LIME)} this month. An elephant weighs {ac('5t', LIME)}.</>)
    }

    if (totalVolumeKg >= 12000) {
      pool.push(<>You out-loaded a double-decker bus this month. {ac(tStr, LIME)} total.</>)
    } else if (totalVolumeKg >= 5000) {
      pool.push(<>{ac(tStr, LIME)} this month. A double-decker bus is {ac('12t', LIME)}.</>)
    }
  }

  // ── Bodyweight ratio ──────────────────────────────────────────────────────
  if (bwr !== null) {
    if (bwr >= 2.0) {
      pool.push(<>{ac(`${bwr}×`, LIME)} your own bodyweight. That's Olympic-level territory.</>)
      pool.push(<>Most certified trainers can't lift what you use for warmup.</>)
    } else if (bwr >= 1.5) {
      pool.push(<>{ac(`${bwr}×`, LIME)} bodyweight. The textbook definition of 'advanced'.</>)
      pool.push(<>A {ac('2×', LIME)} bodyweight lift is the advanced standard. You're tracking toward it.</>)
    } else if (bwr >= 1.0) {
      pool.push(<>Most people never lift their own bodyweight once. You do it for reps.</>)
      pool.push(<>Bodyweight ratio: {ac(`${bwr}×`, LIME)}. Most people stop at {ac('1×', LIME)}.</>)
    }
  }

  // ── Training science ──────────────────────────────────────────────────────
  if (hasData) {
    pool.push(<>Elite lifters PR every 8–12 weeks. You're building toward it either way.</>)
    pool.push(<>Strength adapts in 4–6 week cycles. Your log confirms it.</>)
    pool.push(<>Most athletes plateau because they never measure. You do.</>)
    pool.push(<>Olympic weightlifters squat roughly 2.5× their bodyweight. The gap is a direction.</>)
    pool.push(<>Your training age is the most underrated number in the sport. Keep adding to it.</>)
    pool.push(<>The nervous system adapts before the muscles do. The early gains are real.</>)
  }

  // ── Tier observations (framed as curiosity, not score report) ────────────
  if (eliteCount >= 2) {
    pool.push(<>Elite on {ac(eliteCount, LIME)} movements. The top of the table is a small room.</>)
  }
  if (eliteCount >= 1) {
    pool.push(<>Most athletes never reach Elite on a single lift. You have.</>)
  }
  if (advCount >= 3) {
    pool.push(<>Advanced across {ac(advCount, LIME)} movements. That's not beginner luck anymore.</>)
    pool.push(<>You don't have a genuinely weak lift. That's rarer than people think.</>)
  }
  if (advCount >= 1 && eliteCount === 0) {
    pool.push(<>Advanced strength is where most athletes stop. You haven't.</>)
  }

  // ── Week / time perspective ───────────────────────────────────────────────
  pool.push(<>Week {ac(weekNum, LIME)} of the year. Most New Year's resolutions were dead by week 4.</>)
  pool.push(<>Week {ac(weekNum, LIME)}. Still here. Still logging.</>)
  pool.push(<>Week {ac(weekNum, LIME)}. The body keeps the score.</>)

  // ── PR count / consistency ────────────────────────────────────────────────
  if (prCount >= 20) {
    pool.push(<>{ac(prCount, LIME)} PRs in the book. The bar keeps moving.</>)
    pool.push(<>{ac(prCount, LIME)} records. You stopped guessing your strength a long time ago.</>)
  } else if (prCount >= 10) {
    pool.push(<>{ac(prCount, LIME)} PRs logged. That's not luck.</>)
  } else if (prCount >= 5) {
    pool.push(<>{ac(prCount, LIME)} entries. The log is working.</>)
  }

  // ── Dry wit ───────────────────────────────────────────────────────────────
  pool.push(<>A barbell has no opinion of you. {ac("That's what makes it honest.", LIME)}</>)
  pool.push(<>The floor gets a little further away every week.</>)
  pool.push(<>You logged this. {ac("That already puts you ahead of the version that didn't.", LIME)}</>)
  pool.push(<>The numbers don't care if it hurt. {ac("That's kind of the point.", LIME)}</>)
  pool.push(<>Progress is invisible {ac('until the log proves otherwise.', LIME)}</>)
  pool.push(<>Most people estimate their strength. {ac('You measure it.', LIME)}</>)
  pool.push(<>Quiet sessions. {ac('Loud data.', LIME)}</>)
  pool.push(<>The bar was the same weight for everyone. {ac('You moved it anyway.', LIME)}</>)
  pool.push(<>Every rep you've ever done is still in your muscles. {ac('The log just confirms it.', LIME)}</>)
  pool.push(<>Strong is a direction, not a destination. {ac("You're pointing the right way.", LIME)}</>)
  pool.push(<>The gym doesn't remember you. {ac('Your body does.', LIME)}</>)
  pool.push(<>Numbers compound. {ac('So does consistency.', LIME)}</>)
  pool.push(<>You showed up. {ac('The data was waiting.', LIME)}</>)
  pool.push(<>The record exists. {ac('Now beat it.', LIME)}</>)
  pool.push(<>The average athlete guesses. {ac('You know.', LIME)}</>)
  pool.push(<>Hard work is quiet. {ac('Data is loud.', LIME)}</>)
  pool.push(<>Strength compounds. {ac("You're proof.", LIME)}</>)
  pool.push(<>The log is open. {ac('Keep writing.', LIME)}</>)

  // ── No data fallback ──────────────────────────────────────────────────────
  if (!hasData) {
    pool.push(<>The log is open. {ac('Start writing.', LIME)}</>)
    pool.push(<>Every PR starts with the first entry.</>)
    pool.push(<>Track once. {ac('The data builds itself.', LIME)}</>)
  }

  return pick(pool, seed)
}

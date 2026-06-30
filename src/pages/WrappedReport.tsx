import { useEffect, useRef, useState, useMemo } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase'
import type { PrescribedWorkoutData } from '@/types'

// ─── Types ────────────────────────────────────────────────────────────────────

interface AthletePR {
  movement_name: string
  reps: number
  max_weight: number
}

interface SlideConfig {
  bg: string
  fg: string
  render: () => React.ReactNode
}

// ─── Constants ────────────────────────────────────────────────────────────────

const PT_MONTHS = [
  'JANUARY', 'FEBRUARY', 'MARCH', 'APRIL', 'MAY', 'JUNE',
  'JULY', 'AUGUST', 'SEPTEMBER', 'OCTOBER', 'NOVEMBER', 'DECEMBER',
]

const TITLES = [
  { id: 'visit', label: 'VISITOR',    min: 0,  max: 3  },
  { id: 'reg',   label: 'REGULAR',    min: 4,  max: 8  },
  { id: 'ded',   label: 'DEDICATED',  min: 9,  max: 14 },
  { id: 'cons',  label: 'CONSISTENT', min: 15, max: 19 },
  { id: 'inab',  label: 'UNSHAKABLE', min: 20, max: 24 },
  { id: 'maq',   label: 'MACHINE',    min: 25, max: 31 },
]

const FOCUS_MUSCLES_CELLS: Record<string, string[]> = {
  'superior':     ['pec','shl','shr','bcl','bcr','lat','tcl','tcr','trap'],
  'push':         ['pec','shl','shr','tcl','tcr'],
  'empurrar':     ['pec','shl','shr','tcl','tcr'],
  'pull':         ['lat','bcl','bcr','trap','rdl','rdr'],
  'puxar':        ['lat','bcl','bcr','trap','rdl','rdr'],
  'inferior':     ['qul','qur','pal','par','hip','glu','hml','hmr'],
  'squat':        ['qul','qur','pal','par','hip'],
  'agachar':      ['qul','qur','pal','par','hip'],
  'posterior':    ['hml','hmr','glu','lmb'],
  'hip':          ['hml','hmr','glu','hip'],
  'core':         ['abs','lmb'],
  'full':         ['pec','shl','shr','bcl','bcr','lat','tcl','tcr','qul','qur','glu','hml','hmr','abs'],
  'full_body':    ['pec','shl','shr','bcl','bcr','lat','tcl','tcr','qul','qur','glu','hml','hmr','abs'],
  'crossfit':     ['qul','qur','shl','shr','abs','lat','glu'],
  'wod':          ['qul','qur','shl','shr','abs','lat','glu'],
  'cardio':       ['pal','par','abs'],
  'conditioning': ['pal','par','abs'],
  'forca':        ['pec','lat','qul','qur','hml','hmr'],
  'hipertrofia':  ['pec','lat','shl','shr','qul','qur','bcl','bcr','tcl','tcr'],
}

const FOCUS_DISPLAY_LABELS: Record<string, string> = {
  push: 'PUSH', empurrar: 'PUSH',
  pull: 'PULL', puxar: 'PULL',
  inferior: 'LOWER', squat: 'SQUAT', agachar: 'SQUAT',
  posterior: 'POSTERIOR', hip: 'HIP',
  core: 'CORE', cardio: 'CARDIO', conditioning: 'CARDIO',
  superior: 'UPPER',
  full: 'FULL BODY', full_body: 'FULL BODY',
  crossfit: 'CROSSFIT', wod: 'WOD',
  forca: 'STRENGTH',
  hipertrofia: 'HYPERTROPHY',
}

const ALL_CELLS = [
  'pec','shl','shr','bcl','bcr','lat','tcl','tcr','trap',
  'abs','hip','qul','qur','pal','par','lmb','glu','hml','hmr',
  'nape','rdl','rdr',
]

// ─── Computation helpers ──────────────────────────────────────────────────────

function computeVolume(workouts: PrescribedWorkoutData[]): number {
  let total = 0
  for (const w of workouts) {
    for (const s of w.sections) {
      for (const e of s.exercises) {
        if (e.sets && e.reps && e.load_kg) total += e.sets * e.reps * e.load_kg
      }
    }
  }
  return total
}

function computeStreak(workouts: PrescribedWorkoutData[]): number {
  const completed = new Set(
    workouts
      .filter(w => w.feedback?.status === 'completed')
      .map(w => w.workout_date)
  )
  let max = 0, cur = 0, prev: string | null = null
  const sorted = [...completed].sort()
  for (const d of sorted) {
    if (prev) {
      const diff = (new Date(d).getTime() - new Date(prev).getTime()) / 86400000
      if (diff === 1) cur++
      else cur = 1
    } else {
      cur = 1
    }
    if (cur > max) max = cur
    prev = d
  }
  return max
}

// ─── Slide layouts ────────────────────────────────────────────────────────────

const slideBase: React.CSSProperties = {
  position: 'absolute',
  inset: 0,
  display: 'flex',
  flexDirection: 'column',
  padding: '120px 24px 80px',
}

const eyebrowStyle = (accent?: string): React.CSSProperties => ({
  fontFamily: 'JetBrains Mono, monospace',
  fontSize: 11,
  fontWeight: 800,
  letterSpacing: '0.22em',
  textTransform: 'uppercase',
  opacity: 0.7,
  marginBottom: 16,
  color: accent,
})

const footerStyle: React.CSSProperties = {
  marginTop: 'auto',
  display: 'flex',
  justifyContent: 'space-between',
  fontFamily: 'JetBrains Mono, monospace',
  fontSize: 10,
  fontWeight: 700,
  letterSpacing: '0.16em',
  opacity: 0.7,
  textTransform: 'uppercase',
}

// ─── Slide 01 — Intro ─────────────────────────────────────────────────────────

function Slide01({
  monthLabel, year, sessionCount, volume, prsCount, athleteName,
}: {
  monthLabel: string
  year: number
  sessionCount: number
  volume: number
  prsCount: number
  athleteName: string
}) {
  return (
    <div style={slideBase}>
      <p style={eyebrowStyle()}>CF · MONTHLY · {monthLabel} {year}</p>
      <p style={{
        fontFamily: 'JetBrains Mono, monospace',
        fontSize: 96,
        fontWeight: 900,
        lineHeight: 0.9,
        letterSpacing: '-0.04em',
        marginBottom: 20,
        color: '#0A0A0A',
      }}>
        {monthLabel}
      </p>
      <p style={{ fontSize: 18, fontWeight: 600, color: '#0A0A0A', opacity: 0.8, marginBottom: 8 }}>
        {sessionCount} sessions &middot; {(volume / 1000).toFixed(1)} t &middot; {prsCount} PRs
      </p>
      <p style={{ fontSize: 14, color: '#0A0A0A', opacity: 0.65, marginBottom: 32 }}>
        Time to see what that means.
      </p>
      <p style={{
        fontFamily: 'JetBrains Mono, monospace',
        fontSize: 11,
        fontWeight: 800,
        letterSpacing: '0.22em',
        textTransform: 'uppercase',
        opacity: 0.5,
        color: '#0A0A0A',
      }}>
        TAP TO ADVANCE →
      </p>
      <div style={footerStyle}>
        <span>{athleteName}</span>
        <span>{monthLabel} {year}</span>
      </div>
    </div>
  )
}

// ─── Slide 02 — Sessions ──────────────────────────────────────────────────────

function Slide02({
  sessionCount, daysInMonth, firstDow, trainedDays, monthLabel,
}: {
  sessionCount: number
  daysInMonth: number
  firstDow: number
  trainedDays: Set<number>
  monthLabel: string
}) {
  const pct = Math.round((sessionCount / daysInMonth) * 100)

  // Build calendar cells
  const calCells: Array<{ day: number | null; trained: boolean }> = []
  for (let i = 0; i < firstDow; i++) calCells.push({ day: null, trained: false })
  for (let d = 1; d <= daysInMonth; d++) calCells.push({ day: d, trained: trainedDays.has(d) })

  return (
    <div style={slideBase}>
      <p style={eyebrowStyle('#D4FF3A')}>EPISODE 02 · FREQUENCY</p>
      <p style={{
        fontFamily: 'JetBrains Mono, monospace',
        fontSize: 280,
        fontWeight: 900,
        lineHeight: 0.85,
        letterSpacing: '-0.05em',
        color: '#D4FF3A',
        marginBottom: 12,
      }}>
        {sessionCount}
      </p>
      <p style={{ fontSize: 16, fontWeight: 600, color: '#F5F5F0', marginBottom: 20, opacity: 0.85 }}>
        You trained {sessionCount} out of {daysInMonth} days in {monthLabel}.
      </p>

      {/* Mini calendar */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 3, marginBottom: 'auto' }}>
        {calCells.map((c, i) => (
          <div
            key={i}
            style={{
              width: '100%',
              aspectRatio: '1',
              background: c.day === null ? 'transparent' : c.trained ? '#D4FF3A' : 'rgba(255,255,255,0.08)',
            }}
          />
        ))}
      </div>

      <div style={footerStyle}>
        <span>{pct}% OF DAYS · {monthLabel}</span>
        <span>{sessionCount} SESSIONS</span>
      </div>
    </div>
  )
}

// ─── Slide 03 — Volume ────────────────────────────────────────────────────────

function Slide03({ volume, monthLabel }: { volume: number; monthLabel: string }) {
  const tonnes = (volume / 1000).toFixed(1)
  return (
    <div style={slideBase}>
      <p style={eyebrowStyle('#D4FF3A')}>EPISODE 03 · TONNAGE</p>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 16 }}>
        <p style={{
          fontFamily: 'JetBrains Mono, monospace',
          fontSize: 140,
          fontWeight: 900,
          lineHeight: 0.9,
          color: '#D4FF3A',
          letterSpacing: '-0.04em',
        }}>
          {tonnes}
        </p>
        <p style={{
          fontFamily: 'JetBrains Mono, monospace',
          fontSize: 56,
          fontWeight: 900,
          color: '#D4FF3A',
          opacity: 0.7,
        }}>
          t
        </p>
      </div>
      <p style={{ fontSize: 16, fontWeight: 600, color: '#F5F5F0', opacity: 0.85, marginBottom: 24 }}>
        You moved {Math.round(volume).toLocaleString('en-US')} KG of barbell in {monthLabel}.
      </p>

      {/* Decorative tick row */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 'auto' }}>
        {Array.from({ length: 20 }).map((_, i) => (
          <div key={i} style={{ width: 3, height: 24 + (i % 3) * 8, background: 'rgba(212,255,58,0.3)' }} />
        ))}
      </div>

      <div style={footerStyle}>
        <span>{Math.round(volume).toLocaleString('en-US')} KG</span>
        <span>{monthLabel}</span>
      </div>
    </div>
  )
}

// ─── Slide 04 — Comparison ────────────────────────────────────────────────────

interface ComparisonItem { label: string; weightKg: number; note: string }

const COMPARISONS: Record<string, ComparisonItem[]> = {
  animais: [
    { label: 'AFRICAN ELEPHANTS',          weightKg: 5500,  note: 'none of them do leg day and you know it' },
    { label: 'ADULT HIPPOS',               weightKg: 3500,  note: 'more agile than you on the first WOD of the week' },
    { label: 'RODEO BULLS',                weightKg: 600,   note: 'and they have no periodization' },
    { label: 'WHITE RHINOS',               weightKg: 2000,  note: 'no warmup, no excuse' },
    { label: 'GIANT PANDAS',               weightKg: 120,   note: 'they recover with bamboo. you with pizza' },
    { label: 'HUMPBACK WHALES',            weightKg: 30000, note: 'and they don\'t even train' },
    { label: 'ADULT GORILLAS',             weightKg: 200,   note: 'with better deadlift technique than most' },
    { label: 'ADULT LIONS',                weightKg: 190,   note: 'rest 20h a day and are still tier S' },
    { label: 'ADULT HORSES',               weightKg: 500,   note: 'train in the field without a rack and without excuse' },
    { label: 'POLAR BEARS',                weightKg: 500,   note: 'more volume in winter than you in summer' },
    { label: 'ADULT ZEBRAS',               weightKg: 350,   note: 'no straps, no complaints' },
    { label: 'ADULT GIRAFFES',             weightKg: 1000,  note: 'natural neck training, no machine' },
    { label: 'BOTTLENOSE DOLPHINS',        weightKg: 300,   note: 'free range cardio, no treadmill' },
    { label: 'AFRICAN BUFFALOS',           weightKg: 700,   note: '100% grass-fed, zero supplements' },
    { label: 'NILE CROCODILES',            weightKg: 500,   note: '200 million years of consistency' },
    { label: 'ADULT ORCAS',                weightKg: 5000,  note: 'stronger AND smarter. humiliating' },
    { label: 'ADULT CHIMPANZEES',          weightKg: 60,    note: '5× stronger per kg. reconsider your training' },
    { label: 'ADULT MOOSE',                weightKg: 450,   note: 'natural squats. no bar, no excuses' },
    { label: 'BENGAL TIGERS',              weightKg: 260,   note: 'more explosive. better looking. more focused' },
    { label: 'GREAT WHITE SHARKS',         weightKg: 2200,  note: 'zero body fat. zero active rest' },
    { label: 'ADULT PUMAS',                weightKg: 80,    note: 'best strength-to-weight ratio out there' },
    { label: 'ADULT WILD BOARS',           weightKg: 90,    note: 'more determined than you on leg day' },
    { label: 'GIANT TORTOISES',            weightKg: 400,   note: 'tortoise pace. champion endurance' },
    { label: 'AMERICAN BISONS',            weightKg: 900,   note: 'extinction attempted twice. still here' },
    { label: 'ADULT ANACONDAS',            weightKg: 90,    note: 'more efficient squeeze than your bench press' },
    { label: 'ADULT WALRUSES',             weightKg: 1200,  note: 'core stability on another level. no plank' },
    { label: 'ELEPHANT SEALS',             weightKg: 2000,  note: 'bench press volume in water. reflect on that' },
    { label: 'AMAZON CAIMANS',             weightKg: 200,   note: 'more patience than your coach' },
    { label: 'JAGUARS',                    weightKg: 120,   note: 'sprint, kill, repeat. no periodization' },
    { label: 'MOUNTAIN GOATS',             weightKg: 100,   note: 'real unilateral balance. no bosu ball' },
    { label: 'ADULT HYENAS',               weightKg: 60,    note: 'constant laugh even while suffering. inspiring' },
    { label: 'ADULT CAPYBARAS',            weightKg: 65,    note: '90% of the time in water. the vibe you need' },
    { label: 'GIANT ANTEATERS',            weightKg: 45,    note: '35,000 ants per day. more volume than you' },
    { label: 'FLAMINGOS',                  weightKg: 3,     note: 'unilateral stance for hours. have you tried?' },
    { label: 'ARMADILLOS',                 weightKg: 1,     note: 'perfect defense. you quit in 20min' },
    { label: 'GREEN ANACONDAS',            weightKg: 90,    note: '250kg squeeze. consider grip training' },
    { label: 'SPIDER MONKEYS',             weightKg: 10,    note: 'natural calisthenics. ring muscle-up without coaching' },
    { label: 'OCELOTS',                    weightKg: 12,    note: 'quieter than you showing up 20min late' },
    { label: 'GIANT RIVER OTTERS',         weightKg: 25,    note: 'endangered but still more PRs than most' },
    { label: 'MARSH DEER',                 weightKg: 150,   note: 'swim, run, jump. real full body' },
    { label: 'MANED WOLVES',               weightKg: 30,    note: 'elegant coat even without a recovery shake' },
    { label: 'ADULT KOALAS',               weightKg: 12,    note: 'sleep 22h. and you blame overtraining' },
    { label: 'ADULT OSTRICHES',            weightKg: 130,   note: 'sprint at 70km/h. and you call that cardio' },
    { label: 'ADULT FOXES',                weightKg: 7,     note: 'more craft and agility. fewer excuses' },
    { label: 'ADULT ALBATROSSES',          weightKg: 8,     note: '50 years of non-stop flight. your consistency?' },
    { label: 'ADULT DEER',                 weightKg: 150,   note: 'natural sprints. no pre-workout' },
    { label: 'ADULT BABOONS',              weightKg: 35,    note: 'louder than you. more consistent too' },
    { label: 'ADULT WOLVES',               weightKg: 45,    note: 'pack mentality. you train alone with a podcast' },
    { label: 'ADULT MANDRILLS',            weightKg: 35,    note: 'the face of someone who does one set and takes a selfie' },
    { label: 'PIRANHAS',                   weightKg: 0.5,   note: 'alone, harmless. in a group, devastating' },
    { label: 'ADULT PACAS',               weightKg: 12,    note: 'hidden in the wild but more consistent than you' },
    { label: 'SERIEMAS',                   weightKg: 2,     note: 'fastest bipedal sprint in South America' },
    { label: 'ADULT SHEEP',                weightKg: 80,    note: 'more consistent than you in January' },
    { label: 'GIANT RIVER OTTERS',         weightKg: 30,    note: 'natural swim fins. think about it' },
    { label: 'ADULT WOMBATS',              weightKg: 35,    note: 'the animal with most personality per kg' },
    { label: 'GREEN SEA TURTLES',          weightKg: 200,   note: 'cross oceans. you barely reach the fridge' },
    { label: 'ADULT OPOSSUMS',             weightKg: 1,     note: 'play dead. looks like Monday at the gym' },
    { label: 'TUCO-TUCOS',                 weightKg: 0.2,   note: 'dig 1km tunnels. what did you do today?' },
    { label: 'FIDDLER CRABS',              weightKg: 0.03,  note: 'one claw 30× stronger than the other. real imbalance' },
    { label: 'KING VULTURES',              weightKg: 3,     note: 'soar, observe, act. your workout? act first, think later' },
    { label: 'TAYRAS',                     weightKg: 4,     note: 'a weasel and an otter met and this happened. functional' },
    { label: 'CANE TOADS',                 weightKg: 0.3,   note: 'more toxic than it looks. just like your deload' },
    { label: 'ADULT COATIS',               weightKg: 5,     note: 'curious and persistent. you lost those qualities' },
    { label: 'RED HOWLER MONKEYS',         weightKg: 7,     note: 'the loudest call in South America per kg. authentic' },
    { label: 'AMAZONIAN MANATEES',         weightKg: 500,   note: 'vegan, calm, resilient. learn something' },
    { label: 'SPERM WHALES',               weightKg: 50000, note: 'dives 2km without air. no air tank' },
    { label: 'SEA LIONS',                  weightKg: 300,   note: 'flexibility you will never have' },
    { label: 'BLUE WHALES',                weightKg: 150000,note: 'the largest animal on Earth. you barely hit your March PR' },
    { label: 'ADULT LEMURS',               weightKg: 3,     note: 'big eyes from staying up watching shows' },
  ],
  veiculos: [
    { label: '1972 VOLKSWAGEN BEETLES',    weightKg: 840,   note: 'the car, not the nostalgia' },
    { label: 'CITY BUSES',                 weightKg: 12000, note: 'no AC, just like your gym' },
    { label: 'SEMI-TRAILER TRUCKS',        weightKg: 40000, note: 'rolling down the highway at 3am' },
    { label: 'LOWERED VANS',               weightKg: 1200,  note: 'with 8 people and a subwoofer' },
    { label: 'M1 ABRAMS TANKS',            weightKg: 62000, note: 'with less range of motion than you' },
    { label: 'CEMENT MIXER TRUCKS',        weightKg: 12000, note: 'always moving, never stops' },
    { label: 'TOYOTA HILUX',               weightKg: 2000,  note: 'the truck your coach drives' },
    { label: 'JOHN DEERE TRACTORS',        weightKg: 7500,  note: 'functional, no fuss' },
    { label: '250CC TRAIL BIKES',          weightKg: 130,   note: 'more agile. fewer excuses' },
    { label: 'MOVING VANS',                weightKg: 3500,  note: 'carried more heavy things than you' },
    { label: 'RESCUE HELICOPTERS',         weightKg: 5000,  note: 'shows up when you need it most' },
    { label: 'METRO TRAIN CARS',           weightKg: 45000, note: 'same schedule every day. you could learn' },
    { label: 'HYDRAULIC EXCAVATORS',       weightKg: 20000, note: 'work volume with zero complaints' },
    { label: 'MOUNTAIN BIKES',             weightKg: 12,    note: 'lighter than your excuse not to show up' },
    { label: 'YELLOW SCHOOL BUSES',        weightKg: 14000, note: 'transports the future every day. you?' },
    { label: 'ARMORED BANK TRUCKS',        weightKg: 15000, note: 'moves forward with full protection' },
    { label: 'HUMMER H1S',                 weightKg: 4600,  note: 'overkill but delivers. you?' },
    { label: 'PICKUP TRUCKS',              weightKg: 1100,  note: 'works harder than it looks' },
    { label: 'FISHING BOATS',              weightKg: 30000, note: 'wakes up at 4am with no pre-workout' },
    { label: 'BACKHOE LOADERS',            weightKg: 8000,  note: 'digs deep without complaining' },
    { label: 'AMBULANCES',                 weightKg: 3500,  note: 'always available when it matters most' },
    { label: 'GARBAGE TRUCKS',             weightKg: 15000, note: 'picks up what others left behind. life philosophy' },
    { label: 'POLARIS ATVS',               weightKg: 600,   note: 'all terrain, no excuse' },
    { label: 'FORMULA 1 CARS',             weightKg: 800,   note: 'everything sacrificed for performance' },
    { label: 'MOTOR GRADERS',              weightKg: 14000, note: 'levels the terrain. do you level your diet?' },
    { label: 'HORSE-DRAWN CARTS',          weightKg: 400,   note: '3,000 years of technology. still works' },
    { label: 'MINI COOPERS',               weightKg: 1150,  note: 'small, fast, goes where an SUV can\'t' },
    { label: 'EMPTY BOEING 737S',          weightKg: 80000, note: 'you\'d be the heaviest check-in in history' },
    { label: 'ITALIAN VESPAS',             weightKg: 130,   note: 'style and functionality. which did you choose?' },
    { label: 'MILITARY INFLATABLE BOATS',  weightKg: 250,   note: 'light, tough. like your core should be' },
    { label: 'RACING KARTS',               weightKg: 160,   note: 'zero comfort, 100% performance. philosophy' },
    { label: 'TRACKED BULLDOZERS',         weightKg: 20000, note: 'advances even in mud' },
    { label: 'WATER TANKER TRUCKS',        weightKg: 8000,  note: 'reaches where nobody goes. delivers what\'s needed' },
    { label: 'AMERICAN 4X4 PICKUPS',       weightKg: 2700,  note: 'overbuilt for any terrain' },
    { label: 'ADULT JET SKIS',             weightKg: 350,   note: 'more fun. less training. reflect on that' },
    { label: 'ELECTRIC SCOOTERS',          weightKg: 100,   note: 'quiet, efficient, no drama' },
    { label: 'NUCLEAR SUBMARINES',         weightKg: 8000000, note: 'years underwater. and you complain about 45min' },
    { label: 'CROP DUSTING PLANES',        weightKg: 1000,  note: 'low, fast, precise. the ideal workout' },
    { label: 'GARBAGE COMPACTORS',         weightKg: 15000, note: 'compresses everything into less volume. your excuses too' },
    { label: 'DIESEL LOCOMOTIVES',         weightKg: 180000,note: '18 wagons and you say you\'re tired' },
    { label: 'POPCORN CARTS',              weightKg: 80,    note: 'small business. big consistency. learn from it' },
    { label: 'CABLE CAR CABINS',           weightKg: 3000,  note: 'high altitude, no drama' },
    { label: 'ELECTRIC CARGO BIKES',       weightKg: 60,    note: 'more work, less noise' },
    { label: 'ELECTRIC SCOOTERS',          weightKg: 20,    note: 'present for delivery. absent on leg day' },
    { label: 'AGRICULTURAL DRONES',        weightKg: 15,    note: 'more high-tech than your supplement' },
    { label: 'ELECTRIC VANS',              weightKg: 2200,  note: 'quiet and consistent. like your training should be' },
    { label: 'PRESIDENTIAL LIMOS',         weightKg: 9000,  note: 'long, heavy, strict protocol' },
    { label: 'MOBILE CRANES',              weightKg: 130000,note: 'lifts what nobody else can. inspiration' },
    { label: 'MINI EXCAVATORS',            weightKg: 3000,  note: 'more compact, same result' },
    { label: 'SLEEPER TOUR BUSES',         weightKg: 17000, note: 'sleeps on the job. you during the EMOM' },
    { label: 'MOTORIZED ALUMINUM BOATS',   weightKg: 450,   note: 'downstream without stopping' },
    { label: 'AIRCRAFT CARRIERS',          weightKg: 100000000, note: 'impossible? you said the same about 100kg' },
    { label: 'TANKER TRUCKS',              weightKg: 22000, note: 'carries what you don\'t want to know about' },
    { label: 'MINIBUSES',                  weightKg: 5000,  note: 'half the size, same efficiency' },
    { label: 'SAND BUGGY DUNE BUGGIES',   weightKg: 700,   note: 'born for adverse conditions. you?'},
    { label: 'FERRARI 488S',               weightKg: 1470,  note: 'faster but you go further' },
    { label: 'MOTORIZED TRIKES',           weightKg: 400,   note: 'small but never stops' },
    { label: 'RESCUE WATER BIKES',         weightKg: 400,   note: 'first on scene. no waiting for a signal' },
    { label: 'ROAD GRADERS',               weightKg: 16000, note: 'works to level. you work to excuse' },
    { label: 'MILITARY BINOCULARS',        weightKg: 2,     note: 'sees far but you\'re right in front of the PR' },
    { label: 'CEREMONIAL SWORDS',          weightKg: 1,     note: 'forged for the occasion. you\'re forged in training' },
    { label: 'POLARIS SIDE-BY-SIDES',      weightKg: 700,   note: 'two seats, training duo' },
    { label: 'F-18 FIGHTER JETS',          weightKg: 14500, note: 'faster than your rest between sets' },
    { label: 'COMPETITION KAYAKS',         weightKg: 18,    note: 'efficient glide. zero wasted energy' },
    { label: 'ROWING EIGHTS',              weightKg: 100,   note: 'synchrony of 8 people. you barely sync your alarm' },
    { label: 'SUP BOARDS',                 weightKg: 13,    note: 'real core stability. on the water, not in a studio' },
    { label: 'ENDURO MOTORCYCLES',         weightKg: 110,   note: 'light enough to fly. heavy enough to hurt' },
    { label: 'LEVEL 3 BALLISTIC VESTS',    weightKg: 7,     note: 'protection for those going to battle. you went' },
    { label: 'MILITARY RUCKSACKS',         weightKg: 40,    note: '20km without complaining. you on a 3km hike' },
    { label: 'MOTORCYCLE HELMETS',         weightKg: 1,     note: 'protection you should give your knees' },
  ],
  comida: [
    { label: 'BIG MACS',                   weightKg: 0.2,   note: 'the cut will have to wait' },
    { label: 'SIRLOIN STEAKS',             weightKg: 1.5,   note: 'enough for the box BBQ' },
    { label: 'WHEY PROTEIN TUBS',          weightKg: 5,     note: 'that you promised would be the last one' },
    { label: 'BAKERY CHICKEN CROQUETTES',  weightKg: 0.15,  note: 'ancestral Brazilian pre-workout' },
    { label: 'FAMILY PIZZAS',              weightKg: 0.8,   note: 'that Sunday one that ruins the week' },
    { label: 'PEANUT BUTTER JARS',         weightKg: 0.5,   note: 'macros don\'t add up but you keep trying' },
    { label: '5KG RICE BAGS',              weightKg: 5,     note: 'the base of every real nutritional pyramid' },
    { label: 'DOZEN EGGS',                 weightKg: 0.72,  note: 'how fast do you actually eat these?' },
    { label: '70% DARK CHOCOLATE BARS',    weightKg: 0.1,   note: 'emotional cheat meal at 11pm' },
    { label: 'ROASTED CHICKENS',           weightKg: 1.2,   note: 'Sunday meal prep. every Sunday' },
    { label: 'PASTA PACKETS',              weightKg: 0.5,   note: 'carbs from the heart' },
    { label: 'WHOLE WATERMELONS',          weightKg: 8,     note: '92% water. like your commitment' },
    { label: 'RIPE AVOCADOS',              weightKg: 0.2,   note: 'healthy fat at $3 each' },
    { label: 'GROCERY BASKETS',            weightKg: 25,    note: 'the nutritional minimum. you went beyond' },
    { label: 'CANNED TUNA',                weightKg: 0.17,  note: 'the snack of those with no time to complain' },
    { label: 'CHICKEN BREAST TRAYS',       weightKg: 2,     note: 'the food that defines character' },
    { label: 'BANANA BUNCHES',             weightKg: 0.8,   note: '$1 pre-workout better than any supplement' },
    { label: 'GREEK YOGURT CUPS',          weightKg: 0.5,   note: 'protein + laziness = balance' },
    { label: 'OATMEAL PACKETS (1KG)',       weightKg: 1,     note: 'breakfast for those who want real results' },
    { label: '20L WATER JUGS',             weightKg: 20,    note: 'hydration you promised to prioritize' },
    { label: 'SALMON FILLETS',             weightKg: 0.3,   note: 'omega-3 for those who respect themselves' },
    { label: 'CANNED BEANS',               weightKg: 0.56,  note: 'neglected plant protein' },
    { label: 'SWEET POTATOES (1KG)',        weightKg: 1,     note: 'the noble carb of the fitness diet' },
    { label: 'WHOLE MILK CARTONS',         weightKg: 1,     note: 'gainz no questions asked' },
    { label: 'PROTEIN BARS',               weightKg: 0.07,  note: '15g of protein + 30g of hope' },
    { label: 'LITERS OF PRE-WORKOUT',      weightKg: 1.5,   note: 'that makes you run on the sidewalk for no reason' },
    { label: 'ACAI BOWLS WITH GRANOLA',    weightKg: 0.5,   note: 'Instagram workout after a real workout' },
    { label: 'CASHEW BUTTER JARS',         weightKg: 0.35,  note: 'more expensive than your gym membership' },
    { label: 'FITNESS CHICKEN MINI PIES',  weightKg: 0.12,  note: 'meal prep for those with a future' },
    { label: 'MIXED NUTS TUBS',            weightKg: 0.15,  note: 'healthy fat that disappears in 10 min' },
    { label: 'ORGANIC KIWIS',              weightKg: 0.1,   note: 'vitamin C you discovered last week' },
    { label: 'WHOLE BROCCOLIS',            weightKg: 0.35,  note: 'the vegetable judging you from the fridge' },
    { label: 'WHOLE CUCUMBERS',            weightKg: 0.3,   note: '95% water. like your Monday diet' },
    { label: 'QUAIL EGG DOZENS',           weightKg: 0.15,  note: 'elite protein in a small package' },
    { label: 'LITERS OF KEFIR',            weightKg: 1,     note: 'happy microbiome = real performance' },
    { label: 'COLD PRESS JUICE BOTTLES',   weightKg: 0.75,  note: '$8 for 200ml. your macros approve' },
    { label: 'CHIA SEEDS (200G)',           weightKg: 0.2,   note: 'more omega-3 per kg than you think' },
    { label: 'ORGANIC CARROTS',            weightKg: 0.2,   note: 'free beta-carotene. you prefer supplements' },
    { label: 'SARDINE CANS',               weightKg: 0.12,  note: 'the no-nonsense athlete\'s food' },
    { label: 'BUTTER BLOCKS',              weightKg: 0.25,  note: 'dense calories for those unafraid' },
    { label: 'WHOLE PUMPKINS',             weightKg: 2,     note: 'more versatile than your training spreadsheet' },
    { label: 'COTTAGE CHEESE TUBS',        weightKg: 0.5,   note: 'late night snack for a heavy conscience' },
    { label: 'QUINOA PACKETS',             weightKg: 0.4,   note: 'complete protein. you don\'t eat it. why?' },
    { label: 'LIGHT CREAM CHEESE TUBS',    weightKg: 0.25,  note: 'light until you see the sodium' },
    { label: 'PAPAYAS',                    weightKg: 0.8,   note: 'digestion guaranteed. PR guaranteed? different' },
    { label: 'COOKED YAMS',                weightKg: 0.5,   note: 'more anti-inflammatory than your ego' },
    { label: 'WHOLE SHRIMP (1KG)',          weightKg: 1,     note: 'premium protein you skip during competition week' },
    { label: 'PROTEIN CHOCOLATE TRUFFLES', weightKg: 0.05,  note: 'guilt that costs $5' },
    { label: 'KIMCHI JARS',                weightKg: 0.35,  note: 'fermented food your coach recommended but you never bought' },
    { label: 'ARTISAN GRANOLA BAGS',       weightKg: 0.35,  note: 'more caloric than pizza. did you know?' },
    { label: 'CEREAL BARS',                weightKg: 0.03,  note: '80 calories of hope and nothing more' },
    { label: 'COOKED CORN EARS',           weightKg: 0.3,   note: 'countryside carbs, no drama' },
    { label: 'KILOS OF CHICKPEAS',         weightKg: 1,     note: 'the hummus base for those who track macros' },
    { label: 'GHEE BUTTER JARS',           weightKg: 0.4,   note: 'ancestral fat the carnivore mentioned on the podcast' },
    { label: 'DATE BUNCHES',               weightKg: 0.5,   note: 'natural sugar for those who deny sugar' },
    { label: 'PEANUT BUTTER WHEY JARS',    weightKg: 0.5,   note: 'the product the influencer sells' },
    { label: 'LITERS OF OAT MILK',         weightKg: 1,     note: 'vegan alternative for those who take it seriously' },
    { label: 'FRESH FIGS',                 weightKg: 0.08,  note: 'sophisticated fruit to compensate for basic training' },
    { label: 'BABY FOOD POUCHES',          weightKg: 0.12,  note: 'easy digestion. easy ego to swallow' },
    { label: 'BAKED YAM STICKS',           weightKg: 0.2,   note: 'the snack you post but don\'t eat' },
    { label: 'RED BELL PEPPERS',           weightKg: 0.2,   note: 'more vitamin C than oranges and nobody counts' },
    { label: 'COTTAGE TURMERIC TUBS',      weightKg: 0.35,  note: 'anti-inflammatory for a guilty conscience' },
    { label: 'CAST IRON SKILLETS',         weightKg: 3,     note: 'takes long to heat up. cooks much better. like training' },
    { label: 'AGED SPIRITS',               weightKg: 1.2,   note: 'complexity that time gives. same for training' },
    { label: 'CANNED PEAS',                weightKg: 0.3,   note: 'the forgotten vegetable that shows up in soup' },
    { label: 'LITERS OF PROTEIN SUPPLEMENT', weightKg: 1.5, note: 'investment you make before proper sleep' },
    { label: 'PURE ACAI TUBS (500G)',       weightKg: 0.5,   note: 'no guarana, no granola, no lies' },
    { label: 'RAW CARROT BUNCHES',         weightKg: 0.5,   note: '$0.50 snack nobody eats but should' },
    { label: 'BLENDED WHEY CUPS',          weightKg: 0.4,   note: 'already had it before feeling hungry. standard' },
  ],
  existencial: [
    { label: 'EMOTIONALLY HEAVY EX-PARTNERS', weightKg: 142, note: 'estimated weight in therapy' },
    { label: 'FAMILY AT SUNDAY LUNCH',     weightKg: 75,    note: 'ego included' },
    { label: 'MONDAY PROMISES',            weightKg: 0.001, note: 'but the accumulation weighs something' },
    { label: 'ABANDONED TRAINING SPREADSHEETS', weightKg: 0.005, note: 'carbon and guilt' },
    { label: 'INSTAGRAM COACHES',          weightKg: 80,    note: 'the weight of unsolicited advice' },
    { label: 'LIFE COACHES',               weightKg: 78,    note: 'same as above, more expensive' },
    { label: '"MOTIVATION" POSTS SAVED UNREAD', weightKg: 0.0001, note: 'immeasurable digital weight' },
    { label: 'IGNORED DIET PLANS',         weightKg: 0.002, note: 'laser-printed for $5' },
    { label: 'SKIPPED WORKOUTS WITH GOOD EXCUSES', weightKg: 0.0003, note: 'heavy psychological load' },
    { label: 'NEW YEAR RESOLUTIONS',       weightKg: 0.001, note: 'peak in January. zero by March' },
    { label: 'GYM EGOS',                   weightKg: 85,    note: 'heavier than the owner\'s back squat' },
    { label: 'UNSOLICITED FORM OPINIONS',  weightKg: 0.0001, note: 'but you listened anyway' },
    { label: 'NETFLIX SHOWS THAT RUINED SLEEP', weightKg: 0.0001, note: 'heavier than recovery' },
    { label: 'SNOOZED ALARMS FOR EARLY TRAINING', weightKg: 0.00001, note: 'countless and with no declared weight' },
    { label: 'GLASSES OF WATER YOU PROMISED TO DRINK', weightKg: 0.25, note: 'but forgot in the car' },
    { label: 'STRETCHING REMINDERS',       weightKg: 0.00001, note: 'notification ignored for 3 weeks' },
    { label: 'FRIENDS WHO WERE GOING TO TRAIN WITH YOU', weightKg: 75, note: 'disappeared in February' },
    { label: 'GYM MONTHS PAID WITHOUT GOING', weightKg: 0.0001, note: 'the biggest fitness sunk cost' },
    { label: 'WEIGHTS YOU "WERE ABOUT TO HIT"', weightKg: 0.00001, note: 'exactly 8 months ago' },
    { label: 'DAYS YOU SAID "DIET STARTS TOMORROW"', weightKg: 0.00001, note: 'countless' },
    { label: 'PROGRESS PHOTOS YOU NEVER TOOK', weightKg: 0.00001, note: 'mild but real regret' },
    { label: 'GOOD NIGHTS SLEEP YOU SACRIFICED', weightKg: 0.0001, note: 'accumulated debt' },
    { label: 'COPIED WORKOUT LISTS',       weightKg: 0.00001, note: 'still in your notes from last year' },
    { label: 'MOTIVATION WHATSAPP GROUPS', weightKg: 0.0001, note: '90% memes, 10% training' },
    { label: 'WORKOUT STORIES YOU POSTED', weightKg: 0.00001, note: 'more views than your PRs' },
    { label: 'FEAR OF LOOKING WEAK AT THE BOX', weightKg: 0.0001, note: 'nobody is watching, you know it' },
    { label: 'COMPARISONS WITH THE ATHLETE NEXT TO YOU', weightKg: 0.0001, note: 'they\'re also looking at you' },
    { label: 'GYM SHOES YOU BOUGHT',       weightKg: 0.5,   note: 'and didn\'t need' },
    { label: 'WORKOUT CLOTHES YOU DON\'T WEAR', weightKg: 0.3, note: 'but they were on sale' },
    { label: 'HAND STRAPS YOU HAVE AT HOME', weightKg: 0.15, note: 'but never take with you' },
    { label: 'WORKOUT APPS DOWNLOADED',    weightKg: 0.0001, note: 'half uninstalled the same day' },
    { label: 'FITNESS ACCOUNTS THAT MADE YOU INSECURE', weightKg: 0.0001, note: 'the cost of the algorithm' },
    { label: 'BEFORE AND AFTER PHOTOS YOU SAVED', weightKg: 0.00001, note: 'still in the hidden folder' },
    { label: 'CREATIVE EXCUSES FOR YOUR COACH', weightKg: 0.0001, note: 'more creative than the workout' },
    { label: 'HOLIDAYS YOU "DESERVED" TO REST', weightKg: 0.0001, note: 'all 12 of the year' },
    { label: 'MENUS ANALYZED BY MACROS',   weightKg: 0.0001, note: 'and you ordered the burger anyway' },
    { label: 'WORKOUTS PLANNED BUT NOT DONE', weightKg: 0.0001, note: 'the worst PR of the month' },
    { label: 'HOURS STARING AT THE GYM MIRROR', weightKg: 0.0001, note: 'doesn\'t count as training' },
    { label: 'GYM BATHROOM SELFIES',       weightKg: 0.0001, note: 'the most honest photo of the month' },
    { label: 'PRODUCTIVITY PODCASTS LISTENED WHILE TRAINING', weightKg: 0.0001, note: 'irony uncounted' },
    { label: 'KNEES WRAPPED EVERY OTHER WEEK', weightKg: 0.5, note: 'technology or psychology?' },
    { label: 'WORKOUT PLAYLISTS BUILT',    weightKg: 0.00001, note: '80% good. you know which part isn\'t' },
    { label: 'DIET TALK WITH PEOPLE WHO DIDN\'T ASK', weightKg: 0.0001, note: 'the social cost of discipline' },
    { label: 'BIKES BOUGHT TO "USE EVERY DAY"', weightKg: 12, note: 'went 3 times. stopped on day three' },
    { label: 'MOBILITY WORKOUTS YOU SKIPPED', weightKg: 0.0001, note: 'the price is coming' },
    { label: 'CREATINE CAPSULES BOUGHT BY HYPE', weightKg: 0.003, note: 'but it works. that\'s the drama' },
    { label: 'HOURS RESEARCHING THE PERFECT WORKOUT', weightKg: 0.0001, note: 'vs hours doing any workout' },
    { label: 'EXPIRED PRE-WORKOUTS',       weightKg: 0.3,   note: 'compromised potency. character too' },
    { label: 'BACK BELTS BOUGHT "FOR PROTECTION"', weightKg: 0.6, note: 'and never used. muscular irony' },
    { label: 'GYM COMPRESSION SOCKS',      weightKg: 0.1,   note: 'does it work? ask the mirror' },
    { label: 'TRIPS THAT BROKE THE STREAK', weightKg: 0.0001, note: 'or the streak that broke the trip' },
    { label: 'CROSSFIT LIVES WATCHED WITH ENVY', weightKg: 0.00001, note: 'but real motivation' },
    { label: 'HEALTHY FOOD PHOTOS THAT WEREN\'T', weightKg: 0.0001, note: 'we know' },
    { label: 'PERIODIZATION DEBATES ONLINE', weightKg: 0.0001, note: 'time you could have been training' },
    { label: 'COMPARISONS BETWEEN COACHES', weightKg: 0.0001, note: 'your coach doesn\'t see it, but you remember' },
    { label: 'MISCALIBRATED PAIN SCALES',  weightKg: 0.0001, note: 'everything is "8" for you. always' },
    { label: 'CROSSFIT CAR STICKERS',      weightKg: 0.05,  note: 'identity for $3' },
    { label: 'DEC 31 AT 11:59PM RESOLUTIONS', weightKg: 0.0001, note: 'you know how it ends' },
    { label: 'UNREAD FITNESS READING LISTS', weightKg: 0.00001, note: 'but you have the app' },
    { label: 'TECHNIQUE VIDEOS WATCHED BUT NOT APPLIED', weightKg: 0.00001, note: 'theory: 10/10. practice: 4/10' },
    { label: 'NUTRITION APPOINTMENTS BOOKED', weightKg: 0.00001, note: 'and never attended' },
    { label: 'POST-BBQ WEIGH-INS',         weightKg: 0.00001, note: 'real number, creative interpretation' },
    { label: 'PAPER WORKOUT NOTES YOU LOST', weightKg: 0.002, note: 'soul data lost' },
    { label: 'DELOADS CALLED TOO EARLY',   weightKg: 0.0001, note: 'fatigue vs laziness: hard distinction' },
    { label: 'PROTEIN SHAKES TAKEN OUT OF OBLIGATION', weightKg: 0.35, note: 'you weren\'t pretending to like it. everyone knew' },
    { label: 'RELATIONSHIPS AFFECTED BY TRAINING SCHEDULE', weightKg: 0.0001, note: 'worth it. or not. depends on the PR' },
    { label: 'SUPPLEMENTS IN THE DRAWER UNUSED', weightKg: 0.3, note: '$50 of crystallized hope' },
    { label: 'WEEKS YOU SAID "I\'LL DOUBLE VOLUME"', weightKg: 0.0001, note: 'and doubled it for 2 days' },
    { label: 'COMPARISONS WITH YOURSELF 2 YEARS AGO', weightKg: 0.0001, note: 'that\'s the right comparison. make it' },
  ],
  global: [
    // space
    { label: 'SPACEX STARSHIPS',                 weightKg: 120000, note: 'Elon doesn\'t do leg day either' },
    { label: 'INTERNATIONAL SPACE STATIONS',     weightKg: 420000, note: 'orbits at 28,000 km/h. your cardio doesn\'t' },
    { label: 'CURIOSITY MARS ROVERS',            weightKg: 899,    note: 'alone, no network, no excuse' },
    { label: 'STARLINK SATELLITES',              weightKg: 260,    note: 'always in orbit. zero absences' },
    { label: 'SATURN V ROCKETS',                 weightKg: 2950000,note: 'took humans to the moon. how much did you lift?' },
    { label: 'JAMES WEBB TELESCOPES',            weightKg: 6200,   note: 'sees 13 billion years back. do you remember your March PR?' },
    { label: 'VOYAGER 1 PROBES',                 weightKg: 722,    note: '23 billion km covered. no deload' },
    { label: 'APOLLO LUNAR MODULES',             weightKg: 15103,  note: 'went and came back with what it had. philosophy' },
    { label: 'SPACEX DRAGON CAPSULES',           weightKg: 4200,   note: 'reusable. like your determination should be' },
    { label: 'NASA ASTRONAUTS',                  weightKg: 75,     note: 'years of prep for 6 months in space. and you skipped Tuesday' },
    // wonders / architecture
    { label: 'EIFFEL TOWERS',                   weightKg: 7300000,note: 'iron structure. you\'re flesh. almost there' },
    { label: 'GIZA PYRAMIDS',                   weightKg: 5900000000, note: 'built without a gym. without supplements' },
    { label: 'STATUES OF LIBERTY',              weightKg: 225000, note: 'she doesn\'t lift her arm by strength' },
    { label: 'ROMAN COLOSSEUMS',                weightKg: 700000000, note: 'real combat arena. your WOD is close' },
    { label: 'STONEHENGE (MAIN STONE)',         weightKg: 25000,  note: 'no crane. no explanation. just volume' },
    { label: 'DAVID STATUES (MICHELANGELO)',    weightKg: 5660,   note: 'pure marble. you\'re almost there' },
    { label: 'BIG BENS (BELL)',                 weightKg: 13760,  note: 'on time for 163 years. were you on time today?' },
    { label: 'BRANDENBURG GATES',              weightKg: 1200000,note: 'survived two wars. you survived today\'s WOD' },
    { label: 'CHRIST THE REDEEMERS',           weightKg: 1145000,note: 'arms open for those who train and those who don\'t' },
    { label: 'PETRONAS TWIN TOWERS',            weightKg: 100000000, note: 'dual structure. like your deadlift should be' },
    // pop culture / celebrities
    { label: 'USAIN BOLTS',                     weightKg: 94,     note: '9.58s in 100m. you took longer to get out of bed' },
    { label: 'LEBRON JAMES',                    weightKg: 113,    note: 'trains more than you. sleeps more too' },
    { label: 'RONALDO NAZÁRIO',                 weightKg: 80,     note: 'still more skill per kg than anyone' },
    { label: 'MICHAEL PHELPS',                  weightKg: 88,     note: '28 Olympic medals. how many do you have?' },
    { label: 'SERENA WILLIAMS',                 weightKg: 72,     note: 'more mental strength per kg than you' },
    { label: 'THOR (MCU)',                      weightKg: 290,    note: 'fictional but the actor\'s effort isn\'t' },
    { label: 'WOLVERINE (HUGH JACKMAN)',        weightKg: 90,     note: '53 years old. still more ripped than you' },
    { label: 'ROCKY BALBOAS',                   weightKg: 86,     note: 'fictional character. real discipline' },
    { label: 'HERMIONE GRANGERS',               weightKg: 56,     note: 'studied more. trained less. similar results' },
    { label: 'ELON MUSKS',                      weightKg: 82,     note: 'doesn\'t train. still carries weight' },
    { label: 'ARNOLD SCHWARZENEGGERS (PEAK)',   weightKg: 107,    note: 'the standard. you haven\'t gotten close yet' },
    { label: 'CRISTIANO RONALDOS',              weightKg: 83,     note: '3h of training per day. did you today?' },
    { label: 'SIMONE BILES',                    weightKg: 47,     note: 'smaller than you. stronger in everything' },
    { label: 'MIKE TYSONS (PEAK)',              weightKg: 99,     note: 'punch force of 1,800 psi. your jab: unmeasured' },
    // technology
    { label: 'IPHONE 15 PROS',                 weightKg: 0.187,  note: 'cutting-edge tech you use to scroll memes' },
    { label: 'MACBOOK PROS (M3)',               weightKg: 1.55,   note: 'more processing than your training plan' },
    { label: 'NVIDIA H100 GPUS',                weightKg: 4.5,    note: 'trains AI 24h a day. and you?' },
    { label: 'TESLA MODEL S',                   weightKg: 2241,   note: 'zero emissions. zero excuses' },
    { label: 'APPLE WATCHES',                   weightKg: 0.051,  note: 'counts your steps. do you count your sets?' },
    { label: 'DJI MAVIC 3 DRONES',             weightKg: 0.895,  note: 'flies high, records everything, no complaining' },
    { label: 'AMAZON AWS SERVERS',              weightKg: 11,     note: 'works 24/7 with no day off. your role model' },
    { label: 'RTX 4090 GPUS',                   weightKg: 2.1,    note: 'more VRAM than your muscle memory cells' },
    { label: 'STARLINK ROUTERS',                weightKg: 4.5,    note: 'connected anywhere. you: only with good WiFi' },
    { label: 'RED MONSTRO 8K CAMERAS',         weightKg: 6.3,    note: 'captures every detail. your coach does too' },
    // scientific absurdity
    { label: 'ANTARCTIC PENGUINS',              weightKg: 30,     note: '256 million total. more consistent than your class' },
    { label: 'ADULT GIRAFFES',                  weightKg: 1000,   note: 'natural neck training, no machine, every week' },
    { label: 'ADULT T-REXES',                   weightKg: 8000,   note: 'extinct. but never missed a workout' },
    { label: 'BLUE WHALES',                     weightKg: 150000, note: 'the largest animal on Earth. you lift more per kg' },
    { label: 'GIANT SEQUOIA TREES',             weightKg: 1200000,note: '3,000 years of consistency without a PR' },
    { label: 'MAIN BELT ASTEROIDS',             weightKg: 1000000000000, note: 'not even worth trying. just for perspective' },
    { label: 'HUMAN BRAINS',                    weightKg: 1.4,   note: 'uses 20% of body energy. not using 100% of potential' },
    { label: 'HUMAN HEARTS',                    weightKg: 0.3,   note: 'beats 100,000 times a day without asking for a deload' },
    { label: 'COMPLETE BEEHIVES',               weightKg: 3,     note: '60,000 workers per hive. zero strikes' },
    { label: 'GIANT SQUIDS',                    weightKg: 275,   note: '10m tentacles. your grip training has limits' },
    { label: 'LEAFCUTTER ANTS (1 TRILLION)',    weightKg: 0.002, note: 'carry 50× their weight. how much of your 1RM?' },
    { label: 'TUNGUSKA METEORS',                weightKg: 100000000, note: 'impact without contact. like you on leg day' },
    { label: 'COCKROACHES',                     weightKg: 0.001, note: 'survive everything. your motivation doesn\'t' },
    { label: 'HUMAN SKELETON (206 BONES)',      weightKg: 9,     note: 'holds everything up. do you take care of any?' },
    { label: 'NEURONS (100 BILLION)',           weightKg: 0.00000000001, note: 'you use all of them planning not to train' },
    // pop absurdity
    { label: 'DEATH STARS (STAR WARS)',         weightKg: 1000000000000000, note: 'fictional. your effort isn\'t' },
    { label: 'THANOS WITH THE INFINITY STONES', weightKg: 250,   note: 'one snap eliminates half. you eliminate zero sets' },
    { label: 'DOLOKHOV (WAR AND PEACE)',        weightKg: 80,    note: 'literary character. historical discipline' },
    { label: 'BATMAN (CHRISTIAN BALE)',         weightKg: 95,    note: 'no superpowers. just training and trauma' },
    { label: 'JOHN WICK',                       weightKg: 86,    note: 'kills 84 people per film. you barely kill the AMRAP' },
    { label: 'CHUCK NORRIS',                    weightKg: 80,    note: 'legend. you\'re becoming one' },
    { label: 'KING KONG GORILLAS',              weightKg: 31000, note: 'fictional but the strength isn\'t' },
    { label: 'GODZILLAS',                       weightKg: 99634000, note: 'perspective: you\'re microscopic and still trained' },
    { label: 'TARDIS (DOCTOR WHO)',             weightKg: 1,     note: 'bigger on the inside than the outside. like your potential' },
    { label: 'MJOLNIRS (THOR)',                 weightKg: 42,    note: 'only the worthy can lift it. you lifted more' },
  ],
}

function pickOne<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

function Slide04({ volume, monthLabel }: { volume: number; monthLabel: string }) {
  const picks = useMemo(() => {
    return Object.values(COMPARISONS).map(cat => {
      const valid = cat.filter(c => {
        const n = Math.round(volume / c.weightKg)
        return n >= 1 && n <= 9999
      })
      const pool = valid.length > 0 ? valid : cat
      return { item: pickOne(pool), count: Math.round(volume / (valid.length > 0 ? pickOne(pool).weightKg : cat[0].weightKg)) }
    }).map(({ item }) => ({
      item,
      count: Math.max(1, Math.round(volume / item.weightKg)),
    }))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div style={{ ...slideBase, paddingTop: 100, gap: 0 }}>
      <p style={eyebrowStyle()}>EPISODE 04 · THAT IS A LOT</p>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-around', marginTop: 12 }}>
        {picks.map(({ item, count }, i) => (
          <div key={i} style={{ borderTop: '1px solid rgba(0,0,0,0.15)', paddingTop: 10, paddingBottom: 10 }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, flexWrap: 'wrap' }}>
              <span style={{
                fontFamily: 'JetBrains Mono, monospace',
                fontSize: 42, fontWeight: 900, lineHeight: 1, color: '#0A0A0A',
              }}>×{count}</span>
              <span style={{
                fontFamily: 'JetBrains Mono, monospace',
                fontSize: 12, fontWeight: 800, letterSpacing: '0.1em',
                textTransform: 'uppercase', color: '#0A0A0A', lineHeight: 1.2,
              }}>{item.label}</span>
            </div>
            <p style={{
              fontFamily: 'JetBrains Mono, monospace',
              fontSize: 10, opacity: 0.5, marginTop: 3,
              letterSpacing: '0.06em', color: '#0A0A0A', fontStyle: 'italic',
            }}>{item.note}</p>
          </div>
        ))}
      </div>
      <div style={footerStyle}>
        <span>VOLUME · {monthLabel}</span>
        <span>{Math.round(volume).toLocaleString('en-US')} KG</span>
      </div>
    </div>
  )
}

// ─── Slide 05 — Streak ────────────────────────────────────────────────────────

function Slide05({ streakDays, monthLabel }: { streakDays: number; monthLabel: string }) {
  const bars = 14
  return (
    <div style={slideBase}>
      <p style={eyebrowStyle()}>EPISODE 05 · STREAK</p>
      <p style={{
        fontFamily: 'JetBrains Mono, monospace',
        fontSize: 200,
        fontWeight: 900,
        lineHeight: 0.85,
        letterSpacing: '-0.04em',
        color: '#0A0A0A',
        marginBottom: 12,
      }}>
        {streakDays}
      </p>
      <p style={{ fontSize: 16, fontWeight: 600, color: '#0A0A0A', opacity: 0.8, marginBottom: 24 }}>
        You trained {streakDays} consecutive day{streakDays !== 1 ? 's' : ''} without missing.
      </p>

      {/* Chain visualization */}
      <div style={{ display: 'flex', gap: 6, alignItems: 'flex-end', marginBottom: 'auto' }}>
        {Array.from({ length: bars }).map((_, i) => (
          <div key={i} style={{
            width: 14,
            height: 40 + Math.sin(i * 0.8) * 8,
            background: i < streakDays ? '#0A0A0A' : 'rgba(0,0,0,0.2)',
          }} />
        ))}
      </div>

      <div style={footerStyle}>
        <span>RECORD · {streakDays} DAYS</span>
        <span>TARGET · 14 DAYS</span>
      </div>
    </div>
  )
}

// ─── Slide 06 — PR Hero ───────────────────────────────────────────────────────

function Slide06({ prs, monthLabel }: { prs: AthletePR[]; monthLabel: string }) {
  const sorted = [...prs].sort((a, b) => {
    // Prefer 1RM
    if (a.reps === 1 && b.reps !== 1) return -1
    if (b.reps === 1 && a.reps !== 1) return 1
    return b.max_weight - a.max_weight
  })
  const hero = sorted[0]

  if (!hero) {
    return (
      <div style={slideBase}>
        <p style={eyebrowStyle()}>EPISODE 06 · EDITION PR</p>
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <p style={{ fontSize: 18, fontWeight: 700, color: '#0A0A0A', opacity: 0.6, textAlign: 'center' }}>
            No PRs recorded this month
          </p>
        </div>
        <div style={footerStyle}>
          <span>PRs · {monthLabel}</span>
          <span>KEEP BREAKING THEM</span>
        </div>
      </div>
    )
  }

  return (
    <div style={slideBase}>
      <p style={eyebrowStyle()}>EPISODE 06 · EDITION PR</p>

      {/* Framed box */}
      <div style={{
        border: '2px solid #0A0A0A',
        padding: 18,
        display: 'flex',
        flexDirection: 'column',
        flex: 1,
        marginBottom: 24,
      }}>
        {/* Top: movement + pill */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <p style={{ fontSize: 15, fontWeight: 800, color: '#0A0A0A', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
            {hero.movement_name}
          </p>
          <div style={{
            background: '#0A0A0A',
            color: '#FF8A00',
            fontFamily: 'JetBrains Mono, monospace',
            fontSize: 10,
            fontWeight: 800,
            letterSpacing: '0.16em',
            padding: '3px 8px',
          }}>
            {hero.reps === 1 ? '1RM' : `${hero.reps}RM`}
          </div>
        </div>

        {/* Big weight */}
        <p style={{
          fontFamily: 'JetBrains Mono, monospace',
          fontSize: 120,
          fontWeight: 900,
          lineHeight: 0.9,
          color: '#0A0A0A',
          letterSpacing: '-0.04em',
          marginBottom: 8,
        }}>
          {hero.max_weight}
        </p>
        <p style={{
          fontFamily: 'JetBrains Mono, monospace',
          fontSize: 24,
          fontWeight: 700,
          color: '#0A0A0A',
          opacity: 0.6,
          marginBottom: 'auto',
        }}>
          kg
        </p>

        {/* Stats row */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, borderTop: '1px solid rgba(0,0,0,0.2)', paddingTop: 12 }}>
          {[
            { label: 'MOVEMENT', value: hero.movement_name.split(' ')[0] },
            { label: 'KG', value: `${hero.max_weight}` },
            { label: 'REPS', value: `${hero.reps}` },
          ].map(({ label, value }) => (
            <div key={label}>
              <p style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 9, fontWeight: 700, letterSpacing: '0.18em', opacity: 0.5, marginBottom: 2, textTransform: 'uppercase', color: '#0A0A0A' }}>
                {label}
              </p>
              <p style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 14, fontWeight: 800, color: '#0A0A0A', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {value}
              </p>
            </div>
          ))}
        </div>
      </div>

      <div style={footerStyle}>
        <span>PR HERO · {monthLabel}</span>
        <span>{hero.max_weight} KG</span>
      </div>
    </div>
  )
}

// ─── Slide 07 — All PRs ───────────────────────────────────────────────────────

function Slide07({ prs, monthLabel }: { prs: AthletePR[]; monthLabel: string }) {
  const sorted = [...prs].sort((a, b) => b.max_weight - a.max_weight).slice(0, 5)

  return (
    <div style={slideBase}>
      <p style={eyebrowStyle('#D4FF3A')}>EPISODE 07 · MONTH TROPHIES</p>
      <p style={{ fontSize: 28, fontWeight: 900, color: '#F5F5F0', marginBottom: 24, lineHeight: 1.1 }}>
        Your personal records.
      </p>

      {sorted.length === 0 ? (
        <p style={{ fontSize: 15, color: 'rgba(245,245,240,0.5)', flex: 1 }}>
          No PRs recorded.
        </p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 0, flex: 1 }}>
          {sorted.map((pr, i) => (
            <div key={`${pr.movement_name}-${pr.reps}-${i}`} style={{
              display: 'grid',
              gridTemplateColumns: '28px 1fr auto auto',
              gap: 12,
              alignItems: 'center',
              padding: '12px 0',
              borderBottom: '1px solid rgba(255,255,255,0.06)',
            }}>
              <span style={{
                fontFamily: 'JetBrains Mono, monospace',
                fontSize: 12,
                fontWeight: 800,
                color: 'rgba(212,255,58,0.4)',
              }}>
                {String(i + 1).padStart(2, '0')}
              </span>
              <span style={{
                fontSize: 14,
                fontWeight: 700,
                color: '#F5F5F0',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}>
                {pr.movement_name}
              </span>
              <span style={{
                fontFamily: 'JetBrains Mono, monospace',
                fontSize: 16,
                fontWeight: 900,
                color: '#D4FF3A',
              }}>
                {pr.max_weight} kg
              </span>
              <span style={{
                fontFamily: 'JetBrains Mono, monospace',
                fontSize: 10,
                fontWeight: 700,
                color: 'rgba(245,245,240,0.4)',
                minWidth: 32,
                textAlign: 'right',
              }}>
                {pr.reps === 1 ? '1RM' : `${pr.reps}RM`}
              </span>
            </div>
          ))}
        </div>
      )}

      <div style={footerStyle}>
        <span>{prs.length} PRs TOTAL</span>
        <span>KEEP BREAKING THEM</span>
      </div>
    </div>
  )
}

// ─── Slide 08 — Title ─────────────────────────────────────────────────────────

function Slide08({
  sessionCount, titleObj, nextTitle, monthLabel,
}: {
  sessionCount: number
  titleObj: typeof TITLES[0]
  nextTitle: typeof TITLES[0] | undefined
  monthLabel: string
}) {
  return (
    <div style={slideBase}>
      <p style={eyebrowStyle('#D4FF3A')}>EPISODE 08 · YOUR TITLE</p>
      <p style={{
        fontFamily: 'JetBrains Mono, monospace',
        fontSize: 56,
        fontWeight: 900,
        color: '#D4FF3A',
        lineHeight: 1,
        marginBottom: 12,
        letterSpacing: '-0.02em',
      }}>
        {titleObj.label}
      </p>
      <p style={{ fontSize: 15, fontWeight: 600, color: '#F5F5F0', opacity: 0.7, marginBottom: 28 }}>
        {sessionCount} sessions · {titleObj.min}–{titleObj.max} for the tier
      </p>

      {/* Progress ladder: 6 cols */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 4, marginBottom: 20 }}>
        {TITLES.map((t) => {
          const isCurrent = t.id === titleObj.id
          const isPast = TITLES.indexOf(t) < TITLES.indexOf(titleObj)
          return (
            <div key={t.id} style={{
              padding: '8px 4px',
              background: isCurrent ? '#D4FF3A' : isPast ? 'rgba(212,255,58,0.15)' : 'rgba(255,255,255,0.04)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 4,
            }}>
              <span style={{
                fontFamily: 'JetBrains Mono, monospace',
                fontSize: 8,
                fontWeight: 800,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                color: isCurrent ? '#0A0A0A' : isPast ? 'rgba(212,255,58,0.6)' : 'rgba(255,255,255,0.25)',
                textAlign: 'center',
                lineHeight: 1.2,
              }}>
                {t.label}
              </span>
            </div>
          )
        })}
      </div>

      {nextTitle && (
        <p style={{
          fontFamily: 'JetBrains Mono, monospace',
          fontSize: 12,
          fontWeight: 700,
          color: 'rgba(245,245,240,0.5)',
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
          marginBottom: 'auto',
        }}>
          +{nextTitle.min - sessionCount} sessions to {nextTitle.label}
        </p>
      )}
      {!nextTitle && <div style={{ flex: 1 }} />}

      <div style={footerStyle}>
        <span>{monthLabel} TITLE</span>
        <span>UNLOCKED</span>
      </div>
    </div>
  )
}

// ─── Slide 09 — Body Map ──────────────────────────────────────────────────────

function Slide09({
  muscleSessions, trainedMuscleCount, monthLabel,
}: {
  muscleSessions: Record<string, number>
  trainedMuscleCount: number
  monthLabel: string
}) {
  const maxS = Math.max(1, ...Object.values(muscleSessions))

  function cellBg(cell: string): string {
    const v = muscleSessions[cell] ?? 0
    if (v === 0) return 'rgba(255,255,255,0.06)'
    const ratio = v / maxS
    if (ratio >= 0.5) return '#D4FF3A'
    return 'rgba(212,255,58,0.35)'
  }

  // Front grid cells
  const frontCells: Array<{ id: string; area: string }> = [
    { id: 'nape', area: 'nape' },
    { id: 'shl',  area: 'shl' },
    { id: 'trap', area: 'trap' },
    { id: 'shr',  area: 'shr' },
    { id: 'bcl',  area: 'bcl' },
    { id: 'pec',  area: 'pec' },
    { id: 'bcr',  area: 'bcr' },
    { id: 'abs',  area: 'abs' },
    { id: 'hip',  area: 'hip' },
    { id: 'qul',  area: 'qul' },
    { id: 'qur',  area: 'qur' },
    { id: 'pal',  area: 'pal' },
    { id: 'par',  area: 'par' },
  ]

  // Top/bottom muscles by session count
  const sortedMuscles = Object.entries(muscleSessions).sort((a, b) => b[1] - a[1])
  const topMuscle = sortedMuscles[0]?.[0] ?? null
  const bottomMuscle = sortedMuscles[sortedMuscles.length - 1]?.[0] ?? null

  const muscleName: Record<string, string> = {
    pec: 'Chest', shl: 'Shoulder L', shr: 'Shoulder R', bcl: 'Biceps L',
    bcr: 'Biceps R', lat: 'Lats', tcl: 'Triceps L', tcr: 'Triceps R',
    trap: 'Traps', abs: 'Core', hip: 'Hip', qul: 'Quad L',
    qur: 'Quad R', pal: 'Hamstring L', par: 'Hamstring R', lmb: 'Lower Back',
    glu: 'Glutes', hml: 'Post L', hmr: 'Post R', nape: 'Neck',
    rdl: 'Rear Delt L', rdr: 'Rear Delt R',
  }

  const coveragePct = Math.round((trainedMuscleCount / ALL_CELLS.length) * 100)

  return (
    <div style={slideBase}>
      <p style={eyebrowStyle('#D4FF3A')}>EPISODE 09 · THE WHOLE BODY</p>
      <p style={{ fontSize: 18, fontWeight: 800, color: '#F5F5F0', marginBottom: 16, lineHeight: 1.2 }}>
        You trained {trainedMuscleCount} out of {ALL_CELLS.length} muscle groups.
      </p>

      {/* CSS grid mannequin (front) */}
      <div style={{
        display: 'grid',
        gridTemplateAreas: `
          ".    nape nape ."
          "shl  trap trap shr"
          "bcl  pec  pec  bcr"
          ".    abs  abs  ."
          ".    hip  hip  ."
          "qul  qul  qur  qur"
          "pal  pal  par  par"
        `,
        gridTemplateRows: '22px 36px 50px 40px 20px 60px 40px',
        gridTemplateColumns: '1fr 1.05fr 1.05fr 1fr',
        gap: 3,
        marginBottom: 16,
        maxWidth: 200,
      }}>
        {frontCells.map(c => (
          <div
            key={c.id}
            style={{
              gridArea: c.area,
              background: cellBg(c.id),
            }}
          />
        ))}
      </div>

      {/* Two tiles */}
      {(topMuscle || bottomMuscle) && (
        <div style={{ display: 'flex', gap: 8, marginBottom: 'auto' }}>
          {topMuscle && (
            <div style={{ background: 'rgba(212,255,58,0.1)', border: '1px solid rgba(212,255,58,0.25)', padding: '8px 12px', flex: 1 }}>
              <p style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 9, fontWeight: 700, letterSpacing: '0.18em', color: '#D4FF3A', marginBottom: 2 }}>MOST TRAINED</p>
              <p style={{ fontSize: 13, fontWeight: 800, color: '#F5F5F0' }}>{muscleName[topMuscle] ?? topMuscle}</p>
            </div>
          )}
          {bottomMuscle && bottomMuscle !== topMuscle && (
            <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', padding: '8px 12px', flex: 1 }}>
              <p style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 9, fontWeight: 700, letterSpacing: '0.18em', color: 'rgba(245,245,240,0.4)', marginBottom: 2 }}>LEAST TRAINED</p>
              <p style={{ fontSize: 13, fontWeight: 800, color: '#F5F5F0' }}>{muscleName[bottomMuscle] ?? bottomMuscle}</p>
            </div>
          )}
        </div>
      )}
      {!topMuscle && <div style={{ flex: 1 }} />}

      <div style={footerStyle}>
        <span>{coveragePct}% COVERAGE</span>
        <span>{trainedMuscleCount} GROUPS</span>
      </div>
    </div>
  )
}

// ─── Slide 10 — Focus Insight ─────────────────────────────────────────────────

function Slide10({ focusCounts, sessionCount, monthLabel }: {
  focusCounts: Record<string, number>
  sessionCount: number
  monthLabel: string
}) {
  const entries = Object.entries(focusCounts).sort((a, b) => b[1] - a[1])
  const top3 = entries.slice(0, 3)
  const mostTag = top3[0]?.[0] ?? null
  const leastTag = entries[entries.length - 1]?.[0] ?? null

  const mostLabel = mostTag ? (FOCUS_DISPLAY_LABELS[mostTag] ?? mostTag.toUpperCase()) : '—'
  const leastLabel = leastTag && leastTag !== mostTag ? (FOCUS_DISPLAY_LABELS[leastTag] ?? leastTag.toUpperCase()) : null

  const imbalanceMsg = mostTag && leastLabel
    ? `Your ${mostLabel} was trained much more than ${leastLabel}.`
    : mostTag
    ? `Focus concentrated on ${mostLabel}.`
    : 'Insufficient focus data.'

  const advice = leastLabel
    ? `Consider adding more ${leastLabel} sessions next month to balance your development.`
    : 'Vary your focus areas to ensure complete development.'

  return (
    <div style={slideBase}>
      <p style={eyebrowStyle()}>EPISODE 10 · HARD TRUTH</p>

      {/* Two stamps */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        <div style={{ background: '#0A0A0A', padding: '4px 10px' }}>
          <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, fontWeight: 800, letterSpacing: '0.18em', color: '#FF3B30' }}>IMBALANCE</span>
        </div>
        <div style={{ background: '#0A0A0A', padding: '4px 10px' }}>
          <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, fontWeight: 800, letterSpacing: '0.18em', color: '#FF3B30' }}>FOCUS {monthLabel.split(' ')[0]}</span>
        </div>
      </div>

      <p style={{ fontSize: 22, fontWeight: 900, color: '#0A0A0A', lineHeight: 1.2, marginBottom: 12 }}>
        {imbalanceMsg}
      </p>
      <p style={{ fontSize: 14, color: '#0A0A0A', opacity: 0.75, lineHeight: 1.6, marginBottom: 24 }}>
        {advice}
      </p>

      {/* 3 metrics */}
      {top3.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6, marginBottom: 'auto' }}>
          {top3.map(([tag, count]) => {
            const pct = sessionCount > 0 ? Math.round((count / sessionCount) * 100) : 0
            return (
              <div key={tag} style={{ background: 'rgba(0,0,0,0.12)', padding: '10px 8px' }}>
                <p style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 24, fontWeight: 900, color: '#0A0A0A', lineHeight: 1 }}>
                  {pct}%
                </p>
                <p style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 9, fontWeight: 700, letterSpacing: '0.12em', color: '#0A0A0A', opacity: 0.6, marginTop: 4, textTransform: 'uppercase' }}>
                  {FOCUS_DISPLAY_LABELS[tag] ?? tag}
                </p>
              </div>
            )
          })}
        </div>
      )}
      {top3.length === 0 && <div style={{ flex: 1 }} />}

      <div style={footerStyle}>
        <span>ADJUST NEXT MONTH</span>
        <span>DATA · {monthLabel}</span>
      </div>
    </div>
  )
}

// ─── Slide 11 — Consistency ───────────────────────────────────────────────────

function Slide11({
  consistency, completedCount, sessionCount, partialCount, skippedCount, monthLabel,
}: {
  consistency: number
  completedCount: number
  sessionCount: number
  partialCount: number
  skippedCount: number
  monthLabel: string
}) {
  return (
    <div style={slideBase}>
      <p style={eyebrowStyle()}>EPISODE 11 · CONSISTENCY</p>
      <p style={{
        fontFamily: 'JetBrains Mono, monospace',
        fontSize: 200,
        fontWeight: 900,
        lineHeight: 0.85,
        letterSpacing: '-0.04em',
        color: '#0A0A0A',
        marginBottom: 12,
      }}>
        {consistency}%
      </p>
      <p style={{ fontSize: 16, fontWeight: 600, color: '#0A0A0A', opacity: 0.8, marginBottom: 24 }}>
        {completedCount} out of {sessionCount} workouts completed.
      </p>

      {/* Three chips */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 'auto' }}>
        <div style={{ background: '#0A0A0A', padding: '8px 14px' }}>
          <p style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 9, fontWeight: 700, letterSpacing: '0.16em', color: '#D4FF3A', marginBottom: 2 }}>DONE</p>
          <p style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 20, fontWeight: 900, color: '#D4FF3A' }}>{completedCount}</p>
        </div>
        <div style={{ background: '#0A0A0A', padding: '8px 14px' }}>
          <p style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 9, fontWeight: 700, letterSpacing: '0.16em', color: '#FF8A00', marginBottom: 2 }}>PARTIAL</p>
          <p style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 20, fontWeight: 900, color: '#FF8A00' }}>{partialCount}</p>
        </div>
        <div style={{ background: '#0A0A0A', padding: '8px 14px' }}>
          <p style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 9, fontWeight: 700, letterSpacing: '0.16em', color: '#FF3B30', marginBottom: 2 }}>MISSED</p>
          <p style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 20, fontWeight: 900, color: '#FF3B30' }}>{skippedCount}</p>
        </div>
      </div>

      <div style={footerStyle}>
        <span>{monthLabel}</span>
        <span>{consistency}% CONSISTENCY</span>
      </div>
    </div>
  )
}

// ─── Slide 12 — Outro ─────────────────────────────────────────────────────────

function Slide12({
  monthLabel, year, sessionCount, volume, streakDays, titleLabel, prsCount, coveragePct, onShare,
}: {
  monthLabel: string
  year: number
  sessionCount: number
  volume: number
  streakDays: number
  titleLabel: string
  prsCount: number
  coveragePct: number
  onShare: () => void
}) {
  const rows = [
    { label: 'SESSIONS', value: `${sessionCount}` },
    { label: 'VOLUME', value: `${(volume / 1000).toFixed(1)} T` },
    { label: 'STREAK', value: `${streakDays} DAYS` },
    { label: 'TITLE', value: titleLabel },
    { label: 'PRs', value: `+${prsCount}` },
    { label: 'COVERAGE', value: `${coveragePct}%` },
  ]

  return (
    <div style={slideBase}>
      <p style={eyebrowStyle()}>END · SHARE WITH THE BOX</p>
      <p style={{
        fontFamily: 'JetBrains Mono, monospace',
        fontSize: 80,
        fontWeight: 900,
        lineHeight: 0.85,
        letterSpacing: '-0.04em',
        color: '#0A0A0A',
        marginBottom: 20,
      }}>
        {monthLabel}
      </p>

      {/* Recap table */}
      <div style={{ background: '#0A0A0A', marginBottom: 20 }}>
        {rows.map((row, i) => (
          <div key={row.label} style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '9px 14px',
            borderBottom: i < rows.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none',
          }}>
            <span style={{
              fontFamily: 'JetBrains Mono, monospace',
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: '0.18em',
              color: 'rgba(212,255,58,0.45)',
              textTransform: 'uppercase',
            }}>
              {row.label}
            </span>
            <span style={{
              fontFamily: 'JetBrains Mono, monospace',
              fontSize: 13,
              fontWeight: 900,
              color: '#D4FF3A',
            }}>
              {row.value}
            </span>
          </div>
        ))}
      </div>

      {/* Share button */}
      <button
        onClick={onShare}
        style={{
          background: '#0A0A0A',
          color: '#D4FF3A',
          border: 'none',
          padding: '14px 24px',
          fontFamily: 'JetBrains Mono, monospace',
          fontSize: 13,
          fontWeight: 800,
          letterSpacing: '0.16em',
          textTransform: 'uppercase',
          cursor: 'pointer',
          width: '100%',
          textAlign: 'center',
          marginBottom: 'auto',
        }}
      >
        SHARE EDITION
      </button>

      <div style={{ ...footerStyle, marginTop: 16 }}>
        <span>CF · SCORES</span>
        <span>NEXT MONTH</span>
      </div>
    </div>
  )
}

// ─── Loading Screen ───────────────────────────────────────────────────────────

function LoadingScreen() {
  return (
    <div style={{
      position: 'fixed', inset: 0, background: '#0A0A0A',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 9999,
    }}>
      <div style={{
        width: 32, height: 32,
        border: '3px solid #D4FF3A',
        borderTopColor: 'transparent',
        borderRadius: '50%',
        animation: 'wf_spin 0.7s linear infinite',
      }} />
      <style>{`@keyframes wf_spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  )
}

// ─── Stage component ──────────────────────────────────────────────────────────

interface WrappedStageProps {
  slides: SlideConfig[]
  onClose: () => void
}

function WrappedStage({ slides, onClose }: WrappedStageProps) {
  const [idx, setIdx] = useState(0)
  const [paused, setPaused] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Inject animation once
  useEffect(() => {
    const style = document.createElement('style')
    style.id = 'wf-anim'
    style.textContent = `@keyframes wfill { from { width: 0% } to { width: 100% } }`
    document.head.appendChild(style)
    return () => {
      const el = document.getElementById('wf-anim')
      if (el) document.head.removeChild(el)
    }
  }, [])

  // Auto-advance
  useEffect(() => {
    if (paused) return
    timerRef.current = setTimeout(() => {
      if (idx < slides.length - 1) setIdx(i => i + 1)
      else onClose()
    }, 6000)
    return () => { if (timerRef.current) clearTimeout(timerRef.current) }
  }, [idx, paused, slides.length, onClose])

  const slide = slides[idx]

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      background: slide.bg, color: slide.fg,
      display: 'flex', flexDirection: 'column',
      fontFamily: 'Space Grotesk, sans-serif',
      overflow: 'hidden',
      userSelect: 'none',
    }}>
      {/* Progress bars */}
      <div style={{
        position: 'absolute', top: 48, left: 12, right: 12, zIndex: 30,
        display: 'flex', gap: 3,
      }}>
        {slides.map((_, i) => (
          <div key={i} style={{
            flex: 1, height: 3,
            background: slide.fg === '#0A0A0A' ? 'rgba(0,0,0,0.2)' : 'rgba(255,255,255,0.2)',
            position: 'relative', overflow: 'hidden',
          }}>
            <div style={{
              position: 'absolute', inset: '0 0 0 0',
              background: slide.fg === '#0A0A0A' ? 'rgba(0,0,0,0.9)' : 'rgba(255,255,255,0.9)',
              width: i < idx ? '100%' : i > idx ? '0%' : undefined,
              animation: i === idx && !paused ? 'wfill 6s linear forwards' : undefined,
            }} />
          </div>
        ))}
      </div>

      {/* Brand top */}
      <div style={{
        position: 'absolute', top: 60, left: 0, right: 0,
        padding: '10px 20px',
        display: 'flex', justifyContent: 'space-between',
        zIndex: 25, pointerEvents: 'none',
      }}>
        <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, fontWeight: 800, letterSpacing: '0.22em', color: slide.fg }}>
          CF<span style={{ color: '#D4FF3A' }}>·</span>MONTHLY
        </span>
        <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, fontWeight: 700, letterSpacing: '0.18em', opacity: 0.65, color: slide.fg }}>
          {idx + 1} / {slides.length}
        </span>
      </div>

      {/* Slide content */}
      <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }} key={idx}>
        {slide.render()}
      </div>

      {/* Tap zones */}
      <div
        style={{ position: 'absolute', top: 100, bottom: 0, left: 0, width: '33%', zIndex: 40 }}
        onClick={() => setIdx(i => Math.max(i - 1, 0))}
        onPointerDown={() => setPaused(true)}
        onPointerUp={() => setPaused(false)}
        onPointerLeave={() => setPaused(false)}
      />
      <div
        style={{ position: 'absolute', top: 100, bottom: 0, right: 0, width: '67%', zIndex: 40 }}
        onClick={() => { if (idx < slides.length - 1) setIdx(i => i + 1); else onClose() }}
        onPointerDown={() => setPaused(true)}
        onPointerUp={() => setPaused(false)}
        onPointerLeave={() => setPaused(false)}
      />

      {/* Close button */}
      <button
        onClick={onClose}
        style={{
          position: 'absolute', top: 58, right: 16, zIndex: 50,
          background: 'transparent', border: 'none',
          color: slide.fg, cursor: 'pointer', padding: 4, opacity: 0.7,
        }}
      >
        <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  )
}

// ─── Main export ──────────────────────────────────────────────────────────────

export default function WrappedReport() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { athleteId } = useParams<{ athleteId?: string }>()
  const isCoachView = !!athleteId
  const targetId = athleteId ?? user?.id ?? ''

  const [loading, setLoading] = useState(true)
  const [workouts, setWorkouts] = useState<PrescribedWorkoutData[]>([])
  const [prs, setPRs] = useState<AthletePR[]>([])
  const [athleteName, setAthleteName] = useState<string>('Athlete')

  // Month: default to current
  const { selectedYear, selectedMonth } = useMemo(() => {
    const now = new Date()
    return { selectedYear: now.getFullYear(), selectedMonth: now.getMonth() }
  }, [])

  useEffect(() => {
    if (!targetId) return
    let cancelled = false

    async function load() {
      setLoading(true)
      try {
        const [workoutsRes, prsRes] = await Promise.all([
          isCoachView
            ? supabase.rpc('personal_get_athlete_workouts', { p_athlete_id: targetId })
            : supabase.rpc('get_my_prescribed_workouts'),
          supabase.rpc('get_athlete_prs', { p_athlete_id: targetId }),
        ])

        if (isCoachView) {
          const { data: profileData } = await supabase
            .from('profiles')
            .select('name,username')
            .eq('user_id', targetId)
            .maybeSingle()
          if (!cancelled && profileData) {
            setAthleteName(profileData.name ?? profileData.username ?? 'Athlete')
          }
        } else if (user) {
          const { data: profileData } = await supabase
            .from('profiles')
            .select('name,username')
            .eq('user_id', user.id)
            .maybeSingle()
          if (!cancelled && profileData) {
            setAthleteName(profileData.name ?? profileData.username ?? 'Athlete')
          }
        }

        if (!cancelled) {
          setWorkouts((workoutsRes.data as PrescribedWorkoutData[]) ?? [])
          setPRs((prsRes.data as AthletePR[]) ?? [])
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    return () => { cancelled = true }
  }, [targetId, isCoachView, user])

  // Filter to selected month
  const monthWorkouts = useMemo(() => workouts.filter(w => {
    const [y, m] = w.workout_date.split('-').map(Number)
    return y === selectedYear && m - 1 === selectedMonth
  }), [workouts, selectedYear, selectedMonth])

  // Computed stats
  const sessionCount = monthWorkouts.length
  const completedCount = monthWorkouts.filter(w => w.feedback?.status === 'completed').length
  const partialCount = monthWorkouts.filter(w => w.feedback?.status === 'partially_completed').length
  const skippedCount = monthWorkouts.filter(w => w.feedback?.status === 'skipped').length
  const consistency = sessionCount > 0 ? Math.round((completedCount / sessionCount) * 100) : 0
  const volume = useMemo(() => computeVolume(monthWorkouts), [monthWorkouts])
  const streak = useMemo(() => computeStreak(monthWorkouts), [monthWorkouts])

  // Calendar
  const daysInMonth = new Date(selectedYear, selectedMonth + 1, 0).getDate()
  const firstDow = new Date(selectedYear, selectedMonth, 1).getDay() // 0=Sun
  const sunFirstDow = firstDow // keep as-is for 7-col grid starting Sunday
  const trainedDays = useMemo(() => new Set(monthWorkouts.map(w => parseInt(w.workout_date.split('-')[2]))), [monthWorkouts])

  // Focus distribution
  const focusCounts = useMemo<Record<string, number>>(() => {
    const counts: Record<string, number> = {}
    for (const w of monthWorkouts) {
      for (const tag of (w.focus ?? [])) {
        const k = tag.toLowerCase()
        counts[k] = (counts[k] ?? 0) + 1
      }
    }
    return counts
  }, [monthWorkouts])

  // Muscle coverage
  const { muscleSessions, trainedMuscleCount } = useMemo(() => {
    const ms: Record<string, number> = {}
    for (const w of monthWorkouts) {
      const activated = new Set<string>()
      for (const tag of (w.focus ?? [])) {
        const cells = FOCUS_MUSCLES_CELLS[tag.toLowerCase()] ?? []
        cells.forEach(c => activated.add(c))
      }
      activated.forEach(c => { ms[c] = (ms[c] ?? 0) + 1 })
    }
    const count = ALL_CELLS.filter(c => (ms[c] ?? 0) > 0).length
    return { muscleSessions: ms, trainedMuscleCount: count }
  }, [monthWorkouts])

  // Title
  const titleObj = useMemo(() => {
    return TITLES.slice().reverse().find(t => sessionCount >= t.min) ?? TITLES[0]
  }, [sessionCount])
  const titleIdx = TITLES.findIndex(t => t.id === titleObj.id)
  const nextTitle = TITLES[titleIdx + 1]

  const monthLabel = PT_MONTHS[selectedMonth]
  const coveragePct = Math.round((trainedMuscleCount / ALL_CELLS.length) * 100)

  // Share handler
  const handleShare = () => {
    const text = `CF·MONTHLY ${monthLabel} ${selectedYear}\n${sessionCount} sessions · ${(volume / 1000).toFixed(1)}t · ${prs.length} PRs\nTitle: ${titleObj.label}`
    if (navigator.share) {
      navigator.share({ title: 'CF Monthly', text }).catch(() => {})
    } else if (navigator.clipboard) {
      navigator.clipboard.writeText(text).catch(() => {})
    }
  }

  // Build slides
  const slides = useMemo<SlideConfig[]>(() => [
    {
      bg: '#D4FF3A', fg: '#0A0A0A',
      render: () => (
        <Slide01
          monthLabel={monthLabel}
          year={selectedYear}
          sessionCount={sessionCount}
          volume={volume}
          prsCount={prs.length}
          athleteName={athleteName}
        />
      ),
    },
    {
      bg: '#0A0A0A', fg: '#F5F5F0',
      render: () => (
        <Slide02
          sessionCount={sessionCount}
          daysInMonth={daysInMonth}
          firstDow={sunFirstDow}
          trainedDays={trainedDays}
          monthLabel={monthLabel}
        />
      ),
    },
    {
      bg: '#0A0A0A', fg: '#F5F5F0',
      render: () => <Slide03 volume={volume} monthLabel={monthLabel} />,
    },
    {
      bg: '#D4FF3A', fg: '#0A0A0A',
      render: () => <Slide04 volume={volume} monthLabel={monthLabel} />,
    },
    {
      bg: '#4DA3FF', fg: '#0A0A0A',
      render: () => <Slide05 streakDays={streak} monthLabel={monthLabel} />,
    },
    {
      bg: '#FF8A00', fg: '#0A0A0A',
      render: () => <Slide06 prs={prs} monthLabel={monthLabel} />,
    },
    {
      bg: '#0A0A0A', fg: '#F5F5F0',
      render: () => <Slide07 prs={prs} monthLabel={monthLabel} />,
    },
    {
      bg: '#0A0A0A', fg: '#F5F5F0',
      render: () => (
        <Slide08
          sessionCount={sessionCount}
          titleObj={titleObj}
          nextTitle={nextTitle}
          monthLabel={monthLabel}
        />
      ),
    },
    {
      bg: '#0A0A0A', fg: '#F5F5F0',
      render: () => (
        <Slide09
          muscleSessions={muscleSessions}
          trainedMuscleCount={trainedMuscleCount}
          monthLabel={monthLabel}
        />
      ),
    },
    {
      bg: '#FF3B30', fg: '#0A0A0A',
      render: () => (
        <Slide10
          focusCounts={focusCounts}
          sessionCount={sessionCount}
          monthLabel={monthLabel}
        />
      ),
    },
    {
      bg: '#D4FF3A', fg: '#0A0A0A',
      render: () => (
        <Slide11
          consistency={consistency}
          completedCount={completedCount}
          sessionCount={sessionCount}
          partialCount={partialCount}
          skippedCount={skippedCount}
          monthLabel={monthLabel}
        />
      ),
    },
    {
      bg: '#D4FF3A', fg: '#0A0A0A',
      render: () => (
        <Slide12
          monthLabel={monthLabel}
          year={selectedYear}
          sessionCount={sessionCount}
          volume={volume}
          streakDays={streak}
          titleLabel={titleObj.label}
          prsCount={prs.length}
          coveragePct={coveragePct}
          onShare={handleShare}
        />
      ),
    },
  // eslint-disable-next-line react-hooks/exhaustive-deps
  ], [
    monthLabel, selectedYear, sessionCount, volume, prs,
    athleteName, daysInMonth, sunFirstDow, trainedDays,
    streak, titleObj, nextTitle, muscleSessions, trainedMuscleCount,
    focusCounts, consistency, completedCount, partialCount, skippedCount, coveragePct,
  ])

  if (loading) return <LoadingScreen />

  return <WrappedStage slides={slides} onClose={() => navigate(-1)} />
}

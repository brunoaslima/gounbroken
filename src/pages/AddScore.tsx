import { FormEvent, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { useMovements } from '@/hooks/useMovements'
import { useScores } from '@/hooks/useScores'
import { useProfile } from '@/hooks/useProfile'
import { analyzeStrength, TIER_LABELS } from '@/lib/strengthStandards'
import { epley1RM } from '@/lib/scoreUtils'
import TierBar from '@/components/TierBar'
import MovementPicker from '@/components/MovementPicker'
import { phCapture } from '@/lib/posthog'

const QUICK_ADJUST = [-5, -2.5, -1, +1, +2.5, +5]
const REP_BUTTONS = [1, 2, 3, 4, 5, 6, 8, 10]

export default function AddScore() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { user } = useAuth()
  const { movements } = useMovements(user?.id)
  const { addScore, getPRsForMovement } = useScores(user?.id)
  const { profile } = useProfile(user?.id)

  const today = new Date().toISOString().split('T')[0]

  const [movementId, setMovementId] = useState(searchParams.get('movement') ?? '')
  const [reps, setReps] = useState<number>(1)
  const [weight, setWeight] = useState(0)
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)

  const movement = movements.find(m => m.id === movementId)
  const currentPR = movementId && reps ? (getPRsForMovement(movementId)[reps] ?? null) : null
  const wouldBePR = weight > 0 && (currentPR === null || weight > currentPR)
  const e1rm = epley1RM(weight, reps)

  // Strength analysis preview
  const strengthAnalysis = movement && profile?.body_weight_kg && profile?.gender && reps === 1 && weight > 0
    ? analyzeStrength(movement.name, weight, profile.body_weight_kg, profile.gender as 'male'|'female'|'other')
    : null

  function adjustWeight(delta: number) {
    setWeight(prev => Math.max(0, Math.round((prev + delta) * 2) / 2))
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!movementId || !reps || weight <= 0) return
    setSaving(true)
    try {
      const { newPR } = await addScore(movementId, reps, weight, today, notes || undefined)
      phCapture('pr_logged', {
        movement_name: movement?.name ?? movementId,
        reps,
        weight_kg: weight,
        is_new_pr: newPR,
      })
      if (newPR) {
        navigate(`/athlete/movement/${movementId}`, {
          replace: true,
          state: { celebratePR: true, weight, reps },
        })
      } else {
        navigate(-1)
      }
    } catch (err: unknown) {
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="min-h-screen bg-graphite safe-top safe-bottom flex flex-col">
      {/* TopBar */}
      <header
        className="flex items-center justify-between px-5 border-b border-[#2A2A2A]"
        style={{ height: 52 }}
      >
        <button
          onClick={() => navigate(-1)}
          className="font-mono font-bold uppercase tracking-[0.12em] text-[11px] text-[#A8A8A4] active:text-soft-white"
        >
          Cancel
        </button>
        <span className="font-mono font-bold uppercase tracking-[0.18em] text-[11px] text-[#A8A8A4]">
          New PR
        </span>
        <div className="w-16" />
      </header>

      <form onSubmit={handleSubmit} className="flex-1 flex flex-col">
        <div className="flex-1 overflow-y-auto">

          {/* Exercise */}
          <div className="px-5 pt-5 pb-4 border-b border-[#2A2A2A]">
            <span className="font-mono font-bold uppercase tracking-[0.12em] text-[10px] text-[#6B6B68] block mb-2">
              Exercise
            </span>
            <MovementPicker
              movements={movements}
              value={movementId}
              onChange={setMovementId}
              required
            />
          </div>

          {/* Carga */}
          <div className="px-5 pt-5 pb-4 border-b border-[#2A2A2A]">
            <div className="flex items-center justify-between mb-3">
              <span className="font-mono font-bold uppercase tracking-[0.12em] text-[10px] text-[#6B6B68]">
                Load
                {currentPR !== null && (
                  <span className="normal-case font-normal ml-2 text-[#3D3D3B]">
                    Current PR: {currentPR}kg
                  </span>
                )}
              </span>
              {/* KG only for now */}
              <span className="font-mono font-bold uppercase tracking-widest text-[10px] px-2 py-1 border border-[#2A2A2A] text-[#A8A8A4]">KG</span>
            </div>

            {/* Big number display */}
            <div
              className="border border-[#2A2A2A] bg-[#141414] flex items-center justify-between px-5"
              style={{ minHeight: 100 }}
            >
              <input
                type="number"
                step="0.5"
                min="0"
                value={weight === 0 ? '' : weight}
                onChange={e => setWeight(parseFloat(e.target.value) || 0)}
                className="flex-1 bg-transparent text-soft-white focus:outline-none"
                style={{ fontSize: 52, fontFamily: '"JetBrains Mono", ui-monospace, monospace', fontWeight: 800, letterSpacing: '0.01em', fontVariantNumeric: 'tabular-nums', lineHeight: 1 }}
                placeholder="0"
                inputMode="decimal"
              />
              {wouldBePR && (
                <span className="font-mono font-bold uppercase tracking-[0.12em] text-[11px] px-2 py-1 ml-2" style={{ background: '#D4FF3A', color: '#0A0A0A', flexShrink: 0 }}>
                  NOVO PR
                </span>
              )}
            </div>

            {/* Quick adjust */}
            <div className="flex mt-0" style={{ gap: 0 }}>
              {QUICK_ADJUST.map((delta, i) => (
                <button
                  key={delta}
                  type="button"
                  onClick={() => adjustWeight(delta)}
                  className="flex-1 py-3 font-mono font-bold text-[12px] text-soft-white active:bg-[#2A2A2A] transition-colors"
                  style={{
                    border: '1px solid #2A2A2A',
                    borderLeft: i === 0 ? '1px solid #2A2A2A' : 'none',
                    background: '#141414',
                  }}
                >
                  {delta > 0 ? `+${delta}` : delta}
                </button>
              ))}
            </div>
          </div>

          {/* Reps */}
          <div className="px-5 pt-5 pb-4 border-b border-[#2A2A2A]">
            <div className="flex items-center justify-between mb-3">
              <span className="font-mono font-bold uppercase tracking-[0.12em] text-[10px] text-[#6B6B68]">
                Reps
              </span>
              {e1rm && reps > 1 && (
                <span className="font-mono font-bold uppercase tracking-[0.1em] text-[10px] text-[#A8A8A4]">
                  E1RM · {e1rm} KG
                </span>
              )}
            </div>
            <div className="flex" style={{ gap: 0 }}>
              {REP_BUTTONS.map((r, i) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setReps(r)}
                  className="flex-1 py-3.5 font-mono font-bold text-[13px] transition-colors"
                  style={{
                    border: '1px solid #2A2A2A',
                    borderLeft: i === 0 ? '1px solid #2A2A2A' : 'none',
                    background: reps === r ? '#D4FF3A' : '#141414',
                    color: reps === r ? '#0A0A0A' : '#A8A8A4',
                  }}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>

          {/* Strength tier preview */}
          {strengthAnalysis && (
            <div className="px-5 pt-4 pb-5 border-b border-[#2A2A2A]">
              <span className="font-mono font-bold uppercase tracking-[0.12em] text-[10px] text-[#6B6B68] block mb-4">
                Strength level
              </span>
              <TierBar
                score={strengthAnalysis.score}
                kgToNextLevel={strengthAnalysis.kgToNextLevel}
                nextLevelLabel={strengthAnalysis.nextLevel ? TIER_LABELS[strengthAnalysis.nextLevel] : null}
              />
            </div>
          )}

          {/* Nota */}
          <div className="px-5 pt-5 pb-4">
            <span className="font-mono font-bold uppercase tracking-[0.12em] text-[10px] text-[#6B6B68] block mb-2">
              Note
            </span>
            <div className="border border-[#2A2A2A] bg-[#141414]">
              <input
                type="text"
                value={notes}
                onChange={e => setNotes(e.target.value)}
                className="w-full bg-transparent px-4 py-3.5 text-soft-white placeholder-[#3D3D3B] focus:outline-none text-[15px]"
                placeholder="How was it?"
              />
            </div>
          </div>
        </div>

        {/* Save button */}
        <div className="px-5 pb-8 pt-4">
          <button
            type="submit"
            disabled={saving || !movementId || weight <= 0}
            className="w-full bg-lime text-graphite font-mono font-bold uppercase tracking-[0.18em] text-[12px] py-4 flex items-center justify-center gap-2 disabled:opacity-30 active:bg-lime-lo transition-colors"
          >
            {saving && <span className="w-3.5 h-3.5 border-2 border-graphite/40 border-t-graphite rounded-full animate-spin" />}
            {saving ? 'Saving...' : 'Save PR'}
          </button>
        </div>
      </form>
    </div>
  )
}

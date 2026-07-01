import { useState } from 'react'
import { LineChart, Line, ResponsiveContainer, Tooltip, YAxis } from 'recharts'
import { useAuth } from '@/hooks/useAuth'
import { useProfile } from '@/hooks/useProfile'
import { useWeightHistory } from '@/hooks/useWeightHistory'
import { formatDate } from '@/lib/utils'

interface Props {
  open: boolean
  onClose: () => void
}

const ROLE_LABELS: Record<string, string> = {
  admin: 'Admin',
  personal: 'Personal',
  box_admin: 'Box Admin',
}

const ROLE_COLORS: Record<string, string> = {
  admin:     '#D4FF3A',
  personal:  '#4DA3FF',
  box_admin: '#FFB800',
}

/**
 * Renders the profile side panel with editable personal details, physical data, weight history, and sign-out controls.
 *
 * @param open - Controls whether the panel is visible.
 * @param onClose - Closes the panel.
 * @returns The profile panel content.
 */
export default function ProfilePanel({ open, onClose }: Props) {
  const { user, signOut } = useAuth()
  const { profile, loading, updateProfile, getAge, getBMI, getBMILabel } = useProfile(user?.id)
  const { history } = useWeightHistory(user?.id)

  const [editName, setEditName] = useState('')
  const [editUsername, setEditUsername] = useState('')
  const [editWeight, setEditWeight] = useState('')
  const [editHeight, setEditHeight] = useState('')
  const [editGender, setEditGender] = useState<'male' | 'female' | null>(null)
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')

  function startEdit() {
    if (!profile) return
    setEditName(profile.name ?? '')
    setEditUsername(profile.username ?? '')
    setEditWeight(String(profile.body_weight_kg))
    setEditHeight(String(profile.height_cm))
    const g = profile.gender
    setEditGender(g === 'male' || g === 'female' ? g : null)
    setEditing(true)
    setSaveError('')
  }

  function cancelEdit() {
    setEditing(false)
    setSaveError('')
  }

  async function handleSave() {
    setSaving(true)
    setSaveError('')
    try {
      await updateProfile({
        name: editName || undefined,
        username: editUsername || undefined,
        body_weight_kg: editWeight ? Number(editWeight) : undefined,
        height_cm: editHeight ? Number(editHeight) : undefined,
        gender: editGender ?? undefined,
      })
      setEditing(false)
    } catch (err: unknown) {
      setSaveError(err instanceof Error ? err.message : 'Erro ao salvar')
    } finally {
      setSaving(false)
    }
  }

  const bmi = getBMI()
  const bmiInfo = bmi ? getBMILabel(bmi) : null
  const age = getAge()
  const initials = profile?.name
    ? profile.name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()
    : null

  const last5 = history.slice(-5)
  const chartData = history.map(h => ({ date: h.recorded_at, weight: h.weight_kg }))

  return (
    <>
      {open && (
        <div
          className="fixed inset-0 bg-black/60 z-40"
          onClick={onClose}
        />
      )}

      <div
        className={`fixed top-0 right-0 h-full w-full max-w-sm bg-card border-l border-white/5 z-50 flex flex-col transition-transform duration-300 overflow-y-auto ${
          open ? 'translate-x-0' : 'translate-x-full'
        }`}
        style={{ paddingTop: 'env(safe-area-inset-top)', paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        {/* Header */}
        <div className="px-5 py-5 flex items-center justify-between border-b border-white/5 shrink-0">
          <div className="flex items-center gap-3">
            <button onClick={onClose} className="text-muted-gray hover:text-soft-white p-1">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <h2 className="text-soft-white font-bold text-base">Meu Perfil</h2>
          </div>
          {profile?.roles?.filter(r => r !== 'user').map(r => (
            <span key={r}
              className="text-xs font-bold px-2.5 py-1"
              style={{ color: ROLE_COLORS[r] ?? '#A8A8A4', background: (ROLE_COLORS[r] ?? '#A8A8A4') + '20' }}
            >
              {ROLE_LABELS[r] ?? r}
            </span>
          ))}
        </div>

        {loading ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="w-8 h-8 border-2 border-lime border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="flex-1 px-4 py-4 space-y-4">

            {/* Section 1 — Personal */}
            <div className="bg-graphite rounded-2xl border border-white/5 p-4 space-y-4">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-2xl bg-lime/15 border border-lime/20 flex items-center justify-center shrink-0">
                  <span className="text-lime font-black text-xl">{initials ?? '?'}</span>
                </div>
                <div className="flex-1 min-w-0">
                  {editing ? (
                    <input
                      type="text"
                      value={editName}
                      onChange={e => setEditName(e.target.value)}
                      className="w-full bg-card border border-white/10 rounded-xl px-3 py-2 text-soft-white text-sm focus:outline-none focus:border-lime/50 transition-colors mb-1"
                      placeholder="Seu nome"
                    />
                  ) : (
                    <p className="text-soft-white font-bold text-base truncate">
                      {profile?.name ?? user?.email?.split('@')[0] ?? '—'}
                    </p>
                  )}
                  {editing ? (
                    <input
                      type="text"
                      value={editUsername}
                      onChange={e => setEditUsername(e.target.value.toLowerCase().replace(/\s/g, ''))}
                      className="w-full bg-card border border-white/10 rounded-xl px-3 py-2 text-muted-gray text-sm focus:outline-none focus:border-lime/50 transition-colors"
                      placeholder="username"
                    />
                  ) : (
                    <p className="text-muted-gray text-sm truncate">
                      {profile?.username ? `@${profile.username}` : user?.email ?? ''}
                    </p>
                  )}
                </div>
              </div>

              {!editing && (
                <div className="flex items-center justify-between pt-1 border-t border-white/5">
                  <span className="text-muted-gray text-xs">Email</span>
                  <span className="text-soft-white text-xs truncate max-w-[200px]">{user?.email}</span>
                </div>
              )}

              {!editing && (
                <button
                  onClick={startEdit}
                  className="w-full bg-white/5 hover:bg-white/8 text-muted-gray text-sm font-medium rounded-xl py-2.5 transition-colors"
                >
                  Editar perfil
                </button>
              )}
            </div>

            {/* Section 2 — Physical data */}
            <div className="bg-graphite rounded-2xl border border-white/5 p-4 space-y-3">
              <p className="text-[11px] font-bold text-muted-gray uppercase tracking-widest">Physical data</p>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-muted-gray text-sm">Data nasc.</span>
                  <span className="text-soft-white text-sm">
                    {profile?.date_of_birth ? formatDate(profile.date_of_birth) : '—'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-gray text-sm">Idade</span>
                  <span className="text-soft-white text-sm">{age != null ? `${age} anos` : '—'}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-gray text-sm">Peso</span>
                  {editing ? (
                    <input
                      type="number"
                      step={0.1}
                      value={editWeight}
                      onChange={e => setEditWeight(e.target.value)}
                      className="w-24 bg-card border border-white/10 rounded-xl px-3 py-1.5 text-soft-white text-sm text-right focus:outline-none focus:border-lime/50 transition-colors"
                    />
                  ) : (
                    <span className="text-soft-white text-sm">{profile?.body_weight_kg}kg</span>
                  )}
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-gray text-sm">Altura</span>
                  {editing ? (
                    <input
                      type="number"
                      value={editHeight}
                      onChange={e => setEditHeight(e.target.value)}
                      className="w-24 bg-card border border-white/10 rounded-xl px-3 py-1.5 text-soft-white text-sm text-right focus:outline-none focus:border-lime/50 transition-colors"
                    />
                  ) : (
                    <span className="text-soft-white text-sm">{profile?.height_cm}cm</span>
                  )}
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-gray text-sm">Gender</span>
                  {editing ? (
                    <div className="flex" style={{ gap: 1, background: '#2A2A2A' }}>
                      {(['male', 'female'] as const).map(g => (
                        <button
                          key={g}
                          type="button"
                          onClick={() => setEditGender(editGender === g ? null : g)}
                          className="font-mono font-black uppercase"
                          style={{
                            fontSize: 10, letterSpacing: '0.14em',
                            padding: '6px 14px',
                            background: editGender === g ? '#F5F5F0' : '#1A1A1A',
                            color: editGender === g ? '#0A0A0A' : '#A8A8A4',
                            border: 'none', cursor: 'pointer',
                          }}
                        >
                          {g === 'male' ? 'MALE' : 'FEMALE'}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <span className="text-soft-white text-sm capitalize">
                      {profile?.gender === 'male' || profile?.gender === 'female' ? profile.gender : '—'}
                    </span>
                  )}
                </div>
                {editing && (
                  <p className="font-mono text-[9px] text-[#6B6B68]" style={{ letterSpacing: '0.12em' }}>
                    Used to validate Mixed division composition.
                  </p>
                )}
                <div className="flex items-center justify-between">
                  <span className="text-muted-gray text-sm">IMC</span>
                  {bmi && bmiInfo ? (
                    <span
                      className="text-xs font-bold px-2 py-0.5"
                      style={{ color: bmiInfo.color, background: bmiInfo.color + '20' }}
                    >
                      {bmi} · {bmiInfo.label}
                    </span>
                  ) : (
                    <span className="text-soft-white text-sm">—</span>
                  )}
                </div>
              </div>

              {editing && (
                <>
                  {saveError && (
                    <p className="text-warning text-xs bg-warning/10 border border-warning/20 rounded-xl px-3 py-2">
                      {saveError}
                    </p>
                  )}
                  <div className="flex gap-2 pt-1">
                    <button
                      onClick={cancelEdit}
                      className="flex-1 bg-white/5 text-muted-gray text-sm font-medium rounded-xl py-2.5 transition-colors"
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={handleSave}
                      disabled={saving}
                      className="flex-[2] bg-lime hover:bg-lime/90 disabled:opacity-50 text-graphite text-sm font-bold rounded-xl py-2.5 transition-colors"
                    >
                      {saving ? '…' : 'Save changes'}
                    </button>
                  </div>
                </>
              )}
            </div>

            {/* Section 3 — Weight history */}
            {history.length > 0 && (
              <div className="bg-graphite rounded-2xl border border-white/5 p-4 space-y-3">
                <p className="text-[11px] font-bold text-muted-gray uppercase tracking-widest">Weight history</p>

                {history.length >= 2 && (
                  <div className="h-[100px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={chartData}>
                        <YAxis domain={['auto', 'auto']} hide />
                        <Tooltip
                          contentStyle={{ background: '#141414', border: '1px solid #2A2A2A', borderRadius: 0, fontSize: 12 }}
                          labelStyle={{ color: '#A8A8A4' }}
                          itemStyle={{ color: '#4DA3FF' }}
                          formatter={(val: number) => [`${val}kg`, 'Peso']}
                        />
                        <Line
                          type="monotone"
                          dataKey="weight"
                          stroke="#4DA3FF"
                          strokeWidth={2}
                          dot={false}
                          activeDot={{ r: 4, fill: '#4DA3FF' }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                )}

                <div className="space-y-1.5">
                  {last5.slice().reverse().map(entry => (
                    <div key={entry.id} className="flex items-center justify-between">
                      <span className="text-muted-gray text-xs">{formatDate(entry.recorded_at)}</span>
                      <span className="text-soft-white text-sm font-semibold">{entry.weight_kg}kg</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Sign out */}
            <button
              onClick={() => { signOut(); onClose() }}
              className="w-full bg-graphite hover:bg-white/5 border border-white/5 text-muted-gray text-sm font-medium rounded-2xl py-3.5 transition-colors"
            >
              Sair da conta
            </button>
          </div>
        )}
      </div>
    </>
  )
}

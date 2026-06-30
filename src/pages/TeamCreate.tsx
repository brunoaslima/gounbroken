import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase } from '@/lib/supabase'

export default function TeamCreate() {
  const { id: competitionId } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const [competitionName, setCompetitionName] = useState('')
  const [teamMaxSize, setTeamMaxSize] = useState(4)
  const [teamName, setTeamName] = useState('')
  const [box, setBox] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!competitionId) return
    supabase
      .from('competitions')
      .select('name, team_max_size')
      .eq('id', competitionId)
      .single()
      .then(({ data }) => {
        if (data) {
          setCompetitionName(data.name)
          setTeamMaxSize(data.team_max_size ?? 4)
        }
      })
  }, [competitionId])

  async function handleSubmit() {
    if (!teamName.trim() || !competitionId || submitting) return
    setSubmitting(true)
    const { data, error } = await supabase.rpc('create_competition_team', {
      p_competition_id: competitionId,
      p_name: teamName.trim(),
      p_box: box.trim() || null,
    })
    setSubmitting(false)
    if (error) {
      return
    }
    // RPC returns the new team UUID as a string or object
    const teamId = typeof data === 'string' ? data : (data as { id: string } | null)?.id ?? String(data)
    navigate(`/athlete/competitions/${competitionId}/team/${teamId}`)
  }

  return (
    <div className="min-h-screen bg-[#0A0A0A] flex flex-col" style={{ maxWidth: 480, margin: '0 auto' }}>

      {/* Topbar */}
      <header
        className="flex items-center justify-between px-4 border-b border-[#2A2A2A] flex-shrink-0"
        style={{ height: 52 }}
      >
        <button
          onClick={() => navigate(-1)}
          className="flex items-center justify-center text-[#F5F5F0] active:opacity-60"
          style={{ width: 36, height: 36 }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M19 12H5M5 12l7-7M5 12l7 7" />
          </svg>
        </button>
        <span className="font-mono font-bold uppercase tracking-[0.22em] text-[11px] text-[#A8A8A4]">
          CREATE TEAM · 1 OF 1
        </span>
        <span style={{ width: 36 }} />
      </header>

      {/* Progress bar — 2 segments, no gap */}
      <div className="flex flex-shrink-0" style={{ height: 3 }}>
        <div style={{ flex: 1, background: '#D4FF3A' }} />
        <div style={{ flex: 1, background: '#2A2A2A' }} />
      </div>

      {/* Scrollable form */}
      <div className="flex-1 overflow-y-auto px-5 pt-5 flex flex-col gap-5 pb-32">

        <span className="font-mono font-bold uppercase tracking-[0.14em] text-[10px] text-[#D4FF3A]">
          {competitionName}
        </span>

        <h2
          className="font-sans font-bold text-[#F5F5F0]"
          style={{ fontSize: 24, letterSpacing: '-0.015em', lineHeight: 1.1, margin: 0 }}
        >
          Give your team<br />a strong name.
        </h2>

        {/* Team name field */}
        <div className="flex flex-col gap-1.5">
          <label className="font-mono font-bold uppercase tracking-[0.14em] text-[10px] text-[#6B6B68]">
            Team name
          </label>
          <input
            value={teamName}
            onChange={e => setTeamName(e.target.value)}
            maxLength={32}
            placeholder="Iron Bears"
            className="bg-[#1F1F1F] border border-[#2A2A2A] text-[#F5F5F0] font-sans text-[14px] px-3 outline-none focus:border-[#D4FF3A] transition-colors"
            style={{ paddingTop: 11, paddingBottom: 11 }}
          />
          <span className="font-mono text-[10px] text-[#6B6B68]" style={{ letterSpacing: '0.1em' }}>
            {teamName.length} / 32 · will appear on the leaderboard
          </span>
        </div>

        {/* Box / origin field */}
        <div className="flex flex-col gap-1.5">
          <label className="font-mono font-bold uppercase tracking-[0.14em] text-[10px] text-[#6B6B68]">
            Box / Origin (optional)
          </label>
          <input
            value={box}
            onChange={e => setBox(e.target.value)}
            maxLength={64}
            placeholder="CF Pinheiros"
            className="bg-[#1F1F1F] border border-[#2A2A2A] text-[#F5F5F0] font-sans text-[14px] px-3 outline-none focus:border-[#D4FF3A] transition-colors"
            style={{ paddingTop: 11, paddingBottom: 11 }}
          />
        </div>

        {/* Info box */}
        <div className="flex gap-3 border border-[#2A2A2A] bg-[#111111] p-3.5" style={{ alignItems: 'flex-start' }}>
          <span
            className="font-mono font-black text-[12px] text-[#0A0A0A] bg-[#D4FF3A] flex items-center justify-center flex-shrink-0"
            style={{ width: 22, height: 22 }}
          >
            i
          </span>
          <p className="font-sans text-[13px] text-[#A8A8A4]" style={{ lineHeight: 1.4, margin: 0 }}>
            The team needs{' '}
            <strong className="text-[#F5F5F0]">{teamMaxSize} confirmed athletes</strong> and Head Judge approval
            to compete officially.
          </p>
        </div>
      </div>

      {/* Sticky bottom CTA */}
      <div className="sticky bottom-0 px-5 py-4 bg-[#0A0A0A] border-t border-[#2A2A2A] flex-shrink-0">
        <button
          onClick={handleSubmit}
          disabled={!teamName.trim() || submitting}
          className="w-full font-mono font-black uppercase text-[13px] text-[#0A0A0A] bg-[#D4FF3A] py-4 flex items-center justify-center transition-opacity disabled:opacity-30 disabled:cursor-not-allowed"
          style={{ letterSpacing: '0.16em' }}
        >
          {submitting ? 'CREATING...' : 'CREATE TEAM →'}
        </button>
      </div>
    </div>
  )
}

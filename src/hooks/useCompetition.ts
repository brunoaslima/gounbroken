import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import type { Competition, CompetitionWod, CompetitionTeam, CompetitionTeamMember } from '@/types'

export interface MyTeamData {
  team: CompetitionTeam
  members: CompetitionTeamMember[]
}

export interface TeamCounts { total: number; approved: number }

export interface PendingJudgeInvite { id: string; competition_id: string }

export interface PendingTeamInvite { id: string; team_id: string; team_name: string | null }

export function useCompetition(competitionId: string | undefined, userId: string | undefined) {
  const [competition, setCompetition] = useState<Competition | null>(null)
  const [wods, setWods] = useState<CompetitionWod[]>([])
  const [myTeam, setMyTeam] = useState<MyTeamData | null>(null)
  const [myRole, setMyRole] = useState<'head_judge' | 'judge' | 'athlete' | null>(null)
  const [teamCounts, setTeamCounts] = useState<TeamCounts>({ total: 0, approved: 0 })
  const [pendingJudgeInvite, setPendingJudgeInvite] = useState<PendingJudgeInvite | null>(null)
  const [pendingTeamInvite, setPendingTeamInvite] = useState<PendingTeamInvite | null>(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    if (!competitionId) { setLoading(false); return }
    setLoading(true)

    const [compRes, wodsRes, rolesRes, teamsRes, inviteRes] = await Promise.all([
      supabase.from('competitions').select('*').eq('id', competitionId).single(),
      supabase.from('competition_wods').select('*').eq('competition_id', competitionId).order('order_index'),
      userId ? supabase.from('competition_roles').select('role').eq('competition_id', competitionId).eq('user_id', userId) : Promise.resolve({ data: [] }),
      supabase.from('competition_teams').select('id, status').eq('competition_id', competitionId),
      userId
        ? supabase
            .from('competition_judge_invites')
            .select('id, competition_id')
            .eq('competition_id', competitionId)
            .eq('invited_user_id', userId)
            .eq('status', 'pending')
            .maybeSingle()
        : Promise.resolve({ data: null }),
    ])

    setCompetition(compRes.data ?? null)
    setWods(wodsRes.data ?? [])

    const teamsData = teamsRes.data ?? []
    setTeamCounts({
      total: teamsData.length,
      approved: teamsData.filter((t: { status: string }) => t.status === 'approved').length,
    })

    const roles = rolesRes.data ?? []
    if (roles.some((r: { role: string }) => r.role === 'head_judge')) setMyRole('head_judge')
    else if (roles.some((r: { role: string }) => r.role === 'judge')) setMyRole('judge')
    else if (roles.some((r: { role: string }) => r.role === 'athlete')) setMyRole('athlete')
    else setMyRole(null)

    setPendingJudgeInvite((inviteRes.data as PendingJudgeInvite | null) ?? null)

    if (userId) {
      const { data: teamInvData } = await supabase
        .rpc('get_my_team_invite', { p_competition_id: competitionId })
      const inv = (teamInvData as any[])?.[0] ?? null
      setPendingTeamInvite(inv ? { id: inv.id, team_id: inv.team_id, team_name: inv.team_name ?? null } : null)
    } else {
      setPendingTeamInvite(null)
    }

    if (userId) {
      // Captain fast path
      const { data: captainTeam } = await supabase
        .from('competition_teams')
        .select('*')
        .eq('competition_id', competitionId)
        .eq('captain_user_id', userId)
        .maybeSingle()

      if (captainTeam) {
        const { data: members } = await supabase
          .rpc('get_team_members', { p_team_id: captainTeam.id })
        setMyTeam({ team: captainTeam, members: (members as CompetitionTeamMember[]) ?? [] })
      } else {
        // Member path — SECURITY DEFINER bypassa RLS circular entre as duas tabelas
        const { data: memberTeamRows } = await supabase
          .rpc('get_my_team_in_competition', { p_competition_id: competitionId })
        const memberTeam = (memberTeamRows as CompetitionTeam[] | null)?.[0] ?? null

        if (memberTeam) {
          const { data: members } = await supabase.rpc('get_team_members', { p_team_id: memberTeam.id })
          setMyTeam({ team: memberTeam, members: (members as CompetitionTeamMember[]) ?? [] })
        } else {
          setMyTeam(null)
        }
      }
    } else {
      setMyTeam(null)
    }

    setLoading(false)
  }, [competitionId, userId])

  useEffect(() => { load() }, [load])

  return { competition, wods, myTeam, myRole, teamCounts, pendingJudgeInvite, pendingTeamInvite, loading, reload: load }
}

import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'

export interface InviteItem {
  invite_type: 'judge' | 'team'
  id: string
  competition_id: string
  competition_name: string
  competition_date: string
  invited_by_user_id: string | null
  status: string
  assigned_wod_ids: string[] | null
  team_id: string | null
  team_name: string | null
  created_at: string
}

export interface InviterProfile {
  user_id: string
  name: string
  username: string
}

export function useInviteInbox() {
  const [invites, setInvites] = useState<InviteItem[]>([])
  const [inviters, setInviters] = useState<Record<string, InviterProfile>>({})
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase.rpc('get_my_invites')
    const items = (data ?? []) as InviteItem[]
    setInvites(items)

    const ids = [...new Set(items.map(i => i.invited_by_user_id).filter(Boolean))] as string[]
    if (ids.length > 0) {
      const { data: profilesData } = await supabase.rpc('get_profiles_public', { p_user_ids: ids })
      const map: Record<string, InviterProfile> = {}
      for (const p of (profilesData ?? []) as { user_id: string; full_name: string; username: string }[]) {
        map[p.user_id] = { user_id: p.user_id, name: p.full_name, username: p.username }
      }
      setInviters(map)
    }
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  async function acceptInvite(item: InviteItem) {
    setActionLoading(item.id)
    if (item.invite_type === 'judge') {
      await supabase.rpc('accept_judge_invite', { p_invite_id: item.id })
    } else {
      await supabase.rpc('respond_team_invite', { p_member_id: item.id, p_accept: true })
    }
    setActionLoading(null)
    load()
  }

  async function declineInvite(item: InviteItem) {
    setActionLoading(item.id)
    if (item.invite_type === 'judge') {
      await supabase.rpc('decline_judge_invite', { p_invite_id: item.id })
    } else {
      await supabase.rpc('respond_team_invite', { p_member_id: item.id, p_accept: false })
    }
    setActionLoading(null)
    load()
  }

  return { invites, inviters, loading, actionLoading, acceptInvite, declineInvite, reload: load }
}

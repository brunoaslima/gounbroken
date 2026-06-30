import { useNavigate } from 'react-router-dom'
import { useInviteInbox } from '@/hooks/useInviteInbox'
import type { InviteItem, InviterProfile } from '@/hooks/useInviteInbox'

const EN_MONTHS = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC']

function formatDate(iso: string): string {
  const d = new Date(iso + 'T00:00:00')
  return `${String(d.getDate()).padStart(2,'0')} ${EN_MONTHS[d.getMonth()]} ${d.getFullYear()}`
}

function formatTimestamp(iso: string): string {
  const d = new Date(iso)
  const now = new Date()
  const isToday = d.toDateString() === now.toDateString()
  const hhmm = `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`
  return isToday ? `TODAY · ${hhmm}` : `${String(d.getDate()).padStart(2,'0')} ${EN_MONTHS[d.getMonth()]} · ${hhmm}`
}

function avatarInitials(name: string): string {
  const parts = name.trim().split(/\s+/)
  if (parts.length === 1) return name.slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

const STATUS_CFG: Record<string, { color: string; label: string }> = {
  pending:  { color: '#4DA3FF', label: 'INVITED' },
  invited:  { color: '#4DA3FF', label: 'INVITED' },
  accepted: { color: '#D4FF3A', label: 'ACCEPTED' },
  declined: { color: '#6B6B68', label: 'DECLINED' },
  rejected: { color: '#6B6B68', label: 'DECLINED' },
  expired:  { color: '#6B6B68', label: 'EXPIRED' },
  removed:  { color: '#6B6B68', label: 'REMOVED' },
}

function Pill({ status, label }: { status: string; label?: string }) {
  const cfg = STATUS_CFG[status] ?? { color: '#6B6B68', label: status.toUpperCase() }
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      fontFamily: 'JetBrains Mono, monospace', fontWeight: 900,
      fontSize: 9, letterSpacing: '0.16em', textTransform: 'uppercase',
      padding: '3px 7px', border: `1px solid ${cfg.color}33`, color: cfg.color,
    }}>
      <span style={{ width: 6, height: 6, background: cfg.color, flexShrink: 0, display: 'block' }} />
      {label ?? cfg.label}
    </span>
  )
}

function InviteCard({
  item,
  inviters,
  actionLoading,
  showActions,
  onAccept,
  onDecline,
  onNavigate,
}: {
  item: InviteItem
  inviters: Record<string, InviterProfile>
  actionLoading: string | null
  showActions: boolean
  onAccept: () => void
  onDecline: () => void
  onNavigate?: () => void
}) {
  const inviter = item.invited_by_user_id ? inviters[item.invited_by_user_id] : null
  const inviterName = inviter?.name ?? 'Someone'
  const isLoading = actionLoading === item.id
  const wodCount = item.assigned_wod_ids?.length ?? 0

  const descLine = item.invite_type === 'judge'
    ? `${inviterName} invited you to be a judge.`
    : `${inviterName} invited you to team ${item.team_name ?? 'no name'}.`

  return (
    <div style={{
      background: '#111111',
      borderLeft: `3px solid ${showActions ? '#D4FF3A' : '#2A2A2A'}`,
      borderBottom: '1px solid #2A2A2A',
      padding: '14px 16px',
      display: 'grid',
      gridTemplateColumns: '40px 1fr',
      gap: 12,
    }}>
      <div style={{
        width: 40, height: 40, flexShrink: 0,
        background: showActions ? '#D4FF3A' : '#1A1A1A',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontFamily: 'JetBrains Mono, monospace', fontWeight: 900, fontSize: 13,
        color: showActions ? '#0A0A0A' : '#6B6B68',
      }}>
        {avatarInitials(inviterName)}
      </div>

      <div>
        <p style={{ fontSize: 14, fontWeight: 600, color: '#F5F5F0', lineHeight: 1.35, marginBottom: 4 }}>
          {descLine}
        </p>
        <p style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: '#6B6B68', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 8 }}>
          {item.competition_name} · {formatDate(item.competition_date)}
        </p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
          <Pill status={item.status} />
          {item.invite_type === 'judge' && wodCount > 0 && (
            <Pill status="pending" label={`${wodCount} WOD${wodCount > 1 ? 'S' : ''} ASSIGNED`} />
          )}
        </div>
        <p style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 9, color: '#3D3D3B', letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: showActions ? 12 : 0 }}>
          RECEIVED · {formatTimestamp(item.created_at)}
        </p>

        {showActions && (
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={onAccept}
              disabled={isLoading}
              style={{
                flex: 1, padding: '10px 0',
                background: '#D4FF3A', color: '#0A0A0A', border: 0,
                fontFamily: 'JetBrains Mono, monospace', fontWeight: 900,
                fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase',
                opacity: isLoading ? 0.5 : 1, cursor: isLoading ? 'not-allowed' : 'pointer',
              }}
            >
              ACCEPT
            </button>
            <button
              onClick={onDecline}
              disabled={isLoading}
              style={{
                flex: 1, padding: '10px 0',
                background: 'transparent', color: '#6B6B68',
                border: '1px solid #2A2A2A',
                fontFamily: 'JetBrains Mono, monospace', fontWeight: 900,
                fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase',
                opacity: isLoading ? 0.5 : 1, cursor: isLoading ? 'not-allowed' : 'pointer',
              }}
            >
              DECLINE
            </button>
          </div>
        )}

        {onNavigate && (
          <button
            onClick={onNavigate}
            style={{
              display: 'block', width: '100%', padding: '10px 0', marginTop: 8,
              background: 'transparent', color: '#D4FF3A',
              border: '1px solid #D4FF3A44',
              fontFamily: 'JetBrains Mono, monospace', fontWeight: 900,
              fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase',
              cursor: 'pointer',
            }}
          >
            GO TO PANEL
          </button>
        )}
      </div>
    </div>
  )
}

export default function InviteInbox() {
  const navigate = useNavigate()
  const { invites, inviters, loading, actionLoading, acceptInvite, declineInvite } = useInviteInbox()

  const pending = invites.filter(i => i.status === 'pending' || i.status === 'invited')
  const history = invites.filter(i => i.status !== 'pending' && i.status !== 'invited')

  const heroInvite = pending[0] ?? null
  const heroInviter = heroInvite?.invited_by_user_id ? inviters[heroInvite.invited_by_user_id] : null
  const heroInviterName = heroInviter?.name ?? 'Someone'

  return (
    <div style={{ minHeight: '100vh', background: '#0A0A0A', color: '#F5F5F0', display: 'flex', flexDirection: 'column' }}>

      {/* Topbar */}
      <header style={{
        position: 'sticky', top: 0, zIndex: 10,
        height: 52, padding: '0 16px',
        background: '#0A0A0A', borderBottom: '1px solid #2A2A2A',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <button
          onClick={() => navigate(-1)}
          style={{ width: 36, height: 36, background: 'transparent', border: 0, color: '#6B6B68', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>
        <span style={{ fontFamily: 'JetBrains Mono, monospace', fontWeight: 900, fontSize: 11, letterSpacing: '0.22em', textTransform: 'uppercase' }}>
          INVITE · INBOX
        </span>
        <div style={{ width: 36 }} />
      </header>

      <div style={{ flex: 1, overflowY: 'auto', paddingBottom: 96 }}>

        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 64 }}>
            <div className="animate-spin" style={{ width: 20, height: 20, border: '2px solid #D4FF3A', borderTopColor: 'transparent' }} />
          </div>
        ) : invites.length === 0 ? (
          <div style={{ padding: '64px 20px', textAlign: 'center' }}>
            <span style={{ fontFamily: 'JetBrains Mono, monospace', fontWeight: 700, fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#3D3D3B' }}>
              NO INVITES RECEIVED
            </span>
          </div>
        ) : (
          <>
            {/* Hero */}
            {heroInvite && (
              <div style={{ padding: '20px 20px 24px', borderBottom: '1px solid #2A2A2A' }}>
                <span style={{ fontFamily: 'JetBrains Mono, monospace', fontWeight: 700, fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#D4FF3A', display: 'block', marginBottom: 10 }}>
                  {pending.length} NOTIFICATION{pending.length === 1 ? '' : 'S'} · {pending.length} PENDING
                </span>
                <h1 style={{ fontFamily: 'Space Grotesk, sans-serif', fontSize: 28, fontWeight: 700, lineHeight: 1.1, letterSpacing: '-0.02em', margin: 0 }}>
                  {heroInvite.invite_type === 'judge' ? (
                    <>You have an invite to be a <span style={{ color: '#D4FF3A' }}>judge.</span></>
                  ) : (
                    <>You have an invite to join a <span style={{ color: '#D4FF3A' }}>team.</span></>
                  )}
                </h1>
                <p style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#6B6B68', marginTop: 10 }}>
                  {heroInviterName} · {heroInvite.competition_name} · {formatTimestamp(heroInvite.created_at)}
                </p>
              </div>
            )}

            {/* Pendentes */}
            {pending.length > 0 && (
              <div>
                <div style={{ padding: '14px 20px 10px', borderBottom: '1px solid #2A2A2A' }}>
                  <span style={{ fontFamily: 'JetBrains Mono, monospace', fontWeight: 900, fontSize: 10, letterSpacing: '0.16em', textTransform: 'uppercase', color: '#F5F5F0' }}>
                    01 PENDING
                  </span>
                </div>
                {pending.map(item => (
                  <InviteCard
                    key={item.id}
                    item={item}
                    inviters={inviters}
                    actionLoading={actionLoading}
                    showActions
                    onAccept={() => acceptInvite(item)}
                    onDecline={() => declineInvite(item)}
                  />
                ))}
              </div>
            )}

            {/* Histórico */}
            {history.length > 0 && (
              <div>
                <div style={{ padding: '14px 20px 10px', borderBottom: '1px solid #2A2A2A' }}>
                  <span style={{ fontFamily: 'JetBrains Mono, monospace', fontWeight: 900, fontSize: 10, letterSpacing: '0.16em', textTransform: 'uppercase', color: '#6B6B68' }}>
                    {pending.length > 0 ? '02' : '01'} ACCEPTED · HISTORY
                  </span>
                </div>
                {history.map(item => (
                  <InviteCard
                    key={item.id}
                    item={item}
                    inviters={inviters}
                    actionLoading={actionLoading}
                    showActions={false}
                    onAccept={() => {}}
                    onDecline={() => {}}
                    onNavigate={
                      item.invite_type === 'judge' && item.status === 'accepted'
                        ? () => navigate(`/athlete/competitions/${item.competition_id}/judge`)
                        : undefined
                    }
                  />
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

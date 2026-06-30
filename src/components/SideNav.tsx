import { useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { useProfile } from '@/hooks/useProfile'

const NAV_ITEMS = [
  {
    id: 'home',
    path: '/athlete',
    label: 'Home',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M3 12l9-9 9 9" /><path d="M5 10v10h14V10" />
      </svg>
    ),
  },
  {
    id: 'workouts',
    path: '/athlete/my-workouts',
    label: 'Workouts',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
      </svg>
    ),
  },
  {
    id: 'competitions',
    path: '/athlete/competitions',
    label: 'Competitions',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M8 21h8M12 17v4M5 3h14l-1 9a7 7 0 01-12 0L5 3z" />
      </svg>
    ),
  },
  {
    id: 'stats',
    path: '/athlete/stats',
    label: 'PRs',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M3 17l6-6 4 4 8-8" /><path d="M21 7v0M21 7h-4" />
      </svg>
    ),
  },
  {
    id: 'profile',
    path: '/athlete/profile',
    label: 'Profile',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="8" r="4" /><path d="M4 21c1-4 5-6 8-6s7 2 8 6" />
      </svg>
    ),
  },
]

export default function SideNav() {
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const { user } = useAuth()
  const { profile } = useProfile(user?.id)

  const hasPersonal = profile?.roles?.some((r: string) => ['admin', 'personal'].includes(r))

  return (
    <nav
      className="hidden md:flex flex-col shrink-0 h-screen sticky top-0"
      style={{ width: 220, background: '#111111', borderRight: '1px solid #1A1A1A' }}
    >
      {/* Wordmark */}
      <div className="px-6 pt-7 pb-6" style={{ borderBottom: '1px solid #1A1A1A' }}>
        <div className="flex flex-col leading-none">
          <span className="font-mono font-black text-[20px] text-soft-white tracking-[0.04em]">GO</span>
          <div style={{ height: 2, background: '#D4FF3A', margin: '4px 0' }} />
          <span className="font-mono font-black text-[20px] text-soft-white tracking-[0.04em]">UNBROKEN</span>
        </div>
      </div>

      {/* Nav items */}
      <div className="flex flex-col flex-1 py-3">
        {NAV_ITEMS.map(item => {
          const active = item.path === '/athlete' ? pathname === '/athlete' : pathname.startsWith(item.path)
          return (
            <button
              key={item.id}
              onClick={() => navigate(item.path)}
              className="flex items-center gap-3 px-5 py-3 text-left active:bg-[#141414] transition-colors"
              style={{
                borderLeft: active ? '2px solid #D4FF3A' : '2px solid transparent',
                background: active ? '#141414' : 'transparent',
              }}
            >
              <span style={{ color: active ? '#F5F5F0' : '#6B6B68' }}>{item.icon}</span>
              <span
                className="font-mono font-bold uppercase tracking-[0.12em] text-[11px]"
                style={{ color: active ? '#F5F5F0' : '#6B6B68' }}
              >
                {item.label}
              </span>
            </button>
          )
        })}

        {/* Personal / Admin link */}
        {hasPersonal && (
          <button
            onClick={() => navigate('/athlete/personal')}
            className="flex items-center gap-3 px-5 py-3 text-left active:bg-[#141414] transition-colors"
            style={{
              borderLeft: pathname.startsWith('/athlete/personal') || pathname.startsWith('/athlete/admin')
                ? '2px solid #D4FF3A' : '2px solid transparent',
              background: pathname.startsWith('/athlete/personal') || pathname.startsWith('/athlete/admin')
                ? '#141414' : 'transparent',
              marginTop: 4,
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
              style={{ color: pathname.startsWith('/athlete/personal') || pathname.startsWith('/athlete/admin') ? '#F5F5F0' : '#6B6B68' }}>
              <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />
            </svg>
            <span
              className="font-mono font-bold uppercase tracking-[0.12em] text-[11px]"
              style={{ color: pathname.startsWith('/athlete/personal') || pathname.startsWith('/athlete/admin') ? '#F5F5F0' : '#6B6B68' }}
            >
              Personal
            </span>
          </button>
        )}
      </div>

      {/* Register PR button */}
      <div className="px-4 pb-4" style={{ borderTop: '1px solid #1A1A1A', paddingTop: 16 }}>
        <button
          onClick={() => navigate('/athlete/add')}
          className="w-full flex items-center gap-3 px-4 py-3 active:opacity-80 transition-opacity"
          style={{ background: '#D4FF3A' }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#0A0A0A" strokeWidth="2.5">
            <path d="M12 5v14M5 12h14" />
          </svg>
          <span className="font-mono font-bold uppercase tracking-[0.14em] text-[11px]" style={{ color: '#0A0A0A' }}>
            Register PR
          </span>
        </button>

        {/* User pill */}
        {profile?.name && (
          <button
            onClick={() => navigate('/athlete/profile')}
            className="w-full flex items-center gap-2 mt-3 px-2 py-2 active:opacity-70"
          >
            <div
              className="flex items-center justify-center shrink-0 font-mono font-black text-[11px]"
              style={{ width: 28, height: 28, background: '#1A1A1A', border: '1px solid #2A2A2A', color: '#D4FF3A' }}
            >
              {profile.name.trim()[0].toUpperCase()}
            </div>
            <span className="font-mono text-[11px] text-[#6B6B68] truncate">
              {profile.name.trim().split(' ')[0]}
            </span>
          </button>
        )}
      </div>
    </nav>
  )
}

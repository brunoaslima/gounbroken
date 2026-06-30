import { useLocation, useNavigate } from 'react-router-dom'

const NAV_ITEMS = [
  {
    id: 'home',
    path: '/athlete',
    label: 'Home',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M3 12l9-9 9 9" /><path d="M5 10v10h14V10" />
      </svg>
    ),
  },
  {
    id: 'workouts',
    path: '/athlete/my-workouts',
    label: 'Treinos',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
      </svg>
    ),
  },
  {
    id: 'competitions',
    path: '/athlete/competitions',
    label: 'Comp.',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M8 21h8M12 17v4M5 3h14l-1 9a7 7 0 01-12 0L5 3z" />
      </svg>
    ),
  },
  {
    id: 'profile',
    path: '/athlete/profile',
    label: 'Perfil',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="8" r="4" /><path d="M4 21c1-4 5-6 8-6s7 2 8 6" />
      </svg>
    ),
  },
]

export default function BottomNav() {
  const navigate = useNavigate()
  const { pathname } = useLocation()

  return (
    <nav
      className="md:hidden fixed bottom-0 left-0 right-0 z-30 bg-graphite border-t border-[#2A2A2A]"
      style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 8px)' }}
    >
      <div className="grid grid-cols-5">
        {/* Left 2 items */}
        {NAV_ITEMS.slice(0, 2).map(item => {
          const active = item.path === '/athlete' ? pathname === '/athlete' : pathname.startsWith(item.path)
          return (
            <button
              key={item.id}
              onClick={() => navigate(item.path)}
              className="flex flex-col items-center gap-1.5 pt-2.5 pb-2 relative"
            >
              {active && (
                <span className="absolute top-0 left-1/2 -translate-x-1/2 w-6 h-0.5 bg-lime" />
              )}
              <span style={{ color: active ? '#F5F5F0' : '#6B6B68' }}>{item.icon}</span>
              <span
                className="font-mono font-bold uppercase tracking-widest"
                style={{ fontSize: 9, color: active ? '#F5F5F0' : '#6B6B68' }}
              >
                {item.label}
              </span>
            </button>
          )
        })}

        {/* Center FAB — lime square */}
        <button
          onClick={() => navigate('/athlete/add')}
          className="flex flex-col items-center justify-center pt-1"
        >
          <span
            className="flex items-center justify-center active:scale-95 transition-transform"
            style={{ width: 44, height: 44, background: '#D4FF3A', marginTop: -12 }}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#0A0A0A" strokeWidth="2.5">
              <path d="M12 5v14M5 12h14" />
            </svg>
          </span>
        </button>

        {/* Right 2 items */}
        {NAV_ITEMS.slice(2).map(item => {
          const active = pathname.startsWith(item.path)
          return (
            <button
              key={item.id}
              onClick={() => navigate(item.path)}
              className="flex flex-col items-center gap-1.5 pt-2.5 pb-2 relative"
            >
              {active && (
                <span className="absolute top-0 left-1/2 -translate-x-1/2 w-6 h-0.5 bg-lime" />
              )}
              <span style={{ color: active ? '#F5F5F0' : '#6B6B68' }}>{item.icon}</span>
              <span
                className="font-mono font-bold uppercase tracking-widest"
                style={{ fontSize: 9, color: active ? '#F5F5F0' : '#6B6B68' }}
              >
                {item.label}
              </span>
            </button>
          )
        })}
      </div>
    </nav>
  )
}

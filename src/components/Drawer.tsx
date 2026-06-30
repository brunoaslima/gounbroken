import { useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { useProfile } from '@/hooks/useProfile'

interface Props {
  open: boolean
  onClose: () => void
}

interface NavItemProps {
  icon: React.ReactNode
  label: string
  active: boolean
  onClick: () => void
}

function NavItem({ icon, label, active, onClick }: NavItemProps) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-colors ${
        active ? 'bg-lime/15 text-lime' : 'text-muted-gray hover:text-soft-white hover:bg-white/5'
      }`}
    >
      <span className="w-5 shrink-0">{icon}</span>
      <span className="font-medium text-sm">{label}</span>
    </button>
  )
}

export default function Drawer({ open, onClose }: Props) {
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const { user, signOut } = useAuth()
  const { profile } = useProfile(user?.id)

  function go(path: string) {
    navigate(path)
    onClose()
  }

  const displayName = profile?.name ?? user?.email ?? ''

  return (
    <>
      {open && (
        <div
          className="fixed inset-0 bg-black/60 z-40"
          onClick={onClose}
        />
      )}

      <div className={`fixed top-0 left-0 h-full w-72 bg-card border-r border-white/5 z-50 flex flex-col transition-transform duration-300 ${
        open ? 'translate-x-0' : '-translate-x-full'
      }`}
      style={{ paddingTop: 'env(safe-area-inset-top)', paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        <div className="px-5 py-5 flex items-center justify-between border-b border-white/5">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-lime/15 border border-lime/20 flex items-center justify-center">
              <span className="text-lime font-black text-sm">GU</span>
            </div>
            <div>
              <p className="font-bold text-soft-white text-sm">Go Unbroken</p>
              <p className="text-muted-gray text-xs truncate max-w-[140px]">{displayName}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-muted-gray hover:text-soft-white p-1">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          <p className="text-[10px] font-semibold text-muted-gray/60 uppercase tracking-wider px-4 mb-2">Menu</p>

          <NavItem
            label="Recordes Pessoais"
            active={pathname === '/athlete'}
            onClick={() => go('/athlete')}
            icon={
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
              </svg>
            }
          />

          <NavItem
            label="Stats"
            active={pathname === '/athlete/stats'}
            onClick={() => go('/athlete/stats')}
            icon={
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            }
          />

          <NavItem
            label="Meus Treinos"
            active={pathname === '/athlete/my-workouts'}
            onClick={() => go('/athlete/my-workouts')}
            icon={
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
              </svg>
            }
          />

          {(profile?.roles?.includes('personal') || profile?.roles?.includes('admin')) && (
            <NavItem
              label="Personal Trainer"
              active={pathname.startsWith('/athlete/personal')}
              onClick={() => go('/athlete/personal')}
              icon={
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              }
            />
          )}

          {profile?.roles?.includes('admin') && (
            <NavItem
              label="Admin"
              active={pathname === '/athlete/admin'}
              onClick={() => go('/athlete/admin')}
              icon={
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              }
            />
          )}
        </nav>

        <div className="px-3 py-4 border-t border-white/5">
          <NavItem
            label="Sair"
            active={false}
            onClick={() => { signOut(); onClose() }}
            icon={
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            }
          />
        </div>
      </div>
    </>
  )
}

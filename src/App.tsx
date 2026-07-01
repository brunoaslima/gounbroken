import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { useProfile } from '@/hooks/useProfile'
import Login from '@/pages/Login'
import Home from '@/pages/Home'
import AddScore from '@/pages/AddScore'
import MovementDetail from '@/pages/MovementDetail'
import Stats from '@/pages/Stats'
import Profile from '@/pages/Profile'
import Onboarding from '@/pages/Onboarding'
import Admin from '@/pages/Admin'
import Personal from '@/pages/Personal'
import PersonalAthlete from '@/pages/PersonalAthlete'
import PersonalWorkout from '@/pages/PersonalWorkout'
import MyWorkouts from '@/pages/MyWorkouts'
import Invite from '@/pages/Invite'
import Buildup from '@/pages/Buildup'
import AthleteReport from '@/pages/AthleteReport'
import WrappedReport from '@/pages/WrappedReport'
import CompetitionList from '@/pages/CompetitionList'
import CompetitionDetail from '@/pages/CompetitionDetail'
import CompetitionCreate from '@/pages/CompetitionCreate'
import CompetitionManage from '@/pages/CompetitionManage'
import TeamCreate from '@/pages/TeamCreate'
import TeamManage from '@/pages/TeamManage'
import JudgePanel from '@/pages/JudgePanel'
import Leaderboard from '@/pages/Leaderboard'
import InviteInbox from '@/pages/InviteInbox'
import BottomNav from '@/components/BottomNav'
import SideNav from '@/components/SideNav'
import TermsAcceptance from '@/pages/TermsAcceptance'
import CompetitionPublic from '@/pages/CompetitionPublic'
import Landing from '@/pages/Landing'
import Timer from '@/pages/Timer'
import { CURRENT_TERMS_VERSION } from '@/lib/terms'

function Spinner() {
  return (
    <div className="min-h-screen bg-graphite flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-lime border-t-transparent rounded-full animate-spin" />
    </div>
  )
}

function RequireAuth({ children }: { children: React.ReactNode }) {
  const { user, loading: authLoading } = useAuth()
  const { profile, loading: profileLoading } = useProfile(user?.id)

  if (authLoading || (user && profileLoading)) return <Spinner />
  if (!user) return <Navigate to="/login" replace />
  // Terms gate runs before onboarding so all users are covered legally first.
  if (!profile || (profile as { terms_version?: string | null }).terms_version !== CURRENT_TERMS_VERSION)
    return <Navigate to="/terms" replace />
  // Redirect to onboarding when the profile is missing or explicitly incomplete.
  // `onboarding_completed` is set to true only by Onboarding.handleFinish / handleSkip.
  if (!profile.onboarding_completed) return <Navigate to="/onboarding" replace />
  return <>{children}</>
}

function RequireRole({ roles, children }: { children: React.ReactNode; roles: string[] }) {
  const { user, loading: authLoading } = useAuth()
  const { profile, loading: profileLoading } = useProfile(user?.id)

  if (authLoading || (user && profileLoading)) return <Spinner />
  if (!user) return <Navigate to="/login" replace />
  const userRoles: string[] = (profile as { roles?: string[] } | null)?.roles ?? []
  if (!roles.some(r => userRoles.includes(r))) return <Navigate to="/athlete" replace />
  return <>{children}</>
}

function LandingOrLogin() {
  if (window.innerWidth < 768) return <Navigate to="/login" replace />
  return <Landing />
}

function RequireAuthNoProfile({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()
  if (loading) return <Spinner />
  if (!user) return <Navigate to="/login" replace />
  return <>{children}</>
}

// Pages that show the bottom nav (mobile) or sidebar (desktop)
function TabLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-dvh overflow-hidden">
      <SideNav />
      <div className="flex-1 overflow-y-auto min-h-0">
        {children}
        <BottomNav />
      </div>
    </div>
  )
}

export default function App() {
  const { loading } = useAuth()
  if (loading) return <Spinner />

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/"                  element={<Navigate to="/home" replace />} />
        <Route path="/home"              element={<LandingOrLogin />} />
        <Route path="/competition/:slug" element={<CompetitionPublic />} />
        <Route path="/invite/:code"      element={<Invite />} />
        <Route path="/login"             element={<Login />} />
        <Route path="/onboarding"        element={<RequireAuthNoProfile><Onboarding /></RequireAuthNoProfile>} />
        <Route path="/terms"             element={<RequireAuthNoProfile><TermsAcceptance /></RequireAuthNoProfile>} />
        {/* Authenticated app routes */}
        <Route path="/athlete"                element={<RequireAuth><TabLayout><Home /></TabLayout></RequireAuth>} />
        <Route path="/athlete/stats"          element={<RequireAuth><TabLayout><Stats /></TabLayout></RequireAuth>} />
        <Route path="/athlete/profile"        element={<RequireAuth><TabLayout><Profile /></TabLayout></RequireAuth>} />
        <Route path="/athlete/movements"      element={<Navigate to="/athlete/my-workouts" replace />} />
        <Route path="/athlete/my-workouts"    element={<RequireAuth><TabLayout><MyWorkouts /></TabLayout></RequireAuth>} />
        <Route path="/athlete/add"            element={<RequireAuth><TabLayout><AddScore /></TabLayout></RequireAuth>} />
        <Route path="/athlete/movement/:id"   element={<RequireAuth><TabLayout><MovementDetail /></TabLayout></RequireAuth>} />
        <Route path="/athlete/buildup"        element={<RequireAuth><TabLayout><Buildup /></TabLayout></RequireAuth>} />
        <Route path="/athlete/timer"          element={<RequireAuth><TabLayout><Timer /></TabLayout></RequireAuth>} />
        <Route path="/athlete/invites"        element={<RequireAuth><TabLayout><InviteInbox /></TabLayout></RequireAuth>} />
        <Route path="/athlete/admin"          element={<RequireRole roles={['admin']}><TabLayout><Admin /></TabLayout></RequireRole>} />
        <Route path="/athlete/personal"              element={<RequireRole roles={['admin','personal']}><TabLayout><Personal /></TabLayout></RequireRole>} />
        <Route path="/athlete/personal/athlete/:id" element={<RequireRole roles={['admin','personal']}><TabLayout><PersonalAthlete /></TabLayout></RequireRole>} />
        <Route path="/athlete/personal/new"          element={<RequireRole roles={['admin','personal']}><TabLayout><PersonalWorkout /></TabLayout></RequireRole>} />
        <Route path="/athlete/report"           element={<RequireRole roles={['admin','ai']}><AthleteReport /></RequireRole>} />
        <Route path="/athlete/report/:athleteId" element={<RequireRole roles={['admin','ai']}><AthleteReport /></RequireRole>} />
        <Route path="/athlete/wrapped"             element={<RequireRole roles={['admin','ai']}><WrappedReport /></RequireRole>} />
        <Route path="/athlete/wrapped/:athleteId"  element={<RequireRole roles={['admin','ai']}><WrappedReport /></RequireRole>} />
        {/* Competitions */}
        <Route path="/athlete/competitions"                  element={<RequireAuth><TabLayout><CompetitionList /></TabLayout></RequireAuth>} />
        <Route path="/athlete/competitions/new"              element={<RequireRole roles={['admin']}><TabLayout><CompetitionCreate /></TabLayout></RequireRole>} />
        <Route path="/athlete/competitions/:id"              element={<RequireAuth><TabLayout><CompetitionDetail /></TabLayout></RequireAuth>} />
        <Route path="/athlete/competitions/:id/manage"       element={<RequireAuth><TabLayout><CompetitionManage /></TabLayout></RequireAuth>} />
        <Route path="/athlete/competitions/:id/team/new"     element={<RequireAuth><TabLayout><TeamCreate /></TabLayout></RequireAuth>} />
        <Route path="/athlete/competitions/:id/team/:teamId" element={<RequireAuth><TabLayout><TeamManage /></TabLayout></RequireAuth>} />
        <Route path="/athlete/competitions/:id/judge"        element={<RequireAuth><TabLayout><JudgePanel /></TabLayout></RequireAuth>} />
        <Route path="/athlete/competitions/:id/leaderboard"  element={<RequireAuth><TabLayout><Leaderboard /></TabLayout></RequireAuth>} />
        <Route path="*"               element={<Navigate to="/home" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

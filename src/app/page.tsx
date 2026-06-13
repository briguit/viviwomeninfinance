'use client'
import { useApp } from '@/context/AppContext'
import OnboardingScreen from '@/screens/OnboardingScreen'
import ChatScreen from '@/screens/ChatScreen'
import ChallengesScreen from '@/screens/ChallengesScreen'
import ProfileScreen from '@/screens/ProfileScreen'
import BottomNav from '@/components/BottomNav'

export default function Home() {
  const { route, screen } = useApp()

  // Auth not ready yet — blank while localStorage is checked
  if (route === 'loading') {
    return (
      <div className="app-shell flex items-center justify-center min-h-dvh">
        <div className="w-10 h-10 border-4 border-vivi-purple/20 border-t-vivi-purple rounded-full animate-spin" />
      </div>
    )
  }

  // Not authenticated OR no profile yet → full onboarding flow
  if (route === 'splash' || route === 'onboarding') {
    return <OnboardingScreen startAtIdentity={route === 'onboarding'} />
  }

  // Authenticated + profile → main app
  return (
    <div className="app-shell">
      <main className="pb-20">
        {screen === 'chat'       && <ChatScreen />}
        {screen === 'challenges' && <ChallengesScreen />}
        {screen === 'profile'    && <ProfileScreen />}
      </main>
      <BottomNav />
    </div>
  )
}

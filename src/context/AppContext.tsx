'use client'
import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react'
import { useAuth, type AuthState } from '@/lib/useAuth'

export type Lang = 'es' | 'en'
export type Screen = 'chat' | 'challenges' | 'profile'
export type AppRoute = 'loading' | 'splash' | 'onboarding' | 'app'
export type ChallengeStatus = 'completed' | 'available' | 'locked'
export type ChallengeId = 'first-question' | 'defi' | 'savings' | 'verify' | 'ens'

export interface User {
  name: string
  viviEns: string
  country: string
  worldIdVerified: boolean
  usdcBalance: number
  points: number
  level: number
  challengesCompleted: number
}

export interface ChatMessage {
  id: string
  role: 'vivi' | 'user'
  text: string
  card?: {
    platform: string
    rate: string
    source: string
    time: string
    url: string
  }
}

const DEFAULT_CHALLENGE_STATUSES: Record<ChallengeId, ChallengeStatus> = {
  'first-question': 'available',
  'defi':           'locked',
  'savings':        'locked',
  'verify':         'available',
  'ens':            'locked',
}

interface AppContextType {
  auth: AuthState
  route: AppRoute
  screen: Screen
  setScreen: (s: Screen) => void
  lang: Lang
  setLang: (l: Lang) => void
  user: User | null
  saveAndSetUser: (u: User) => void
  walletAddress: string | null
  walletCreating: boolean
  handleLogout: () => void
  chatHistory: ChatMessage[]
  saveChatHistory: (msgs: ChatMessage[]) => void
  challengeStatuses: Record<ChallengeId, ChallengeStatus>
  completeChallengeById: (id: ChallengeId, reward: number) => void
}

const AppContext = createContext<AppContextType | null>(null)

export function AppProvider({ children }: { children: ReactNode }) {
  const auth = useAuth()
  const [screen, setScreen] = useState<Screen>('chat')
  const [lang, setLangState] = useState<Lang>('es')
  const [user, setUser] = useState<User | null>(null)
  const [route, setRoute] = useState<AppRoute>('loading')
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([])
  const [challengeStatuses, setChallengeStatuses] = useState<Record<ChallengeId, ChallengeStatus>>(DEFAULT_CHALLENGE_STATUSES)

  function loadPersistedState(uid: string) {
    const savedChat = localStorage.getItem(`vivi_chat_${uid}`)
    if (savedChat) {
      try { setChatHistory(JSON.parse(savedChat)) } catch { /* ignore */ }
    }
    const savedChallenges = localStorage.getItem(`vivi_challenges_${uid}`)
    if (savedChallenges) {
      try {
        const parsed = JSON.parse(savedChallenges) as Partial<Record<ChallengeId, ChallengeStatus>>
        setChallengeStatuses({ ...DEFAULT_CHALLENGE_STATUSES, ...parsed })
      } catch { /* ignore */ }
    }
  }

  // Determine route + load persisted state once auth is ready
  useEffect(() => {
    if (!auth.ready) return

    // Language preference is independent of auth
    const savedLang = localStorage.getItem('vivi_lang') as Lang | null
    if (savedLang === 'es' || savedLang === 'en') setLangState(savedLang)

    if (!auth.authenticated) {
      setRoute('splash')
      return
    }

    const profile = auth.loadProfile()
    if (!profile) {
      setRoute('onboarding')
    } else {
      setUser(profile)
      setRoute('app')
      setScreen('chat')
      if (auth.userId) loadPersistedState(auth.userId)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auth.ready, auth.authenticated, auth.userId])

  function setLang(l: Lang) {
    setLangState(l)
    localStorage.setItem('vivi_lang', l)
  }

  const saveChatHistory = useCallback((msgs: ChatMessage[]) => {
    if (!auth.userId) return
    const trimmed = msgs.slice(-60)
    setChatHistory(trimmed)
    localStorage.setItem(`vivi_chat_${auth.userId}`, JSON.stringify(trimmed))
  }, [auth.userId])

  const completeChallengeById = useCallback((id: ChallengeId, reward: number) => {
    setChallengeStatuses(prev => {
      const next = { ...prev, [id]: 'completed' as ChallengeStatus }
      if (id === 'first-question') next['defi']    = 'available'
      if (id === 'defi')           next['savings'] = 'available'
      if (id === 'savings')        next['ens']     = 'available'
      if (auth.userId) {
        localStorage.setItem(`vivi_challenges_${auth.userId}`, JSON.stringify(next))
      }
      return next
    })
    setUser(prev => {
      if (!prev) return prev
      const newPoints = prev.points + reward * 10
      const updated: User = {
        ...prev,
        usdcBalance: Math.round((prev.usdcBalance + reward) * 100) / 100,
        points: newPoints,
        level: Math.floor(newPoints / 100) + 1,
        challengesCompleted: prev.challengesCompleted + 1,
      }
      auth.saveProfile(updated)
      return updated
    })
  }, [auth])

  const saveAndSetUser = useCallback((u: User) => {
    setUser(u)
    auth.saveProfile(u)
    setRoute(r => (r === 'onboarding' || r === 'splash' ? 'app' : r))
    setScreen('chat')
    if (auth.userId) loadPersistedState(auth.userId)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auth])

  const handleLogout = useCallback(() => {
    void auth.logout()
    setUser(null)
    setRoute('splash')
    setScreen('chat')
    setChatHistory([])
    setChallengeStatuses(DEFAULT_CHALLENGE_STATUSES)
  }, [auth])

  return (
    <AppContext.Provider value={{
      auth, route, screen, setScreen,
      lang, setLang,
      user, saveAndSetUser,
      walletAddress: auth.walletAddress,
      walletCreating: auth.walletCreating,
      handleLogout,
      chatHistory, saveChatHistory,
      challengeStatuses, completeChallengeById,
    }}>
      {children}
    </AppContext.Provider>
  )
}

export function useApp() {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp must be used within AppProvider')
  return ctx
}

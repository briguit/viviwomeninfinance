'use client'
import { useEffect, useRef } from 'react'
import { usePrivy, useWallets, useCreateWallet } from '@privy-io/react-auth'
import type { User } from '@/context/AppContext'

export interface AuthState {
  ready: boolean
  authenticated: boolean
  /** True while Privy is actively creating the embedded wallet (first-time users only). */
  walletCreating: boolean
  userId: string | null
  userEmail: string | null
  walletAddress: string | null
  login: () => void
  logout: () => Promise<void>
  loadProfile: () => User | null
  saveProfile: (profile: User) => void
}

export function useAuth(): AuthState {
  const { ready, authenticated, user, login, logout } = usePrivy()
  const { wallets } = useWallets()
  const { createWallet } = useCreateWallet()

  const userId = user?.id ?? null
  const userEmail = user?.email?.address ?? null
  const embeddedWallet = wallets.find(w => w.walletClientType === 'privy')
  const walletAddress = embeddedWallet?.address ?? null
  const walletCreating = ready && authenticated && !walletAddress

  // createOnLogin:'users-without-wallets' only fires for Privy modal flows.
  // For headless useLoginWithEmail we must call createWallet() manually.
  const creationFiredRef = useRef(false)
  const walletAddressRef = useRef(walletAddress)
  walletAddressRef.current = walletAddress

  useEffect(() => {
    if (!ready || !authenticated) return
    if (walletAddressRef.current) return
    if (creationFiredRef.current) return
    const tid = setTimeout(() => {
      if (walletAddressRef.current) return
      creationFiredRef.current = true
      console.log('[Vivi] Creating embedded wallet (headless auth)...')
      void createWallet().catch(err =>
        console.warn('[Vivi] createWallet error:', (err as Error)?.message ?? err)
      )
    }, 800)
    return () => clearTimeout(tid)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, authenticated])

  function loadProfile(): User | null {
    if (!userId) return null
    const raw = localStorage.getItem(`vivi_profile_${userId}`)
    if (!raw) return null
    try { return JSON.parse(raw) as User } catch { return null }
  }

  function saveProfile(profile: User) {
    if (!userId) return
    localStorage.setItem(`vivi_profile_${userId}`, JSON.stringify(profile))
  }

  return {
    ready,
    authenticated,
    walletCreating,
    userId,
    userEmail,
    walletAddress,
    login,
    logout,
    loadProfile,
    saveProfile,
  }
}

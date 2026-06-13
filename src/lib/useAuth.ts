'use client'
import { usePrivy, useWallets } from '@privy-io/react-auth'
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

  const userId = user?.id ?? null
  const userEmail = user?.email?.address ?? null
  // Privy creates the embedded wallet automatically after login (createOnLogin: 'users-without-wallets')
  const embeddedWallet = wallets.find(w => w.walletClientType === 'privy')
  const walletAddress = embeddedWallet?.address ?? null
  // Wallet is being created when Privy is ready + authenticated but no embedded wallet exists yet
  const walletCreating = ready && authenticated && !walletAddress

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

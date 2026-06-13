'use client'
import { useState, useEffect } from 'react'
import type { User } from '@/context/AppContext'

// Mock Privy — same interface as @privy-io/react-auth's usePrivy.
// To switch to real Privy: replace this hook's internals with usePrivy().
// The persistence contract (localStorage keys) stays the same.

export interface AuthState {
  ready: boolean
  authenticated: boolean
  userId: string | null
  userEmail: string | null
  login: (email: string) => void
  logout: () => void
  loadProfile: () => User | null
  saveProfile: (profile: User) => void
}

function getOrCreateUserId(email: string): string {
  const key = `vivi_uid_${email.toLowerCase().trim()}`
  let id = localStorage.getItem(key)
  if (!id) {
    id = crypto.randomUUID()
    localStorage.setItem(key, id)
  }
  return id
}

export function useAuth(): AuthState {
  const [ready, setReady] = useState(false)
  const [authenticated, setAuthenticated] = useState(false)
  const [userId, setUserId] = useState<string | null>(null)
  const [userEmail, setUserEmail] = useState<string | null>(null)

  useEffect(() => {
    const sessionEmail = localStorage.getItem('vivi_session')
    if (sessionEmail) {
      const id = getOrCreateUserId(sessionEmail)
      setUserId(id)
      setUserEmail(sessionEmail)
      setAuthenticated(true)
    }
    setReady(true)
  }, [])

  function login(email: string) {
    const id = getOrCreateUserId(email)
    localStorage.setItem('vivi_session', email)
    setUserId(id)
    setUserEmail(email)
    setAuthenticated(true)
  }

  function logout() {
    // Clear session but KEEP the profile and uid mapping so re-login restores profile
    localStorage.removeItem('vivi_session')
    setUserId(null)
    setUserEmail(null)
    setAuthenticated(false)
  }

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

  return { ready, authenticated, userId, userEmail, login, logout, loadProfile, saveProfile }
}

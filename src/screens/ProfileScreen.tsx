'use client'
import { useState, useEffect } from 'react'
import { useApp } from '@/context/AppContext'
import { t } from '@/lib/i18n'
import LanguageToggle from '@/components/LanguageToggle'
import DepositModal from '@/components/DepositModal'
import { ExternalLink, Shield, Star, Award, LogOut, ChevronDown, ChevronUp, TrendingUp, Plus, Search } from 'lucide-react'
import { COUNTRY_FLAGS, COUNTRIES_LIST } from '@/lib/countryData'
import { getEnsProfile, resolveEnsName, type EnsProfile, type EnsLookupResult } from '@/lib/ens'

interface VaultPosition {
  asset_balance: string
  apy: string
  yield_earned: string
}

export default function ProfileScreen() {
  const { lang, user, handleLogout, walletAddress, walletCreating, auth, completeChallengeById, challengeStatuses } = useApp()
  const tx = t[lang]
  const [confirmLogout, setConfirmLogout] = useState(false)
  const [showWallet, setShowWallet] = useState(false)

  // Wallet creation timeout — show fallback after 20 s if wallet still not ready
  const [walletTimedOut, setWalletTimedOut] = useState(false)
  useEffect(() => {
    if (!walletCreating) { setWalletTimedOut(false); return }
    const t = setTimeout(() => setWalletTimedOut(true), 20_000)
    return () => clearTimeout(t)
  }, [walletCreating])

  // ENS state
  const [ensProfile, setEnsProfile]             = useState<EnsProfile | null>(null)
  const [ensLoading, setEnsLoading]             = useState(false)
  const [ensLookupQuery, setEnsLookupQuery]     = useState('')
  const [ensLookupResult, setEnsLookupResult]   = useState<(EnsLookupResult & { name: string }) | null>(null)
  const [ensLookupLoading, setEnsLookupLoading] = useState(false)
  const [ensJustCompleted, setEnsJustCompleted] = useState(false)

  // Earn state
  const [savingsWalletId, setSavingsWalletId]       = useState<string | null>(null)
  const [savingsWalletAddr, setSavingsWalletAddr]   = useState<string | null>(null)
  const [savingsLoading, setSavingsLoading]         = useState(false)
  const [savingsError, setSavingsError]             = useState('')
  const [showDepositModal, setShowDepositModal]     = useState(false)
  const [depositDone, setDepositDone]               = useState(false)
  const [vaultPosition, setVaultPosition]           = useState<VaultPosition | null>(null)

  const userId = auth.userId

  // Fetch real ENS profile from Ethereum mainnet for the authenticated wallet
  useEffect(() => {
    if (!walletAddress) return
    setEnsLoading(true)
    getEnsProfile(walletAddress)
      .then(profile => {
        setEnsProfile(profile)
        // Cache the name so the AI chat can reference it
        if (profile.name && userId) localStorage.setItem(`vivi_ens_${userId}`, profile.name)
        // Auto-complete ENS challenge if this wallet already owns a real ENS name
        if (profile.name && challengeStatuses['ens'] === 'available') {
          completeChallengeById('ens', 20)
          setEnsJustCompleted(true)
        }
      })
      .finally(() => setEnsLoading(false))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [walletAddress])

  // Load stored savings wallet from localStorage on mount
  useEffect(() => {
    if (!userId) return
    const stored = localStorage.getItem(`vivi_savings_${userId}`)
    if (stored) {
      try {
        const { walletId, walletAddress: addr } = JSON.parse(stored) as { walletId: string; walletAddress: string }
        setSavingsWalletId(walletId)
        setSavingsWalletAddr(addr)
      } catch { /* ignore */ }
    }
  }, [userId])

  // Fetch vault position for APY/balance display
  useEffect(() => {
    if (!savingsWalletId) return
    fetch(`/api/earn/position?walletId=${encodeURIComponent(savingsWalletId)}`)
      .then(r => r.json())
      .then((data: { success: boolean; position?: VaultPosition }) => {
        if (data.success && data.position) setVaultPosition(data.position)
      })
      .catch(() => { /* non-critical, keep showing app balance */ })
  }, [savingsWalletId])

  if (!user) return null

  const flag         = COUNTRY_FLAGS[user.country] ?? '🌍'
  const countryLabel = COUNTRIES_LIST.find(c => c.code === user.country)?.label ?? user.country
  const initial      = user.name.charAt(0).toUpperCase()

  // Step 1: Create a Privy server wallet (different from embedded wallet — no user keys)
  async function handleCreateSavingsWallet() {
    setSavingsLoading(true)
    setSavingsError('')
    try {
      const res = await fetch('/api/earn/savings-wallet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      })
      const data = await res.json() as { success: boolean; walletId?: string; walletAddress?: string; message?: string }
      if (data.success && data.walletId && data.walletAddress) {
        setSavingsWalletId(data.walletId)
        setSavingsWalletAddr(data.walletAddress)
        if (userId) {
          localStorage.setItem(`vivi_savings_${userId}`, JSON.stringify({
            walletId: data.walletId,
            walletAddress: data.walletAddress,
          }))
        }
      } else {
        setSavingsError(data.message ?? (lang === 'es' ? 'No se pudo crear el savings wallet.' : 'Could not create savings wallet.'))
      }
    } catch {
      setSavingsError(lang === 'es' ? 'Error de conexión.' : 'Connection error.')
    } finally {
      setSavingsLoading(false)
    }
  }

  async function handleEnsLookup() {
    const raw = ensLookupQuery.trim()
    if (!raw) return
    const name = raw.includes('.') ? raw.toLowerCase() : `${raw.toLowerCase()}.eth`
    setEnsLookupLoading(true)
    setEnsLookupResult(null)
    try {
      const result = await resolveEnsName(name)
      setEnsLookupResult({ ...result, name })
      if (result.status === 'resolved') {
        if (userId) localStorage.setItem(`vivi_ens_${userId}`, name)
        // Complete ENS challenge on first successful lookup
        if (challengeStatuses['ens'] === 'available') {
          completeChallengeById('ens', 20)
          setEnsJustCompleted(true)
        }
      }
    } finally {
      setEnsLookupLoading(false)
    }
  }

  // Badges based on progress
  const badges = [
    { icon: '💬', label: lang === 'es' ? 'Primera pregunta' : 'First question', earned: true },
    { icon: '🌍', label: lang === 'es' ? 'Identidad verificada' : 'Verified identity', earned: user.worldIdVerified },
    { icon: '📈', label: lang === 'es' ? 'Curiosa financiera' : 'Finance curious', earned: user.challengesCompleted >= 2 },
    { icon: '🏆', label: lang === 'es' ? `Nivel ${user.level}` : `Level ${user.level}`, earned: user.level >= 2 },
  ]

  return (
    <div style={{ minHeight: '100dvh', background: '#FAFAF9' }}>
      {/* Header */}
      <header
        className="sticky top-0 z-30"
        style={{ background: '#fff', borderBottom: '1px solid #F3F0FF', padding: '44px 20px 16px' }}
      >
        <div className="flex items-center justify-between">
          <h1 className="font-semibold text-vivi-deep" style={{ fontSize: 22 }}>{tx.nav_profile}</h1>
          <LanguageToggle />
        </div>
      </header>

      <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: 14 }}>

        {/* ── Identity row ─────────────────────────────────────────────────── */}
        <div style={{ background: '#fff', borderRadius: 20, padding: '20px', border: '1px solid #F3F0FF' }}>
          <div className="flex items-center gap-4">
            {/* Avatar */}
            <div
              className="flex-shrink-0 flex items-center justify-center"
              style={{
                width: 56, height: 56, borderRadius: '50%',
                background: 'linear-gradient(135deg, #7C3AED, #A855F7)',
                boxShadow: '0 4px 12px rgba(124,58,237,0.25)',
                overflow: 'hidden',
              }}
            >
              <span style={{ fontSize: 22, fontWeight: 700, color: '#fff', lineHeight: 1 }}>{initial}</span>
            </div>

            <div style={{ flex: 1, minWidth: 0 }}>
              <p className="font-semibold text-vivi-deep truncate" style={{ fontSize: 17 }}>{user.name}</p>
              <p className="truncate" style={{ fontSize: 13, color: '#7C3AED', fontWeight: 500, marginBottom: 4 }}>
                {user.viviEns}
              </p>
              <div className="flex items-center gap-3">
                <span style={{ fontSize: 13 }}>{flag} {countryLabel}</span>
                {user.worldIdVerified && (
                  <div className="flex items-center gap-1">
                    <Shield size={11} style={{ color: '#10B981' }} />
                    <span style={{ fontSize: 11, color: '#10B981', fontWeight: 500 }}>
                      {lang === 'es' ? 'Verificada' : 'Verified'}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Wallet status indicator (visible always, not behind toggle) */}
          {walletCreating && (
            <div
              style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 8, background: '#FFF8F0', borderRadius: 10, padding: '10px 12px', border: '1px solid rgba(251,191,36,0.25)' }}
            >
              {walletTimedOut ? (
                <>
                  <span style={{ fontSize: 14 }}>⚠️</span>
                  <div>
                    <p style={{ fontSize: 12, fontWeight: 600, color: '#92400E' }}>
                      {lang === 'es' ? 'Tardando más de lo esperado' : 'Taking longer than expected'}
                    </p>
                    <p style={{ fontSize: 11, color: '#B45309', marginTop: 2 }}>
                      {lang === 'es'
                        ? 'Puedes seguir usando la app. El wallet aparecerá pronto.'
                        : 'You can keep using the app. Your wallet will appear shortly.'}
                    </p>
                  </div>
                </>
              ) : (
                <>
                  <div style={{ width: 14, height: 14, border: '2px solid rgba(124,58,237,0.25)', borderTopColor: '#7C3AED', borderRadius: '50%', animation: 'spin 0.9s linear infinite', flexShrink: 0 }} />
                  <div>
                    <p style={{ fontSize: 12, fontWeight: 600, color: '#4C1D95' }}>
                      {lang === 'es' ? 'Configurando tu wallet segura…' : 'Setting up your secure wallet…'}
                    </p>
                    <p style={{ fontSize: 11, color: '#7C3AED', marginTop: 2 }}>
                      {lang === 'es' ? 'Privy está generando tus claves onchain' : 'Privy is generating your onchain keys'}
                    </p>
                  </div>
                </>
              )}
            </div>
          )}

          {/* Wallet details toggle (only shown once wallet is ready) */}
          {!walletCreating && (
            <>
              <button
                onClick={() => setShowWallet(v => !v)}
                className="flex items-center gap-1 hover:text-vivi-purple transition-colors"
                style={{ marginTop: 14, fontSize: 12, color: '#9CA3AF' }}
              >
                {showWallet ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                {tx.profile_details}
              </button>
              {showWallet && (
                <div style={{ marginTop: 8, background: '#FAFAF9', borderRadius: 10, padding: '10px 12px' }}>
                  <p style={{ fontSize: 10, color: '#6B7280', fontFamily: 'monospace', wordBreak: 'break-all' }}>
                    {walletAddress}
                  </p>
                  <p style={{ fontSize: 9, color: '#10B981', marginTop: 4, fontWeight: 500 }}>
                    ✓ Privy Embedded Wallet · Base
                  </p>
                </div>
              )}
            </>
          )}
        </div>

        {/* ── Total Balance ────────────────────────────────────────────────── */}
        <div style={{ textAlign: 'center', padding: '4px 0' }}>
          <p style={{ fontSize: 11, fontWeight: 600, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>
            {lang === 'es' ? 'Saldo Total' : 'Total Balance'}
          </p>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, justifyContent: 'center' }}>
            <span style={{ fontSize: 18, fontWeight: 700, color: '#630ed4' }}>$</span>
            <span style={{ fontSize: 48, fontWeight: 800, color: '#121c2a', lineHeight: 1, letterSpacing: '-1px' }}>
              {user.usdcBalance.toFixed(2)}
            </span>
          </div>
          {/* APY indicator from vault position or static */}
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, marginTop: 8, background: '#EFF4FF', borderRadius: 20, padding: '4px 12px' }}>
            <TrendingUp size={12} style={{ color: '#630ed4' }} />
            <span style={{ fontSize: 12, fontWeight: 600, color: '#630ed4' }}>
              {vaultPosition
                ? `+${(parseFloat(vaultPosition.apy) * 100).toFixed(1)}% APY`
                : (lang === 'es' ? '+4.8% APY estimado' : '+4.8% estimated APY')}
            </span>
          </div>
        </div>

        {/* ── Savings Wallet Card ──────────────────────────────────────────── */}
        <div
          style={{
            background: '#fff',
            borderRadius: 20,
            padding: '20px',
            border: '1px solid rgba(124,58,237,0.12)',
            boxShadow: '0 4px 20px rgba(99,14,212,0.07)',
            backgroundImage: 'radial-gradient(at 10% 20%, rgba(177,136,255,0.10) 0px, transparent 50%), radial-gradient(at 90% 80%, rgba(99,14,212,0.05) 0px, transparent 50%)',
          }}
        >
          {/* Card header */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
            <div style={{ width: 40, height: 40, borderRadius: 12, background: '#EDE9FE', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <span style={{ fontSize: 20 }}>💰</span>
            </div>
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: 15, fontWeight: 700, color: '#2D1B4E', lineHeight: 1.2 }}>
                {lang === 'es' ? 'Billetera de Ahorros' : 'Savings Wallet'}
              </p>
              <p style={{ fontSize: 11, color: '#9CA3AF', marginTop: 1 }}>Privy Earn · Morpho · Base</p>
            </div>
            {/* Live APY badge */}
            {(depositDone || vaultPosition) && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 4, background: '#D1FAE5', borderRadius: 20, padding: '4px 10px' }}>
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#10B981' }} />
                <span style={{ fontSize: 11, fontWeight: 700, color: '#065F46' }}>
                  {vaultPosition ? `${(parseFloat(vaultPosition.apy) * 100).toFixed(1)}% APY` : '4.8% APY'}
                </span>
              </div>
            )}
          </div>

          {/* Balance */}
          <div style={{ marginBottom: 16 }}>
            <p style={{ fontSize: 11, color: '#9CA3AF', fontWeight: 500, marginBottom: 4 }}>
              {lang === 'es' ? 'Disponible para uso inmediato' : 'Available for immediate use'}
            </p>
            <p style={{ fontSize: 34, fontWeight: 700, color: '#121c2a', lineHeight: 1, letterSpacing: '-0.5px' }}>
              ${user.usdcBalance.toFixed(2)}
            </p>
            {/* Yield earned line */}
            {vaultPosition && parseFloat(vaultPosition.yield_earned) > 0 ? (
              <p style={{ fontSize: 12, color: '#10B981', fontWeight: 500, marginTop: 4 }}>
                +${parseFloat(vaultPosition.yield_earned).toFixed(4)} {lang === 'es' ? 'USDC generado en yield' : 'USDC earned in yield'}
              </p>
            ) : (
              <p style={{ fontSize: 12, color: '#9CA3AF', marginTop: 4 }}>
                0.00 USDC {lang === 'es' ? 'en tránsito' : 'in transit'}
              </p>
            )}
          </div>

          {/* Savings address preview (if wallet exists) */}
          {savingsWalletAddr && (
            <div style={{ background: '#F8F9FF', borderRadius: 10, padding: '8px 12px', marginBottom: 14, border: '1px solid #EDE9FE' }}>
              <p style={{ fontSize: 9.5, fontFamily: 'monospace', color: '#6B7280', wordBreak: 'break-all', lineHeight: 1.5 }}>
                {savingsWalletAddr.slice(0, 12)}...{savingsWalletAddr.slice(-10)}
              </p>
              <p style={{ fontSize: 9, color: '#10B981', fontWeight: 600, marginTop: 2 }}>
                ✓ Privy Server Wallet · Base (USDC)
              </p>
            </div>
          )}

          {/* Deposit done indicator */}
          {depositDone && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 14 }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#10B981' }} />
              <p style={{ fontSize: 12, color: '#10B981', fontWeight: 500 }}>
                {lang === 'es' ? 'Generando rendimiento en Morpho' : 'Earning yield on Morpho'}
              </p>
            </div>
          )}

          {/* CTAs */}
          <div style={{ display: 'flex', gap: 10 }}>
            <button
              onClick={() => setShowDepositModal(true)}
              style={{
                flex: 1, height: 48, borderRadius: 14, border: 'none',
                background: '#630ed4', color: '#fff',
                fontSize: 14, fontWeight: 600,
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                boxShadow: '0 4px 14px rgba(99,14,212,0.28)',
                cursor: 'pointer',
              }}
            >
              <Plus size={16} />
              {lang === 'es' ? 'Depositar' : 'Deposit'}
            </button>
            <button
              disabled
              title={lang === 'es' ? 'Próximamente' : 'Coming soon'}
              style={{
                flex: 1, height: 48, borderRadius: 14, border: 'none',
                background: '#F3F4F6', color: '#9CA3AF',
                fontSize: 14, fontWeight: 500,
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                cursor: 'not-allowed',
              }}
            >
              ↓ {lang === 'es' ? 'Próximamente' : 'Coming soon'}
            </button>
          </div>

          {/* No wallet helper */}
          {!savingsWalletId && (
            <p style={{ fontSize: 12, color: '#9CA3AF', textAlign: 'center', marginTop: 12, lineHeight: 1.5 }}>
              {lang === 'es'
                ? 'Toca "Depositar" para configurar tu cuenta Privy y empezar a ganar yield.'
                : 'Tap "Deposit" to set up your Privy savings account and start earning yield.'}
            </p>
          )}
        </div>

        {/* ── Earn CTA card ────────────────────────────────────────────────── */}
        <button
          onClick={() => setShowDepositModal(true)}
          style={{
            width: '100%', textAlign: 'left', background: '#fff',
            borderRadius: 18, padding: '16px 18px',
            border: '1px solid rgba(124,58,237,0.12)',
            boxShadow: '0 2px 10px rgba(99,14,212,0.05)',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 14,
            cursor: 'pointer',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ width: 46, height: 46, borderRadius: '50%', background: '#EFF4FF', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <TrendingUp size={20} style={{ color: '#630ed4' }} />
            </div>
            <div>
              <p style={{ fontSize: 15, fontWeight: 700, color: '#121c2a', marginBottom: 2 }}>
                {lang === 'es' ? 'Pon tus fondos a trabajar' : 'Put your funds to work'}
              </p>
              <p style={{ fontSize: 13, color: '#9CA3AF' }}>
                {lang === 'es' ? 'Gana hasta 4.8% APY en tus ahorros.' : 'Earn up to 4.8% APY on your savings.'}
              </p>
            </div>
          </div>
          <span style={{ fontSize: 18, color: '#9CA3AF', flexShrink: 0 }}>›</span>
        </button>

        {/* ── Stats ────────────────────────────────────────────────────────── */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
          {[
            { icon: <Star size={16} style={{ color: '#FBBF24' }} />, value: user.points, label: lang === 'es' ? 'Puntos' : 'Points' },
            { icon: <Award size={16} style={{ color: '#7C3AED' }} />, value: `${tx.profile_level} ${user.level}`, label: '' },
            { icon: <span style={{ fontSize: 18 }}>{flag}</span>, value: countryLabel, label: '' },
          ].map((s, i) => (
            <div
              key={i}
              style={{ background: '#fff', borderRadius: 16, padding: '14px 10px', border: '1px solid #F3F0FF', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, textAlign: 'center' }}
            >
              {s.icon}
              <p style={{ fontSize: 13, fontWeight: 700, color: '#2D1B4E', lineHeight: 1.2 }}>{s.value}</p>
              {s.label && <p style={{ fontSize: 10, color: '#9CA3AF' }}>{s.label}</p>}
            </div>
          ))}
        </div>

        {/* ── ENS Identity (real mainnet resolution) ───────────────────────── */}
        <div style={{ background: '#fff', borderRadius: 20, padding: '20px', border: '1.5px solid rgba(124,58,237,0.2)' }}>
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
            <div style={{ width: 40, height: 40, borderRadius: 12, background: '#2D1B4E', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <span style={{ fontSize: 20 }}>🔑</span>
            </div>
            <div>
              <p style={{ fontSize: 15, fontWeight: 600, color: '#2D1B4E', marginBottom: 2 }}>{tx.profile_ens_title}</p>
              <p style={{ fontSize: 12, color: '#9CA3AF' }}>{tx.profile_ens_sub}</p>
            </div>
          </div>

          {/* ── ENS identity for this wallet ── */}
          {walletCreating ? (
            /* Wallet not yet ready — ENS lookup hasn't started */
            <div style={{ height: 56, background: '#F9FAFB', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16, border: '1px dashed #E5E7EB' }}>
              <p style={{ fontSize: 13, color: '#9CA3AF' }}>
                {lang === 'es' ? 'Esperando wallet para consultar ENS…' : 'Waiting for wallet to query ENS…'}
              </p>
            </div>
          ) : ensLoading ? (
            <div style={{ height: 64, background: '#F5F3FF', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 14, height: 14, border: '2px solid rgba(124,58,237,0.3)', borderTopColor: '#7C3AED', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                <p style={{ fontSize: 13, color: '#9CA3AF' }}>
                  {lang === 'es' ? 'Consultando Ethereum mainnet…' : 'Querying Ethereum mainnet…'}
                </p>
              </div>
            </div>
          ) : ensProfile?.name ? (
            <div style={{ background: '#F5F3FF', borderRadius: 12, padding: '14px', marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                {ensProfile.avatar && (
                  <img src={ensProfile.avatar} alt="" style={{ width: 38, height: 38, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
                )}
                <div>
                  <p style={{ fontSize: 20, fontWeight: 700, color: '#7C3AED', letterSpacing: '-0.3px', lineHeight: 1.2 }}>
                    {ensProfile.name}
                  </p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 3 }}>
                    <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#10B981' }} />
                    <p style={{ fontSize: 11, color: '#10B981', fontWeight: 600 }}>
                      {lang === 'es' ? 'Verificado · Ethereum mainnet' : 'Verified · Ethereum mainnet'}
                    </p>
                  </div>
                </div>
              </div>
              {ensProfile.description && (
                <p style={{ fontSize: 12, color: '#6B7280', lineHeight: 1.5, marginTop: 6 }}>{ensProfile.description}</p>
              )}
              {ensProfile.twitter && (
                <p style={{ fontSize: 12, color: '#7C3AED', marginTop: 4, fontWeight: 500 }}>
                  @{ensProfile.twitter} · Twitter/X
                </p>
              )}
              <a
                href={`https://app.ens.domains/${ensProfile.name}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 hover:underline"
                style={{ marginTop: 8, fontSize: 12, color: '#9CA3AF' }}
              >
                <ExternalLink size={11} />
                {lang === 'es' ? 'Ver en ENS App ↗' : 'View on ENS App ↗'}
              </a>
            </div>
          ) : (
            <div style={{ background: '#F9FAFB', borderRadius: 12, padding: '14px', marginBottom: 16, border: '1px dashed #E5E7EB' }}>
              <p style={{ fontSize: 14, fontWeight: 600, color: '#6B7280', marginBottom: 4 }}>
                {lang === 'es' ? 'Sin nombre ENS en esta wallet' : 'No ENS name on this wallet'}
              </p>
              <p style={{ fontSize: 11, color: '#9CA3AF', fontFamily: 'monospace', wordBreak: 'break-all', lineHeight: 1.5 }}>
                {walletAddress ?? '—'}
              </p>
              <p style={{ fontSize: 11, color: '#9CA3AF', marginTop: 4 }}>
                {lang === 'es' ? 'Registra un nombre en app.ens.domains para verlo aquí.' : 'Register a name at app.ens.domains to see it here.'}
              </p>
            </div>
          )}

          {/* ── ENS lookup tool — always resolves real names, completes challenge ── */}
          <div style={{ borderTop: '1px solid #F3F0FF', paddingTop: 14 }}>
            <p style={{ fontSize: 12, fontWeight: 600, color: '#2D1B4E', marginBottom: 8 }}>
              {lang === 'es' ? 'Explorar identidades ENS' : 'Explore ENS identities'}
            </p>
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                value={ensLookupQuery}
                onChange={e => setEnsLookupQuery(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && void handleEnsLookup()}
                placeholder="vitalik.eth"
                disabled={walletCreating}
                style={{
                  flex: 1, height: 40, borderRadius: 8,
                  border: '1px solid #E5E7EB', padding: '0 12px',
                  fontSize: 14, color: '#2D1B4E', outline: 'none',
                  fontFamily: 'Manrope, sans-serif',
                  opacity: walletCreating ? 0.5 : 1,
                }}
              />
              <button
                onClick={() => void handleEnsLookup()}
                disabled={walletCreating || ensLookupLoading || !ensLookupQuery.trim()}
                style={{
                  height: 40, padding: '0 14px', borderRadius: 8,
                  background: '#7C3AED', color: '#fff',
                  fontSize: 14, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 5,
                  opacity: walletCreating || ensLookupLoading || !ensLookupQuery.trim() ? 0.5 : 1,
                  cursor: walletCreating || ensLookupLoading || !ensLookupQuery.trim() ? 'not-allowed' : 'pointer',
                }}
              >
                {ensLookupLoading
                  ? <div style={{ width: 14, height: 14, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                  : <><Search size={14} />{lang === 'es' ? 'Buscar' : 'Look up'}</>
                }
              </button>
            </div>

            {/* Lookup result — typed status prevents "not registered" on RPC errors */}
            {ensLookupResult && (
              <div style={{
                marginTop: 8, padding: '10px 12px', borderRadius: 8,
                background: ensLookupResult.status === 'resolved' ? '#F0FDF4'
                  : ensLookupResult.status === 'rpc_error' ? '#FFFBEB'
                  : '#FEF2F2',
                border: `1px solid ${
                  ensLookupResult.status === 'resolved' ? '#BBF7D0'
                  : ensLookupResult.status === 'rpc_error' ? '#FDE68A'
                  : '#FECACA'
                }`,
              }}>
                {ensLookupResult.status === 'resolved' ? (
                  <>
                    <p style={{ fontSize: 13, fontWeight: 600, color: '#16A34A' }}>
                      ✓ {ensLookupResult.name}
                    </p>
                    <p style={{ fontSize: 11, color: '#6B7280', fontFamily: 'monospace', marginTop: 2, wordBreak: 'break-all' }}>
                      {ensLookupResult.address}
                    </p>
                    <a
                      href={`https://app.ens.domains/${ensLookupResult.name}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ fontSize: 11, color: '#9CA3AF', display: 'flex', alignItems: 'center', gap: 3, marginTop: 4 }}
                      className="hover:underline"
                    >
                      <ExternalLink size={10} />
                      {lang === 'es' ? 'Ver en ENS App ↗' : 'View on ENS App ↗'}
                    </a>
                  </>
                ) : ensLookupResult.status === 'rpc_error' ? (
                  <p style={{ fontSize: 13, color: '#92400E' }}>
                    {lang === 'es'
                      ? 'Error de red al consultar ENS. Intenta de nuevo.'
                      : 'Network error querying ENS. Please try again.'}
                  </p>
                ) : (
                  <p style={{ fontSize: 13, color: '#DC2626' }}>
                    {lang === 'es'
                      ? `"${ensLookupResult.name}" no está registrado en ENS`
                      : `"${ensLookupResult.name}" is not registered in ENS`}
                  </p>
                )}
              </div>
            )}

            {/* Challenge completed banner */}
            {ensJustCompleted && (
              <div style={{ marginTop: 10, padding: '10px 14px', background: 'linear-gradient(135deg, #EDE9FE, #F5F3FF)', borderRadius: 10, display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 18 }}>🎉</span>
                <p style={{ fontSize: 13, fontWeight: 600, color: '#7C3AED' }}>
                  {lang === 'es' ? '¡Reto ENS completado! +20 USDC' : 'ENS challenge completed! +20 USDC'}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* ── Badges ───────────────────────────────────────────────────────── */}
        <div style={{ background: '#fff', borderRadius: 20, padding: '20px', border: '1px solid #F3F0FF' }}>
          <p style={{ fontSize: 14, fontWeight: 600, color: '#2D1B4E', marginBottom: 12 }}>{tx.profile_badges}</p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            {badges.map((b, i) => (
              <div
                key={i}
                className="flex items-center gap-2"
                style={{
                  padding: '10px 12px',
                  borderRadius: 12,
                  background: b.earned ? '#EDE9FE' : '#F9FAFB',
                  border: b.earned ? '1px solid rgba(124,58,237,0.15)' : '1px solid #F3F4F6',
                  opacity: b.earned ? 1 : 0.5,
                }}
              >
                <span style={{ fontSize: 16 }}>{b.icon}</span>
                <span style={{ fontSize: 12, fontWeight: 500, color: b.earned ? '#2D1B4E' : '#9CA3AF', lineHeight: 1.3 }}>
                  {b.label}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* ── Retos completados ─────────────────────────────────────────────── */}
        <div
          className="flex items-center justify-between"
          style={{ background: '#fff', borderRadius: 20, padding: '20px', border: '1px solid #F3F0FF' }}
        >
          <div>
            <p style={{ fontSize: 12, color: '#9CA3AF', marginBottom: 4 }}>{tx.profile_challenges}</p>
            <p style={{ fontSize: 32, fontWeight: 700, color: '#2D1B4E', lineHeight: 1 }}>
              {user.challengesCompleted}
            </p>
          </div>
          <div
            style={{ width: 48, height: 48, borderRadius: '50%', background: '#EDE9FE', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            <span style={{ fontSize: 22 }}>🎯</span>
          </div>
        </div>

        {/* ── Logout ───────────────────────────────────────────────────────── */}
        <div style={{ paddingBottom: 16 }}>
          {!confirmLogout ? (
            <button
              onClick={() => setConfirmLogout(true)}
              className="w-full flex items-center justify-center gap-2 hover:text-red-500 transition-colors"
              style={{ fontSize: 14, color: '#9CA3AF', padding: '12px 0' }}
            >
              <LogOut size={14} />
              {tx.profile_logout}
            </button>
          ) : (
            <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 16, padding: '16px' }}>
              <p style={{ fontSize: 14, color: '#DC2626', fontWeight: 500, textAlign: 'center', marginBottom: 12 }}>
                {tx.profile_logout_confirm}
              </p>
              <div style={{ display: 'flex', gap: 10 }}>
                <button
                  onClick={() => setConfirmLogout(false)}
                  style={{ flex: 1, height: 44, borderRadius: 12, border: '1px solid #E5E7EB', background: '#fff', fontSize: 14, fontWeight: 500, color: '#6B7280' }}
                >
                  {lang === 'es' ? 'Cancelar' : 'Cancel'}
                </button>
                <button
                  onClick={handleLogout}
                  style={{ flex: 1, height: 44, borderRadius: 12, background: '#EF4444', fontSize: 14, fontWeight: 600, color: '#fff' }}
                >
                  {tx.profile_logout}
                </button>
              </div>
            </div>
          )}
        </div>

      </div>

      <DepositModal
        open={showDepositModal}
        onClose={() => setShowDepositModal(false)}
        savingsWalletId={savingsWalletId}
        savingsWalletAddr={savingsWalletAddr}
        onCreateWallet={handleCreateSavingsWallet}
        walletLoading={savingsLoading}
        walletError={savingsError}
        lang={lang}
        onDepositConfirmed={() => setDepositDone(true)}
      />
    </div>
  )
}

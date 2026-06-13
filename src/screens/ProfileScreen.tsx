'use client'
import { useState, useEffect } from 'react'
import { useApp } from '@/context/AppContext'
import { t } from '@/lib/i18n'
import LanguageToggle from '@/components/LanguageToggle'
import { ExternalLink, Shield, Star, Award, LogOut, ChevronDown, ChevronUp, TrendingUp, Zap, Copy, Check, Search } from 'lucide-react'
import { COUNTRY_FLAGS, COUNTRIES_LIST } from '@/lib/countryData'
import { getEnsProfile, resolveEnsName, type EnsProfile } from '@/lib/ens'

export default function ProfileScreen() {
  const { lang, user, handleLogout, walletAddress, auth, completeChallengeById, challengeStatuses } = useApp()
  const tx = t[lang]
  const [confirmLogout, setConfirmLogout] = useState(false)
  const [showWallet, setShowWallet] = useState(false)

  // ENS state
  const [ensProfile, setEnsProfile]             = useState<EnsProfile | null>(null)
  const [ensLoading, setEnsLoading]             = useState(false)
  const [ensLookupQuery, setEnsLookupQuery]     = useState('')
  const [ensLookupResult, setEnsLookupResult]   = useState<{ name: string; address: string | null } | null>(null)
  const [ensLookupLoading, setEnsLookupLoading] = useState(false)
  const [ensJustCompleted, setEnsJustCompleted] = useState(false)

  // Earn state
  const [savingsWalletId, setSavingsWalletId]       = useState<string | null>(null)
  const [savingsWalletAddr, setSavingsWalletAddr]   = useState<string | null>(null)
  const [savingsLoading, setSavingsLoading]         = useState(false)
  const [savingsError, setSavingsError]             = useState('')
  const [depositLoading, setDepositLoading]         = useState(false)
  const [depositSuccess, setDepositSuccess]         = useState(false)
  const [depositError, setDepositError]             = useState('')
  const [copied, setCopied]                         = useState(false)

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

  // Step 2: Deposit to Privy Earn vault using the server wallet ID
  async function handleDeposit() {
    if (!savingsWalletId) return
    setDepositLoading(true)
    setDepositError('')
    try {
      const res = await fetch('/api/earn/deposit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ walletId: savingsWalletId, amount: '1.00' }),
      })
      const data = await res.json() as { success: boolean; message?: string; status?: string }
      if (data.success) {
        setDepositSuccess(true)
      } else {
        setDepositError(data.message ?? 'Error')
      }
    } catch {
      setDepositError(lang === 'es' ? 'Error de conexión.' : 'Connection error.')
    } finally {
      setDepositLoading(false)
    }
  }

  async function handleEnsLookup() {
    const raw = ensLookupQuery.trim()
    if (!raw) return
    const name = raw.includes('.') ? raw : `${raw}.eth`
    setEnsLookupLoading(true)
    setEnsLookupResult(null)
    try {
      const address = await resolveEnsName(name)
      setEnsLookupResult({ name, address })
      if (address && userId) localStorage.setItem(`vivi_ens_${userId}`, name)
      // Complete ENS challenge on first successful lookup
      if (address && challengeStatuses['ens'] === 'available') {
        completeChallengeById('ens', 20)
        setEnsJustCompleted(true)
      }
    } finally {
      setEnsLookupLoading(false)
    }
  }

  function copyAddress() {
    if (!savingsWalletAddr) return
    navigator.clipboard.writeText(savingsWalletAddr)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
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

          {/* Wallet details toggle */}
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
                {walletAddress ?? (lang === 'es' ? 'Generando wallet…' : 'Generating wallet…')}
              </p>
              {walletAddress && (
                <p style={{ fontSize: 9, color: '#10B981', marginTop: 4, fontWeight: 500 }}>
                  ✓ Privy Embedded Wallet · Base
                </p>
              )}
            </div>
          )}
        </div>

        {/* ── USDC Balance ─────────────────────────────────────────────────── */}
        <div
          style={{
            background: 'linear-gradient(135deg, #2D1B4E 0%, #1a0f35 100%)',
            borderRadius: 20,
            padding: '24px',
            boxShadow: '0 4px 20px rgba(45,27,78,0.15)',
          }}
        >
          <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', marginBottom: 8 }}>{tx.profile_balance}</p>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 12 }}>
            <span style={{ fontSize: 46, fontWeight: 700, color: '#FBBF24', lineHeight: 1 }}>
              ${user.usdcBalance.toFixed(2)}
            </span>
            <span style={{ fontSize: 15, fontWeight: 600, color: 'rgba(251,191,36,0.7)' }}>USDC</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#10B981' }} />
            <p style={{ fontSize: 12, color: '#10B981' }}>{tx.profile_growing}</p>
          </div>
        </div>

        {/* ── Privy Earn card ──────────────────────────────────────────────── */}
        <div
          style={{
            background: 'linear-gradient(135deg, #065F46 0%, #047857 100%)',
            borderRadius: 20,
            padding: '20px',
            boxShadow: '0 4px 20px rgba(6,95,70,0.20)',
          }}
        >
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
            <TrendingUp size={16} style={{ color: '#6EE7B7' }} />
            <p style={{ fontSize: 12, color: '#6EE7B7', fontWeight: 600, letterSpacing: '0.03em' }}>
              PRIVY EARN · Morpho USDC Vault · Base
            </p>
          </div>
          <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.70)', lineHeight: 1.5, marginBottom: 16 }}>
            {lang === 'es'
              ? 'Gana ~4–6% APY depositando USDC en vaults ERC-4626 de Morpho en Base.'
              : 'Earn ~4–6% APY depositing USDC into Morpho ERC-4626 vaults on Base.'}
          </p>

          {/* ── Estado 3: Depósito exitoso ── */}
          {depositSuccess && (
            <div style={{ background: 'rgba(110,231,183,0.18)', borderRadius: 12, padding: '14px', textAlign: 'center' }}>
              <p style={{ fontSize: 22, marginBottom: 4 }}>🎉</p>
              <p style={{ fontSize: 14, color: '#6EE7B7', fontWeight: 600 }}>
                {lang === 'es' ? '¡Depósito enviado a Privy Earn!' : 'Deposit sent to Privy Earn!'}
              </p>
              <p style={{ fontSize: 12, color: 'rgba(110,231,183,0.7)', marginTop: 4 }}>
                {lang === 'es' ? 'Tu USDC está generando yield en Morpho.' : 'Your USDC is earning yield on Morpho.'}
              </p>
            </div>
          )}

          {/* ── Estado 2: Savings wallet creado — mostrar dirección + botón depositar ── */}
          {!depositSuccess && savingsWalletId && savingsWalletAddr && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {/* Savings wallet address */}
              <div style={{ background: 'rgba(0,0,0,0.2)', borderRadius: 12, padding: '12px 14px' }}>
                <p style={{ fontSize: 10, color: 'rgba(110,231,183,0.7)', fontWeight: 600, marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  {lang === 'es' ? 'Tu cuenta de ahorro (envía USDC aquí)' : 'Your savings account (send USDC here)'}
                </p>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <p style={{ fontSize: 10, color: '#fff', fontFamily: 'monospace', flex: 1, wordBreak: 'break-all', lineHeight: 1.5 }}>
                    {savingsWalletAddr}
                  </p>
                  <button
                    onClick={copyAddress}
                    style={{ flexShrink: 0, padding: '4px', background: 'none', color: copied ? '#6EE7B7' : 'rgba(255,255,255,0.5)', cursor: 'pointer' }}
                  >
                    {copied ? <Check size={14} /> : <Copy size={14} />}
                  </button>
                </div>
                <p style={{ fontSize: 10, color: 'rgba(110,231,183,0.6)', marginTop: 4 }}>
                  ✓ Privy Server Wallet · Base (USDC)
                </p>
              </div>

              {/* Deposit button */}
              <button
                onClick={handleDeposit}
                disabled={depositLoading}
                style={{
                  width: '100%', height: 44, borderRadius: 12,
                  background: depositLoading ? 'rgba(255,255,255,0.15)' : '#10B981',
                  fontSize: 14, fontWeight: 600, color: '#fff',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                  cursor: depositLoading ? 'not-allowed' : 'pointer',
                }}
              >
                {depositLoading
                  ? <div style={{ width: 18, height: 18, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                  : <><Zap size={14} />{lang === 'es' ? 'Depositar 1 USDC al vault' : 'Deposit 1 USDC to vault'}</>
                }
              </button>

              {depositError && (
                <p style={{ fontSize: 12, color: '#FCA5A5', textAlign: 'center', lineHeight: 1.5 }}>{depositError}</p>
              )}
            </div>
          )}

          {/* ── Estado 1: Sin savings wallet — botón para crear ── */}
          {!depositSuccess && !savingsWalletId && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ background: 'rgba(0,0,0,0.15)', borderRadius: 10, padding: '10px 14px' }}>
                <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.65)', lineHeight: 1.5 }}>
                  {lang === 'es'
                    ? '① Crea tu cuenta de ahorro Privy → ② Envía USDC → ③ Gana yield automáticamente'
                    : '① Create your Privy savings account → ② Send USDC → ③ Earn yield automatically'}
                </p>
              </div>

              <button
                onClick={handleCreateSavingsWallet}
                disabled={savingsLoading}
                style={{
                  width: '100%', height: 44, borderRadius: 12,
                  background: savingsLoading ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.15)',
                  border: '1.5px solid rgba(110,231,183,0.5)',
                  fontSize: 14, fontWeight: 600, color: '#6EE7B7',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                  cursor: savingsLoading ? 'not-allowed' : 'pointer',
                }}
              >
                {savingsLoading
                  ? <div style={{ width: 18, height: 18, border: '2px solid rgba(110,231,183,0.3)', borderTopColor: '#6EE7B7', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                  : <><TrendingUp size={14} />{lang === 'es' ? 'Crear cuenta de ahorro' : 'Create savings account'}</>
                }
              </button>

              {savingsError && (
                <p style={{ fontSize: 12, color: '#FCA5A5', textAlign: 'center' }}>{savingsError}</p>
              )}
            </div>
          )}
        </div>

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
          {ensLoading ? (
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
                style={{
                  flex: 1, height: 40, borderRadius: 8,
                  border: '1px solid #E5E7EB', padding: '0 12px',
                  fontSize: 14, color: '#2D1B4E', outline: 'none',
                  fontFamily: 'Manrope, sans-serif',
                }}
              />
              <button
                onClick={() => void handleEnsLookup()}
                disabled={ensLookupLoading || !ensLookupQuery.trim()}
                style={{
                  height: 40, padding: '0 14px', borderRadius: 8,
                  background: '#7C3AED', color: '#fff',
                  fontSize: 14, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 5,
                  opacity: ensLookupLoading || !ensLookupQuery.trim() ? 0.5 : 1,
                  cursor: ensLookupLoading || !ensLookupQuery.trim() ? 'not-allowed' : 'pointer',
                }}
              >
                {ensLookupLoading
                  ? <div style={{ width: 14, height: 14, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                  : <><Search size={14} />{lang === 'es' ? 'Buscar' : 'Look up'}</>
                }
              </button>
            </div>

            {/* Lookup result */}
            {ensLookupResult && (
              <div style={{
                marginTop: 8, padding: '10px 12px', borderRadius: 8,
                background: ensLookupResult.address ? '#F0FDF4' : '#FEF2F2',
                border: `1px solid ${ensLookupResult.address ? '#BBF7D0' : '#FECACA'}`,
              }}>
                {ensLookupResult.address ? (
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
                ) : (
                  <p style={{ fontSize: 13, color: '#DC2626' }}>
                    {lang === 'es' ? `"${ensLookupResult.name}" no está registrado` : `"${ensLookupResult.name}" is not registered`}
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
    </div>
  )
}

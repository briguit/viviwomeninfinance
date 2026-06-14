'use client'
import { useState, useEffect } from 'react'
import { useApp } from '@/context/AppContext'
import { t } from '@/lib/i18n'
import LanguageToggle from '@/components/LanguageToggle'
import DepositModal from '@/components/DepositModal'
import WithdrawModal from '@/components/WithdrawModal'
import SendModal from '@/components/SendModal'
import { ExternalLink, Shield, Star, Award, LogOut, ChevronDown, ChevronUp, TrendingUp, Plus, Copy, Check, Search, ArrowUpRight } from 'lucide-react'
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
  const [showWithdrawModal, setShowWithdrawModal]   = useState(false)
  const [depositDone, setDepositDone]               = useState(false)
  const [withdrawDone, setWithdrawDone]             = useState(false)
  const [vaultPosition, setVaultPosition]           = useState<VaultPosition | null>(null)
  const [addrCopied, setAddrCopied]                 = useState(false)
  const [realUsdcBalance, setRealUsdcBalance]       = useState<number | null>(null)
  const [realBalanceLoading, setRealBalanceLoading] = useState(false)
  const [showSendModal, setShowSendModal]           = useState(false)

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
      .catch(() => { /* non-critical */ })
  }, [savingsWalletId])

  // Fetch real onchain USDC balance of savings wallet from Base
  useEffect(() => {
    if (!savingsWalletAddr) return
    setRealBalanceLoading(true)
    fetch(`/api/earn/balance?address=${encodeURIComponent(savingsWalletAddr)}`)
      .then(r => r.json())
      .then((data: { success: boolean; balance: number }) => setRealUsdcBalance(data.balance ?? 0))
      .catch(() => setRealUsdcBalance(0))
      .finally(() => setRealBalanceLoading(false))
  }, [savingsWalletAddr])

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

  function copyAddr() {
    if (!savingsWalletAddr) return
    void navigator.clipboard.writeText(savingsWalletAddr)
    setAddrCopied(true)
    setTimeout(() => setAddrCopied(false), 2000)
  }

  async function fetchRealBalance() {
    if (!savingsWalletAddr) return
    setRealBalanceLoading(true)
    try {
      const res = await fetch(`/api/earn/balance?address=${encodeURIComponent(savingsWalletAddr)}`)
      const data = await res.json() as { success: boolean; balance: number }
      setRealUsdcBalance(data.balance ?? 0)
    } catch { /* non-critical */ }
    finally { setRealBalanceLoading(false) }
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

        {/* ── Savings Vault Card (savings wallet + morpho vault) ── */}
        <div
          style={{
            borderRadius: 20, overflow: 'hidden',
            border: '1px solid rgba(124,58,237,0.18)',
            boxShadow: '0 4px 24px rgba(45,27,78,0.12)',
          }}
        >
          {/* Dark header */}
          <div style={{ background: 'linear-gradient(135deg, #2D1B4E 0%, #3B1F6E 100%)', padding: '16px 20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                <TrendingUp size={13} style={{ color: '#A78BFA' }} />
                <p style={{ fontSize: 11, color: '#A78BFA', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                  PRIVY EARN · Morpho USDC · Base
                </p>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'rgba(16,185,129,0.18)', borderRadius: 20, padding: '4px 10px' }}>
                <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#10B981' }} />
                <span style={{ fontSize: 11, fontWeight: 700, color: '#6EE7B7' }}>
                  {vaultPosition ? `${(parseFloat(vaultPosition.apy) * 100).toFixed(1)}%` : '~4.8%'} APY
                </span>
              </div>
            </div>
            <p style={{ fontSize: 12.5, color: 'rgba(255,255,255,0.65)', lineHeight: 1.5 }}>
              {lang === 'es'
                ? 'Deposita USDC en vaults ERC-4626 de Morpho en Base y genera yield automáticamente.'
                : 'Deposit USDC into Morpho ERC-4626 vaults on Base to earn yield automatically.'}
            </p>
          </div>

          {/* Section A: Savings Wallet (real onchain USDC) */}
          <div style={{ background: '#fff', padding: '16px 20px', borderBottom: '1px solid #F3F0FF' }}>
            <p style={{ fontSize: 10, fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>
              💼 {lang === 'es' ? 'Savings Wallet · Base' : 'Savings Wallet · Base'}
            </p>

            {/* Real onchain USDC balance */}
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginBottom: 10 }}>
              {realBalanceLoading ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <div style={{ width: 12, height: 12, border: '2px solid rgba(124,58,237,0.25)', borderTopColor: '#7C3AED', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                  <span style={{ fontSize: 13, color: '#9CA3AF' }}>{lang === 'es' ? 'Consultando Base…' : 'Querying Base…'}</span>
                </div>
              ) : (
                <>
                  <span style={{ fontSize: 38, fontWeight: 700, color: '#2D1B4E', lineHeight: 1, letterSpacing: '-0.5px' }}>
                    ${(realUsdcBalance ?? 0).toFixed(2)}
                  </span>
                  <span style={{ fontSize: 14, fontWeight: 600, color: '#9CA3AF' }}>USDC</span>
                  <span style={{ fontSize: 10, fontWeight: 600, color: '#1D4ED8', background: '#DBEAFE', borderRadius: 6, padding: '2px 6px', marginLeft: 4 }}>onchain</span>
                </>
              )}
            </div>

            {/* Wallet address */}
            {savingsWalletAddr ? (
              <div style={{ background: '#FAFAF9', borderRadius: 10, padding: '10px 12px', border: '1px solid #F0EBFF', marginBottom: 12 }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                  <p style={{ fontSize: 10.5, fontFamily: 'monospace', color: '#374151', flex: 1, wordBreak: 'break-all', lineHeight: 1.65 }}>
                    {savingsWalletAddr}
                  </p>
                  <button
                    onClick={copyAddr}
                    style={{
                      flexShrink: 0, height: 26, padding: '0 8px', borderRadius: 6, border: 'none',
                      background: addrCopied ? '#D1FAE5' : '#EDE9FE',
                      color: addrCopied ? '#059669' : '#7C3AED',
                      fontSize: 11, fontWeight: 600,
                      display: 'flex', alignItems: 'center', gap: 3, cursor: 'pointer',
                    }}
                  >
                    {addrCopied
                      ? <><Check size={10} />{lang === 'es' ? 'Copiado' : 'Copied'}</>
                      : <><Copy size={10} />{lang === 'es' ? 'Copiar' : 'Copy'}</>
                    }
                  </button>
                </div>
                <p style={{ fontSize: 9.5, color: '#9CA3AF', marginTop: 4 }}>
                  {lang === 'es' ? 'Envía USDC en Base aquí para fondear tu savings wallet' : 'Send USDC on Base here to fund your savings wallet'}
                </p>
              </div>
            ) : (
              <div style={{ background: '#FAFAF9', borderRadius: 10, padding: '10px 12px', border: '1px dashed #E5E7EB', marginBottom: 12 }}>
                <p style={{ fontSize: 12, color: '#9CA3AF', lineHeight: 1.5 }}>
                  {lang === 'es'
                    ? 'Toca "Depositar al vault" para crear tu savings wallet y obtener tu dirección Base.'
                    : 'Tap "Deposit to vault" to create your savings wallet and get your Base address.'}
                </p>
              </div>
            )}

            {/* Savings wallet CTAs */}
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={() => setShowDepositModal(true)}
                style={{
                  flex: 1, height: 44, borderRadius: 12, border: 'none',
                  background: '#630ed4', color: '#fff', fontSize: 13, fontWeight: 600,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
                  cursor: 'pointer', boxShadow: '0 3px 12px rgba(99,14,212,0.22)',
                }}
              >
                <Plus size={14} />{lang === 'es' ? 'Depositar al vault' : 'Deposit to vault'}
              </button>
              <button
                onClick={() => savingsWalletId && setShowSendModal(true)}
                disabled={!savingsWalletId || (realUsdcBalance ?? 0) === 0}
                title={
                  !savingsWalletId
                    ? (lang === 'es' ? 'Crea tu savings wallet primero' : 'Create your savings wallet first')
                    : (realUsdcBalance ?? 0) === 0
                    ? (lang === 'es' ? 'Fondea tu savings wallet con USDC primero' : 'Fund your savings wallet with USDC first')
                    : undefined
                }
                style={{
                  flex: 1, height: 44, borderRadius: 12,
                  background: '#fff',
                  border: `1.5px solid ${savingsWalletId && (realUsdcBalance ?? 0) > 0 ? 'rgba(124,58,237,0.35)' : '#E5E7EB'}`,
                  color: savingsWalletId && (realUsdcBalance ?? 0) > 0 ? '#7C3AED' : '#9CA3AF',
                  fontSize: 13, fontWeight: 600,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
                  cursor: savingsWalletId && (realUsdcBalance ?? 0) > 0 ? 'pointer' : 'not-allowed',
                  opacity: savingsWalletId && (realUsdcBalance ?? 0) > 0 ? 1 : 0.5,
                }}
              >
                <ArrowUpRight size={14} />{lang === 'es' ? 'Enviar USDC' : 'Send USDC'}
              </button>
            </div>
          </div>

          {/* Section B: Morpho Vault */}
          <div style={{ background: '#FAFAF9', padding: '16px 20px' }}>
            <p style={{ fontSize: 10, fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>
              📈 {lang === 'es' ? 'Vault Morpho · Base' : 'Morpho Vault · Base'}
            </p>

            <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginBottom: 6 }}>
              <span style={{ fontSize: 28, fontWeight: 700, color: '#2D1B4E', lineHeight: 1 }}>
                ${vaultPosition ? parseFloat(vaultPosition.asset_balance).toFixed(2) : '0.00'}
              </span>
              <span style={{ fontSize: 13, fontWeight: 600, color: '#9CA3AF' }}>USDC {lang === 'es' ? 'en vault' : 'in vault'}</span>
            </div>

            {vaultPosition && parseFloat(vaultPosition.yield_earned) > 0 ? (
              <p style={{ fontSize: 12, color: '#10B981', marginBottom: 10, fontWeight: 500 }}>
                +${parseFloat(vaultPosition.yield_earned).toFixed(4)} USDC {lang === 'es' ? 'generado en yield' : 'earned in yield'}
              </p>
            ) : depositDone ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 10 }}>
                <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#10B981' }} />
                <p style={{ fontSize: 12, color: '#10B981', fontWeight: 500 }}>
                  {lang === 'es' ? 'Generando yield en Morpho…' : 'Earning yield on Morpho…'}
                </p>
              </div>
            ) : (
              <p style={{ fontSize: 12, color: '#9CA3AF', marginBottom: 10 }}>
                {lang === 'es' ? '0.00 USDC — deposita para empezar a ganar yield' : '0.00 USDC — deposit to start earning yield'}
              </p>
            )}

            <button
              onClick={() => savingsWalletId && setShowWithdrawModal(true)}
              disabled={!savingsWalletId}
              style={{
                width: '100%', height: 42, borderRadius: 12,
                background: '#fff',
                border: `1.5px solid ${savingsWalletId ? 'rgba(124,58,237,0.3)' : '#E5E7EB'}`,
                color: savingsWalletId ? '#7C3AED' : '#9CA3AF',
                fontSize: 13, fontWeight: 600,
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                cursor: savingsWalletId ? 'pointer' : 'not-allowed',
                opacity: savingsWalletId ? 1 : 0.5,
                marginBottom: withdrawDone ? 10 : 12,
              }}
            >
              ↓ {lang === 'es' ? 'Retirar al savings wallet' : 'Withdraw to savings wallet'}
            </button>

            {withdrawDone && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#F0FDF4', borderRadius: 10, padding: '8px 12px', border: '1px solid #BBF7D0', marginBottom: 12 }}>
                <span style={{ fontSize: 14 }}>✅</span>
                <p style={{ fontSize: 12, color: '#166534', fontWeight: 500 }}>
                  {lang === 'es'
                    ? 'Retiro en proceso — USDC regresando a tu savings wallet'
                    : 'Withdrawal in progress — USDC returning to your savings wallet'}
                </p>
              </div>
            )}

            {/* Protocol tags */}
            <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
              {[
                { label: 'Base', bg: '#DBEAFE', color: '#1D4ED8' },
                { label: 'USDC', bg: '#D1FAE5', color: '#065F46' },
                { label: 'Morpho ERC-4626', bg: '#EDE9FE', color: '#7C3AED' },
                { label: 'Privy Earn', bg: '#FFFBEB', color: '#78350F' },
              ].map(tag => (
                <span key={tag.label} style={{ fontSize: 10, fontWeight: 600, color: tag.color, background: tag.bg, borderRadius: 6, padding: '2px 7px' }}>
                  {tag.label}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* ── Vivi Rewards (educational points — NOT real USDC) ── */}
        <div style={{ background: '#FFF8F0', borderRadius: 20, padding: '16px 20px', border: '1px solid rgba(251,191,36,0.3)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                <span style={{ fontSize: 14 }}>🎁</span>
                <p style={{ fontSize: 11, fontWeight: 700, color: '#92400E', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  Vivi Rewards
                </p>
              </div>
              <p style={{ fontSize: 11, color: '#78350F', marginBottom: 8, lineHeight: 1.5 }}>
                {lang === 'es'
                  ? 'Puntos educativos por completar retos. No son USDC real onchain.'
                  : 'Educational points for completing challenges. Not real onchain USDC.'}
              </p>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
                <span style={{ fontSize: 24, fontWeight: 700, color: '#92400E', lineHeight: 1 }}>
                  {user.usdcBalance.toFixed(0)}
                </span>
                <span style={{ fontSize: 12, color: '#B45309', fontWeight: 600 }}>pts</span>
              </div>
            </div>
            <span style={{ fontSize: 36 }}>🏆</span>
          </div>
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
        availableBalance={realUsdcBalance ?? 0}
        onDepositConfirmed={() => {
          setDepositDone(true)
          setTimeout(() => void fetchRealBalance(), 3000)
        }}
      />

      {savingsWalletId && savingsWalletAddr && (
        <WithdrawModal
          open={showWithdrawModal}
          onClose={() => setShowWithdrawModal(false)}
          savingsWalletId={savingsWalletId}
          savingsWalletAddr={savingsWalletAddr}
          vaultBalance={vaultPosition?.asset_balance}
          lang={lang}
          onWithdrawConfirmed={() => {
            setWithdrawDone(true)
            setTimeout(() => void fetchRealBalance(), 3000)
          }}
        />
      )}

      {savingsWalletId && savingsWalletAddr && (
        <SendModal
          open={showSendModal}
          onClose={() => setShowSendModal(false)}
          savingsWalletId={savingsWalletId}
          savingsWalletAddr={savingsWalletAddr}
          availableBalance={realUsdcBalance ?? 0}
          lang={lang}
          onSendConfirmed={() => setTimeout(() => void fetchRealBalance(), 3000)}
        />
      )}
    </div>
  )
}

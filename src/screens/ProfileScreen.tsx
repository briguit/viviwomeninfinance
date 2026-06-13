'use client'
import { useState } from 'react'
import { useApp } from '@/context/AppContext'
import { t } from '@/lib/i18n'
import LanguageToggle from '@/components/LanguageToggle'
import { ExternalLink, Shield, Star, Award, LogOut, ChevronDown, ChevronUp, TrendingUp, Zap } from 'lucide-react'
import { COUNTRY_FLAGS, COUNTRIES_LIST } from '@/lib/countryData'

export default function ProfileScreen() {
  const { lang, user, handleLogout, walletAddress } = useApp()
  const tx = t[lang]
  const [confirmLogout, setConfirmLogout] = useState(false)
  const [showWallet, setShowWallet] = useState(false)
  const [earnLoading, setEarnLoading] = useState(false)
  const [earnSuccess, setEarnSuccess] = useState(false)
  const [earnError, setEarnError] = useState('')

  if (!user) return null

  const flag         = COUNTRY_FLAGS[user.country] ?? '🌍'
  const countryLabel = COUNTRIES_LIST.find(c => c.code === user.country)?.label ?? user.country
  const initial      = user.name.charAt(0).toUpperCase()
  const ensUrl       = `https://app.ens.domains/${user.viviEns}`

  async function handleEarnDeposit() {
    if (!walletAddress) return
    setEarnLoading(true)
    setEarnError('')
    try {
      const res = await fetch('/api/earn/deposit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ walletAddress, amount: '1.00' }),
      })
      const data = await res.json() as { success: boolean; message?: string }
      if (data.success) {
        setEarnSuccess(true)
      } else {
        setEarnError(data.message ?? 'Error')
      }
    } catch {
      setEarnError(lang === 'es' ? 'No se pudo conectar. Intenta de nuevo.' : 'Could not connect. Try again.')
    } finally {
      setEarnLoading(false)
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
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <TrendingUp size={16} style={{ color: '#6EE7B7' }} />
            <p style={{ fontSize: 12, color: '#6EE7B7', fontWeight: 600 }}>
              {lang === 'es' ? 'PRIVY EARN · Morpho USDC Vault · Base' : 'PRIVY EARN · Morpho USDC Vault · Base'}
            </p>
          </div>
          <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.75)', lineHeight: 1.5, marginBottom: 14 }}>
            {lang === 'es'
              ? 'Gana ~4–6% APY en tu USDC a través de vaults ERC-4626 de Morpho en Base. Powered by Privy Earn.'
              : 'Earn ~4–6% APY on your USDC via Morpho ERC-4626 vaults on Base. Powered by Privy Earn.'}
          </p>

          {earnSuccess ? (
            <div style={{ background: 'rgba(110,231,183,0.15)', borderRadius: 12, padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 8 }}>
              <Zap size={14} style={{ color: '#6EE7B7' }} />
              <p style={{ fontSize: 13, color: '#6EE7B7', fontWeight: 500 }}>
                {lang === 'es' ? '¡Depósito enviado a Privy Earn! 🎉' : 'Deposit sent to Privy Earn! 🎉'}
              </p>
            </div>
          ) : (
            <button
              onClick={handleEarnDeposit}
              disabled={earnLoading || !walletAddress}
              style={{
                width: '100%', height: 44, borderRadius: 12,
                background: earnLoading ? 'rgba(255,255,255,0.15)' : '#10B981',
                fontSize: 14, fontWeight: 600,
                color: '#fff',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                cursor: earnLoading || !walletAddress ? 'not-allowed' : 'pointer',
                opacity: !walletAddress ? 0.6 : 1,
              }}
            >
              {earnLoading ? (
                <div style={{ width: 18, height: 18, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
              ) : (
                <>
                  <Zap size={14} />
                  {lang === 'es' ? 'Depositar 1 USDC y ganar yield' : 'Deposit 1 USDC & earn yield'}
                </>
              )}
            </button>
          )}

          {earnError && (
            <p style={{ fontSize: 12, color: '#FCA5A5', marginTop: 8, textAlign: 'center' }}>{earnError}</p>
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

        {/* ── ENS Identity card (key feature) ─────────────────────────────── */}
        <div
          style={{
            background: '#fff',
            borderRadius: 20,
            padding: '20px',
            border: '1.5px solid rgba(124,58,237,0.2)',
          }}
        >
          <div className="flex items-start gap-3" style={{ marginBottom: 12 }}>
            <div
              style={{ width: 40, height: 40, borderRadius: 12, background: '#2D1B4E', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
            >
              <span style={{ fontSize: 20 }}>🔑</span>
            </div>
            <div>
              <p style={{ fontSize: 15, fontWeight: 600, color: '#2D1B4E', marginBottom: 2 }}>{tx.profile_ens_title}</p>
              <p style={{ fontSize: 12, color: '#9CA3AF' }}>{tx.profile_ens_sub}</p>
            </div>
          </div>

          {/* ENS name displayed prominently */}
          <div
            style={{ background: '#F5F3FF', borderRadius: 12, padding: '12px 14px', marginBottom: 12 }}
          >
            <p style={{ fontSize: 18, fontWeight: 700, color: '#7C3AED', letterSpacing: '-0.3px' }}>
              {user.viviEns}
            </p>
          </div>

          <p style={{ fontSize: 13, color: '#6B7280', lineHeight: 1.6, marginBottom: 14 }}>
            {tx.profile_ens_explain}
          </p>

          <a
            href={ensUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 font-medium hover:underline transition-colors"
            style={{ fontSize: 13, color: '#7C3AED' }}
          >
            <ExternalLink size={13} />
            {tx.profile_ens_cta}
          </a>
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

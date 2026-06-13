'use client'
import { useState, useRef, useEffect } from 'react'
import { useApp } from '@/context/AppContext'
import { t } from '@/lib/i18n'
import { COUNTRIES_LIST } from '@/lib/countryData'
import LanguageToggle from '@/components/LanguageToggle'
import { Check, Shield, ChevronLeft } from 'lucide-react'

// World ID — imported only when app_id is configured
let IDKitWidget: React.ComponentType<IDKitProps> | null = null
let VerificationLevel: Record<string, string> | null = null
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const wld = require('@worldcoin/idkit')
  IDKitWidget = wld.IDKitWidget
  VerificationLevel = wld.VerificationLevel
} catch { /* package not installed */ }

interface IDKitProps {
  app_id: string
  action: string
  verification_level?: string
  onSuccess: (proof: WorldIDProof) => void
  children: (props: { open: () => void }) => React.ReactNode
}

interface WorldIDProof {
  proof: string
  merkle_root: string
  nullifier_hash: string
  verification_level: string
}

type Step = 'splash' | 'identity' | 'worldid'

// ── Progress bar ──────────────────────────────────────────────────────────────
const STEPS: Step[] = ['identity', 'worldid']
function ProgressBar({ step }: { step: Step }) {
  const idx = STEPS.indexOf(step)
  if (idx < 0) return null
  return (
    <div className="flex gap-1.5 mb-7">
      {STEPS.map((_, i) => (
        <div
          key={i}
          className="h-1 rounded-full flex-1 transition-all duration-300"
          style={{ background: i <= idx ? '#7C3AED' : '#E5E1FF' }}
        />
      ))}
    </div>
  )
}

// ── Card shell for steps 1–3 ──────────────────────────────────────────────────
function StepCard({
  children, step, onBack,
}: {
  children: React.ReactNode
  step: Step
  onBack?: () => void
}) {
  return (
    <div
      className="app-shell flex flex-col"
      style={{ background: '#F8F7FF', height: '100dvh', overflow: 'hidden' }}
    >
      {/* Top bar */}
      <div className="flex items-center justify-between px-5 pt-10 pb-3 flex-shrink-0">
        {onBack ? (
          <button
            onClick={onBack}
            className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-vivi-lila transition-colors"
          >
            <ChevronLeft size={20} className="text-vivi-deep" />
          </button>
        ) : <div className="w-9" />}
        <LanguageToggle />
      </div>

      {/* Centred card with flex spacers */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>
        <div style={{ flex: 1, minHeight: 20 }} />
        <div className="px-5">
          <div style={{ background: '#fff', borderRadius: 24, padding: 28, boxShadow: '0 4px 24px rgba(45,27,78,0.08)' }}>
            <ProgressBar step={step} />
            {children}
          </div>
        </div>
        <div style={{ flex: 1, minHeight: 28 }} />
      </div>
    </div>
  )
}

// ── Main ──────────────────────────────────────────────────────────────────────
interface Props { startAtIdentity?: boolean }

export default function OnboardingScreen({ startAtIdentity = false }: Props) {
  const { lang, auth, saveAndSetUser } = useApp()
  const tx = t[lang]

  const [step, setStep] = useState<Step>(startAtIdentity ? 'identity' : 'splash')
  const [name, setName] = useState('')

  // ref tracks the current value for use in closures
  const [country, setCountry] = useState('MX')
  const countryRef = useRef('MX')
  function updateCountry(val: string) { countryRef.current = val; setCountry(val) }

  const [worldLoading, setWorldLoading] = useState(false)
  const [worldVerified, setWorldVerified] = useState(false)
  const [worldError, setWorldError] = useState(false)

  // When Privy modal completes auth, transition from splash to identity
  useEffect(() => {
    if (auth.authenticated && step === 'splash') {
      setStep('identity')
    }
  }, [auth.authenticated, step])

  // ── Handlers ───────────────────────────────────────────────────────────────
  function handleIdentity() {
    if (!name.trim()) return
    setStep('worldid')
  }

  async function handleWorldIDSuccess(proof: WorldIDProof) {
    setWorldLoading(true)
    setWorldError(false)
    try {
      const res = await fetch('/api/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(proof),
      })
      const data = await res.json() as { success: boolean }
      if (data.success) {
        setWorldVerified(true)
        setWorldLoading(false)
      } else throw new Error('not verified')
    } catch {
      setWorldLoading(false)
      setWorldError(true)
    }
  }

  function finish(verified: boolean) {
    const currentCountry = countryRef.current
    const trimmedName = name.trim()
    saveAndSetUser({
      name: trimmedName,
      viviEns: `${trimmedName.toLowerCase().replace(/\s+/g, '')}.vivi.eth`,
      country: currentCountry,
      worldIdVerified: verified,
      usdcBalance: 5.0,
      points: 0,
      level: 1,
      challengesCompleted: 0,
    })
  }

  // ══════════════════════════════════════════════════════════════════════════
  // SPLASH
  // ══════════════════════════════════════════════════════════════════════════
  if (step === 'splash') {
    const f = 'Manrope, Verdana, Arial, sans-serif'
    return (
      <div
        className="app-shell flex flex-col"
        style={{ background: '#fef7ff', height: '100dvh' }}
      >
        {/* Language toggle */}
        <div className="flex justify-end px-5 pt-10 flex-shrink-0">
          <LanguageToggle />
        </div>

        {/* Content */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '0 20px 32px' }}>

          {/* Logo */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 40 }}>
            <img src="/vivi-logo.svg" alt="Vivi" style={{ height: 88, width: 88, marginBottom: 12 }} />
            <span style={{ fontFamily: f, fontSize: 40, fontWeight: 800, color: '#7C3AED', letterSpacing: '-0.02em', lineHeight: 1 }}>
              Vivi
            </span>
          </div>

          {/* Headline — display-lg mobile spec */}
          <h1 style={{
            fontFamily: f, fontSize: 28, fontWeight: 700,
            lineHeight: '36px', letterSpacing: '-0.01em',
            color: '#1d1a24', marginBottom: 12, whiteSpace: 'pre-line',
          }}>
            {tx.splash_headline}
          </h1>

          {/* Sub — body-md spec */}
          <p style={{
            fontFamily: f, fontSize: 16, fontWeight: 400,
            lineHeight: '24px', color: '#4a4455', marginBottom: 32,
          }}>
            {tx.splash_sub}
          </p>

          {/* Feature chips — pill with lavender bg + violet label */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 40 }}>
            {[
              { icon: '💬', text: tx.splash_feat1 },
              { icon: '🎯', text: tx.splash_feat2 },
              { icon: '🔑', text: tx.splash_feat3 },
            ].map(({ icon, text }) => (
              <div key={text} style={{
                display: 'flex', alignItems: 'center', gap: 12,
                background: '#ede9fe', borderRadius: 9999, padding: '10px 16px',
              }}>
                <span style={{ fontSize: 16, lineHeight: 1, flexShrink: 0 }}>{icon}</span>
                <span style={{ fontFamily: f, fontSize: 14, fontWeight: 600, color: '#7C3AED', lineHeight: '20px' }}>
                  {text}
                </span>
              </div>
            ))}
          </div>

          {/* Primary CTA */}
          <button
            onClick={auth.login}
            style={{
              width: '100%', height: 56, borderRadius: 16,
              background: '#7C3AED', color: '#fff',
              fontFamily: f, fontSize: 16, fontWeight: 600,
              boxShadow: '0 8px 24px rgba(124,58,237,0.25)',
              marginBottom: 16, letterSpacing: '0.01em',
            }}
            className="transition-all active:scale-95"
          >
            {tx.splash_cta} →
          </button>

          {/* Secondary */}
          <button
            onClick={auth.login}
            style={{ fontFamily: f, fontSize: 14, fontWeight: 600, color: '#4a4455', background: 'none', textAlign: 'center' }}
          >
            {tx.splash_login}
          </button>
        </div>
      </div>
    )
  }

  // ══════════════════════════════════════════════════════════════════════════
  // IDENTITY (paso 1 — Privy handles email auth via modal)
  // ══════════════════════════════════════════════════════════════════════════
  if (step === 'identity') {
    const ens = name.trim()
      ? `${name.trim().toLowerCase().replace(/\s+/g, '')}.vivi.eth`
      : null

    return (
      <StepCard step="identity" onBack={() => setStep('splash')}>
        <div style={{ marginBottom: 20 }}>
          <h2 className="font-semibold text-vivi-deep" style={{ fontSize: 22, lineHeight: 1.3, marginBottom: 6 }}>
            {tx.identity_title}
          </h2>
          <p className="text-vivi-gray" style={{ fontSize: 14 }}>{tx.identity_sub}</p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 16 }}>
          <input
            type="text"
            value={name}
            autoFocus
            onChange={e => setName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleIdentity()}
            placeholder={tx.identity_placeholder}
            style={{ height: 52, borderRadius: 14, border: '1.5px solid #E5E1FF', padding: '0 16px', fontSize: 15, outline: 'none', width: '100%' }}
            className="text-vivi-deep bg-white focus:border-vivi-purple transition-colors"
          />

          {/* ENS name preview */}
          {ens && (
            <div
              className="flex items-center gap-2 animate-bounce-in"
              style={{ background: '#EDE9FE', borderRadius: 12, padding: '10px 14px' }}
            >
              <Check size={14} style={{ color: '#7C3AED', flexShrink: 0 }} />
              <div>
                <p style={{ fontSize: 11, color: '#7C3AED', marginBottom: 1, opacity: 0.7 }}>{tx.identity_ens_preview}</p>
                <p style={{ fontSize: 13, color: '#2D1B4E', fontWeight: 600 }}>{ens}</p>
              </div>
            </div>
          )}

          {/* Country */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label style={{ fontSize: 13, fontWeight: 500, color: '#2D1B4E' }}>{tx.identity_country}</label>
            <select
              value={country}
              onChange={e => updateCountry(e.target.value)}
              style={{ height: 52, borderRadius: 14, border: '1.5px solid #E5E1FF', padding: '0 16px', fontSize: 14, outline: 'none', background: '#fff', width: '100%', appearance: 'auto' }}
              className="text-vivi-deep focus:border-vivi-purple transition-colors cursor-pointer"
            >
              {COUNTRIES_LIST.map(c => (
                <option key={c.code} value={c.code}>{c.flag} {c.label}</option>
              ))}
            </select>
          </div>
        </div>

        <button
          onClick={handleIdentity}
          disabled={!name.trim()}
          style={{ height: 52, borderRadius: 14, background: '#7C3AED', fontSize: 15 }}
          className="w-full text-white font-semibold disabled:opacity-40 transition-all active:scale-95"
        >
          {tx.identity_cta}
        </button>
      </StepCard>
    )
  }

  // ══════════════════════════════════════════════════════════════════════════
  // WORLD ID (paso 3)
  // ══════════════════════════════════════════════════════════════════════════
  const wldAppId = process.env.NEXT_PUBLIC_WLD_APP_ID
  const wldEnabled = !!(IDKitWidget && wldAppId)
  const isDemo = !wldEnabled

  return (
    <StepCard step="worldid" onBack={() => setStep('identity')}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: 6, marginBottom: 20 }}>
        <div
          style={{ width: 52, height: 52, borderRadius: 16, background: '#2D1B4E', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 4 }}
        >
          <span style={{ fontSize: 26 }}>🌍</span>
        </div>
        <h2 className="font-semibold text-vivi-deep" style={{ fontSize: 22 }}>{tx.worldid_title}</h2>
        <p className="text-vivi-gray" style={{ fontSize: 14 }}>{tx.worldid_sub}</p>
      </div>

      {/* Description box */}
      <div style={{ background: '#F5F3FF', borderRadius: 14, padding: '14px 16px', marginBottom: 16 }}>
        <p className="text-vivi-gray" style={{ fontSize: 13, lineHeight: 1.6, marginBottom: 8 }}>{tx.worldid_desc}</p>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Shield size={12} style={{ color: '#10B981', flexShrink: 0 }} />
          <span style={{ fontSize: 11, fontWeight: 500, color: '#10B981' }}>{tx.worldid_feature}</span>
        </div>
      </div>

      {/* Demo mode label */}
      {isDemo && (
        <div style={{ background: '#FFFBEB', borderRadius: 10, padding: '8px 12px', marginBottom: 12, textAlign: 'center' }}>
          <p style={{ fontSize: 11, color: '#92400E' }}>
            {lang === 'es' ? 'Modo demo — simulación de verificación' : 'Demo mode — verification simulation'}
          </p>
        </div>
      )}

      {/* Verified state */}
      {worldVerified && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, marginBottom: 16 }} className="animate-bounce-in">
          <div style={{ width: 52, height: 52, borderRadius: '50%', background: 'rgba(16,185,129,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Check size={26} style={{ color: '#10B981' }} />
          </div>
          <p style={{ fontWeight: 600, fontSize: 16, color: '#10B981' }}>{tx.worldid_verified} ✅</p>
          <button
            onClick={() => finish(true)}
            style={{ height: 52, borderRadius: 14, background: '#7C3AED', fontSize: 15, width: '100%' }}
            className="text-white font-semibold transition-all active:scale-95"
          >
            {tx.step_start}
          </button>
        </div>
      )}

      {/* Error state */}
      {worldError && !worldVerified && (
        <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 12, padding: 14, marginBottom: 12, textAlign: 'center' }}>
          <p style={{ fontSize: 13, color: '#DC2626', fontWeight: 500 }}>{tx.worldid_error}</p>
        </div>
      )}

      {/* Buttons */}
      {!worldVerified && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {worldLoading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '16px 0' }}>
              <div className="w-8 h-8 border-4 border-vivi-lila border-t-vivi-deep rounded-full animate-spin" />
            </div>
          ) : wldEnabled && IDKitWidget ? (
            <IDKitWidget
              app_id={wldAppId as string}
              action={process.env.WLD_ACTION ?? 'verify-human'}
              verification_level={VerificationLevel?.Device ?? 'device'}
              onSuccess={handleWorldIDSuccess}
            >
              {({ open }: { open: () => void }) => (
                <button
                  onClick={open}
                  style={{ height: 52, borderRadius: 14, background: '#2D1B4E', fontSize: 15, width: '100%' }}
                  className="text-white font-semibold flex items-center justify-center gap-2 transition-all active:scale-95"
                >
                  <span>🌍</span> {worldError ? tx.worldid_retry : tx.worldid_cta}
                </button>
              )}
            </IDKitWidget>
          ) : (
            <button
              onClick={() => {
                setWorldLoading(true)
                setTimeout(() => { setWorldLoading(false); setWorldVerified(true) }, 1800)
              }}
              style={{ height: 52, borderRadius: 14, background: '#2D1B4E', fontSize: 15, width: '100%' }}
              className="text-white font-semibold flex items-center justify-center gap-2 transition-all active:scale-95"
            >
              <span>🌍</span> {tx.worldid_cta}
            </button>
          )}

          <button
            onClick={() => finish(false)}
            className="text-vivi-gray text-sm py-2 text-center hover:text-vivi-purple transition-colors"
          >
            {tx.worldid_skip}
          </button>
        </div>
      )}
    </StepCard>
  )
}

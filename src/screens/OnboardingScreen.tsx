'use client'
import { useState, useRef, useEffect } from 'react'
import { useLoginWithEmail } from '@privy-io/react-auth'
import { useApp } from '@/context/AppContext'
import { t } from '@/lib/i18n'
import { COUNTRIES_LIST } from '@/lib/countryData'
import LanguageToggle from '@/components/LanguageToggle'
import { Check, Shield, ChevronLeft, Mail, Lock, ArrowLeft } from 'lucide-react'

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

type Step = 'splash' | 'login' | 'identity' | 'worldid'

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
  const f = 'Manrope, Verdana, Arial, sans-serif'

  const [step, setStep] = useState<Step>(startAtIdentity ? 'identity' : 'splash')
  const [name, setName] = useState('')

  // ref tracks the current value for use in closures
  const [country, setCountry] = useState('MX')
  const countryRef = useRef('MX')
  function updateCountry(val: string) { countryRef.current = val; setCountry(val) }

  // ── Login state ────────────────────────────────────────────────────────────
  const [loginEmail, setLoginEmail]     = useState('')
  const [loginView, setLoginView]       = useState<'email' | 'otp'>('email')
  const [otpDigits, setOtpDigits]       = useState(['', '', '', '', '', ''])
  const [loginLoading, setLoginLoading] = useState(false)
  const [loginError, setLoginError]     = useState('')
  const otpRefs = useRef<(HTMLInputElement | null)[]>([])

  const { sendCode, loginWithCode } = useLoginWithEmail({
    onComplete: () => setStep('identity'),
  })

  const [worldLoading, setWorldLoading] = useState(false)
  const [worldVerified, setWorldVerified] = useState(false)
  const [worldError, setWorldError] = useState(false)

  // When Privy auth completes, move to identity step
  useEffect(() => {
    if (auth.authenticated && (step === 'splash' || step === 'login')) {
      setStep('identity')
    }
  }, [auth.authenticated, step])

  // ── Login handlers ─────────────────────────────────────────────────────────
  async function handleSendCode(e: React.FormEvent) {
    e.preventDefault()
    if (!loginEmail.trim()) return
    setLoginLoading(true); setLoginError('')
    try {
      await sendCode({ email: loginEmail.trim() })
      setLoginView('otp')
      setTimeout(() => otpRefs.current[0]?.focus(), 120)
    } catch {
      setLoginError(lang === 'es' ? 'No se pudo enviar el código. Intenta de nuevo.' : 'Could not send code. Try again.')
    } finally { setLoginLoading(false) }
  }

  async function handleVerifyOtp(e: React.FormEvent) {
    e.preventDefault()
    const code = otpDigits.join('')
    if (code.length < 6) return
    setLoginLoading(true); setLoginError('')
    try {
      await loginWithCode({ code })
    } catch {
      setLoginError(lang === 'es' ? 'Código incorrecto. Intenta de nuevo.' : 'Incorrect code. Try again.')
      setLoginLoading(false)
    }
  }

  async function handleResendCode() {
    try {
      await sendCode({ email: loginEmail })
      setOtpDigits(['', '', '', '', '', ''])
      setLoginError('')
      setTimeout(() => otpRefs.current[0]?.focus(), 120)
    } catch {
      setLoginError(lang === 'es' ? 'Error al reenviar.' : 'Resend failed.')
    }
  }

  function handleOtpInput(idx: number, val: string) {
    const digit = val.replace(/\D/g, '').slice(-1)
    const next = [...otpDigits]; next[idx] = digit; setOtpDigits(next)
    if (digit && idx < 5) otpRefs.current[idx + 1]?.focus()
  }

  function handleOtpKeyDown(idx: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Backspace' && !otpDigits[idx] && idx > 0) {
      const prev = [...otpDigits]; prev[idx - 1] = ''; setOtpDigits(prev)
      otpRefs.current[idx - 1]?.focus()
    }
  }

  function handleOtpPaste(e: React.ClipboardEvent) {
    e.preventDefault()
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6)
    if (!pasted) return
    const digits = [...pasted.split(''), ...Array(6).fill('')].slice(0, 6)
    setOtpDigits(digits)
    otpRefs.current[Math.min(pasted.length - 1, 5)]?.focus()
  }

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
        className="app-shell"
        style={{ background: '#f8f9ff', height: '100dvh', position: 'relative', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}
      >
        {/* Ambient glow blobs */}
        <div style={{ position: 'absolute', top: '-10%', left: '-10%', width: '55%', height: '55%', borderRadius: '50%', background: '#fea619', opacity: 0.12, filter: 'blur(80px)', pointerEvents: 'none', zIndex: 0 }} />
        <div style={{ position: 'absolute', bottom: '-10%', right: '-10%', width: '65%', height: '65%', borderRadius: '50%', background: '#d2bbff', opacity: 0.18, filter: 'blur(100px)', pointerEvents: 'none', zIndex: 0 }} />

        {/* ── Hero (55%) ─────────────────────────────────────────────────── */}
        <div style={{
          position: 'relative', flexGrow: 0, flexBasis: '55%',
          background: '#eff4ff',
          clipPath: 'polygon(0 0, 100% 0, 100% 85%, 0% 100%)',
          overflow: 'hidden',
          boxShadow: '0 4px 24px rgba(76,29,149,0.08)',
          zIndex: 1,
        }}>
          {/* V mark — decorative, right side */}
          <div style={{ position: 'absolute', right: -20, top: '50%', transform: 'translateY(-55%)', opacity: 0.55 }}>
            <img src="/vivi-logo.svg" alt="" style={{ height: 200, width: 200 }} />
          </div>
          {/* Soft circle left */}
          <div style={{ position: 'absolute', left: -40, bottom: -20, width: 240, height: 240, borderRadius: '50%', background: 'rgba(99,14,212,0.06)' }} />
          {/* Gradient overlay bottom */}
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(239,244,255,0.9) 0%, transparent 60%)' }} />
          {/* Language toggle */}
          <div style={{ position: 'absolute', top: 48, right: 20, zIndex: 20 }}>
            <LanguageToggle glass />
          </div>
        </div>

        {/* ── Content (45%) ──────────────────────────────────────────────── */}
        <div style={{
          flexGrow: 1, background: '#ffffff',
          display: 'flex', flexDirection: 'column',
          padding: '0 20px', zIndex: 1,
        }}>
          <div style={{ flexGrow: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 12 }}>
            {/* Brand mark */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <img src="/vivi-logo.svg" alt="Vivi" style={{ height: 44, width: 44 }} />
              <span style={{ fontFamily: f, fontSize: 26, fontWeight: 800, color: '#7C3AED', letterSpacing: '-0.02em', lineHeight: 1 }}>Vivi</span>
            </div>
            {/* Headline */}
            <h2 style={{ fontFamily: f, fontSize: 28, fontWeight: 700, lineHeight: '36px', color: '#121c2a', whiteSpace: 'pre-line', margin: 0 }}>
              {tx.splash_headline}
            </h2>
            {/* Subtitle */}
            <p style={{ fontFamily: f, fontSize: 16, fontWeight: 400, lineHeight: '24px', color: '#4a4455', maxWidth: 300, margin: 0 }}>
              {tx.splash_sub}
            </p>
          </div>

          {/* Action area */}
          <div style={{ paddingBottom: 32, display: 'flex', flexDirection: 'column', gap: 16 }}>
            <button
              onClick={() => setStep('login')}
              style={{
                width: '100%', height: 56, background: '#630ed4', color: '#fff',
                fontFamily: f, fontSize: 14, fontWeight: 600, letterSpacing: '0.01em',
                borderRadius: 12, boxShadow: '0 8px 24px rgba(124,58,237,0.12)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              }}
              className="transition-all active:scale-95"
            >
              {tx.splash_cta} <span style={{ fontSize: 18, lineHeight: 1 }}>→</span>
            </button>
            <div style={{ textAlign: 'center' }}>
              <button
                onClick={() => setStep('login')}
                style={{ fontFamily: f, fontSize: 14, fontWeight: 600, color: '#630ed4', background: 'none', padding: '8px 0' }}
                className="transition-colors active:scale-95"
              >
                {tx.splash_login}
              </button>
            </div>
          </div>
          <div style={{ height: 32 }} />
        </div>
      </div>
    )
  }

  // ══════════════════════════════════════════════════════════════════════════
  // LOGIN — custom email + OTP screen (headless Privy, matches Stitch design)
  // ══════════════════════════════════════════════════════════════════════════
  if (step === 'login') {
    const otpComplete = otpDigits.every(d => d !== '')

    const inputStyle: React.CSSProperties = {
      width: '100%', height: 48,
      background: '#fff', border: '1px solid #ccc3d8', borderRadius: 8,
      padding: '0 12px 0 44px',
      fontFamily: f, fontSize: 16, color: '#121c2a', outline: 'none',
    }
    const otpInputStyle: React.CSSProperties = {
      width: 44, height: 56, textAlign: 'center',
      fontFamily: f, fontSize: 22, fontWeight: 600, color: '#121c2a',
      background: '#fff', border: '1px solid #ccc3d8', borderRadius: 8, outline: 'none',
    }

    return (
      <div
        className="app-shell"
        style={{ background: '#f8f9ff', minHeight: '100dvh', position: 'relative', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}
      >
        {/* Ambient blobs */}
        <div style={{ position: 'absolute', top: '-10%', right: '-10%', width: 300, height: 300, borderRadius: '50%', background: '#d2bbff', filter: 'blur(100px)', opacity: 0.40, pointerEvents: 'none', zIndex: 0 }} />
        <div style={{ position: 'absolute', bottom: '-10%', left: '-10%', width: 360, height: 360, borderRadius: '50%', background: '#ffddb8', filter: 'blur(120px)', opacity: 0.40, pointerEvents: 'none', zIndex: 0 }} />

        <main style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '20px', position: 'relative', zIndex: 10, width: '100%' }}>
          {/* "Vivi" header */}
          <div style={{ width: '100%', display: 'flex', justifyContent: 'center', marginBottom: 32 }}>
            <h1 style={{ fontFamily: f, fontSize: 28, fontWeight: 700, color: '#630ed4', letterSpacing: '-0.01em' }}>Vivi</h1>
          </div>

          {/* Glass card */}
          <div style={{
            width: '100%',
            background: 'rgba(255,255,255,0.70)',
            backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
            border: '1px solid rgba(255,255,255,0.50)',
            boxShadow: '0 4px 20px rgba(76,29,149,0.04)',
            borderRadius: 24, padding: 24,
          }}>
            {loginView === 'email' ? (
              /* ── Email state ── */
              <div>
                <div style={{ marginBottom: 24 }}>
                  <h2 style={{ fontFamily: f, fontSize: 24, fontWeight: 600, lineHeight: '32px', color: '#121c2a', marginBottom: 4 }}>
                    {lang === 'es' ? 'Bienvenida de nuevo' : 'Welcome back'}
                  </h2>
                  <p style={{ fontFamily: f, fontSize: 16, fontWeight: 400, lineHeight: '24px', color: '#4a4455' }}>
                    {lang === 'es' ? 'Inicia sesión para acceder a tu billetera segura.' : 'Sign in to access your secure wallet.'}
                  </p>
                </div>

                <form onSubmit={handleSendCode} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <div style={{ position: 'relative' }}>
                    <div style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#7b7487', pointerEvents: 'none', display: 'flex' }}>
                      <Mail size={18} />
                    </div>
                    <input
                      type="email" value={loginEmail} autoFocus required
                      onChange={e => setLoginEmail(e.target.value)}
                      placeholder={lang === 'es' ? 'Ingresa tu correo electrónico' : 'Enter your email'}
                      style={inputStyle}
                    />
                  </div>
                  <button
                    type="submit" disabled={loginLoading || !loginEmail.trim()}
                    style={{
                      width: '100%', height: 44, background: '#630ed4', color: '#fff',
                      fontFamily: f, fontSize: 14, fontWeight: 600, letterSpacing: '0.01em',
                      borderRadius: 8, boxShadow: '0 8px 24px rgba(124,58,237,0.12)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      opacity: loginLoading || !loginEmail.trim() ? 0.6 : 1,
                    }}
                    className="transition-all active:scale-[0.98]"
                  >
                    {loginLoading ? '…' : (lang === 'es' ? 'Enviar Código' : 'Send Code')}
                  </button>
                </form>

                {/* Divider */}
                <div style={{ margin: '24px 0', display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ flex: 1, height: 1, background: '#ccc3d8' }} />
                  <span style={{ fontFamily: f, fontSize: 12, fontWeight: 500, color: '#7b7487', whiteSpace: 'nowrap' }}>
                    {lang === 'es' ? 'o continúa con' : 'or continue with'}
                  </span>
                  <div style={{ flex: 1, height: 1, background: '#ccc3d8' }} />
                </div>

                {/* Social buttons */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  {['Google', 'Apple'].map(p => (
                    <button key={p} onClick={auth.login} style={{ height: 44, border: '1px solid #ccc3d8', borderRadius: 8, fontFamily: f, fontSize: 14, fontWeight: 600, color: '#121c2a', background: '#fff' }}
                      className="transition-colors hover:bg-gray-50 active:scale-[0.98]"
                    >{p}</button>
                  ))}
                </div>

                {loginError && <p style={{ fontFamily: f, fontSize: 12, color: '#ba1a1a', marginTop: 12, textAlign: 'center' }}>{loginError}</p>}

                {/* Back to splash */}
                <button onClick={() => setStep('splash')} style={{ display: 'flex', alignItems: 'center', gap: 4, fontFamily: f, fontSize: 12, color: '#7b7487', background: 'none', marginTop: 20, marginLeft: -4, padding: 4 }}>
                  <ArrowLeft size={14} /> {lang === 'es' ? 'Volver' : 'Back'}
                </button>
              </div>
            ) : (
              /* ── OTP state ── */
              <div>
                <button
                  onClick={() => { setLoginView('email'); setOtpDigits(['','','','','','']); setLoginError('') }}
                  style={{ display: 'flex', alignItems: 'center', gap: 6, fontFamily: f, fontSize: 14, fontWeight: 600, color: '#7b7487', background: 'none', marginBottom: 20, padding: '8px 8px 8px 0', marginLeft: -8 }}
                  className="hover:text-primary transition-colors"
                >
                  <ArrowLeft size={18} /> {lang === 'es' ? 'Atrás' : 'Back'}
                </button>

                <div style={{ marginBottom: 24 }}>
                  <h2 style={{ fontFamily: f, fontSize: 24, fontWeight: 600, lineHeight: '32px', color: '#121c2a', marginBottom: 4 }}>
                    {lang === 'es' ? 'Revisa tu correo' : 'Check your email'}
                  </h2>
                  <p style={{ fontFamily: f, fontSize: 16, fontWeight: 400, lineHeight: '24px', color: '#4a4455' }}>
                    {lang === 'es' ? 'Enviamos un código de 6 dígitos a ' : 'We sent a 6-digit code to '}
                    <span style={{ fontWeight: 600, color: '#630ed4' }}>{loginEmail}</span>
                  </p>
                </div>

                <form onSubmit={handleVerifyOtp} style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 4 }}>
                    {otpDigits.map((digit, idx) => (
                      <input
                        key={idx}
                        ref={el => { otpRefs.current[idx] = el }}
                        type="number" inputMode="numeric" maxLength={1} value={digit}
                        onChange={e => handleOtpInput(idx, e.target.value)}
                        onKeyDown={e => handleOtpKeyDown(idx, e)}
                        onPaste={idx === 0 ? handleOtpPaste : undefined}
                        style={otpInputStyle}
                        className="otp-no-spin"
                      />
                    ))}
                  </div>
                  <button
                    type="submit" disabled={!otpComplete || loginLoading}
                    style={{
                      width: '100%', height: 44, background: '#630ed4', color: '#fff',
                      fontFamily: f, fontSize: 14, fontWeight: 600, letterSpacing: '0.01em',
                      borderRadius: 8, boxShadow: '0 8px 24px rgba(124,58,237,0.12)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      opacity: !otpComplete || loginLoading ? 0.5 : 1,
                      cursor: !otpComplete ? 'not-allowed' : 'pointer',
                    }}
                    className="transition-all active:scale-[0.98]"
                  >
                    {loginLoading ? '…' : (lang === 'es' ? 'Verificar e Iniciar Sesión' : 'Verify & Sign In')}
                  </button>
                </form>

                <div style={{ marginTop: 16, textAlign: 'center' }}>
                  <p style={{ fontFamily: f, fontSize: 12, fontWeight: 500, color: '#4a4455' }}>
                    {lang === 'es' ? '¿No recibiste el código? ' : "Didn't receive code? "}
                    <button onClick={handleResendCode} style={{ color: '#630ed4', fontWeight: 700, background: 'none' }}
                      className="hover:underline"
                    >
                      {lang === 'es' ? 'Reenviar' : 'Resend'}
                    </button>
                  </p>
                </div>

                {loginError && <p style={{ fontFamily: f, fontSize: 12, color: '#ba1a1a', marginTop: 12, textAlign: 'center' }}>{loginError}</p>}
              </div>
            )}
          </div>

          {/* Footer */}
          <div style={{ marginTop: 32, textAlign: 'center' }}>
            <p style={{ fontFamily: f, fontSize: 12, fontWeight: 500, color: '#7b7487', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
              <Lock size={14} />
              {lang === 'es' ? 'Inicio de sesión seguro por Privy' : 'Secure login powered by Privy'}
            </p>
          </div>
        </main>
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

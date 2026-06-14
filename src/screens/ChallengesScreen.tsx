'use client'
import { useState } from 'react'
import { useApp, type ChallengeId, type ChallengeStatus } from '@/context/AppContext'
import { t } from '@/lib/i18n'
import LanguageToggle from '@/components/LanguageToggle'
import ConfettiBlast from '@/components/ConfettiBlast'
import { CheckCircle2, Lock, Circle, X } from 'lucide-react'

interface ChallengeConfig {
  id: ChallengeId
  emoji: string
  reward: number
  titleKey: keyof typeof t.es
  descKey: keyof typeof t.es
  noteKey?: keyof typeof t.es
  badgeKey?: keyof typeof t.es
}

const CHALLENGES: ChallengeConfig[] = [
  { id: 'first-question', emoji: '💬', reward: 5,  titleKey: 'ch1_title', descKey: 'ch1_desc' },
  { id: 'defi',           emoji: '🔮', reward: 10, titleKey: 'ch2_title', descKey: 'ch2_desc' },
  { id: 'savings',        emoji: '🎯', reward: 10, titleKey: 'ch3_title', descKey: 'ch3_desc' },
  { id: 'verify',         emoji: '🌍', reward: 15, titleKey: 'ch4_title', descKey: 'ch4_desc' },
  { id: 'ens',            emoji: '🔑', reward: 20, titleKey: 'ch5_title', descKey: 'ch5_desc', noteKey: 'ch5_note', badgeKey: 'ch5_badge' },
]

function StatusIcon({ status }: { status: ChallengeStatus }) {
  if (status === 'completed') return <CheckCircle2 size={20} style={{ color: '#10B981' }} />
  if (status === 'locked')    return <Lock size={16} style={{ color: '#D1D5DB' }} />
  return <Circle size={20} style={{ color: '#7C3AED' }} />
}

interface ModalData { titleKey: keyof typeof t.es; reward: number; worldIdGated?: boolean }

export default function ChallengesScreen() {
  const { lang, user, challengeStatuses, completeChallengeById, setScreen } = useApp()
  const tx = t[lang]
  const [confetti, setConfetti] = useState(false)
  const [modal, setModal] = useState<ModalData | null>(null)
  const isVerified = user?.worldIdVerified ?? false

  const points = user?.points ?? 0
  const level  = user?.level  ?? 1
  const progressPct = Math.min(((points % 100) / 100) * 100, 100)

  function handleTap(ch: ChallengeConfig) {
    const status = challengeStatuses[ch.id]
    if (status !== 'available') return

    // ENS challenge: navigate to profile where the real ENS lookup lives
    if (ch.id === 'ens') {
      setScreen('profile')
      return
    }

    completeChallengeById(ch.id, ch.reward)

    if (isVerified) {
      setConfetti(true)
      setTimeout(() => setConfetti(false), 120)
      setModal({ titleKey: ch.titleKey, reward: ch.reward, worldIdGated: false })
    } else {
      // Challenge marked complete + points awarded, but USDC is gated
      setModal({ titleKey: ch.titleKey, reward: ch.reward, worldIdGated: true })
    }
  }

  return (
    <div className="flex flex-col" style={{ minHeight: '100dvh', background: '#FAFAF9' }}>
      <ConfettiBlast trigger={confetti} />

      {/* Header */}
      <header
        className="sticky top-0 z-30"
        style={{ background: '#fff', borderBottom: '1px solid #F3F0FF', padding: '44px 20px 16px' }}
      >
        <div className="flex items-center justify-between" style={{ marginBottom: 14 }}>
          <div>
            <h1 className="font-semibold text-vivi-deep" style={{ fontSize: 22 }}>{tx.challenges_title}</h1>
            <p className="text-vivi-gray" style={{ fontSize: 13 }}>{tx.challenges_subtitle}</p>
          </div>
          <LanguageToggle />
        </div>

        {/* Progress bar */}
        <div className="flex items-center gap-3">
          <div style={{ flex: 1 }}>
            <div className="flex items-center justify-between" style={{ marginBottom: 4 }}>
              <span style={{ fontSize: 12, color: '#6B7280' }}>
                {tx.challenges_level} {level} · {points} {tx.challenges_points}
              </span>
              <span style={{ fontSize: 12, fontWeight: 600, color: '#7C3AED' }}>
                {progressPct.toFixed(0)}%
              </span>
            </div>
            <div style={{ height: 6, background: '#EDE9FE', borderRadius: 999, overflow: 'hidden' }}>
              <div
                className="transition-all duration-700"
                style={{ height: '100%', width: `${progressPct}%`, background: 'linear-gradient(90deg, #7C3AED, #A855F7)', borderRadius: 999 }}
              />
            </div>
          </div>
        </div>
      </header>

      {/* Challenge list */}
      <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        {CHALLENGES.map((ch, idx) => {
          const status = challengeStatuses[ch.id]
          const isDone   = status === 'completed'
          const isLocked = status === 'locked'
          const isActive = status === 'available'

          return (
            <button
              key={ch.id}
              onClick={() => handleTap(ch)}
              disabled={isLocked}
              style={{
                width: '100%',
                textAlign: 'left',
                background: '#fff',
                borderRadius: 18,
                padding: '16px 18px',
                border: isDone
                  ? '1.5px solid rgba(16,185,129,0.25)'
                  : isLocked
                  ? '1.5px solid #F3F4F6'
                  : '1.5px solid rgba(124,58,237,0.18)',
                opacity: isLocked ? 0.55 : 1,
                boxShadow: isActive ? '0 2px 12px rgba(124,58,237,0.10)' : '0 1px 4px rgba(0,0,0,0.04)',
                transition: 'box-shadow 0.15s, opacity 0.15s',
                cursor: isLocked ? 'default' : 'pointer',
              }}
              className={isActive ? 'hover:shadow-md active:scale-[0.98]' : ''}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
                {/* Step number / emoji */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, flexShrink: 0 }}>
                  <div
                    style={{
                      width: 40, height: 40, borderRadius: 12,
                      background: isDone ? 'rgba(16,185,129,0.10)' : isLocked ? '#F9FAFB' : '#F5F3FF',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 20,
                      filter: isLocked ? 'grayscale(0.7)' : 'none',
                    }}
                  >
                    {ch.emoji}
                  </div>
                  {/* Connector line (except last) */}
                  {idx < CHALLENGES.length - 1 && (
                    <div style={{ width: 2, height: 8, background: isDone ? '#10B981' : '#E5E1FF', borderRadius: 1 }} />
                  )}
                </div>

                {/* Text */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 3 }}>
                    <p
                      style={{
                        fontSize: 15, fontWeight: 600, lineHeight: 1.3,
                        color: isDone ? '#10B981' : isLocked ? '#9CA3AF' : '#2D1B4E',
                      }}
                    >
                      {tx[ch.titleKey] as string}
                    </p>
                    <StatusIcon status={status} />
                  </div>
                  <p style={{ fontSize: 13, color: '#6B7280', lineHeight: 1.45, marginBottom: 6 }}>
                    {tx[ch.descKey] as string}
                  </p>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    {/* Reward badge */}
                    <span
                      style={{
                        fontSize: 12, fontWeight: 700,
                        color: isDone ? '#10B981' : '#FBBF24',
                        background: isDone ? 'rgba(16,185,129,0.10)' : 'rgba(251,191,36,0.12)',
                        borderRadius: 999, padding: '2px 10px',
                      }}
                    >
                      +{ch.reward} USDC
                    </span>

                    {/* Optional badge (e.g. ENS "Ir a Perfil") */}
                    {!isDone && ch.badgeKey && (
                      <span
                        style={{ fontSize: 11, fontWeight: 500, color: '#7C3AED', background: '#EDE9FE', borderRadius: 999, padding: '2px 10px' }}
                      >
                        {tx[ch.badgeKey] as string}
                      </span>
                    )}

                    {/* Lock hint */}
                    {isLocked && (
                      <span style={{ fontSize: 11, color: '#9CA3AF' }}>
                        {tx.challenges_locked_hint}
                      </span>
                    )}
                  </div>

                  {/* Optional note */}
                  {!isDone && ch.noteKey && (
                    <p style={{ fontSize: 11, color: '#7C3AED', marginTop: 6, lineHeight: 1.5, opacity: 0.85 }}>
                      {tx[ch.noteKey] as string}
                    </p>
                  )}
                </div>
              </div>
            </button>
          )
        })}
      </div>

      {/* Completion modal */}
      {modal && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center"
          style={{ padding: '0 20px 32px', background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)' }}
          onClick={() => setModal(null)}
        >
          <div
            className="w-full max-w-app bg-white animate-bounce-in"
            style={{ borderRadius: 28, padding: '32px 28px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}
            onClick={e => e.stopPropagation()}
          >
            <button
              className="absolute"
              style={{ top: 16, right: 16, color: '#9CA3AF' }}
              onClick={() => setModal(null)}
            >
              <X size={20} />
            </button>

            {modal.worldIdGated ? (
              /* ── NOT VERIFIED: show gate message ── */
              <>
                <div style={{ fontSize: 52 }}>🔒</div>
                <div style={{ textAlign: 'center' }}>
                  <p style={{ fontSize: 18, fontWeight: 600, color: '#2D1B4E', marginBottom: 6 }}>
                    {lang === 'es' ? '¡Reto completado! 🎉' : 'Challenge complete! 🎉'}
                  </p>
                  <p style={{ fontSize: 14, color: '#6B7280', lineHeight: 1.6 }}>
                    {lang === 'es'
                      ? `Ganaste ${modal.reward * 10} pts. Para recibir los $${modal.reward} USDC, necesitas verificar tu identidad con World ID.`
                      : `You earned ${modal.reward * 10} pts. To receive $${modal.reward} USDC, you need to verify your identity with World ID.`}
                  </p>
                </div>
                <div style={{ width: '100%', background: '#FFF8F0', borderRadius: 14, padding: '12px 16px', border: '1px solid rgba(251,191,36,0.3)', textAlign: 'center' }}>
                  <p style={{ fontSize: 12, color: '#92400E', lineHeight: 1.5 }}>
                    🌍 {lang === 'es'
                      ? 'Vivi garantiza 1 beca por persona real — World ID previene que alguien cree 1000 cuentas y vacíe el fondo.'
                      : 'Vivi guarantees 1 scholarship per real person — World ID prevents someone from creating 1000 accounts and draining the fund.'}
                  </p>
                </div>
                <button
                  onClick={() => { setModal(null); setScreen('profile') }}
                  style={{ width: '100%', height: 50, borderRadius: 14, background: '#2D1B4E', fontSize: 15, border: 'none', color: '#fff', fontWeight: 600, cursor: 'pointer' }}
                >
                  🌍 {lang === 'es' ? 'Verificar con World ID →' : 'Verify with World ID →'}
                </button>
                <button onClick={() => setModal(null)} style={{ fontSize: 13, color: '#9CA3AF', background: 'none', border: 'none', cursor: 'pointer' }}>
                  {lang === 'es' ? 'Ahora no' : 'Not now'}
                </button>
              </>
            ) : (
              /* ── VERIFIED: normal confetti modal ── */
              <>
                <div style={{ fontSize: 52 }} className="animate-bounce">🎉</div>
                <div style={{ textAlign: 'center' }}>
                  <p style={{ fontSize: 18, fontWeight: 600, color: '#2D1B4E', marginBottom: 4 }}>
                    {tx.modal_congrats}{' '}
                    <span style={{ color: '#FBBF24' }}>{modal.reward} {tx.modal_usdc}</span>
                  </p>
                  <p style={{ fontSize: 14, color: '#6B7280' }}>
                    {tx[modal.titleKey] as string}
                  </p>
                </div>
                <div style={{ width: '100%', background: '#F5F3FF', borderRadius: 18, padding: '16px', textAlign: 'center' }}>
                  <p style={{ fontSize: 36, fontWeight: 700, color: '#7C3AED', lineHeight: 1 }}>
                    ${(user?.usdcBalance ?? 0).toFixed(2)}
                  </p>
                  <p style={{ fontSize: 12, color: '#6B7280', marginTop: 4 }}>
                    {lang === 'es' ? 'Tu nuevo balance USDC' : 'Your new USDC balance'}
                  </p>
                </div>
                <button
                  onClick={() => setModal(null)}
                  style={{ width: '100%', height: 50, borderRadius: 14, background: '#7C3AED', fontSize: 15, border: 'none', color: '#fff', fontWeight: 600, cursor: 'pointer' }}
                >
                  {tx.modal_view}
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

'use client'
import { useState, useEffect } from 'react'
import { Copy, Check, X, Zap, ArrowRight } from 'lucide-react'

interface Props {
  open: boolean
  onClose: () => void
  savingsWalletId: string | null
  savingsWalletAddr: string | null
  onCreateWallet: () => Promise<void>
  walletLoading: boolean
  walletError: string
  lang: 'es' | 'en'
  onDepositConfirmed: () => void
}

type View = 'address' | 'success'

const QUICK_AMOUNTS = ['5', '10', '25', '50']

export default function DepositModal({
  open, onClose,
  savingsWalletId, savingsWalletAddr,
  onCreateWallet, walletLoading, walletError,
  lang, onDepositConfirmed,
}: Props) {
  const [copied, setCopied] = useState(false)
  const [amount, setAmount] = useState('')
  const [view, setView] = useState<View>('address')
  const [apiLoading, setApiLoading] = useState(false)
  const [apiError, setApiError] = useState('')
  const es = lang === 'es'

  // Reset state each time the modal opens so a re-open starts fresh
  useEffect(() => {
    if (open) {
      setView('address')
      setAmount('')
      setApiError('')
      setCopied(false)
    }
  }, [open])

  if (!open) return null

  const showSetup = !savingsWalletId

  function copyAddress() {
    if (!savingsWalletAddr) return
    void navigator.clipboard.writeText(savingsWalletAddr)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  async function handleSentFunds() {
    if (!savingsWalletId) return
    setApiLoading(true)
    setApiError('')
    try {
      const res = await fetch('/api/earn/deposit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ walletId: savingsWalletId, amount: amount || '1.00' }),
      })
      const data = await res.json() as { success: boolean; message?: string }
      if (data.success) {
        setView('success')
        onDepositConfirmed()
      } else {
        setApiError(data.message ?? (es ? 'Error al depositar.' : 'Deposit error.'))
      }
    } catch {
      setApiError(es ? 'Error de conexión.' : 'Connection error.')
    } finally {
      setApiLoading(false)
    }
  }

  const titleText = !showSetup && view === 'success'
    ? (es ? '¡Depósito confirmado!' : 'Deposit confirmed!')
    : (es ? 'Depositar USDC' : 'Deposit USDC')

  return (
    <div
      className="fixed inset-0 z-50 flex items-end"
      style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(3px)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        className="w-full bg-white"
        style={{ borderRadius: '24px 24px 0 0', paddingBottom: 'max(24px, env(safe-area-inset-bottom))', maxHeight: '92dvh', overflowY: 'auto' }}
      >
        {/* Drag handle */}
        <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 14 }}>
          <div style={{ width: 36, height: 4, borderRadius: 2, background: '#E5E7EB' }} />
        </div>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', padding: '16px 22px 0' }}>
          <div>
            <h2 style={{ fontSize: 20, fontWeight: 700, color: '#2D1B4E', lineHeight: 1.2 }}>{titleText}</h2>
            <p style={{ fontSize: 12, color: '#9CA3AF', marginTop: 2 }}>Base · Morpho Vault · ~4.8% APY</p>
          </div>
          <button onClick={onClose} style={{ background: 'none', color: '#9CA3AF', padding: 4 }}>
            <X size={20} />
          </button>
        </div>

        <div style={{ padding: '20px 22px 4px', display: 'flex', flexDirection: 'column', gap: 14 }}>

          {/* ── SETUP: no wallet yet ── */}
          {showSetup && (
            <>
              <div style={{ background: '#F5F3FF', borderRadius: 16, padding: '20px' }}>
                <p style={{ fontSize: 15, fontWeight: 700, color: '#2D1B4E', marginBottom: 14 }}>
                  {es ? '3 pasos para empezar a ganar yield' : '3 steps to start earning yield'}
                </p>
                {[
                  es ? 'Crea tu wallet de ahorros Privy (gratis)' : 'Create your Privy savings wallet (free)',
                  es ? 'Copia la dirección y envía USDC en Base' : 'Copy the address and send USDC on Base',
                  es ? 'Gana ~4.8% APY en Morpho automáticamente' : 'Earn ~4.8% APY on Morpho automatically',
                ].map((step, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: i < 2 ? 10 : 0 }}>
                    <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#7C3AED', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <span style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>{i + 1}</span>
                    </div>
                    <p style={{ fontSize: 13, color: '#374151' }}>{step}</p>
                  </div>
                ))}
              </div>

              <button
                onClick={() => void onCreateWallet()}
                disabled={walletLoading}
                style={{
                  height: 52, borderRadius: 14, background: '#630ed4', color: '#fff',
                  fontSize: 15, fontWeight: 600, border: 'none',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  opacity: walletLoading ? 0.7 : 1,
                  cursor: walletLoading ? 'not-allowed' : 'pointer',
                }}
              >
                {walletLoading ? (
                  <div style={{ width: 18, height: 18, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                ) : (
                  <>{es ? 'Crear cuenta de ahorro' : 'Create savings account'}<ArrowRight size={16} /></>
                )}
              </button>

              {walletError && (
                <p style={{ fontSize: 12, color: '#EF4444', textAlign: 'center' }}>{walletError}</p>
              )}
            </>
          )}

          {/* ── ADDRESS: wallet exists, show copy + send ── */}
          {!showSetup && savingsWalletAddr && view === 'address' && (
            <>
              {/* Network badges */}
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {[
                  { label: 'Base', bg: '#DBEAFE', color: '#1D4ED8' },
                  { label: 'USDC', bg: '#D1FAE5', color: '#065F46' },
                  { label: 'Morpho Vault', bg: '#EDE9FE', color: '#7C3AED' },
                ].map(b => (
                  <span key={b.label} style={{ fontSize: 11, fontWeight: 600, color: b.color, background: b.bg, borderRadius: 6, padding: '3px 8px' }}>
                    {b.label}
                  </span>
                ))}
              </div>

              {/* Address box */}
              <div style={{ background: '#F8F9FF', borderRadius: 14, padding: '14px', border: '1.5px solid #EDE9FE' }}>
                <p style={{ fontSize: 10, fontWeight: 700, color: '#7C3AED', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>
                  {es ? 'Tu cuenta de ahorros — envía USDC aquí' : 'Your savings account — send USDC here'}
                </p>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                  <p style={{ fontSize: 11, fontFamily: 'monospace', color: '#2D1B4E', flex: 1, wordBreak: 'break-all', lineHeight: 1.7 }}>
                    {savingsWalletAddr}
                  </p>
                  <button
                    onClick={copyAddress}
                    style={{
                      flexShrink: 0, height: 34, padding: '0 10px', borderRadius: 8, border: 'none',
                      background: copied ? '#D1FAE5' : '#EDE9FE',
                      color: copied ? '#059669' : '#7C3AED',
                      fontSize: 12, fontWeight: 600,
                      display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer',
                    }}
                  >
                    {copied
                      ? <><Check size={12} />{es ? 'Copiado' : 'Copied'}</>
                      : <><Copy size={12} />{es ? 'Copiar' : 'Copy'}</>
                    }
                  </button>
                </div>
                <p style={{ fontSize: 10, color: '#9CA3AF', marginTop: 6 }}>
                  ✓ Privy Server Wallet · Base Network · no gas needed to receive
                </p>
              </div>

              {/* How-to callout */}
              <div style={{ background: '#FFFBEB', borderRadius: 12, padding: '12px 14px', border: '1px solid #FDE68A', display: 'flex', gap: 10 }}>
                <span style={{ fontSize: 18, flexShrink: 0 }}>💡</span>
                <div>
                  <p style={{ fontSize: 13, fontWeight: 600, color: '#92400E', marginBottom: 3 }}>
                    {es ? 'Cómo depositar' : 'How to deposit'}
                  </p>
                  <p style={{ fontSize: 12, color: '#78350F', lineHeight: 1.55 }}>
                    {es
                      ? 'Copia la dirección y envía USDC desde tu wallet en Base. Confirma la transacción, luego toca "Ya envié los fondos".'
                      : 'Copy the address and send USDC from your wallet on Base. Confirm the transaction, then tap "I\'ve sent the funds".'}
                  </p>
                </div>
              </div>

              {/* Quick amounts */}
              <div>
                <p style={{ fontSize: 12, fontWeight: 600, color: '#6B7280', marginBottom: 8 }}>
                  {es ? 'Monto (referencia)' : 'Amount (reference)'}
                </p>
                <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
                  {QUICK_AMOUNTS.map(q => (
                    <button
                      key={q}
                      onClick={() => setAmount(a => a === q ? '' : q)}
                      style={{
                        flex: 1, height: 38, borderRadius: 10, border: 'none',
                        background: amount === q ? '#630ed4' : '#F5F3FF',
                        color: amount === q ? '#fff' : '#7C3AED',
                        fontSize: 13, fontWeight: 600, cursor: 'pointer',
                      }}
                    >
                      ${q}
                    </button>
                  ))}
                </div>
                <input
                  value={amount}
                  onChange={e => setAmount(e.target.value.replace(/[^0-9.]/g, ''))}
                  placeholder={es ? 'Otro monto en USDC' : 'Other amount in USDC'}
                  style={{
                    width: '100%', height: 42, borderRadius: 10,
                    border: '1.5px solid #E5E7EB', padding: '0 14px',
                    fontSize: 14, color: '#2D1B4E', outline: 'none',
                    fontFamily: 'Manrope, sans-serif', boxSizing: 'border-box',
                  }}
                />
              </div>

              {/* API error */}
              {apiError && (
                <div style={{ background: '#FEF2F2', borderRadius: 10, padding: '10px 14px', border: '1px solid #FECACA' }}>
                  <p style={{ fontSize: 12, color: '#DC2626', lineHeight: 1.5 }}>{apiError}</p>
                </div>
              )}

              {/* Primary CTA */}
              <button
                onClick={() => void handleSentFunds()}
                disabled={apiLoading}
                style={{
                  width: '100%', height: 52, borderRadius: 14, border: 'none',
                  background: apiLoading ? 'rgba(99,14,212,0.6)' : '#630ed4',
                  color: '#fff', fontSize: 15, fontWeight: 600,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  cursor: apiLoading ? 'not-allowed' : 'pointer',
                  boxShadow: '0 4px 16px rgba(99,14,212,0.28)',
                }}
              >
                {apiLoading
                  ? <div style={{ width: 18, height: 18, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                  : <><Zap size={16} />{es ? 'Ya envié los fondos' : "I've sent the funds"}</>
                }
              </button>

              <p style={{ textAlign: 'center', fontSize: 11, color: '#9CA3AF', lineHeight: 1.5, paddingBottom: 4 }}>
                {es
                  ? 'En modo demo, funciona sin USDC real. Solo toca el botón.'
                  : 'In demo mode, this works without real USDC. Just tap the button.'}
              </p>
            </>
          )}

          {/* ── SUCCESS ── */}
          {!showSetup && view === 'success' && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, paddingTop: 8, paddingBottom: 8 }}>
              <div style={{ fontSize: 60 }}>🎉</div>
              <div style={{ textAlign: 'center' }}>
                <p style={{ fontSize: 22, fontWeight: 700, color: '#2D1B4E', marginBottom: 8 }}>
                  {es ? '¡Depósito enviado!' : 'Deposit sent!'}
                </p>
                <p style={{ fontSize: 14, color: '#6B7280', lineHeight: 1.6 }}>
                  {es
                    ? `Tu USDC${amount ? ` ($${amount})` : ''} está siendo depositado en el vault Morpho en Base. Empezarás a ganar rendimiento automáticamente.`
                    : `Your USDC${amount ? ` ($${amount})` : ''} is being deposited into the Morpho vault on Base. You'll start earning yield automatically.`}
                </p>
              </div>
              <div style={{ background: '#F5F3FF', borderRadius: 16, padding: '16px', width: '100%', textAlign: 'center', border: '1.5px solid rgba(124,58,237,0.15)' }}>
                <p style={{ fontSize: 12, color: '#7C3AED', fontWeight: 600, marginBottom: 4 }}>Morpho USDC Vault · Base</p>
                <p style={{ fontSize: 28, fontWeight: 700, color: '#2D1B4E', lineHeight: 1 }}>~4.8% APY</p>
                <p style={{ fontSize: 12, color: '#9CA3AF', marginTop: 4 }}>
                  {es ? 'rendimiento anual estimado' : 'estimated annual yield'}
                </p>
              </div>
              <button
                onClick={onClose}
                style={{
                  width: '100%', height: 52, borderRadius: 14, border: 'none',
                  background: '#630ed4', color: '#fff', fontSize: 15, fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                {es ? 'Perfecto, ver mi perfil' : 'Great, back to profile'}
              </button>
            </div>
          )}

        </div>
      </div>
    </div>
  )
}

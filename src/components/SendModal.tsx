'use client'
import { useState, useEffect } from 'react'
import { X, ArrowUpRight, Check, AlertCircle } from 'lucide-react'

interface Props {
  open: boolean
  onClose: () => void
  savingsWalletId: string
  savingsWalletAddr: string
  availableBalance: number
  lang: 'es' | 'en'
  onSendConfirmed: () => void
}

type View = 'form' | 'success'

const QUICK_AMOUNTS = ['5', '10', '25', '50']

const isValidAddress = (addr: string) => /^0x[a-fA-F0-9]{40}$/.test(addr.trim())

export default function SendModal({
  open, onClose,
  savingsWalletId,
  availableBalance,
  lang, onSendConfirmed,
}: Props) {
  const [view, setView]           = useState<View>('form')
  const [recipient, setRecipient] = useState('')
  const [amount, setAmount]       = useState('')
  const [apiLoading, setApiLoading] = useState(false)
  const [apiError, setApiError]   = useState('')
  const [txHash, setTxHash]       = useState<string | null>(null)
  const [isDemo, setIsDemo]       = useState(false)
  const es = lang === 'es'

  useEffect(() => {
    if (open) {
      setView('form')
      setRecipient('')
      setAmount('')
      setApiError('')
      setTxHash(null)
      setIsDemo(false)
    }
  }, [open])

  if (!open) return null

  const numAmount      = parseFloat(amount)
  const recipientValid = isValidAddress(recipient)
  const amountValid    = !isNaN(numAmount) && numAmount > 0 && numAmount <= availableBalance
  const canSend        = recipientValid && amountValid && !apiLoading

  let recipientError = ''
  if (recipient && !recipientValid) {
    recipientError = es
      ? 'Dirección inválida — debe empezar con 0x y tener 42 caracteres.'
      : 'Invalid address — must start with 0x and be 42 characters.'
  }
  let amountError = ''
  if (amount && !isNaN(numAmount)) {
    if (numAmount <= 0) {
      amountError = es ? 'El monto debe ser mayor a 0.' : 'Amount must be greater than 0.'
    } else if (numAmount > availableBalance) {
      amountError = es
        ? `Fondos insuficientes. Disponible: $${availableBalance.toFixed(2)} USDC`
        : `Insufficient funds. Available: $${availableBalance.toFixed(2)} USDC`
    }
  }

  async function handleSend() {
    if (!canSend) return
    setApiLoading(true)
    setApiError('')
    try {
      const res = await fetch('/api/earn/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          walletId: savingsWalletId,
          recipientAddress: recipient.trim(),
          amount,
        }),
      })
      const data = await res.json() as { success: boolean; message?: string; txHash?: string | null; demo?: boolean }
      if (data.success) {
        setTxHash(data.txHash ?? null)
        setIsDemo(!!data.demo)
        setView('success')
        onSendConfirmed()
      } else {
        setApiError(data.message ?? (es ? 'Error al enviar.' : 'Send error.'))
      }
    } catch {
      setApiError(es ? 'Error de conexión.' : 'Connection error.')
    } finally {
      setApiLoading(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end"
      style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(3px)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        className="w-full bg-white"
        style={{ borderRadius: '24px 24px 0 0', paddingBottom: 'max(24px, env(safe-area-inset-bottom))', maxHeight: '90dvh', overflowY: 'auto' }}
      >
        {/* Drag handle */}
        <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 14 }}>
          <div style={{ width: 36, height: 4, borderRadius: 2, background: '#E5E7EB' }} />
        </div>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', padding: '16px 22px 0' }}>
          <div>
            <h2 style={{ fontSize: 20, fontWeight: 700, color: '#2D1B4E', lineHeight: 1.2 }}>
              {view === 'success'
                ? (es ? '¡USDC enviado!' : 'USDC sent!')
                : (es ? 'Enviar USDC' : 'Send USDC')}
            </h2>
            <p style={{ fontSize: 12, color: '#9CA3AF', marginTop: 2 }}>
              {es ? 'Desde tu savings wallet · Base' : 'From your savings wallet · Base'}
            </p>
          </div>
          <button onClick={onClose} style={{ background: 'none', color: '#9CA3AF', padding: 4 }}>
            <X size={20} />
          </button>
        </div>

        <div style={{ padding: '20px 22px 4px', display: 'flex', flexDirection: 'column', gap: 14 }}>

          {/* ── FORM ── */}
          {view === 'form' && (
            <>
              {/* Available balance */}
              <div style={{ background: '#F5F3FF', borderRadius: 14, padding: '12px 16px' }}>
                <p style={{ fontSize: 11, color: '#7C3AED', fontWeight: 600, marginBottom: 2 }}>
                  {es ? 'Disponible en savings wallet' : 'Available in savings wallet'}
                </p>
                <p style={{ fontSize: 22, fontWeight: 700, color: '#2D1B4E', lineHeight: 1 }}>
                  ${availableBalance.toFixed(2)}{' '}
                  <span style={{ fontSize: 13, fontWeight: 500, color: '#9CA3AF' }}>USDC</span>
                </p>
              </div>

              {/* Recipient */}
              <div>
                <p style={{ fontSize: 12, fontWeight: 600, color: '#6B7280', marginBottom: 8 }}>
                  {es ? 'Dirección de destino (Base)' : 'Recipient address (Base)'}
                </p>
                <input
                  value={recipient}
                  onChange={e => setRecipient(e.target.value.trim())}
                  placeholder="0x..."
                  spellCheck={false}
                  style={{
                    width: '100%', borderRadius: 10, boxSizing: 'border-box',
                    border: `1.5px solid ${recipientError ? '#FCA5A5' : '#E5E7EB'}`,
                    padding: '10px 14px', fontSize: 13, color: '#2D1B4E',
                    outline: 'none', fontFamily: 'monospace',
                  }}
                />
                {recipientError && (
                  <p style={{ fontSize: 11, color: '#DC2626', marginTop: 4 }}>{recipientError}</p>
                )}
                {recipientValid && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 4 }}>
                    <Check size={11} style={{ color: '#10B981' }} />
                    <p style={{ fontSize: 11, color: '#10B981' }}>{es ? 'Dirección válida' : 'Valid address'}</p>
                  </div>
                )}
              </div>

              {/* Amount */}
              <div>
                <p style={{ fontSize: 12, fontWeight: 600, color: '#6B7280', marginBottom: 8 }}>
                  {es ? 'Monto a enviar (USDC)' : 'Amount to send (USDC)'}
                </p>
                <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
                  {QUICK_AMOUNTS.map(q => (
                    <button
                      key={q}
                      onClick={() => setAmount(a => a === q ? '' : q)}
                      disabled={parseFloat(q) > availableBalance}
                      style={{
                        flex: 1, height: 38, borderRadius: 10, border: 'none',
                        background: amount === q ? '#630ed4' : parseFloat(q) > availableBalance ? '#F9FAFB' : '#F5F3FF',
                        color: amount === q ? '#fff' : parseFloat(q) > availableBalance ? '#D1D5DB' : '#7C3AED',
                        fontSize: 13, fontWeight: 600,
                        cursor: parseFloat(q) > availableBalance ? 'not-allowed' : 'pointer',
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
                    width: '100%', height: 42, borderRadius: 10, boxSizing: 'border-box',
                    border: `1.5px solid ${amountError ? '#FCA5A5' : '#E5E7EB'}`,
                    padding: '0 14px', fontSize: 14, color: '#2D1B4E',
                    outline: 'none', fontFamily: 'Manrope, sans-serif',
                  }}
                />
                {amountError && (
                  <p style={{ fontSize: 11, color: '#DC2626', marginTop: 4 }}>{amountError}</p>
                )}
              </div>

              {/* Warning */}
              <div style={{ background: '#FFFBEB', borderRadius: 12, padding: '10px 14px', border: '1px solid #FDE68A', display: 'flex', gap: 8 }}>
                <AlertCircle size={16} style={{ color: '#F59E0B', flexShrink: 0, marginTop: 1 }} />
                <p style={{ fontSize: 12, color: '#78350F', lineHeight: 1.5 }}>
                  {es
                    ? 'Esta operación envía USDC directamente desde tu savings wallet en Base. Es irreversible una vez confirmada.'
                    : 'This sends USDC directly from your savings wallet on Base. It is irreversible once confirmed.'}
                </p>
              </div>

              {/* API error */}
              {apiError && (
                <div style={{ background: '#FEF2F2', borderRadius: 10, padding: '10px 14px', border: '1px solid #FECACA' }}>
                  <p style={{ fontSize: 12, color: '#DC2626', lineHeight: 1.5 }}>{apiError}</p>
                </div>
              )}

              {/* Send CTA */}
              <button
                onClick={() => void handleSend()}
                disabled={!canSend}
                style={{
                  width: '100%', height: 52, borderRadius: 14, border: 'none',
                  background: canSend ? '#630ed4' : '#E5E7EB',
                  color: canSend ? '#fff' : '#9CA3AF',
                  fontSize: 15, fontWeight: 600,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  cursor: canSend ? 'pointer' : 'not-allowed',
                  boxShadow: canSend ? '0 4px 16px rgba(99,14,212,0.25)' : 'none',
                  transition: 'all 0.2s',
                }}
              >
                {apiLoading
                  ? <div style={{ width: 18, height: 18, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                  : <><ArrowUpRight size={16} />{es ? 'Confirmar envío' : 'Confirm send'}</>
                }
              </button>

              <p style={{ textAlign: 'center', fontSize: 11, color: '#9CA3AF', lineHeight: 1.5, paddingBottom: 4 }}>
                {es
                  ? 'En modo demo, funciona sin USDC real. Ingresa cualquier dirección válida 0x.'
                  : 'In demo mode, works without real USDC. Enter any valid 0x address.'}
              </p>
            </>
          )}

          {/* ── SUCCESS ── */}
          {view === 'success' && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, paddingTop: 8, paddingBottom: 8 }}>
              <div style={{ width: 64, height: 64, borderRadius: '50%', background: '#D1FAE5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <ArrowUpRight size={30} style={{ color: '#059669' }} />
              </div>
              <div style={{ textAlign: 'center' }}>
                <p style={{ fontSize: 22, fontWeight: 700, color: '#2D1B4E', marginBottom: 8 }}>
                  {es ? '¡Envío confirmado!' : 'Send confirmed!'}
                </p>
                <p style={{ fontSize: 14, color: '#6B7280', lineHeight: 1.6 }}>
                  {es ? `$${amount} USDC enviados a:` : `$${amount} USDC sent to:`}
                </p>
                <p style={{ fontSize: 11, fontFamily: 'monospace', color: '#374151', wordBreak: 'break-all', lineHeight: 1.6, marginTop: 4 }}>
                  {recipient}
                </p>
              </div>

              {isDemo && (
                <div style={{ background: '#FFF8F0', borderRadius: 10, padding: '10px 14px', border: '1px solid #FDE68A', width: '100%' }}>
                  <p style={{ fontSize: 11, color: '#92400E', textAlign: 'center' }}>
                    {es
                      ? 'Modo demo — transacción simulada. Configura PRIVY_* env vars para envíos reales.'
                      : 'Demo mode — simulated transaction. Configure PRIVY_* env vars for real sends.'}
                  </p>
                </div>
              )}

              {txHash && (
                <div style={{ background: '#F5F3FF', borderRadius: 12, padding: '12px 14px', width: '100%' }}>
                  <p style={{ fontSize: 10, fontWeight: 700, color: '#7C3AED', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>
                    Transaction Hash
                  </p>
                  <p style={{ fontSize: 10, fontFamily: 'monospace', color: '#374151', wordBreak: 'break-all', lineHeight: 1.6 }}>
                    {txHash}
                  </p>
                </div>
              )}

              <button
                onClick={onClose}
                style={{ width: '100%', height: 52, borderRadius: 14, border: 'none', background: '#630ed4', color: '#fff', fontSize: 15, fontWeight: 600, cursor: 'pointer' }}
              >
                {es ? 'Listo, ver mi perfil' : 'Done, back to profile'}
              </button>
            </div>
          )}

        </div>
      </div>
    </div>
  )
}

'use client'
import { useState, useEffect } from 'react'
import { X, ArrowDown } from 'lucide-react'

interface Props {
  open: boolean
  onClose: () => void
  savingsWalletId: string
  availableBalance: number
  lang: 'es' | 'en'
  onDepositConfirmed: () => void
}

type View = 'form' | 'success'

const QUICK_AMOUNTS = ['5', '10', '25', '50']

export default function DepositModal({
  open, onClose,
  savingsWalletId,
  availableBalance,
  lang, onDepositConfirmed,
}: Props) {
  const [view, setView]           = useState<View>('form')
  const [amount, setAmount]       = useState('')
  const [apiLoading, setApiLoading] = useState(false)
  const [apiError, setApiError]   = useState('')
  const es = lang === 'es'

  useEffect(() => {
    if (open) { setView('form'); setAmount(''); setApiError('') }
  }, [open])

  if (!open) return null

  const numAmount   = parseFloat(amount)
  const hasBalance  = availableBalance > 0
  const amountValid = !isNaN(numAmount) && numAmount > 0 && numAmount <= availableBalance
  const canDeposit  = amountValid && !apiLoading

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

  async function handleDeposit() {
    if (!canDeposit) return
    setApiLoading(true)
    setApiError('')
    try {
      const res = await fetch('/api/earn/deposit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ walletId: savingsWalletId, amount }),
      })
      const data = await res.json() as { success: boolean; message?: string }
      if (data.success) { setView('success'); onDepositConfirmed() }
      else setApiError(data.message ?? (es ? 'Error al depositar.' : 'Deposit error.'))
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
        style={{ borderRadius: '24px 24px 0 0', paddingBottom: 'max(24px, env(safe-area-inset-bottom))', maxHeight: '85dvh', overflowY: 'auto' }}
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
                ? (es ? '¡Transferido a ahorro!' : 'Moved to savings!')
                : (es ? 'Transferir a ahorro' : 'Move to savings')}
            </h2>
            <p style={{ fontSize: 12, color: '#9CA3AF', marginTop: 2 }}>
              Morpho Vault · Base · ~4.8% APY
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
              {/* Flow diagram: wallet → vault */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#F8F9FF', borderRadius: 12, padding: '12px 14px' }}>
                <div style={{ flex: 1, textAlign: 'center' }}>
                  <p style={{ fontSize: 10, fontWeight: 600, color: '#9CA3AF', marginBottom: 4 }}>
                    {es ? 'Tu wallet' : 'Your wallet'}
                  </p>
                  <p style={{ fontSize: 20, fontWeight: 700, color: '#2D1B4E', lineHeight: 1 }}>
                    ${availableBalance.toFixed(2)}
                  </p>
                  <p style={{ fontSize: 10, color: '#9CA3AF', marginTop: 2 }}>USDC</p>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                  <ArrowDown size={18} style={{ color: '#7C3AED' }} />
                </div>
                <div style={{ flex: 1, textAlign: 'center' }}>
                  <p style={{ fontSize: 10, fontWeight: 600, color: '#9CA3AF', marginBottom: 4 }}>
                    {es ? 'Vault Morpho' : 'Morpho Vault'}
                  </p>
                  <p style={{ fontSize: 14, fontWeight: 700, color: '#10B981', lineHeight: 1 }}>~4.8%</p>
                  <p style={{ fontSize: 10, color: '#9CA3AF', marginTop: 2 }}>APY · Base</p>
                </div>
              </div>

              {!hasBalance ? (
                /* No USDC in wallet yet */
                <div style={{ background: '#FFF8F0', borderRadius: 14, padding: '20px', border: '1px solid rgba(251,191,36,0.3)', textAlign: 'center' }}>
                  <p style={{ fontSize: 36, marginBottom: 10 }}>💸</p>
                  <p style={{ fontSize: 15, fontWeight: 600, color: '#92400E', marginBottom: 8 }}>
                    {es ? 'Tu wallet no tiene USDC' : 'Your wallet has no USDC'}
                  </p>
                  <p style={{ fontSize: 13, color: '#78350F', lineHeight: 1.6 }}>
                    {es
                      ? 'Primero recibe USDC en tu savings wallet. Cierra este panel y toca "Recibir" para ver tu dirección.'
                      : 'First receive USDC into your savings wallet. Close this panel and tap "Receive" to get your address.'}
                  </p>
                </div>
              ) : (
                <>
                  {/* Amount selector */}
                  <div>
                    <p style={{ fontSize: 12, fontWeight: 600, color: '#6B7280', marginBottom: 8 }}>
                      {es ? 'Monto a transferir' : 'Amount to move'}
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

                  {/* API error */}
                  {apiError && (
                    <div style={{ background: '#FEF2F2', borderRadius: 10, padding: '10px 14px', border: '1px solid #FECACA' }}>
                      <p style={{ fontSize: 12, color: '#DC2626', lineHeight: 1.5 }}>{apiError}</p>
                    </div>
                  )}

                  {/* CTA */}
                  <button
                    onClick={() => void handleDeposit()}
                    disabled={!canDeposit}
                    style={{
                      width: '100%', height: 52, borderRadius: 14, border: 'none',
                      background: canDeposit ? '#630ed4' : '#E5E7EB',
                      color: canDeposit ? '#fff' : '#9CA3AF',
                      fontSize: 15, fontWeight: 600,
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                      cursor: canDeposit ? 'pointer' : 'not-allowed',
                      boxShadow: canDeposit ? '0 4px 16px rgba(99,14,212,0.25)' : 'none',
                    }}
                  >
                    {apiLoading
                      ? <div style={{ width: 18, height: 18, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                      : <><ArrowDown size={16} />{es ? 'Transferir a ahorro' : 'Move to savings'}</>
                    }
                  </button>

                  <p style={{ textAlign: 'center', fontSize: 11, color: '#9CA3AF', lineHeight: 1.5, paddingBottom: 4 }}>
                    {es
                      ? 'En modo demo, funciona sin USDC real. Solo selecciona un monto.'
                      : 'In demo mode, works without real USDC. Just select an amount.'}
                  </p>
                </>
              )}
            </>
          )}

          {/* ── SUCCESS ── */}
          {view === 'success' && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, paddingTop: 8, paddingBottom: 8 }}>
              <div style={{ fontSize: 56 }}>🎉</div>
              <div style={{ textAlign: 'center' }}>
                <p style={{ fontSize: 22, fontWeight: 700, color: '#2D1B4E', marginBottom: 8 }}>
                  {es ? '¡Transferido a ahorro!' : 'Moved to savings!'}
                </p>
                <p style={{ fontSize: 14, color: '#6B7280', lineHeight: 1.6 }}>
                  {es
                    ? `Tu USDC${amount ? ` ($${amount})` : ''} está ahora ganando ~4.8% APY en el vault Morpho en Base.`
                    : `Your USDC${amount ? ` ($${amount})` : ''} is now earning ~4.8% APY in the Morpho vault on Base.`}
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
                  background: '#630ed4', color: '#fff', fontSize: 15, fontWeight: 600, cursor: 'pointer',
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

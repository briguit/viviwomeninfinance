'use client'
import { useState, useEffect } from 'react'
import { X, ArrowDownToLine } from 'lucide-react'

interface Props {
  open: boolean
  onClose: () => void
  savingsWalletId: string
  savingsWalletAddr: string
  vaultBalance?: string
  lang: 'es' | 'en'
  onWithdrawConfirmed: () => void
}

type View = 'amount' | 'success'

const QUICK_AMOUNTS = ['5', '10', '25', '50']

export default function WithdrawModal({
  open, onClose,
  savingsWalletId, savingsWalletAddr,
  vaultBalance,
  lang, onWithdrawConfirmed,
}: Props) {
  const [amount, setAmount] = useState('')
  const [view, setView] = useState<View>('amount')
  const [apiLoading, setApiLoading] = useState(false)
  const [apiError, setApiError] = useState('')
  const es = lang === 'es'

  // Reset state each time the modal opens
  useEffect(() => {
    if (open) {
      setAmount('')
      setView('amount')
      setApiError('')
    }
  }, [open])

  if (!open) return null

  async function handleWithdraw() {
    if (!savingsWalletId) return
    setApiLoading(true)
    setApiError('')
    try {
      const res = await fetch('/api/earn/withdraw', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ walletId: savingsWalletId, amount: amount || '1.00' }),
      })
      const data = await res.json() as { success: boolean; message?: string; demo?: boolean }
      if (data.success) {
        setView('success')
        onWithdrawConfirmed()
      } else {
        setApiError(
          data.message ??
          (es
            ? 'No se pudo procesar el retiro. Asegúrate de tener USDC suficiente en el vault.'
            : 'Could not process withdrawal. Make sure you have enough USDC in the vault.')
        )
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
                ? (es ? '¡Retiro solicitado!' : 'Withdrawal requested!')
                : (es ? 'Retirar USDC' : 'Withdraw USDC')}
            </h2>
            <p style={{ fontSize: 12, color: '#9CA3AF', marginTop: 2 }}>
              Base · Morpho Vault · Privy Earn
            </p>
          </div>
          <button onClick={onClose} style={{ background: 'none', color: '#9CA3AF', padding: 4 }}>
            <X size={20} />
          </button>
        </div>

        <div style={{ padding: '20px 22px 4px', display: 'flex', flexDirection: 'column', gap: 14 }}>

          {/* ── AMOUNT VIEW ── */}
          {view === 'amount' && (
            <>
              {/* Current vault balance */}
              {vaultBalance && (
                <div style={{ background: '#F5F3FF', borderRadius: 14, padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div>
                    <p style={{ fontSize: 11, color: '#7C3AED', fontWeight: 600, marginBottom: 2 }}>
                      {es ? 'Saldo disponible en vault' : 'Available vault balance'}
                    </p>
                    <p style={{ fontSize: 22, fontWeight: 700, color: '#2D1B4E', lineHeight: 1 }}>
                      ${parseFloat(vaultBalance).toFixed(2)} <span style={{ fontSize: 13, fontWeight: 500, color: '#9CA3AF' }}>USDC</span>
                    </p>
                  </div>
                  <div style={{ display: 'flex', gap: 4, flexDirection: 'column', alignItems: 'flex-end', justifyContent: 'center' }}>
                    <span style={{ fontSize: 10, fontWeight: 600, color: '#065F46', background: '#D1FAE5', borderRadius: 6, padding: '2px 7px' }}>Morpho</span>
                    <span style={{ fontSize: 10, fontWeight: 600, color: '#1D4ED8', background: '#DBEAFE', borderRadius: 6, padding: '2px 7px' }}>Base</span>
                  </div>
                </div>
              )}

              {/* Where funds go — honest disclosure */}
              <div style={{ background: '#FFFBEB', borderRadius: 12, padding: '12px 14px', border: '1px solid #FDE68A', display: 'flex', gap: 10 }}>
                <span style={{ fontSize: 18, flexShrink: 0 }}>📍</span>
                <div>
                  <p style={{ fontSize: 13, fontWeight: 600, color: '#92400E', marginBottom: 3 }}>
                    {es ? '¿A dónde van los fondos?' : 'Where do funds go?'}
                  </p>
                  <p style={{ fontSize: 12, color: '#78350F', lineHeight: 1.55 }}>
                    {es
                      ? 'Privy retirará el USDC del vault Morpho y lo devolverá a tu savings wallet en Base. Desde ahí puedes transferirlos a tu wallet personal.'
                      : 'Privy will withdraw USDC from the Morpho vault back to your savings wallet on Base. From there you can transfer to your personal wallet.'}
                  </p>
                  <p style={{ fontSize: 10, fontFamily: 'monospace', color: '#92400E', marginTop: 6, wordBreak: 'break-all' }}>
                    → {savingsWalletAddr}
                  </p>
                </div>
              </div>

              {/* Amount selector */}
              <div>
                <p style={{ fontSize: 12, fontWeight: 600, color: '#6B7280', marginBottom: 8 }}>
                  {es ? 'Monto a retirar' : 'Amount to withdraw'}
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

              {/* Withdraw CTA */}
              <button
                onClick={() => void handleWithdraw()}
                disabled={apiLoading}
                style={{
                  width: '100%', height: 52, borderRadius: 14, border: 'none',
                  background: apiLoading ? 'rgba(99,14,212,0.55)' : '#630ed4',
                  color: '#fff', fontSize: 15, fontWeight: 600,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  cursor: apiLoading ? 'not-allowed' : 'pointer',
                  boxShadow: '0 4px 14px rgba(99,14,212,0.25)',
                }}
              >
                {apiLoading
                  ? <div style={{ width: 18, height: 18, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                  : <><ArrowDownToLine size={16} />{es ? 'Retirar USDC' : 'Withdraw USDC'}</>
                }
              </button>

              <p style={{ textAlign: 'center', fontSize: 11, color: '#9CA3AF', lineHeight: 1.5, paddingBottom: 4 }}>
                {es
                  ? 'En modo demo, funciona sin USDC real en el vault.'
                  : 'In demo mode, this works without real USDC in the vault.'}
              </p>
            </>
          )}

          {/* ── SUCCESS VIEW ── */}
          {view === 'success' && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, paddingTop: 8, paddingBottom: 8 }}>
              <div style={{ width: 64, height: 64, borderRadius: '50%', background: '#D1FAE5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <ArrowDownToLine size={30} style={{ color: '#059669' }} />
              </div>
              <div style={{ textAlign: 'center' }}>
                <p style={{ fontSize: 22, fontWeight: 700, color: '#2D1B4E', marginBottom: 8 }}>
                  {es ? '¡Retiro solicitado!' : 'Withdrawal requested!'}
                </p>
                <p style={{ fontSize: 14, color: '#6B7280', lineHeight: 1.6 }}>
                  {es
                    ? `Tu USDC${amount ? ` ($${amount})` : ''} está siendo retirado del vault Morpho y retornará a tu savings wallet en Base.`
                    : `Your USDC${amount ? ` ($${amount})` : ''} is being withdrawn from the Morpho vault and will return to your savings wallet on Base.`}
                </p>
              </div>

              {/* Where funds land */}
              <div style={{ background: '#F8F9FF', borderRadius: 14, padding: '14px', width: '100%', border: '1.5px solid #EDE9FE' }}>
                <p style={{ fontSize: 11, fontWeight: 700, color: '#7C3AED', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>
                  {es ? 'Los fondos regresarán a' : 'Funds will return to'}
                </p>
                <p style={{ fontSize: 11, fontFamily: 'monospace', color: '#374151', wordBreak: 'break-all', lineHeight: 1.6 }}>
                  {savingsWalletAddr}
                </p>
                <p style={{ fontSize: 10, color: '#9CA3AF', marginTop: 6 }}>
                  ✓ Privy Server Wallet · Base Network
                </p>
                <p style={{ fontSize: 11, color: '#6B7280', marginTop: 8, lineHeight: 1.5 }}>
                  {es
                    ? 'Desde esa dirección, transfiere el USDC a tu wallet personal usando cualquier app de Base.'
                    : 'From that address, transfer the USDC to your personal wallet using any Base-compatible app.'}
                </p>
              </div>

              <button
                onClick={onClose}
                style={{ width: '100%', height: 52, borderRadius: 14, border: 'none', background: '#630ed4', color: '#fff', fontSize: 15, fontWeight: 600, cursor: 'pointer' }}
              >
                {es ? 'Entendido, ver mi perfil' : 'Got it, back to profile'}
              </button>
            </div>
          )}

        </div>
      </div>
    </div>
  )
}

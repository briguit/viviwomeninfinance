'use client'
import { useState } from 'react'
import { X, Copy, Check } from 'lucide-react'

interface Props {
  open: boolean
  onClose: () => void
  address: string
  lang: 'es' | 'en'
}

export default function ReceiveModal({ open, onClose, address, lang }: Props) {
  const [copied, setCopied] = useState(false)
  const es = lang === 'es'

  if (!open) return null

  function copyAddress() {
    void navigator.clipboard.writeText(address)
    setCopied(true)
    setTimeout(() => setCopied(false), 2500)
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end"
      style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(3px)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        className="w-full bg-white"
        style={{ borderRadius: '24px 24px 0 0', paddingBottom: 'max(24px, env(safe-area-inset-bottom))' }}
      >
        {/* Drag handle */}
        <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 14 }}>
          <div style={{ width: 36, height: 4, borderRadius: 2, background: '#E5E7EB' }} />
        </div>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', padding: '16px 22px 0' }}>
          <div>
            <h2 style={{ fontSize: 20, fontWeight: 700, color: '#2D1B4E', lineHeight: 1.2 }}>
              {es ? 'Recibir USDC' : 'Receive USDC'}
            </h2>
            <p style={{ fontSize: 12, color: '#9CA3AF', marginTop: 2 }}>
              {es ? 'Tu savings wallet · Base' : 'Your savings wallet · Base'}
            </p>
          </div>
          <button onClick={onClose} style={{ background: 'none', color: '#9CA3AF', padding: 4 }}>
            <X size={20} />
          </button>
        </div>

        <div style={{ padding: '24px 22px', display: 'flex', flexDirection: 'column', gap: 16 }}>
          <p style={{ fontSize: 14, color: '#374151', lineHeight: 1.6 }}>
            {es
              ? 'Envía USDC en la red Base a esta dirección para fondear tu wallet.'
              : 'Send USDC on the Base network to this address to fund your wallet.'}
          </p>

          {/* Address box */}
          <div style={{ background: '#F5F3FF', borderRadius: 16, padding: '20px', border: '1.5px solid rgba(124,58,237,0.15)' }}>
            <p style={{ fontSize: 10, fontWeight: 700, color: '#7C3AED', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12 }}>
              {es ? 'Tu dirección en Base' : 'Your Base address'}
            </p>
            <p style={{ fontSize: 13, fontFamily: 'monospace', color: '#2D1B4E', wordBreak: 'break-all', lineHeight: 1.8, marginBottom: 16 }}>
              {address}
            </p>
            <button
              onClick={copyAddress}
              style={{
                width: '100%', height: 48, borderRadius: 12, border: 'none',
                background: copied ? '#D1FAE5' : '#630ed4',
                color: copied ? '#059669' : '#fff',
                fontSize: 15, fontWeight: 600,
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                cursor: 'pointer', transition: 'all 0.2s',
              }}
            >
              {copied
                ? <><Check size={16} />{es ? '¡Copiado!' : 'Copied!'}</>
                : <><Copy size={16} />{es ? 'Copiar dirección' : 'Copy address'}</>
              }
            </button>
          </div>

          {/* Network warning */}
          <div style={{ background: '#FFFBEB', borderRadius: 12, padding: '12px 14px', border: '1px solid #FDE68A' }}>
            <p style={{ fontSize: 12, color: '#92400E', lineHeight: 1.5 }}>
              ⚠️ {es
                ? 'Solo envía USDC en la red Base. Fondos enviados en otras redes no llegarán.'
                : 'Only send USDC on the Base network. Funds sent on other networks will not arrive.'}
            </p>
          </div>

          {/* Tags */}
          <div style={{ display: 'flex', gap: 6 }}>
            {['Privy Server Wallet', 'Base', 'USDC'].map(tag => (
              <span key={tag} style={{ fontSize: 10, fontWeight: 600, color: '#6B7280', background: '#F3F4F6', borderRadius: 6, padding: '3px 8px' }}>
                {tag}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

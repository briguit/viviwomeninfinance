'use client'
import dynamic from 'next/dynamic'
import type { ISuccessResult } from '@worldcoin/idkit'
import type { ComponentType } from 'react'
import { useState } from 'react'

interface IDKitWidgetProps {
  app_id: string
  action: string
  verification_level?: string
  onSuccess: (proof: ISuccessResult) => void | Promise<void>
  children: (props: { open: () => void }) => React.ReactNode
}

// IDKitWidget is a named runtime export in @worldcoin/idkit v2.x
const IDKitWidget = dynamic(
  () => import('@worldcoin/idkit').then((m: Record<string, unknown>) => ({ default: m['IDKitWidget'] as ComponentType<IDKitWidgetProps> })),
  { ssr: false }
) as ComponentType<IDKitWidgetProps>

interface Props {
  lang: 'es' | 'en'
  onVerified: () => void
}

export default function WorldIDVerifyButton({ lang, onVerified }: Props) {
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')
  const es = lang === 'es'

  const wldAppId  = process.env.NEXT_PUBLIC_WLD_APP_ID
  const wldAction = process.env.NEXT_PUBLIC_WLD_ACTION ?? 'verify-human'
  const wldEnabled = !!wldAppId

  async function handleSuccess(proof: ISuccessResult) {
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(proof),
      })
      const data = await res.json() as { success: boolean; error?: string }
      if (data.success) {
        onVerified()
      } else {
        setError(
          data.error ??
          (es ? 'Verificación fallida. Intenta de nuevo.' : 'Verification failed. Try again.')
        )
      }
    } catch {
      setError(es ? 'Error de conexión.' : 'Connection error.')
    } finally {
      setLoading(false)
    }
  }

  const btnStyle: React.CSSProperties = {
    width: '100%', height: 52, borderRadius: 14, border: 'none',
    background: loading ? 'rgba(45,27,78,0.55)' : '#2D1B4E',
    color: '#fff', fontSize: 15, fontWeight: 600,
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
    cursor: loading ? 'not-allowed' : 'pointer',
  }

  const spinner = (
    <div style={{ width: 16, height: 16, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {wldEnabled ? (
        <IDKitWidget
          app_id={wldAppId}
          action={wldAction}
          verification_level="device"
          onSuccess={handleSuccess}
        >
          {({ open }) => (
            <button onClick={open} style={btnStyle} disabled={loading}>
              {loading
                ? <>{spinner}{es ? 'Verificando…' : 'Verifying…'}</>
                : <><span>🌍</span>{es ? 'Verificar con World ID' : 'Verify with World ID'}</>
              }
            </button>
          )}
        </IDKitWidget>
      ) : (
        /* Demo mode: simulate verification after 1.5 s */
        <button
          onClick={() => {
            setLoading(true)
            setTimeout(() => { setLoading(false); onVerified() }, 1500)
          }}
          style={btnStyle}
          disabled={loading}
        >
          {loading
            ? <>{spinner}{es ? 'Simulando verificación…' : 'Simulating verification…'}</>
            : <><span>🌍</span>{es ? 'Verificar (modo demo)' : 'Verify (demo mode)'}</>
          }
        </button>
      )}
      {!wldEnabled && !loading && (
        <p style={{ fontSize: 11, color: '#92400E', textAlign: 'center', background: '#FFFBEB', borderRadius: 8, padding: '6px 10px' }}>
          {es ? 'Modo demo — sin NEXT_PUBLIC_WLD_APP_ID configurado' : 'Demo mode — NEXT_PUBLIC_WLD_APP_ID not configured'}
        </p>
      )}
      {error && (
        <p style={{ fontSize: 12, color: '#DC2626', textAlign: 'center', lineHeight: 1.5 }}>{error}</p>
      )}
    </div>
  )
}

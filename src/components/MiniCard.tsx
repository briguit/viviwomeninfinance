import { ExternalLink } from 'lucide-react'

interface MiniCardProps {
  platform: string
  rate: string
  source: string
  time: string
  url: string
  lang: 'es' | 'en'
}

export default function MiniCard({ platform, rate, source, time, url, lang }: MiniCardProps) {
  const isApprox = time === 'referencia' || time === 'reference'
  const openLabel = lang === 'es' ? `Abrir ${platform}` : `Open ${platform}`
  const disclosure = lang === 'es'
    ? 'Vivi puede ganar una comisión si te registras — así mantenemos las becas gratuitas 💜'
    : 'Vivi may earn a commission if you sign up — this keeps scholarships free 💜'

  return (
    <div
      style={{
        marginTop: 10,
        background: '#FAFAF9',
        border: '1px solid rgba(124,58,237,0.12)',
        borderRadius: 14,
        padding: '12px 14px',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
        <span style={{ fontSize: 12, fontWeight: 600, color: '#2D1B4E' }}>{platform}</span>
        <span style={{ fontSize: 10, color: '#9CA3AF' }}>
          {source}
          {isApprox && <> · <span style={{ color: '#F59E0B' }}>{time}</span></>}
          {!isApprox && <> · {time}</>}
        </span>
      </div>

      <p style={{ fontSize: 26, fontWeight: 700, color: '#7C3AED', lineHeight: 1, marginBottom: 8 }}>
        {rate}
      </p>

      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, fontWeight: 600, color: '#7C3AED' }}
        className="hover:underline"
      >
        {openLabel} <ExternalLink size={11} />
      </a>

      <p style={{ fontSize: 9, color: '#9CA3AF', marginTop: 8, lineHeight: 1.5 }}>{disclosure}</p>
    </div>
  )
}

'use client'
import { useApp } from '@/context/AppContext'

export default function LanguageToggle() {
  const { lang, setLang } = useApp()
  const isEs = lang === 'es'

  return (
    <button
      onClick={() => setLang(isEs ? 'en' : 'es')}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 2,
        background: '#EDE9FE',
        border: '1px solid rgba(124,58,237,0.15)',
        borderRadius: 999,
        padding: '5px 12px',
        fontSize: 12,
        fontWeight: 600,
        color: '#7C3AED',
        cursor: 'pointer',
        transition: 'background 0.15s',
      }}
    >
      <span style={{ opacity: isEs ? 1 : 0.45 }}>ES</span>
      <span style={{ margin: '0 3px', opacity: 0.3 }}>|</span>
      <span style={{ opacity: isEs ? 0.45 : 1 }}>EN</span>
    </button>
  )
}

'use client'
import { useApp } from '@/context/AppContext'

export default function LanguageToggle({ glass = false }: { glass?: boolean }) {
  const { lang, setLang } = useApp()

  const wrap: React.CSSProperties = glass
    ? {
        display: 'flex',
        background: 'rgba(222,233,252,0.80)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        borderRadius: 9999,
        padding: 4,
        border: '1px solid #d9e3f6',
        boxShadow: '0 2px 8px rgba(76,29,149,0.06)',
      }
    : {
        display: 'flex',
        background: '#ede9fe',
        border: '1px solid rgba(124,58,237,0.12)',
        borderRadius: 9999,
        padding: 3,
      }

  const btn = (active: boolean): React.CSSProperties => ({
    padding: '4px 12px',
    fontFamily: 'Manrope, Verdana, Arial, sans-serif',
    fontSize: 13,
    fontWeight: 600,
    letterSpacing: '0.03em',
    borderRadius: 9999,
    background: active ? '#ffffff' : 'transparent',
    color: active ? '#630ed4' : '#4a4455',
    boxShadow: active ? '0 2px 8px rgba(76,29,149,0.08)' : 'none',
    cursor: 'pointer',
    transition: 'all 0.15s',
  })

  return (
    <div style={wrap}>
      <button onClick={() => setLang('en')} style={btn(lang === 'en')}>EN</button>
      <button onClick={() => setLang('es')} style={btn(lang === 'es')}>ES</button>
    </div>
  )
}

'use client'
import { useApp } from '@/context/AppContext'
import { t } from '@/lib/i18n'
import { MessageCircle, Target, User } from 'lucide-react'

export default function BottomNav() {
  const { screen, setScreen, lang } = useApp()
  const tx = t[lang]

  const tabs = [
    { id: 'chat'       as const, label: tx.nav_chat,       Icon: MessageCircle },
    { id: 'challenges' as const, label: tx.nav_challenges, Icon: Target },
    { id: 'profile'    as const, label: tx.nav_profile,    Icon: User },
  ]

  return (
    <nav
      className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-app flex z-40"
      style={{ background: '#fff', borderTop: '1px solid #F3F0FF', paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
    >
      {tabs.map(({ id, label, Icon }) => {
        const active = screen === id
        return (
          <button
            key={id}
            onClick={() => setScreen(id)}
            className="flex-1 flex flex-col items-center transition-colors"
            style={{ padding: '10px 0 12px', gap: 3, color: active ? '#7C3AED' : '#9CA3AF' }}
          >
            <Icon size={22} strokeWidth={active ? 2.5 : 1.8} />
            <span style={{ fontSize: 10, fontWeight: active ? 600 : 400 }}>{label}</span>
            {active && (
              <div style={{ position: 'absolute', bottom: 0, width: 24, height: 2, background: '#7C3AED', borderRadius: 999 }} />
            )}
          </button>
        )
      })}
    </nav>
  )
}

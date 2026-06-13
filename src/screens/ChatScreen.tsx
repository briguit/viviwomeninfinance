'use client'
import { useState, useRef, useEffect } from 'react'
import { useApp, type ChatMessage } from '@/context/AppContext'
import { t } from '@/lib/i18n'
import { getViviResponse } from '@/lib/viviAI'
import LanguageToggle from '@/components/LanguageToggle'
import MiniCard from '@/components/MiniCard'
import { Send } from 'lucide-react'

const VIVI_AVATAR = (
  <div
    className="flex-shrink-0 flex items-center justify-center rounded-full shadow-sm"
    style={{ width: 32, height: 32, background: 'linear-gradient(135deg, #7C3AED, #A855F7)' }}
  >
    <span className="text-white text-xs font-bold">V</span>
  </div>
)

function buildWelcome(name: string, lang: 'es' | 'en'): string {
  return lang === 'es'
    ? `¡Hola ${name}! 👋 Soy Vivi, tu mentora de finanzas personales.\n\nPuedo ayudarte con:\n• ¿Qué es USDC y cómo funciona?\n• Tipo de cambio para tu país\n• Rendimientos en DeFi\n• Cómo empezar a ahorrar\n\n¿Por dónde empezamos?`
    : `Hi ${name}! 👋 I'm Vivi, your personal finance mentor.\n\nI can help you with:\n• What is USDC and how does it work?\n• Exchange rates for your country\n• DeFi yields\n• How to start saving\n\nWhere do you want to start?`
}

export default function ChatScreen() {
  const { lang, user, chatHistory, saveChatHistory, auth } = useApp()
  const tx = t[lang]
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const initialized = useRef(false)

  // Initialize messages: load history or show welcome
  useEffect(() => {
    if (initialized.current || !user) return
    initialized.current = true

    if (chatHistory.length > 0) {
      setMessages(chatHistory)
      return
    }

    const welcome: ChatMessage = {
      id: 'welcome',
      role: 'vivi',
      text: buildWelcome(user.name, lang),
    }
    setMessages([welcome])
    saveChatHistory([welcome])
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  function addMessages(next: ChatMessage[]) {
    setMessages(next)
    saveChatHistory(next)
  }

  async function sendMessage(text: string) {
    if (!text.trim() || loading) return
    const userMsg: ChatMessage = { id: Date.now().toString(), role: 'user', text: text.trim() }
    const withUser = [...messages, userMsg]
    addMessages(withUser)
    setInput('')
    setLoading(true)
    try {
      const ensName = auth.userId ? localStorage.getItem(`vivi_ens_${auth.userId}`) : null
      const res = await getViviResponse(text, lang, user?.country ?? 'MX', ensName)
      const viviMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'vivi',
        text: res.text,
        card: res.card,
      }
      addMessages([...withUser, viviMsg])
    } finally {
      setLoading(false)
    }
  }

  const chips = [tx.chip_yield, tx.chip_dolar, tx.chip_defi, tx.chip_ahorro]

  return (
    <div className="flex flex-col" style={{ height: '100dvh' }}>
      {/* Header */}
      <header
        className="flex items-center justify-between sticky top-0 z-30"
        style={{ background: '#fff', borderBottom: '1px solid #F3F0FF', padding: '14px 16px' }}
      >
        <div className="flex items-center gap-3">
          <div
            className="flex items-center justify-center rounded-full shadow-sm"
            style={{ width: 36, height: 36, background: 'linear-gradient(135deg, #7C3AED, #A855F7)' }}
          >
            <span className="text-white text-sm font-bold">V</span>
          </div>
          <div>
            <p className="font-semibold text-vivi-deep" style={{ fontSize: 14, lineHeight: 1.2 }}>Vivi</p>
            <div className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-vivi-mint" style={{ animation: 'pulse 2s infinite' }} />
              <p className="text-vivi-gray" style={{ fontSize: 11 }}>{tx.chat_status}</p>
            </div>
          </div>
        </div>
        <LanguageToggle />
      </header>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto chat-scroll" style={{ padding: '16px 16px 8px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {messages.map(msg => (
            <div
              key={msg.id}
              className="flex gap-2 animate-fade-up"
              style={{ flexDirection: msg.role === 'user' ? 'row-reverse' : 'row' }}
            >
              {msg.role === 'vivi' && VIVI_AVATAR}
              <div
                style={{ maxWidth: '78%', display: 'flex', flexDirection: 'column', alignItems: msg.role === 'user' ? 'flex-end' : 'flex-start' }}
              >
                <div
                  style={{
                    borderRadius: 18,
                    padding: '10px 14px',
                    fontSize: 14,
                    lineHeight: 1.55,
                    whiteSpace: 'pre-line',
                    ...(msg.role === 'user'
                      ? { background: '#EDE9FE', color: '#2D1B4E', borderTopRightRadius: 4 }
                      : { background: '#fff', color: '#2D1B4E', border: '1px solid #F3F0FF', borderTopLeftRadius: 4, boxShadow: '0 1px 6px rgba(45,27,78,0.06)' }
                    ),
                  }}
                >
                  {msg.text}
                  {msg.card && <MiniCard {...msg.card} lang={lang} />}
                </div>
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex gap-2 animate-fade-up">
              {VIVI_AVATAR}
              <div
                className="flex gap-1 items-center"
                style={{ background: '#fff', borderRadius: 18, borderTopLeftRadius: 4, border: '1px solid #F3F0FF', padding: '12px 16px', boxShadow: '0 1px 6px rgba(45,27,78,0.06)' }}
              >
                {[0, 1, 2].map(i => (
                  <div
                    key={i}
                    className="w-2 h-2 rounded-full animate-bounce"
                    style={{ background: 'rgba(124,58,237,0.4)', animationDelay: `${i * 150}ms` }}
                  />
                ))}
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>
      </div>

      {/* Suggested chips */}
      <div
        className="overflow-x-auto chat-scroll"
        style={{ padding: '8px 16px', display: 'flex', gap: 8, flexShrink: 0 }}
      >
        {chips.map(chip => (
          <button
            key={chip}
            onClick={() => sendMessage(chip)}
            style={{ flexShrink: 0, fontSize: 12, color: '#7C3AED', border: '1px solid rgba(124,58,237,0.25)', background: '#F5F3FF', borderRadius: 999, padding: '6px 14px', whiteSpace: 'nowrap' }}
            className="hover:bg-vivi-lila transition-colors active:scale-95"
          >
            {chip}
          </button>
        ))}
      </div>

      {/* Input */}
      <div style={{ padding: '0 16px 16px', background: '#FAFAF9', borderTop: '1px solid #F3F0FF', flexShrink: 0 }}>
        <div
          className="flex gap-2 items-end focus-within:border-vivi-purple transition-colors"
          style={{ background: '#fff', borderRadius: 22, border: '1.5px solid #E5E1FF', padding: '10px 12px 10px 16px', marginTop: 10 }}
        >
          <textarea
            ref={inputRef}
            rows={1}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                sendMessage(input)
              }
            }}
            placeholder={tx.chat_placeholder}
            className="flex-1 resize-none bg-transparent text-vivi-deep focus:outline-none"
            style={{ fontSize: 14, maxHeight: 112, lineHeight: 1.5, paddingTop: 2 }}
          />
          <button
            aria-label="Enviar"
            onClick={() => sendMessage(input)}
            disabled={!input.trim() || loading}
            className="flex-shrink-0 flex items-center justify-center transition-all active:scale-90 disabled:opacity-30"
            style={{ width: 36, height: 36, borderRadius: '50%', background: '#7C3AED' }}
          >
            <Send size={15} className="text-white" />
          </button>
        </div>
        <p className="text-center" style={{ fontSize: 10, color: '#9CA3AF', marginTop: 6 }}>
          {tx.chat_disclaimer}
        </p>
      </div>
    </div>
  )
}

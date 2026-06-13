import type { Lang } from '@/context/AppContext'
import { fetchExchangeRate, COUNTRY_CURRENCY } from './countryData'

export interface ViviCard {
  platform: string
  rate: string
  source: string
  time: string
  url: string
}

export interface ViviResponse {
  text: string
  card?: ViviCard
}

// ── Intent detection ──────────────────────────────────────────────────────────
function detect(msg: string) {
  const m = msg.toLowerCase()
  if (m.match(/rend|yield|usdc.*earn|earn.*usdc|apy|inter[eé]s|gano|cuánto.*gano|gana/))
    return 'yield'
  if (m.match(/dólar|dollar|tipo de cambio|exchange|cuánto.*peso|peso.*cuánto|tasa|conversion/))
    return 'fx'
  if (m.match(/defi|descentrali|blockchain|protocolo|liquidez|liquidity/))
    return 'defi'
  if (m.match(/ahorro|ahorrar|saving|save|metas?|goal|guardar/))
    return 'savings'
  if (m.match(/usdc|stablecoin|stable|estable/))
    return 'usdc'
  if (m.match(/ens|\.eth|identidad onchain|nombre.*web3|web3.*nombre|wallet.*name/))
    return 'ens'
  if (m.match(/bitcoin|btc|ethereum(?!\s+name)|eth\b|nft|volatil|crypto/))
    return 'crypto'
  if (m.match(/emp[ie]z|start|begin|inicio|primer|first|c[oó]mo.*usar/))
    return 'start'
  return 'default'
}

// ── FX ────────────────────────────────────────────────────────────────────────
async function buildFxResponse(country: string, lang: Lang): Promise<ViviResponse> {
  const currency = COUNTRY_CURRENCY[country]
  if (!currency) {
    return {
      text: lang === 'es'
        ? 'Lo siento, aún no tengo ese tipo de cambio. Puedo ayudarte con México, Colombia, Perú, Argentina, Chile y más. ¿Cuál necesitas?'
        : "Sorry, I don't have that exchange rate yet. I can help with Mexico, Colombia, Peru, Argentina, Chile and more. Which one do you need?",
    }
  }
  if (currency.dollarCountry) {
    const names: Record<string, string> = { EC: 'Ecuador', PA: 'Panamá', SV: 'El Salvador', US: 'EE.UU.' }
    const name = names[country] ?? (lang === 'es' ? 'tu país' : 'your country')
    return {
      text: lang === 'es'
        ? `¡Buena noticia! En ${name} ya se usa el dólar (USD), así que no hay conversión. Tu USDC equivale directamente a dólares locales. 🎉`
        : `Great news! In ${name} the US Dollar is already used, so no conversion needed. Your USDC is directly equivalent to local dollars. 🎉`,
    }
  }

  const result = await fetchExchangeRate(country)
  if (!result) {
    return {
      text: lang === 'es'
        ? 'No pude obtener el tipo de cambio en este momento. Por favor intenta de nuevo en unos segundos.'
        : "Couldn't fetch the exchange rate right now. Please try again in a few seconds.",
    }
  }
  return {
    text: lang === 'es'
      ? 'Aquí tienes el tipo de cambio actual:'
      : "Here's the current exchange rate:",
    card: {
      platform: `1 USD → ${result.currency.code}`,
      rate: result.formatted,
      source: 'Open Exchange Rates',
      time: lang === 'es' ? 'en vivo' : 'live',
      url: 'https://open.er-api.com',
    },
  }
}

// ── Static responses ──────────────────────────────────────────────────────────
// YIELD card: range not a single value; labeled as reference data
const YIELD_CARD: ViviCard = {
  platform: 'Aave V3 — USDC',
  rate: '~4–6% APY',
  source: 'DeFiLlama',
  time: 'referencia',
  url: 'https://defillama.com/yields?token=USDC',
}
const YIELD_CARD_EN: ViviCard = { ...YIELD_CARD, time: 'reference' }

const RESPONSES: Record<string, Record<Lang, ViviResponse>> = {
  yield: {
    es: {
      text: 'USDC puede generar rendimientos en protocolos DeFi como Aave. El rango actual de referencia está entre 4 % y 6 % anual (APY). Si tienes $100 USDC ganarías entre $4 y $6 al año sin hacer nada. Los rendimientos varían — siempre verifica la fuente antes de invertir.',
      card: YIELD_CARD,
    },
    en: {
      text: 'USDC can earn yield in DeFi protocols like Aave. Current reference ranges are 4–6% APY. With $100 USDC you would earn $4–6 per year doing nothing. Yields fluctuate — always verify the source before investing.',
      card: YIELD_CARD_EN,
    },
  },
  defi: {
    es: { text: 'DeFi (Finanzas Descentralizadas) son servicios financieros que funcionan con código en la blockchain, sin bancos ni intermediarios. Puedes ahorrar, prestar y ganar rendimientos las 24 horas. USDC es la moneda más usada en DeFi porque siempre vale exactamente $1. ¿Quieres que te explique cómo funciona Aave, uno de los protocolos más seguros?' },
    en: { text: 'DeFi (Decentralized Finance) is financial services running on blockchain code — no banks or intermediaries needed. You can save, lend, and earn yields 24/7. USDC is the most-used currency in DeFi because it always equals exactly $1. Want me to explain how Aave, one of the safest protocols, works?' },
  },
  savings: {
    es: { text: 'El ahorro más efectivo es el consistente, no el grande. Una buena regla de inicio: guarda el 10–20 % de lo que recibes cada mes. Con USDC en DeFi, ese ahorro puede generar entre 4–6 % al año sin esfuerzo adicional. ¿Cuánto crees que podrías ahorrar al mes? Podemos calcular juntas cuánto tendrías en un año.' },
    en: { text: "Effective saving is consistent, not large. A good starting rule: save 10–20% of your monthly income. With USDC in DeFi, those savings can earn 4–6% per year with no extra effort. How much do you think you could save per month? We can calculate together how much you'd have in a year." },
  },
  usdc: {
    es: { text: 'USDC (USD Coin) es una moneda digital estable — siempre vale exactamente 1 dólar. A diferencia de Bitcoin o Ethereum, no fluctúa. Es perfecta para aprender finanzas porque siempre sabes cuánto tienes. Con USDC en DeFi también puedes ganar rendimientos sin asumir riesgo de volatilidad. ¿Quieres saber cómo se usa?' },
    en: { text: "USDC (USD Coin) is a stable digital currency — always worth exactly $1. Unlike Bitcoin or Ethereum, it doesn't fluctuate. It's perfect for learning finance because you always know how much you have. With USDC in DeFi you can also earn yield without taking on volatility risk. Want to know how to use it?" },
  },
  ens: {
    es: { text: 'ENS (Ethereum Name Service) es como el «DNS de la blockchain» — convierte las largas direcciones de Ethereum en nombres legibles como tuyo.vivi.eth. Con tu nombre ENS puedes recibir pagos en cripto, probar tu identidad en apps Web3 y representarte onchain, todo sin recordar ninguna dirección larga. Tu nombre .vivi.eth ya está registrado en Vivi. 🔑' },
    en: { text: "ENS (Ethereum Name Service) is like the 'DNS of the blockchain' — it converts long Ethereum addresses into readable names like yours.vivi.eth. With your ENS name you can receive crypto payments, prove your identity in Web3 apps, and represent yourself onchain — all without remembering a long address. Your .vivi.eth name is already registered with Vivi. 🔑" },
  },
  crypto: {
    es: { text: 'Importante distinguir: Bitcoin y Ethereum son activos volátiles — su precio puede subir o bajar mucho. USDC es diferente: es una stablecoin respaldada en reservas reales que siempre vale $1. Para aprender finanzas y empezar a ahorrar de forma segura, USDC es el mejor punto de partida. Cuando entiendas bien las bases, la volatilidad cripto tiene más sentido.' },
    en: { text: "Important distinction: Bitcoin and Ethereum are volatile assets — their price can rise or fall significantly. USDC is different: it's a stablecoin backed by real reserves and always worth $1. For learning finance and saving safely, USDC is the best starting point. Once you understand the fundamentals, crypto volatility makes more sense." },
  },
  start: {
    es: { text: 'Me alegra que quieras empezar. Te recomiendo este camino:\n\n1️⃣ Pregúntame «¿qué es USDC?» — es el punto de entrada más importante\n2️⃣ Luego «¿qué es DeFi?» — para entender dónde vive tu dinero\n3️⃣ Después «¿cómo empiezo a ahorrar?» — para definir tu primera meta\n\n¿Por cuál empezamos?' },
    en: { text: "Great that you want to start. Here's the path I recommend:\n\n1️⃣ Ask me 'What is USDC?' — it's the most important entry point\n2️⃣ Then 'What is DeFi?' — to understand where your money lives\n3️⃣ Then 'How do I start saving?' — to set your first goal\n\nWhich one do we start with?" },
  },
}

// ── Non-repeating follow-up defaults ─────────────────────────────────────────
const FOLLOW_UPS: Record<Lang, string[]> = {
  es: [
    'Cuéntame más sobre lo que buscas. ¿Quieres entender DeFi, hacer rendir tu USDC, o planear un ahorro?',
    'Para darte la mejor respuesta: ¿estás pensando en el corto plazo (menos de 1 año) o en el largo plazo?',
    'La consistencia es clave en finanzas personales — pequeños pasos, grandes resultados. ¿Cuál es tu meta financiera más importante ahora mismo?',
    '¿Tienes ya un ahorro mensual o estás comenzando desde cero? La respuesta cambia el consejo.',
  ],
  en: [
    "Tell me more about what you're looking for. Do you want to understand DeFi, earn yield on your USDC, or plan savings?",
    "To give you the best answer: are you thinking short-term (less than 1 year) or long-term?",
    "Consistency is key in personal finance — small steps, big results. What's your most important financial goal right now?",
    "Do you already have monthly savings or are you starting from scratch? The answer changes the advice.",
  ],
}

let followUpIdx = 0

// ── Main export ───────────────────────────────────────────────────────────────
export async function getViviResponse(
  message: string,
  lang: Lang,
  country: string = 'MX',
): Promise<ViviResponse> {
  // Simulate network latency for a realistic feel
  await new Promise(r => setTimeout(r, 500 + Math.random() * 400))

  const intent = detect(message)

  if (intent === 'fx') return buildFxResponse(country, lang)
  if (RESPONSES[intent]) return RESPONSES[intent][lang]

  // Cycle through follow-ups without repeating
  const pool = FOLLOW_UPS[lang]
  const response = { text: pool[followUpIdx % pool.length] }
  followUpIdx++
  return response
}

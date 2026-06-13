export interface CurrencyInfo {
  code: string
  name: string
  nameEn: string
  symbol: string
  dollarCountry?: boolean
}

export const COUNTRY_CURRENCY: Record<string, CurrencyInfo> = {
  MX: { code: 'MXN', name: 'Peso mexicano',       nameEn: 'Mexican peso',         symbol: '$'   },
  CO: { code: 'COP', name: 'Peso colombiano',      nameEn: 'Colombian peso',       symbol: '$'   },
  AR: { code: 'ARS', name: 'Peso argentino',       nameEn: 'Argentine peso',       symbol: '$'   },
  PE: { code: 'PEN', name: 'Sol peruano',          nameEn: 'Peruvian sol',         symbol: 'S/'  },
  CL: { code: 'CLP', name: 'Peso chileno',         nameEn: 'Chilean peso',         symbol: '$'   },
  BR: { code: 'BRL', name: 'Real brasileño',       nameEn: 'Brazilian real',       symbol: 'R$'  },
  BO: { code: 'BOB', name: 'Boliviano',            nameEn: 'Bolivian boliviano',   symbol: 'Bs.' },
  PY: { code: 'PYG', name: 'Guaraní paraguayo',   nameEn: 'Paraguayan guaraní',   symbol: '₲'   },
  UY: { code: 'UYU', name: 'Peso uruguayo',       nameEn: 'Uruguayan peso',       symbol: '$U'  },
  VE: { code: 'VES', name: 'Bolívar venezolano',  nameEn: 'Venezuelan bolívar',   symbol: 'Bs.S'},
  EC: { code: 'USD', name: 'Dólar (Ecuador usa USD)', nameEn: 'USD (Ecuador uses dollar)', symbol: '$', dollarCountry: true },
  PA: { code: 'USD', name: 'Dólar (Panamá usa USD)',  nameEn: 'USD (Panama uses dollar)',  symbol: '$', dollarCountry: true },
  SV: { code: 'USD', name: 'Dólar (El Salvador usa USD)', nameEn: 'USD (El Salvador uses dollar)', symbol: '$', dollarCountry: true },
  CR: { code: 'CRC', name: 'Colón costarricense', nameEn: 'Costa Rican colón',    symbol: '₡'   },
  GT: { code: 'GTQ', name: 'Quetzal guatemalteco',nameEn: 'Guatemalan quetzal',   symbol: 'Q'   },
  HN: { code: 'HNL', name: 'Lempira hondureño',   nameEn: 'Honduran lempira',     symbol: 'L'   },
  NI: { code: 'NIO', name: 'Córdoba nicaragüense',nameEn: 'Nicaraguan córdoba',   symbol: 'C$'  },
  DO: { code: 'DOP', name: 'Peso dominicano',     nameEn: 'Dominican peso',       symbol: '$'   },
  CU: { code: 'CUP', name: 'Peso cubano',         nameEn: 'Cuban peso',           symbol: '$'   },
  US: { code: 'USD', name: 'Dólar estadounidense',nameEn: 'US Dollar',            symbol: '$',  dollarCountry: true },
  ES: { code: 'EUR', name: 'Euro',                nameEn: 'Euro',                 symbol: '€'   },
  DE: { code: 'EUR', name: 'Euro',                nameEn: 'Euro',                 symbol: '€'   },
}

export const COUNTRIES_LIST = [
  { code: 'MX', flag: '🇲🇽', label: 'México' },
  { code: 'CO', flag: '🇨🇴', label: 'Colombia' },
  { code: 'AR', flag: '🇦🇷', label: 'Argentina' },
  { code: 'PE', flag: '🇵🇪', label: 'Perú' },
  { code: 'CL', flag: '🇨🇱', label: 'Chile' },
  { code: 'BR', flag: '🇧🇷', label: 'Brasil' },
  { code: 'BO', flag: '🇧🇴', label: 'Bolivia' },
  { code: 'PY', flag: '🇵🇾', label: 'Paraguay' },
  { code: 'UY', flag: '🇺🇾', label: 'Uruguay' },
  { code: 'VE', flag: '🇻🇪', label: 'Venezuela' },
  { code: 'EC', flag: '🇪🇨', label: 'Ecuador' },
  { code: 'PA', flag: '🇵🇦', label: 'Panamá' },
  { code: 'CR', flag: '🇨🇷', label: 'Costa Rica' },
  { code: 'GT', flag: '🇬🇹', label: 'Guatemala' },
  { code: 'HN', flag: '🇭🇳', label: 'Honduras' },
  { code: 'NI', flag: '🇳🇮', label: 'Nicaragua' },
  { code: 'SV', flag: '🇸🇻', label: 'El Salvador' },
  { code: 'DO', flag: '🇩🇴', label: 'Rep. Dominicana' },
  { code: 'CU', flag: '🇨🇺', label: 'Cuba' },
  { code: 'US', flag: '🇺🇸', label: 'USA' },
  { code: 'ES', flag: '🇪🇸', label: 'España' },
] as const

export const COUNTRY_FLAGS: Record<string, string> = Object.fromEntries(
  COUNTRIES_LIST.map(c => [c.code, c.flag])
)

export async function fetchExchangeRate(country: string): Promise<{
  rate: number
  currency: CurrencyInfo
  formatted: string
} | null> {
  const currency = COUNTRY_CURRENCY[country]
  if (!currency) return null
  if (currency.dollarCountry) return null

  try {
    const res = await fetch(`https://open.er-api.com/v6/latest/USD`, { next: { revalidate: 300 } })
    const data = await res.json()
    const rate: number = data.rates?.[currency.code]
    if (!rate) return null
    return {
      rate,
      currency,
      formatted: `${currency.symbol}${rate.toLocaleString('es', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
    }
  } catch {
    return null
  }
}

# VIVI — Design System & UI Spec
*(Este documento vive en el repo. Claude Code: sigue estas reglas en CADA pantalla. No inventes estilos fuera de este sistema.)*

---

## 1. Concepto de marca

**Vivi** es tu mentora de dinero: la amiga que sabe de finanzas y te explica sin juzgarte.
No es un banco (frío), no es un exchange (intimidante), no es un juguete (infantil).

**Personalidad:** cálida, clara, segura, celebra tus logros. Habla como persona, no como institución.
**Anti-referencias:** nada de azul corporativo bancario, nada de dark-mode trading con velas rojas/verdes, nada de jerga cripto sin explicar.
**Referencias de tono visual:** Duolingo (gamificación amigable) + Nubank (fintech moderna) + WhatsApp (chat familiar).

**Tagline:** *Your money mentor* / *Tu mentora de dinero*

---

## 2. Paleta de colores

| Rol | Color | Hex | Uso |
|---|---|---|---|
| Primario | Violeta Vivi | `#7C3AED` | Botones principales, links, burbuja de Vivi, acentos |
| Primario oscuro | Morado profundo | `#2D1B4E` | Titulares, texto fuerte |
| Recompensa | Dorado | `#FBBF24` | TODO lo relacionado a premios, USDC, puntos, confetti |
| Éxito | Verde menta | `#10B981` | Confirmaciones, retos completados, yields positivos |
| Fondo | Blanco humo | `#FAFAF9` | Fondo general de la app |
| Superficie | Blanco | `#FFFFFF` | Cards, burbujas de chat |
| Texto secundario | Gris | `#6B7280` | Subtítulos, metadata |
| Burbuja usuaria | Lila claro | `#EDE9FE` | Mensajes de la usuaria en el chat |

**Regla:** el dorado `#FBBF24` SOLO se usa para dinero/premios — así el ojo aprende que dorado = ganancia. No usarlo decorativamente.

---

## 3. Tipografía

- **Font:** Poppins (Google Fonts) — única familia en toda la app
- Titulares: 600 (semibold) · Cuerpo: 400 · Números de dinero: 700, tamaño grande
- Los montos en USDC siempre se muestran grandes y en `#2D1B4E` con el ícono dorado al lado — el dinero es protagonista

---

## 4. Reglas de UI (mobile-first)

- Layout de UNA columna, ancho máximo `430px`, centrado en desktop con fondo `#FAFAF9`
- Botones: altura mínima 52px, border-radius 16px, texto 600 — pulgar-friendly
- Cards: border-radius 20px, sombra suave (`shadow-sm`), padding generoso
- Navegación: barra inferior fija con 3 tabs — 💬 Chat · 🎯 Retos (Challenges) · 👤 Perfil (Profile)
- Toggle de idioma ES/EN visible en el header (pill pequeño) — es momento WOW del demo
- Direcciones 0x NUNCA visibles por defecto: siempre mostrar `nombre.vivi.eth`. El 0x solo bajo "ver detalles técnicos"
- Micro-celebraciones: al completar un reto → confetti dorado + el monto USDC animado subiendo al balance

---

## 5. Pantallas (wireframes funcionales)

### 5.1 Onboarding (3 pasos, sin fricción)
1. **Splash:** logo Vivi + tagline + botón único "Empezar / Get started"
2. **Registro:** Privy login con email (un solo campo). Mientras se crea la wallet: loader con copy "Creando tu espacio seguro… ✨" — NUNCA mencionar 'wallet', 'llaves' ni 'blockchain' aquí
3. **Identidad:** "Tu nombre en Vivi" → input → muestra `maria.vivi.eth` creándose + selector de país (define moneda local en las respuestas de Vivi)
4. **Verificación World ID:** card explicando "Verifica que eres humana — así garantizamos 1 beca por persona" → botón World ID → check verde al volver

### 5.2 Chat (pantalla principal, default)
- Header: avatar Vivi (isotipo) + "Vivi" + estado "siempre disponible" + toggle ES/EN
- Burbujas: Vivi a la izquierda (blanco, borde violeta sutil), usuaria a la derecha (`#EDE9FE`)
- Cuando Vivi muestra datos (yields, tipo de cambio): renderizar como MINI-CARD dentro de la burbuja — nombre de plataforma, tasa en grande, fuente y hora del dato, y botón "Abrir en [plataforma] →" (link de referido) con disclosure: "Vivi gana una comisión si te registras — así mantenemos las becas gratis 💜"
- 3 chips de preguntas sugeridas sobre el input: "¿Dónde rinde más mi USDC?" · "¿A cuánto está el dólar?" · "Explícame qué es DeFi"
- Disclaimer fijo y discreto bajo el input: "Vivi educa, no da consejo financiero personalizado"

### 5.3 Retos (Challenges)
- Header con barra de progreso del nivel + puntos acumulados
- Lista de cards de reto: emoji + título + recompensa en dorado ("+5 USDC") + estado (bloqueado 🔒 / disponible / completado ✅)
- El primer reto del demo: "Haz tu primera pregunta a Vivi" → al completarse: confetti + modal "¡Ganaste 5 USDC!" con botón "Ver en mi perfil"
- Retos bloqueados muestran qué los desbloquea ("Verifica tu World ID para desbloquear")

### 5.4 Perfil
- Avatar + `maria.vivi.eth` en grande (el 0x escondido en "detalles")
- **Balance USDC protagonista** (número grande + dorado) con sub-línea verde: "Tu dinero está creciendo: +4.2% anual ✨" (Privy Earn)
- Badges/credenciales (desde ENS text records): país, nivel, retos completados
- Botón secundario: "Ver mi identidad on-chain" (link a explorer / app de ENS)

---

## 6. Voz y copy (system prompt de Vivi hereda esto)

- Tutea, celebra, nunca regaña. "¡Buena pregunta!" antes que "La respuesta es"
- Explica TODO término técnico en la misma frase: "APY (el porcentaje que ganas al año)"
- Bilingüe: responde en el idioma del último mensaje de la usuaria
- Siempre que recomiende plataformas: muestra MÍNIMO 2-3 opciones comparadas (nunca una sola) + disclosure de afiliado
- Jamás dice "deberías invertir en X". Dice "estas son tus opciones, esto significa cada una"

---

*Assets: `vivi-logo.svg` en `/public`. Favicon: el isotipo (burbuja-V) solo.*

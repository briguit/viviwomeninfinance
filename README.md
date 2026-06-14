# Vivi — Financial Education for Women in DeFi

**Live app:** [viviwomeninfinance.vercel.app](https://viviwomeninfinance.vercel.app)

Vivi is a bilingual (ES/EN) financial education app built for women entering DeFi. It combines an AI-powered chat mentor, progressive challenges, and a real yield-earning savings account (USDC on Base via Morpho vaults). Every economic incentive — the welcome bonus and challenge rewards — is gated behind World ID to ensure one scholarship per real human.

The app targets users in Latin America who are curious about crypto and savings but lack accessible, trust-building tools. Vivi speaks their language (literally) and walks them from "what is DeFi?" to having real yield-earning USDC onchain in minutes.

---

## What breaks without World ID

Vivi's core value proposition is a **scholarship fund**: users earn real USDC (initially as educational reward points, later deposited into a Morpho vault) by completing financial education challenges. Without proof of humanity:

- A single actor could create 1,000 accounts and claim 1,000 × $5 welcome bonuses
- The challenge reward pool would be drained by bots in minutes
- The "1 scholarship per woman" model collapses entirely

**World ID is not decorative** — it is the only mechanism that makes a per-person economic incentive honest at scale. The app validates the proof server-side at `/api/verify` against the Worldcoin Developer API before crediting any USDC. Educational features (chat, explanations) remain accessible without verification, but all monetary rewards require a valid World ID proof.

---

## User flow

```
Splash → Email login (Privy OTP) → Set name + country
  → World ID verification (device-level) → Main app
       ↓
  Chat with Vivi (Claude AI)   Earn USDC challenges   Savings account
  Ask about DeFi, savings,     5 challenges, each      Real USDC → Morpho
  exchange rates                gated by World ID       vault on Base (~4.8% APY)
```

**Without World ID:** challenges complete and points are awarded, but the USDC reward is locked. A prominent gate in the Profile and Challenges screens explains why and surfaces the verification button.

---

## Tech stack

| Layer | Technology |
|---|---|
| Framework | Next.js 14 (App Router, `'use client'`) |
| Auth | Privy v3.30 — email OTP + embedded wallets |
| Identity | `@worldcoin/idkit` v4.1.8 — World ID device verification |
| ENS | viem — real Ethereum mainnet ENS resolution |
| Savings | Privy Earn (Morpho ERC-4626 vault on Base) |
| AI chat | Anthropic Claude API (claude-haiku-4-5) |
| Onchain | viem 2.x, Base mainnet, USDC |
| Styling | Tailwind CSS + inline styles |
| Language | TypeScript 5, React 18 |

---

## Running locally

### Prerequisites

- Node.js 18+
- A [Privy](https://dashboard.privy.io) account (free)
- A [Worldcoin Developer Portal](https://developer.worldcoin.org) app (free, staging)
- An [Anthropic](https://console.anthropic.com) API key (optional — falls back to mock responses)

### Setup

```bash
git clone https://github.com/briguit/viviwomeninfinance
cd viviwomeninfinance
npm install

cp .env.local.example .env.local
# Fill in the values in .env.local
```

### Environment variables

```env
# Privy auth
NEXT_PUBLIC_PRIVY_APP_ID=your-privy-app-id
NEXT_PUBLIC_PRIVY_CLIENT_ID=your-privy-client-id
PRIVY_APP_ID=your-privy-app-id
PRIVY_APP_SECRET=your-privy-app-secret
PRIVY_EARN_VAULT_ID=your-earn-vault-id

# World ID (create app at developer.worldcoin.org, use "device" verification level)
NEXT_PUBLIC_WLD_APP_ID=app_staging_xxxxxxxxxxxxxxxxxxxxxxxx
NEXT_PUBLIC_WLD_ACTION=verify-human
WLD_ACTION=verify-human

# Claude AI (optional)
ANTHROPIC_API_KEY=sk-ant-...
```

**If `NEXT_PUBLIC_WLD_APP_ID` is not set**, the app runs in demo mode: the verification button simulates a successful check after 1.5 s so the full flow can be tested without a real World ID credential.

### Run

```bash
npm run dev
# Open http://localhost:3000
```

---

## Key API routes

| Route | Purpose |
|---|---|
| `POST /api/verify` | World ID backend verification (required by Worldcoin Track B) |
| `POST /api/earn/savings-wallet` | Create Privy server wallet for savings |
| `GET  /api/earn/balance` | Query real USDC balance on Base via publicnode RPC |
| `POST /api/earn/deposit` | Deposit USDC into Morpho vault |
| `POST /api/earn/withdraw` | Withdraw from Morpho vault |
| `POST /api/earn/send` | Send USDC to any Base address |
| `POST /api/chat` | Claude AI chat endpoint |

---

## World ID integration details

- **Package:** `@worldcoin/idkit` v4.1.8
- **Verification level:** `device` (no Orb required — accessible for hackathon)
- **Action:** `verify-human` (configurable via env var)
- **Backend verification:** `POST https://developer.worldcoin.org/api/v2/verify/{appId}` — called server-side, never from the browser
- **Signal:** `0x00` (no additional signal required for this use case)
- **Nullifier hash:** stored client-side in localStorage as `vivi_worldid_{userId}` to prevent re-prompting across sessions

The `IDKitWidget` is loaded via `next/dynamic` with `ssr: false` to prevent SSR conflicts with the browser-only widget internals.

---

## Hackathon — Worldcoin Track B compliance

✅ World ID 4.0 used as a **real constraint** (USDC rewards broken without it)  
✅ Proof of humanity determines **eligibility and uniqueness** (1 scholarship/person)  
✅ Backend verification at `/api/verify` (server-side, not client-side)  
✅ Functional web app at [viviwomeninfinance.vercel.app](https://viviwomeninfinance.vercel.app)  
✅ Bilingual (ES/EN) for Latin American market

---

## Screenshots / flow

1. **Splash** — brand intro, "Comenzar con Vivi"
2. **Login** — email + 6-digit OTP (Privy headless auth)
3. **Identity** — name, ENS preview, country
4. **World ID** — sybil-resistance explanation + IDKit widget
5. **Chat** — AI financial mentor, bilingual chips
6. **Challenges** — 5 progressive challenges; USDC locked until World ID verified
7. **Profile** — savings wallet, Morpho vault balance, ENS identity, World ID status

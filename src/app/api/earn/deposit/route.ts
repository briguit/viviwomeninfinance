import { NextRequest, NextResponse } from 'next/server'

// POST /api/earn/deposit
// Deposits USDC into a Privy Earn (Morpho ERC-4626) vault on Base.
// Requires a Privy server wallet ID (from /api/earn/savings-wallet), NOT an Ethereum address.
// Docs: https://docs.privy.io/wallets/actions/earn/deposit
export async function POST(req: NextRequest) {
  const appId     = process.env.PRIVY_APP_ID
  const appSecret = process.env.PRIVY_APP_SECRET
  const vaultId   = process.env.PRIVY_EARN_VAULT_ID

  if (!appId || !appSecret || !vaultId) {
    return NextResponse.json({ success: true, demo: true, message: 'Demo mode — configure PRIVY_* env vars for live deposits' })
  }

  let body: { walletId?: string; amount?: string }
  try { body = await req.json() } catch { return NextResponse.json({ success: false, message: 'Invalid JSON' }, { status: 400 }) }

  const { walletId, amount = '1.00' } = body

  if (!walletId) {
    return NextResponse.json({
      success: false,
      message: 'Se requiere el ID del savings wallet. Crea uno primero con /api/earn/savings-wallet',
    }, { status: 400 })
  }

  const credentials = Buffer.from(`${appId}:${appSecret}`).toString('base64')

  const privyRes = await fetch(
    `https://api.privy.io/api/v1/wallets/${walletId}/earn/ethereum/deposit`,
    {
      method: 'POST',
      headers: {
        'privy-app-id': appId,
        'Authorization': `Basic ${credentials}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ vault_id: vaultId, amount }),
    }
  )

  if (!privyRes.ok) {
    const errText = await privyRes.text()
    let errMsg: string
    try {
      const parsed = JSON.parse(errText) as { error?: string; message?: string }
      // Translate common Privy errors to user-friendly messages
      if (parsed.error === 'insufficient_funds') {
        errMsg = 'Tu savings wallet no tiene USDC suficiente. Envía USDC a la dirección de tu savings wallet.'
      } else {
        errMsg = parsed.error ?? parsed.message ?? 'Error desconocido de Privy'
      }
    } catch {
      errMsg = errText
    }
    return NextResponse.json({ success: false, message: errMsg }, { status: privyRes.status })
  }

  const data = await privyRes.json() as {
    id: string
    status: 'pending' | 'succeeded' | 'rejected' | 'failed'
    amount: string
    vault_id: string
  }

  return NextResponse.json({
    success: true,
    actionId: data.id,
    status: data.status,
    amount: data.amount,
  })
}

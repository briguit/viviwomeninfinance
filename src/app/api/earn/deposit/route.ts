import { NextRequest, NextResponse } from 'next/server'

// POST /api/earn/deposit
// Deposits USDC into a Privy Earn (Morpho ERC-4626) vault on Base.
// Docs: https://docs.privy.io/wallets/actions/earn/deposit
export async function POST(req: NextRequest) {
  const appId     = process.env.PRIVY_APP_ID
  const appSecret = process.env.PRIVY_APP_SECRET
  const vaultId   = process.env.PRIVY_EARN_VAULT_ID

  if (!appId || !appSecret || !vaultId) {
    // In demo mode (no credentials), return a simulated success
    return NextResponse.json({ success: true, demo: true, message: 'Demo mode — configure PRIVY_* env vars for live deposits' })
  }

  let body: { walletAddress?: string; walletId?: string; amount?: string }
  try { body = await req.json() } catch { return NextResponse.json({ success: false, message: 'Invalid JSON' }, { status: 400 }) }

  const { walletAddress, walletId, amount = '1.00' } = body
  if (!walletAddress && !walletId) {
    return NextResponse.json({ success: false, message: 'walletAddress or walletId required' }, { status: 400 })
  }

  // Privy Earn requires the wallet's internal ID (not address).
  // If only address is provided, resolve it to Privy wallet ID first.
  const credentials = Buffer.from(`${appId}:${appSecret}`).toString('base64')
  const privyHeaders = {
    'privy-app-id': appId,
    'Authorization': `Basic ${credentials}`,
    'Content-Type': 'application/json',
  }

  // Use walletId if provided, otherwise use walletAddress as the identifier.
  const targetWalletId = walletId ?? walletAddress

  const privyRes = await fetch(
    `https://api.privy.io/api/v1/wallets/${targetWalletId}/earn/ethereum/deposit`,
    {
      method: 'POST',
      headers: privyHeaders,
      body: JSON.stringify({ vault_id: vaultId, amount }),
    }
  )

  if (!privyRes.ok) {
    const err = await privyRes.text()
    return NextResponse.json({ success: false, message: err }, { status: privyRes.status })
  }

  const data = await privyRes.json() as {
    id: string
    status: 'pending' | 'succeeded' | 'rejected' | 'failed'
    amount: string
    vault_id: string
  }

  return NextResponse.json({ success: true, actionId: data.id, status: data.status, amount: data.amount })
}

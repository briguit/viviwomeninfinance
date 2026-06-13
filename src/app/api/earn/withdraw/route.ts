import { NextRequest, NextResponse } from 'next/server'

// POST /api/earn/withdraw
// Withdraws USDC from a Privy Earn (Morpho ERC-4626) vault on Base.
// Docs: https://docs.privy.io/wallets/actions/earn/withdraw
export async function POST(req: NextRequest) {
  const appId     = process.env.PRIVY_APP_ID
  const appSecret = process.env.PRIVY_APP_SECRET
  const vaultId   = process.env.PRIVY_EARN_VAULT_ID

  if (!appId || !appSecret || !vaultId) {
    return NextResponse.json({ success: true, demo: true, message: 'Demo mode — configure PRIVY_* env vars for live withdrawals' })
  }

  let body: { walletId?: string; walletAddress?: string; amount?: string }
  try { body = await req.json() } catch { return NextResponse.json({ success: false, message: 'Invalid JSON' }, { status: 400 }) }

  const { walletAddress, walletId, amount = '1.00' } = body
  if (!walletAddress && !walletId) {
    return NextResponse.json({ success: false, message: 'walletAddress or walletId required' }, { status: 400 })
  }

  const credentials = Buffer.from(`${appId}:${appSecret}`).toString('base64')
  const targetWalletId = walletId ?? walletAddress

  const privyRes = await fetch(
    `https://api.privy.io/api/v1/wallets/${targetWalletId}/earn/ethereum/withdraw`,
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
    const err = await privyRes.text()
    return NextResponse.json({ success: false, message: err }, { status: privyRes.status })
  }

  const data = await privyRes.json() as {
    id: string
    status: 'pending' | 'succeeded' | 'rejected' | 'failed'
    amount: string
  }

  return NextResponse.json({ success: true, actionId: data.id, status: data.status, amount: data.amount })
}

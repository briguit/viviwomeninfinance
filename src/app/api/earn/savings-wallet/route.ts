import { NextRequest, NextResponse } from 'next/server'

// POST /api/earn/savings-wallet
// Creates a Privy server wallet for this user to use as their Earn savings account.
// Server wallets are controlled by the app (not user keys) — correct type for Earn API.
// The wallet ID is stored client-side in localStorage; we don't persist it server-side.
export async function POST(req: NextRequest) {
  const appId     = process.env.PRIVY_APP_ID
  const appSecret = process.env.PRIVY_APP_SECRET

  if (!appId || !appSecret) {
    // Demo mode: return a fake wallet for UI testing
    return NextResponse.json({
      success: true,
      demo: true,
      walletId: 'wallet:demo-savings-wallet',
      walletAddress: '0x742d35Cc6634C0532925a3b8D4C9C0931af3A8B2',
    })
  }

  let body: { userId?: string }
  try { body = await req.json() } catch { body = {} }

  const credentials = Buffer.from(`${appId}:${appSecret}`).toString('base64')
  const headers = {
    'privy-app-id': appId,
    'Authorization': `Basic ${credentials}`,
    'Content-Type': 'application/json',
  }

  // Create a server wallet (app-controlled, no user key — correct for Earn API)
  const createRes = await fetch('https://api.privy.io/api/v1/wallets', {
    method: 'POST',
    headers,
    body: JSON.stringify({
      chain_type: 'ethereum',
      // Optional: tag wallet with user info for tracking
      ...(body.userId && { policy_ids: [] }),
    }),
  })

  if (!createRes.ok) {
    const err = await createRes.text()
    return NextResponse.json({ success: false, message: `Privy wallet creation failed: ${err}` }, { status: createRes.status })
  }

  const wallet = await createRes.json() as {
    id: string       // e.g. "wallet:abc123" — use this for Earn API
    address: string  // Ethereum address — show to user to fund
    chain_type: string
  }

  return NextResponse.json({
    success: true,
    walletId: wallet.id,
    walletAddress: wallet.address,
  })
}

import { NextRequest, NextResponse } from 'next/server'

// GET /api/earn/position?walletId=...
// Returns the user's current Privy Earn position (shares, accrued yield, USDC value).
export async function GET(req: NextRequest) {
  const appId     = process.env.PRIVY_APP_ID
  const appSecret = process.env.PRIVY_APP_SECRET
  const vaultId   = process.env.PRIVY_EARN_VAULT_ID

  if (!appId || !appSecret || !vaultId) {
    // Demo mode: return placeholder position
    return NextResponse.json({
      success: true,
      demo: true,
      position: {
        vault_id: 'demo-vault',
        asset_balance: '5.00',
        share_balance: '4.98',
        apy: '0.048',
        yield_earned: '0.02',
      },
    })
  }

  const walletId = req.nextUrl.searchParams.get('walletId')
  if (!walletId) {
    return NextResponse.json({ success: false, message: 'walletId required' }, { status: 400 })
  }

  const credentials = Buffer.from(`${appId}:${appSecret}`).toString('base64')

  // Privy Earn vault info endpoint
  const vaultRes = await fetch(
    `https://api.privy.io/api/v1/earn/ethereum/vaults/${vaultId}`,
    {
      headers: {
        'privy-app-id': appId,
        'Authorization': `Basic ${credentials}`,
      },
    }
  )

  if (!vaultRes.ok) {
    const err = await vaultRes.text()
    return NextResponse.json({ success: false, message: err }, { status: vaultRes.status })
  }

  const vault = await vaultRes.json()
  return NextResponse.json({ success: true, vault })
}

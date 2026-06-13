import { NextRequest, NextResponse } from 'next/server'
import { encodeFunctionData, isAddress } from 'viem'

const USDC_BASE = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913' as const

const TRANSFER_ABI = [{
  name: 'transfer',
  type: 'function',
  inputs: [
    { name: 'to', type: 'address' },
    { name: 'amount', type: 'uint256' },
  ],
  outputs: [{ type: 'bool' }],
  stateMutability: 'nonpayable' as const,
}] as const

// POST /api/earn/send
// Sends USDC from a Privy server wallet to any address on Base via raw transaction.
// Docs: https://docs.privy.io/wallets/server/signing
export async function POST(req: NextRequest) {
  const appId     = process.env.PRIVY_APP_ID
  const appSecret = process.env.PRIVY_APP_SECRET

  if (!appId || !appSecret) {
    return NextResponse.json({
      success: true,
      demo: true,
      txHash: null,
      message: 'Demo mode — configure PRIVY_APP_ID + PRIVY_APP_SECRET for real USDC sends',
    })
  }

  let body: { walletId?: string; recipientAddress?: string; amount?: string }
  try { body = await req.json() } catch {
    return NextResponse.json({ success: false, message: 'Invalid JSON' }, { status: 400 })
  }

  const { walletId, recipientAddress, amount } = body

  if (!walletId) {
    return NextResponse.json({ success: false, message: 'walletId required' }, { status: 400 })
  }
  if (!recipientAddress || !isAddress(recipientAddress)) {
    return NextResponse.json({ success: false, message: 'Valid recipient address required (0x...)' }, { status: 400 })
  }
  if (!amount || isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) {
    return NextResponse.json({ success: false, message: 'Amount must be greater than 0' }, { status: 400 })
  }

  const amountWei = BigInt(Math.round(parseFloat(amount) * 1_000_000)) // USDC = 6 decimals

  const data = encodeFunctionData({
    abi: TRANSFER_ABI,
    functionName: 'transfer',
    args: [recipientAddress as `0x${string}`, amountWei],
  })

  const credentials = Buffer.from(`${appId}:${appSecret}`).toString('base64')

  try {
    const privyRes = await fetch(
      `https://api.privy.io/api/v1/wallets/${walletId}/transactions`,
      {
        method: 'POST',
        headers: {
          'privy-app-id': appId,
          'Authorization': `Basic ${credentials}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          caip2: 'eip155:8453', // Base mainnet chain ID = 8453
          transaction: {
            to: USDC_BASE,
            data,
            value: '0',
          },
        }),
      }
    )

    if (!privyRes.ok) {
      const errText = await privyRes.text()
      let errMsg: string
      try {
        const parsed = JSON.parse(errText) as { error?: string; message?: string; cause?: string }
        const isInsufficient = parsed.error === 'insufficient_funds' || (parsed.cause ?? '').includes('insufficient')
        errMsg = isInsufficient
          ? `Savings wallet doesn't have enough USDC. Need at least ${amount} USDC.`
          : parsed.error ?? parsed.message ?? errText.slice(0, 200)
      } catch {
        errMsg = errText.slice(0, 200)
      }
      return NextResponse.json({ success: false, message: errMsg }, { status: privyRes.status })
    }

    const txData = await privyRes.json() as { id?: string; hash?: string; transaction_hash?: string; status?: string }

    return NextResponse.json({
      success: true,
      txHash: txData.hash ?? txData.transaction_hash ?? null,
      status: txData.status,
      actionId: txData.id,
    })
  } catch (err) {
    return NextResponse.json({
      success: false,
      message: (err as Error)?.message ?? 'Network error calling Privy API',
    }, { status: 500 })
  }
}

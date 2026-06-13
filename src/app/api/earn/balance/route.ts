import { NextRequest, NextResponse } from 'next/server'
import { createPublicClient, http, formatUnits, isAddress } from 'viem'

const USDC_BASE = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913' as const

const USDC_ABI = [{
  name: 'balanceOf',
  type: 'function',
  inputs: [{ name: 'account', type: 'address' }],
  outputs: [{ name: '', type: 'uint256' }],
  stateMutability: 'view' as const,
}] as const

// GET /api/earn/balance?address=0x...
// Returns the real USDC balance of a wallet on Base mainnet via public RPC.
export async function GET(req: NextRequest) {
  const address = req.nextUrl.searchParams.get('address')

  if (!address || !isAddress(address)) {
    return NextResponse.json({ success: false, balance: 0, message: 'Valid address required' }, { status: 400 })
  }

  try {
    const client = createPublicClient({
      transport: http('https://base.publicnode.com'),
    })

    const raw = await client.readContract({
      address: USDC_BASE,
      abi: USDC_ABI,
      functionName: 'balanceOf',
      args: [address as `0x${string}`],
    })

    const balance = parseFloat(formatUnits(raw as bigint, 6))
    return NextResponse.json({ success: true, balance })
  } catch (err) {
    // Non-fatal: return 0 on RPC error so the UI shows $0.00 rather than crashing
    return NextResponse.json({
      success: true,
      balance: 0,
      rpc_error: (err as Error)?.message?.slice(0, 100),
    })
  }
}

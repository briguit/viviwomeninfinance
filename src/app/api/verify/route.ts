import { type NextRequest, NextResponse } from 'next/server'

// World ID backend verification
// Docs: https://docs.worldcoin.org/id/cloud-verification
export async function POST(req: NextRequest) {
  const appId = process.env.NEXT_PUBLIC_WLD_APP_ID
  const action = process.env.WLD_ACTION ?? process.env.NEXT_PUBLIC_WLD_ACTION ?? 'verify-human'

  if (!appId) {
    return NextResponse.json({
      success: false,
      error: 'NEXT_PUBLIC_WLD_APP_ID no está configurado. Agrega tu App ID del Developer Portal de Worldcoin. / NEXT_PUBLIC_WLD_APP_ID is not configured. Add your App ID from the Worldcoin Developer Portal.',
    }, { status: 500 })
  }

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ success: false, error: 'JSON inválido / Invalid JSON' }, { status: 400 })
  }

  const { proof, merkle_root, nullifier_hash, verification_level } = body

  if (!proof || !merkle_root || !nullifier_hash) {
    return NextResponse.json({
      success: false,
      error: 'Faltan campos del proof de World ID (proof, merkle_root, nullifier_hash). / Missing World ID proof fields.',
    }, { status: 400 })
  }

  try {
    const verifyRes = await fetch(`https://developer.worldcoin.org/api/v2/verify/${appId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action,
        nullifier_hash,
        merkle_root,
        proof,
        verification_level: verification_level ?? 'device',
        signal_hash: '0x00',
      }),
    })

    const result = await verifyRes.json() as { success?: boolean; detail?: string }

    if (verifyRes.ok && result.success) {
      return NextResponse.json({ success: true })
    }

    return NextResponse.json(
      { success: false, error: result.detail ?? 'Verificación fallida — el proof no es válido o ya fue usado. / Verification failed — proof is invalid or already used.' },
      { status: 400 }
    )
  } catch (err) {
    console.error('[World ID verify]', err)
    return NextResponse.json({
      success: false,
      error: 'Error de red al contactar Worldcoin. Intenta de nuevo. / Network error contacting Worldcoin. Please retry.',
    }, { status: 502 })
  }
}

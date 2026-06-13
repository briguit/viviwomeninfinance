/**
 * ENS integration — real Ethereum mainnet resolution via viem.
 * Used for: reverse lookup, forward resolution, avatar, text records.
 * No API key required; uses public RPC endpoints.
 */
import { createPublicClient, http } from 'viem'
import { mainnet } from 'viem/chains'
import { normalize } from 'viem/ens'

export interface EnsProfile {
  name: string | null
  avatar: string | null
  description: string | null
  twitter: string | null
  url: string | null
  validated: boolean // true = name forward-resolves back to the queried address
}

// Public mainnet RPC — no API key needed for ENS read-only calls
const client = createPublicClient({
  chain: mainnet,
  transport: http('https://eth.llamarpc.com'),
})

/**
 * Reverse-lookup a wallet address to its ENS primary name.
 * Then forward-validates: the resolved name must map back to the same address.
 * This prevents spoofed reverse records.
 */
export async function lookupEnsName(address: string): Promise<string | null> {
  try {
    const name = await client.getEnsName({ address: address as `0x${string}` })
    if (!name) return null
    const resolved = await client.getEnsAddress({ name: normalize(name) })
    if (!resolved || resolved.toLowerCase() !== address.toLowerCase()) return null
    return name
  } catch {
    return null
  }
}

/** Forward-resolve an ENS name to its address. Returns null if unregistered. */
export async function resolveEnsName(name: string): Promise<string | null> {
  try {
    const address = await client.getEnsAddress({ name: normalize(name) })
    return address ?? null
  } catch {
    return null
  }
}

/** Fetch ENS avatar URI (may be IPFS, HTTP, or token URI). */
export async function getEnsAvatar(name: string): Promise<string | null> {
  try {
    const avatar = await client.getEnsAvatar({ name: normalize(name) })
    return avatar ?? null
  } catch {
    return null
  }
}

/** Fetch a single ENS text record (e.g. 'description', 'com.twitter', 'url'). */
export async function getEnsTextRecord(name: string, key: string): Promise<string | null> {
  try {
    const value = await client.getEnsText({ name: normalize(name), key })
    return value ?? null
  } catch {
    return null
  }
}

/**
 * Full ENS profile for a wallet address.
 * Validates ownership via forward resolution before fetching metadata.
 */
export async function getEnsProfile(address: string): Promise<EnsProfile> {
  const empty: EnsProfile = {
    name: null, avatar: null, description: null, twitter: null, url: null, validated: false,
  }
  if (!address) return empty

  const name = await lookupEnsName(address)
  if (!name) return empty

  const [avatar, description, twitter, url] = await Promise.allSettled([
    getEnsAvatar(name),
    getEnsTextRecord(name, 'description'),
    getEnsTextRecord(name, 'com.twitter'),
    getEnsTextRecord(name, 'url'),
  ])

  return {
    name,
    validated: true,
    avatar:      avatar.status      === 'fulfilled' ? avatar.value      : null,
    description: description.status === 'fulfilled' ? description.value : null,
    twitter:     twitter.status     === 'fulfilled' ? twitter.value     : null,
    url:         url.status         === 'fulfilled' ? url.value         : null,
  }
}

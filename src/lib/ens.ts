/**
 * ENS integration — real Ethereum mainnet resolution via viem.
 * RPC: ethereum.publicnode.com (free, no key, supports CCIP-Read for Universal Resolver).
 *
 * Tested working: vitalik.eth, nick.eth, ens.eth + reverse lookups.
 * eth.llamarpc.com was the original RPC but returns 403 (Cloudflare challenge) from Node.js.
 * cloudflare-eth.com and rpc.ankr.com/eth reject CCIP-Read calls used by viem v2 ENS.
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
  validated: boolean
}

/** Three distinct outcomes so the UI never lies. */
export type EnsLookupResult =
  | { status: 'resolved'; address: string }
  | { status: 'not_found' }           // name exists but has no addr record (rare) or is unregistered
  | { status: 'rpc_error'; message: string }

const client = createPublicClient({
  chain: mainnet,
  transport: http('https://ethereum.publicnode.com'),
})

/**
 * Reverse-lookup an address → ENS primary name, then forward-validates.
 * Prevents accepting spoofed reverse records.
 * Returns null for no name OR on any RPC error (safe to display as "no name").
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

/**
 * Forward-resolve an ENS name to its address.
 * Returns a typed result distinguishing "not found" from "RPC/resolver error"
 * so the UI never incorrectly says "not registered" when the RPC failed.
 */
export async function resolveEnsName(name: string): Promise<EnsLookupResult> {
  const normalized = name.trim().toLowerCase()
  const withSuffix = normalized.endsWith('.eth') ? normalized : `${normalized}.eth`
  try {
    const address = await client.getEnsAddress({ name: normalize(withSuffix) })
    if (address) return { status: 'resolved', address }
    return { status: 'not_found' }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    // Distinguish real "not registered" from infra errors
    // viem throws ContractFunctionZeroDataError when there is no resolver (= not registered)
    const isNotRegistered =
      msg.includes('returned no data') ||
      msg.includes('ContractFunctionZero') ||
      msg.includes('no data')
    if (isNotRegistered) return { status: 'not_found' }
    return { status: 'rpc_error', message: msg.slice(0, 120) }
  }
}

/** Fetch ENS avatar URI. Returns null on missing record or error. */
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

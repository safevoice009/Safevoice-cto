import * as ed25519 from '@noble/ed25519'
import { sha256 } from '@noble/hashes/sha2.js'

export type MemorialTributeStatus = 'draft' | 'pending_moderation' | 'published' | 'rejected'

export interface TributeCosignerProof {
  id: string
  tributeId: string
  cosignerId: string
  publicKey: string
  signature: string
  signedAt: number
  contentHash: string
}

export interface TributeModeratorDecision {
  id: string
  tributeId: string
  moderatorId: string
  publicKey: string
  signature: string
  decidedAt: number
  action: 'approve' | 'reject'
  reason?: string | null
  contentHash: string
}

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

function stableJson(value: unknown): string {
  if (value === null || typeof value !== 'object') {
    return JSON.stringify(value)
  }

  if (Array.isArray(value)) {
    return `[${value.map(stableJson).join(',')}]`
  }

  const obj = value as Record<string, unknown>
  const keys = Object.keys(obj).sort()
  return `{${keys.map((k) => `${JSON.stringify(k)}:${stableJson(obj[k])}`).join(',')}}`
}

export function computeTributeContentHash(payload: {
  personName: string
  college: string | null
  message: string
  contentVersion: number
}): string {
  const encoder = new TextEncoder()
  const data = encoder.encode(stableJson(payload))
  const digest = sha256(data)
  return bytesToHex(digest)
}

function derivePrivateKey(signerId: string): Uint8Array {
  const encoder = new TextEncoder()
  const seed = sha256(encoder.encode(`safevoice:memorial:${signerId}`))
  return seed.slice(0, 32)
}

export async function createCosignerProof(input: {
  tributeId: string
  cosignerId: string
  contentHash: string
}): Promise<Omit<TributeCosignerProof, 'id' | 'signedAt'>> {
  const privateKey = derivePrivateKey(input.cosignerId)
  const publicKey = await ed25519.getPublicKey(privateKey)

  const message = new TextEncoder().encode(`cosign:${input.tributeId}:${input.contentHash}`)
  const signature = await ed25519.sign(message, privateKey)

  return {
    tributeId: input.tributeId,
    cosignerId: input.cosignerId,
    publicKey: bytesToHex(publicKey),
    signature: bytesToHex(signature),
    contentHash: input.contentHash,
  }
}

export async function createModeratorDecision(input: {
  tributeId: string
  moderatorId: string
  action: 'approve' | 'reject'
  reason?: string | null
  contentHash: string
}): Promise<Omit<TributeModeratorDecision, 'id' | 'decidedAt'>> {
  const privateKey = derivePrivateKey(input.moderatorId)
  const publicKey = await ed25519.getPublicKey(privateKey)

  const message = new TextEncoder().encode(
    `moderate:${input.action}:${input.tributeId}:${input.contentHash}:${input.reason ?? ''}`
  )
  const signature = await ed25519.sign(message, privateKey)

  return {
    tributeId: input.tributeId,
    moderatorId: input.moderatorId,
    publicKey: bytesToHex(publicKey),
    signature: bytesToHex(signature),
    action: input.action,
    reason: input.reason ?? null,
    contentHash: input.contentHash,
  }
}

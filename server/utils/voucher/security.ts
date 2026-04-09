import { createError } from "h3"
import { bytesToHex, getAddress, isAddress } from "viem"

export function normalizeWalletAddress(address: string): string {
  if (!isAddress(address, { strict: false })) {
    throw createError({
      statusCode: 400,
      statusMessage: "Invalid wallet address.",
    })
  }

  return getAddress(address)
}

export function isExpired(isoTimestamp: string): boolean {
  return new Date(isoTimestamp).getTime() <= Date.now()
}

export function createFutureIsoTimestamp(secondsFromNow: number): string {
  return new Date(Date.now() + secondsFromNow * 1000).toISOString()
}

export function createOpaqueToken(byteLength = 32): string {
  const bytes = crypto.getRandomValues(new Uint8Array(byteLength))
  return bytesToHex(bytes)
}

export async function sha256Hex(value: string): Promise<string> {
  const encodedValue = new TextEncoder().encode(value)
  const digest = await crypto.subtle.digest("SHA-256", encodedValue)
  return bytesToHex(new Uint8Array(digest))
}

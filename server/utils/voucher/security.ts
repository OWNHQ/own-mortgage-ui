import type { H3Event } from "h3"
import { createError } from "h3"
import { bytesToHex, getAddress, isAddress } from "viem"
import { RATE_LIMITS } from "./constants"
import { incrementRateLimit } from "./db"
import { getClientIp } from "./http"

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

export async function enforceVoucherRateLimit(
  event: H3Event,
  action: keyof typeof RATE_LIMITS,
  address?: string,
): Promise<void> {
  const { limit, windowSeconds } = RATE_LIMITS[action]
  const windowStart = Math.floor(Date.now() / (windowSeconds * 1000)) * windowSeconds
  const expiresAt = windowStart + windowSeconds * 2
  const clientIp = getClientIp(event)
  const baseKey = address ? `${action}:${clientIp}:${address}` : `${action}:${clientIp}`

  const attempts = await incrementRateLimit(event, baseKey, windowStart, expiresAt)
  if (attempts > limit) {
    throw createError({
      statusCode: 429,
      statusMessage: "Too many voucher requests. Please try again shortly.",
    })
  }
}

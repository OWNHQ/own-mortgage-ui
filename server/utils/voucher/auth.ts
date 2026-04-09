import type { H3Event } from "h3"
import { createError } from "h3"
import { VOUCHER_SESSION_TTL_SECONDS } from "./constants"
import {
  createSession,
  deleteSessionByTokenHash,
  getSessionByTokenHash,
} from "./db"
import {
  clearVoucherSessionCookie,
  getVoucherSessionCookie,
  setVoucherSessionCookie,
} from "./http"
import {
  createFutureIsoTimestamp,
  createOpaqueToken,
  isExpired,
  sha256Hex,
} from "./security"

export async function createVoucherSession(event: H3Event, address: string): Promise<void> {
  const rawSessionToken = createOpaqueToken()
  const sessionTokenHash = await sha256Hex(rawSessionToken)
  const expiresAt = createFutureIsoTimestamp(VOUCHER_SESSION_TTL_SECONDS)

  await createSession(event, sessionTokenHash, address, expiresAt)
  setVoucherSessionCookie(event, rawSessionToken)
}

export async function getVoucherSession(event: H3Event): Promise<{ address: string } | null> {
  const rawSessionToken = getVoucherSessionCookie(event)
  if (!rawSessionToken) {
    return null
  }

  const sessionTokenHash = await sha256Hex(rawSessionToken)
  const session = await getSessionByTokenHash(event, sessionTokenHash)
  if (!session) {
    clearVoucherSessionCookie(event)
    return null
  }

  if (isExpired(session.expires_at)) {
    await deleteSessionByTokenHash(event, sessionTokenHash)
    clearVoucherSessionCookie(event)
    return null
  }

  return {
    address: session.address,
  }
}

export async function getVoucherSessionForAddress(
  event: H3Event,
  address: string,
): Promise<{ address: string } | null> {
  const session = await getVoucherSession(event)
  if (!session || session.address !== address) {
    return null
  }

  return session
}

export async function requireVoucherSession(event: H3Event): Promise<{ address: string }> {
  const session = await getVoucherSession(event)
  if (!session) {
    throw createError({
      statusCode: 401,
      statusMessage: "Wallet verification is required before claiming a voucher.",
    })
  }

  return session
}

export async function requireVoucherSessionForAddress(
  event: H3Event,
  address: string,
): Promise<{ address: string }> {
  const session = await getVoucherSessionForAddress(event, address)
  if (!session) {
    throw createError({
      statusCode: 401,
      statusMessage: "Wallet verification is required for this address before claiming a voucher.",
    })
  }

  return session
}

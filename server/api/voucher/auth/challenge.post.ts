import { generateNonce } from "siwe"
import { createError, readBody } from "h3"
import { ensureVoucherSchema, getEligibleWalletByAddress, isVoucherStorageConfigured, upsertNonce } from "../../../utils/voucher/db"
import { normalizeWalletAddress, enforceVoucherRateLimit } from "../../../utils/voucher/security"
import { createVoucherSiweMessage } from "../../../utils/voucher/siwe"

export default defineEventHandler(async (event) => {
  await ensureVoucherSchema(event)

  if (!isVoucherStorageConfigured(event)) {
    throw createError({
      statusCode: 503,
      statusMessage: "Conference voucher storage is not configured.",
    })
  }

  const body = await readBody<{ address?: string }>(event)
  if (!body?.address) {
    throw createError({
      statusCode: 400,
      statusMessage: "Wallet address is required.",
    })
  }

  const normalizedAddress = normalizeWalletAddress(body.address)
  await enforceVoucherRateLimit(event, "challenge", normalizedAddress)

  const voucherRecord = await getEligibleWalletByAddress(event, normalizedAddress)
  if (!voucherRecord) {
    throw createError({
      statusCode: 403,
      statusMessage: "This wallet is not eligible for a conference voucher.",
    })
  }

  const nonce = generateNonce()
  const { message, expiresAt } = createVoucherSiweMessage(event, normalizedAddress, nonce)
  await upsertNonce(event, nonce, normalizedAddress, expiresAt)

  return {
    expiresAt,
    message,
  }
})

import { createError, readBody } from "h3"
import { SiweMessage } from "siwe"
import {
  consumeNonce,
  ensureVoucherSchema,
  getEligibleWalletByAddress,
  getNonce,
  isVoucherStorageConfigured,
} from "../../../utils/voucher/db"
import { createVoucherSession } from "../../../utils/voucher/auth"
import { isExpired, normalizeWalletAddress } from "../../../utils/voucher/security"
import { verifyVoucherSiweMessage } from "../../../utils/voucher/siwe"

export default defineEventHandler(async (event) => {
  await ensureVoucherSchema(event)

  if (!isVoucherStorageConfigured(event)) {
    throw createError({
      statusCode: 503,
      statusMessage: "ETHPrague voucher storage is not configured.",
    })
  }

  const body = await readBody<{ message?: string; signature?: string }>(event)
  if (!body?.message || !body.signature) {
    throw createError({
      statusCode: 400,
      statusMessage: "Message and signature are required.",
    })
  }

  let siweMessage: SiweMessage
  try {
    siweMessage = new SiweMessage(body.message)
  } catch {
    throw createError({
      statusCode: 400,
      statusMessage: "Invalid SIWE message payload.",
    })
  }
  const normalizedAddress = normalizeWalletAddress(siweMessage.address)

  const voucherRecord = await getEligibleWalletByAddress(event, normalizedAddress)
  if (!voucherRecord) {
    throw createError({
      statusCode: 403,
      statusMessage: "This wallet is not eligible for an ETHPrague voucher.",
    })
  }

  const nonceRecord = await getNonce(event, siweMessage.nonce)
  if (!nonceRecord || nonceRecord.address !== normalizedAddress) {
    throw createError({
      statusCode: 400,
      statusMessage: "This wallet verification request is invalid or has already been used.",
    })
  }

  if (nonceRecord.consumed_at || isExpired(nonceRecord.expires_at)) {
    throw createError({
      statusCode: 400,
      statusMessage: "This wallet verification request expired. Please sign again.",
    })
  }

  const isValidSignature = await verifyVoucherSiweMessage(
    event,
    body.message,
    body.signature,
    nonceRecord.nonce,
    normalizedAddress,
  )

  if (!isValidSignature) {
    throw createError({
      statusCode: 401,
      statusMessage: "Wallet signature verification failed.",
    })
  }

  await consumeNonce(event, nonceRecord.nonce)
  await createVoucherSession(event, normalizedAddress)

  return {
    success: true,
  }
})

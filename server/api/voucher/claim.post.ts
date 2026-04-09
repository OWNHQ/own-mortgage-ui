import { createError, readBody } from "h3"
import { requireVoucherSessionForAddress } from "../../utils/voucher/auth"
import {
  ensureVoucherSchema,
  getEligibleWalletByAddress,
  isVoucherStorageConfigured,
  markVoucherAsClaimed,
} from "../../utils/voucher/db"
import { normalizeWalletAddress } from "../../utils/voucher/security"

export default defineEventHandler(async (event) => {
  await ensureVoucherSchema(event)

  if (!isVoucherStorageConfigured(event)) {
    throw createError({
      statusCode: 503,
      statusMessage: "ETHPrague voucher storage is not configured.",
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
  await requireVoucherSessionForAddress(event, normalizedAddress)

  const voucherRecord = await getEligibleWalletByAddress(event, normalizedAddress)
  if (!voucherRecord) {
    throw createError({
      statusCode: 403,
      statusMessage: "This wallet is not eligible for an ETHPrague voucher.",
    })
  }

  await markVoucherAsClaimed(event, normalizedAddress)

  const refreshedVoucherRecord = await getEligibleWalletByAddress(event, normalizedAddress)
  if (!refreshedVoucherRecord) {
    throw createError({
      statusCode: 500,
      statusMessage: "Voucher record disappeared during claim processing.",
    })
  }

  return {
    claimedAt: refreshedVoucherRecord.claimed_at ?? new Date().toISOString(),
    voucherCode: refreshedVoucherRecord.voucher_code,
  }
})

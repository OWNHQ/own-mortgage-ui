import { createError } from "h3"
import { requireVoucherSession } from "../../utils/voucher/auth"
import {
  ensureVoucherSchema,
  getEligibleWalletByAddress,
  isVoucherStorageConfigured,
  markVoucherAsClaimed,
} from "../../utils/voucher/db"

export default defineEventHandler(async (event) => {
  await ensureVoucherSchema(event)

  if (!isVoucherStorageConfigured(event)) {
    throw createError({
      statusCode: 503,
      statusMessage: "ETHPrague voucher storage is not configured.",
    })
  }

  const session = await requireVoucherSession(event)

  const voucherRecord = await getEligibleWalletByAddress(event, session.address)
  if (!voucherRecord) {
    throw createError({
      statusCode: 403,
      statusMessage: "This wallet is not eligible for an ETHPrague voucher.",
    })
  }

  await markVoucherAsClaimed(event, session.address)

  const refreshedVoucherRecord = await getEligibleWalletByAddress(event, session.address)
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

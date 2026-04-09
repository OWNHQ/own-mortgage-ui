import { createError, getQuery } from "h3"
import { getVoucherSessionForAddress } from "../../utils/voucher/auth"
import { ensureVoucherSchema, getEligibleWalletByAddress, isVoucherStorageConfigured } from "../../utils/voucher/db"
import { normalizeWalletAddress } from "../../utils/voucher/security"

export default defineEventHandler(async (event) => {
  await ensureVoucherSchema(event)

  if (!isVoucherStorageConfigured(event)) {
    return {
      configured: false,
      status: "unavailable",
    }
  }

  const query = getQuery(event)
  const addressParam = Array.isArray(query.address) ? query.address[0] : query.address

  if (!addressParam || typeof addressParam !== "string") {
    throw createError({
      statusCode: 400,
      statusMessage: "Wallet address is required.",
    })
  }

  const normalizedAddress = normalizeWalletAddress(addressParam)

  const session = await getVoucherSessionForAddress(event, normalizedAddress)
  if (!session) {
    return {
      configured: true,
      status: "unverified",
    }
  }

  const voucherRecord = await getEligibleWalletByAddress(event, normalizedAddress)
  if (!voucherRecord) {
    return {
      configured: true,
      status: "ineligible",
    }
  }

  return {
    claimedAt: voucherRecord.claimed_at ?? undefined,
    configured: true,
    status: voucherRecord.claimed_at ? "eligible-claimed" : "eligible-unclaimed",
  }
})

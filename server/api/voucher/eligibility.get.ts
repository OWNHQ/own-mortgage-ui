import { createError, getQuery } from "h3"
import { ensureVoucherSchema, getEligibleWalletByAddress, isVoucherStorageConfigured } from "../../utils/voucher/db"
import { normalizeWalletAddress, enforceVoucherRateLimit } from "../../utils/voucher/security"

export default defineEventHandler(async (event) => {
  await ensureVoucherSchema(event)

  if (!isVoucherStorageConfigured(event)) {
    return {
      configured: false,
      eligible: false,
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
  await enforceVoucherRateLimit(event, "eligibility", normalizedAddress)

  const voucherRecord = await getEligibleWalletByAddress(event, normalizedAddress)
  return {
    configured: true,
    eligible: Boolean(voucherRecord),
  }
})

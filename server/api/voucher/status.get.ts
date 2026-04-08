import { ensureVoucherSchema, getEligibleWalletByAddress, isVoucherStorageConfigured } from "../../utils/voucher/db"
import { getVoucherSession } from "../../utils/voucher/auth"

export default defineEventHandler(async (event) => {
  await ensureVoucherSchema(event)

  if (!isVoucherStorageConfigured(event)) {
    return {
      configured: false,
      status: "unavailable",
    }
  }

  const session = await getVoucherSession(event)
  if (!session) {
    return {
      configured: true,
      status: "unverified",
    }
  }

  const voucherRecord = await getEligibleWalletByAddress(event, session.address)
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

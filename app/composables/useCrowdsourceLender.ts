import type { Address } from 'viem'
import { LENDER_COMMITMENTS } from '~/constants/lenderSnapshot'
import { CREDIT_DECIMALS } from '~/constants/proposalConstants'
import { formatAmount } from '~/lib/format-decimals'

interface CrowdsourceLender {
  address: Address
  balance: bigint
  formattedBalance: string
}

const roundToNearestInteger = (balance: bigint): bigint => {
  const decimalUnit = 10n ** BigInt(CREDIT_DECIMALS)
  return ((balance + decimalUnit / 2n) / decimalUnit) * decimalUnit
}

export const loadCrowdsourceLenders = (): CrowdsourceLender[] => LENDER_COMMITMENTS
  .map(({ address, assets }) => {
    const balance = roundToNearestInteger(assets)
    return {
      address,
      balance,
      formattedBalance: formatAmount(balance),
    }
  })
  .filter(lender => lender.balance > 0n && lender.formattedBalance !== '0')
  .sort((a, b) => {
    if (a.balance > b.balance) return -1
    if (a.balance < b.balance) return 1
    return 0
  })

const snapshotLenders = loadCrowdsourceLenders()

export const useCrowdsourceLender = () => {
  const lenders = readonly(ref(snapshotLenders))

  return {
    lenders,
    totalLenders: computed(() => lenders.value.length),
    isLoading: readonly(ref(false)),
    error: readonly(ref<string | null>(null)),
  }
}

import type { Address } from 'viem'

export type LenderClaimToastAction = 'DONATE_LENDER_CLAIM' | 'WITHDRAW_LENDER'

export const createLenderClaimToastId = (
    action: LenderClaimToastAction,
    userAddress: Address,
    vaultAddress: Address,
    receiverAddress: Address,
    value: string,
    attemptId: string,
): string => `${action}_${userAddress}_${vaultAddress}_${receiverAddress}_${value}_${attemptId}`

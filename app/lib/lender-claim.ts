import type { Address } from 'viem'

export interface LenderClaimWithdrawal {
    assets: bigint
    blockNumber: bigint
    logIndex: number
    owner: Address
    shares: bigint
}

export interface LenderClaimRepayment {
    amount: bigint
    blockNumber: bigint
    logIndex: number
}

interface CalculateLenderClaimParams {
    currentLiquidAssets: bigint
    currentTotalShares: bigint
    currentUserShares: bigint
    onChainMaxWithdraw: bigint
    owner: Address
    repayments: LenderClaimRepayment[]
    withdrawals: LenderClaimWithdrawal[]
}

export interface LenderClaimCalculation {
    claimableAssets: bigint
    cumulativeEntitlement: bigint
    initialLiquidAssets: bigint
    initialTotalShares: bigint
    initialUserShares: bigint
    userWithdrawnAssets: bigint
}

export type LenderClaimExitMode = 'redeem' | 'redeem-defaulted' | 'withdraw'

export const RUNNING_LOAN_STATUS = 2

export const getLenderClaimExitMode = (loanStatus: number, totalCollateralAssets: bigint): LenderClaimExitMode => {
    if (loanStatus === RUNNING_LOAN_STATUS) return 'withdraw'
    return totalCollateralAssets > 0n ? 'redeem-defaulted' : 'redeem'
}

type ClaimEvent =
    | ({ type: 'repayment' } & LenderClaimRepayment)
    | ({ type: 'withdrawal' } & LenderClaimWithdrawal)

const min = (...values: bigint[]) => values.reduce((smallest, value) => value < smallest ? value : smallest)

/**
 * Calculates a lender's cumulative repayment entitlement.
 *
 * This intentionally assumes vault shares are not transferred between wallets after the loan starts.
 * Any liquid credit already in the vault at activation, including dust or direct transfers, is shared
 * pro rata alongside repayments so no distributable vault liquidity is stranded by the frontend.
 * Withdrawals burn shares, so every repayment is allocated using the share balances that existed when
 * that repayment arrived. Previous withdrawals are deducted from the resulting cumulative entitlement.
 */
export function calculateLenderClaim({
    currentLiquidAssets,
    currentTotalShares,
    currentUserShares,
    onChainMaxWithdraw,
    owner,
    repayments,
    withdrawals,
}: CalculateLenderClaimParams): LenderClaimCalculation {
    const normalizedOwner = owner.toLowerCase()

    const totalWithdrawnAssets = withdrawals.reduce((sum, withdrawal) => sum + withdrawal.assets, 0n)
    const totalWithdrawnShares = withdrawals.reduce((sum, withdrawal) => sum + withdrawal.shares, 0n)
    const totalRepaidAssets = repayments.reduce((sum, repayment) => sum + repayment.amount, 0n)
    const userWithdrawals = withdrawals.filter(withdrawal => withdrawal.owner.toLowerCase() === normalizedOwner)
    const userWithdrawnAssets = userWithdrawals.reduce((sum, withdrawal) => sum + withdrawal.assets, 0n)
    const userWithdrawnShares = userWithdrawals.reduce((sum, withdrawal) => sum + withdrawal.shares, 0n)

    const initialTotalShares = currentTotalShares + totalWithdrawnShares
    const initialUserShares = currentUserShares + userWithdrawnShares
    const cumulativeLiquidAssets = currentLiquidAssets + totalWithdrawnAssets
    const initialLiquidAssets = cumulativeLiquidAssets > totalRepaidAssets
        ? cumulativeLiquidAssets - totalRepaidAssets
        : 0n

    let totalShares = initialTotalShares
    let userShares = initialUserShares
    let cumulativeEntitlement = totalShares > 0n
        ? initialLiquidAssets * userShares / totalShares
        : 0n

    const events: ClaimEvent[] = [
        ...repayments.map(repayment => ({ ...repayment, type: 'repayment' as const })),
        ...withdrawals.map(withdrawal => ({ ...withdrawal, type: 'withdrawal' as const })),
    ].sort((a, b) => {
        if (a.blockNumber < b.blockNumber) return -1
        if (a.blockNumber > b.blockNumber) return 1
        return a.logIndex - b.logIndex
    })

    for (const event of events) {
        if (event.type === 'repayment') {
            if (totalShares > 0n) {
                cumulativeEntitlement += event.amount * userShares / totalShares
            }
            continue
        }

        totalShares = event.shares > totalShares ? 0n : totalShares - event.shares
        if (event.owner.toLowerCase() === normalizedOwner) {
            userShares = event.shares > userShares ? 0n : userShares - event.shares
        }
    }

    const remainingEntitlement = cumulativeEntitlement > userWithdrawnAssets
        ? cumulativeEntitlement - userWithdrawnAssets
        : 0n

    return {
        claimableAssets: min(remainingEntitlement, onChainMaxWithdraw, currentLiquidAssets),
        cumulativeEntitlement,
        initialLiquidAssets,
        initialTotalShares,
        initialUserShares,
        userWithdrawnAssets,
    }
}

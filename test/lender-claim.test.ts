import { describe, expect, test } from 'bun:test'
import type { Address } from 'viem'
import { calculateLenderClaim, getLenderClaimExitMode } from '../app/lib/lender-claim'

const OWNER = '0x1111111111111111111111111111111111111111' as Address
const OTHER = '0x2222222222222222222222222222222222222222' as Address

describe('calculateLenderClaim', () => {
    test('allocates repayments using shares at each event and deducts prior claims or donations', () => {
        const result = calculateLenderClaim({
            currentLiquidAssets: 220n,
            currentTotalShares: 350n,
            currentUserShares: 75n,
            onChainMaxWithdraw: 1_000n,
            owner: OWNER,
            repayments: [
                { amount: 200n, blockNumber: 10n, logIndex: 1 },
                { amount: 150n, blockNumber: 20n, logIndex: 1 },
            ],
            withdrawals: [
                { assets: 50n, blockNumber: 15n, logIndex: 1, owner: OWNER, shares: 25n },
                { assets: 80n, blockNumber: 18n, logIndex: 1, owner: OTHER, shares: 75n },
            ],
        })

        expect(result.initialUserShares).toBe(100n)
        expect(result.cumulativeEntitlement).toBe(76n)
        expect(result.userWithdrawnAssets).toBe(50n)
        expect(result.claimableAssets).toBe(26n)
    })

    test('shares unexplained initial vault liquidity pro rata', () => {
        const result = calculateLenderClaim({
            currentLiquidAssets: 120n,
            currentTotalShares: 100n,
            currentUserShares: 25n,
            onChainMaxWithdraw: 1_000n,
            owner: OWNER,
            repayments: [{ amount: 100n, blockNumber: 10n, logIndex: 1 }],
            withdrawals: [],
        })

        expect(result.initialLiquidAssets).toBe(20n)
        expect(result.cumulativeEntitlement).toBe(30n)
        expect(result.claimableAssets).toBe(30n)
    })

    test('caps the result by both current liquidity and the contract exit capacity', () => {
        const result = calculateLenderClaim({
            currentLiquidAssets: 30n,
            currentTotalShares: 100n,
            currentUserShares: 50n,
            onChainMaxWithdraw: 20n,
            owner: OWNER,
            repayments: [{ amount: 100n, blockNumber: 10n, logIndex: 1 }],
            withdrawals: [],
        })

        expect(result.claimableAssets).toBe(20n)
    })
})

describe('getLenderClaimExitMode', () => {
    test('uses withdraw only while the loan is running', () => {
        expect(getLenderClaimExitMode(2, 0n)).toBe('withdraw')
    })

    test('uses adjustable redeem for an ended credit-only position', () => {
        expect(getLenderClaimExitMode(0, 0n)).toBe('redeem')
        expect(getLenderClaimExitMode(3, 0n)).toBe('redeem')
    })

    test('uses wallet-only terminal redemption whenever collateral is bundled', () => {
        expect(getLenderClaimExitMode(4, 1n)).toBe('redeem-defaulted')
        expect(getLenderClaimExitMode(0, 1n)).toBe('redeem-defaulted')
    })
})

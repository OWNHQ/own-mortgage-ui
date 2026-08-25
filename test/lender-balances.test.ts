import { describe, expect, test } from 'bun:test'
import { zeroAddress } from 'viem'
import { calculateLenderBalancesFromTransfers } from '../app/lib/lender-balances'

const LENDER = '0x1111111111111111111111111111111111111111'

describe('calculateLenderBalancesFromTransfers', () => {
    test('keeps the commitment fixed when shares are burned after the snapshot', () => {
        const balances = calculateLenderBalancesFromTransfers([
            { blockNumber: 10n, fromAddress: zeroAddress, toAddress: LENDER, value: 100n },
            { blockNumber: 15n, fromAddress: LENDER, toAddress: zeroAddress, value: 25n },
            { blockNumber: 30n, fromAddress: LENDER, toAddress: zeroAddress, value: 10n },
        ], { snapshotBlock: 20n })

        expect(balances[LENDER]).toBe(75n)
    })

    test('keeps a lender listed after all shares are burned after the snapshot', () => {
        const balances = calculateLenderBalancesFromTransfers([
            { blockNumber: 10n, fromAddress: zeroAddress, toAddress: LENDER, value: 100n },
            { blockNumber: 30n, fromAddress: LENDER, toAddress: zeroAddress, value: 100n },
        ], { snapshotBlock: 20n })

        expect(balances[LENDER]).toBe(100n)
    })
})

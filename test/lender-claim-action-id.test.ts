import { describe, expect, test } from 'bun:test'
import type { Address } from 'viem'
import { createLenderClaimToastId } from '../app/lib/lender-claim-action-id'

const USER = '0x1111111111111111111111111111111111111111' as Address
const VAULT = '0x2222222222222222222222222222222222222222' as Address
const RECEIVER = '0x3333333333333333333333333333333333333333' as Address

describe('createLenderClaimToastId', () => {
    test('gives repeated identical transactions distinct attempt IDs', () => {
        const first = createLenderClaimToastId('WITHDRAW_LENDER', USER, VAULT, RECEIVER, '100', 'attempt-1')
        const second = createLenderClaimToastId('WITHDRAW_LENDER', USER, VAULT, RECEIVER, '100', 'attempt-2')

        expect(first).not.toBe(second)
    })

    test('includes the destination and transaction value', () => {
        const id = createLenderClaimToastId('DONATE_LENDER_CLAIM', USER, VAULT, RECEIVER, '250', 'attempt-1')

        expect(id).toContain(RECEIVER)
        expect(id).toContain('_250_')
    })
})

import { describe, expect, test } from 'bun:test'
import { getAddress, keccak256, stringToHex } from 'viem'
import {
  LENDER_COMMITMENTS,
  LENDER_COMMITMENT_SNAPSHOT,
} from '../app/constants/lenderSnapshot'
import { PWN_CROWDSOURCE_LENDER_VAULT_ADDRESS } from '../app/constants/addresses'
import { LOAN_CREATED_BLOCK } from '../app/constants/loan'

describe('lender commitment snapshot', () => {
    test('matches its verified count, total, block, and digest', () => {
        const totalAssets = LENDER_COMMITMENTS.reduce((sum, lender) => sum + lender.assets, 0n)
        const digestInput = LENDER_COMMITMENTS
            .map(({ address, assets }) => `${address}:${assets}`)
            .join('|')

        expect(LENDER_COMMITMENTS).toHaveLength(LENDER_COMMITMENT_SNAPSHOT.lenderCount)
        expect(totalAssets).toBe(LENDER_COMMITMENT_SNAPSHOT.totalAssets)
        expect(LENDER_COMMITMENT_SNAPSHOT.blockNumber).toBe(LOAN_CREATED_BLOCK)
        expect(LENDER_COMMITMENT_SNAPSHOT.vaultAddress).toBe(PWN_CROWDSOURCE_LENDER_VAULT_ADDRESS)
        expect(keccak256(stringToHex(digestInput))).toBe(LENDER_COMMITMENT_SNAPSHOT.digest)
    })

    test('contains unique checksummed addresses sorted by assets', () => {
        const addresses = LENDER_COMMITMENTS.map(lender => lender.address)

        expect(new Set(addresses).size).toBe(addresses.length)
        expect(addresses.every(address => getAddress(address) === address)).toBe(true)
        expect(LENDER_COMMITMENTS.every((lender, index) => (
            index === 0 || LENDER_COMMITMENTS[index - 1]!.assets >= lender.assets
        ))).toBe(true)
    })
})

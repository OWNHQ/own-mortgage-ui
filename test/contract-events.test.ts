import { describe, expect, test } from 'bun:test'
import { getContractEventsInBlockRange } from '../app/lib/contract-events'

describe('getContractEventsInBlockRange', () => {
    test('returns a successful range without splitting', async () => {
        const calls: Array<[bigint, bigint]> = []
        const events = await getContractEventsInBlockRange({
            fromBlock: 10n,
            toBlock: 20n,
            query: async (fromBlock, toBlock) => {
                calls.push([fromBlock, toBlock])
                return ['event']
            },
        })

        expect(events).toEqual(['event'])
        expect(calls).toEqual([[10n, 20n]])
    })

    test('recursively bisects provider-limited ranges without gaps or duplicates', async () => {
        const calls: Array<[bigint, bigint]> = []
        const events = await getContractEventsInBlockRange({
            fromBlock: 1n,
            toBlock: 8n,
            query: async (fromBlock, toBlock) => {
                calls.push([fromBlock, toBlock])
                if (toBlock - fromBlock >= 2n) {
                    throw new Error('block range is too wide')
                }
                return Array.from(
                    { length: Number(toBlock - fromBlock + 1n) },
                    (_, index) => fromBlock + BigInt(index),
                )
            },
        })

        expect(events).toEqual([1n, 2n, 3n, 4n, 5n, 6n, 7n, 8n])
        expect(calls[0]).toEqual([1n, 8n])
    })

    test('recognizes a nested response-size error', async () => {
        const events = await getContractEventsInBlockRange({
            fromBlock: 1n,
            toBlock: 2n,
            query: async (fromBlock, toBlock) => {
                if (fromBlock !== toBlock) {
                    throw new Error('request failed', { cause: new Error('response size exceeded the defined limit') })
                }
                return [fromBlock]
            },
        })

        expect(events).toEqual([1n, 2n])
    })

    test('rethrows unrelated and unsplittable errors', async () => {
        const unrelatedError = new Error('network offline')
        await expect(getContractEventsInBlockRange({
            fromBlock: 1n,
            toBlock: 10n,
            query: async () => { throw unrelatedError },
        })).rejects.toBe(unrelatedError)

        const singleBlockError = new Error('query returned more than the provider limit')
        await expect(getContractEventsInBlockRange({
            fromBlock: 7n,
            toBlock: 7n,
            query: async () => { throw singleBlockError },
        })).rejects.toBe(singleBlockError)
    })
})

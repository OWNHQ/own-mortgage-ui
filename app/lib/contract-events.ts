const BLOCK_RANGE_ERROR_PATTERN = /block range|range is too (?:large|wide)|exceed(?:s|ed)? (?:the )?(?:maximum )?(?:block )?range|query returned more than|too many results|response size|(?:exceed(?:s|ed)?|reached) (?:the )?(?:defined )?limit|limit exceeded|-32005/i

const getErrorText = (error: unknown): string => {
    const messages: string[] = []
    let current = error

    for (let depth = 0; depth < 5 && current; depth++) {
        if (current instanceof Error) {
            messages.push(current.message)
        } else if (typeof current === 'string') {
            messages.push(current)
            break
        }

        if (typeof current !== 'object' || !('cause' in current)) break
        current = current.cause
    }

    return messages.join(' ')
}

const isBlockRangeError = (error: unknown): boolean => {
    return BLOCK_RANGE_ERROR_PATTERN.test(getErrorText(error))
}

interface ContractEventsInBlockRangeParams<TEvent> {
    fromBlock: bigint
    query: (fromBlock: bigint, toBlock: bigint) => Promise<readonly TEvent[]>
    toBlock: bigint
}

/**
 * Runs an event query and adaptively bisects ranges rejected by the RPC provider.
 * Earlier ranges are resolved first so the returned events preserve block order.
 */
export const getContractEventsInBlockRange = async <TEvent>({
    fromBlock,
    query,
    toBlock,
}: ContractEventsInBlockRangeParams<TEvent>): Promise<TEvent[]> => {
    if (toBlock < fromBlock) return []

    try {
        return [...await query(fromBlock, toBlock)]
    } catch (error) {
        if (!isBlockRangeError(error) || fromBlock >= toBlock) {
            throw error
        }

        const midpoint = fromBlock + ((toBlock - fromBlock) / 2n)
        const earlierEvents = await getContractEventsInBlockRange({
            fromBlock,
            query,
            toBlock: midpoint,
        })
        const laterEvents = await getContractEventsInBlockRange({
            fromBlock: midpoint + 1n,
            query,
            toBlock,
        })

        return [...earlierEvents, ...laterEvents]
    }
}

import type { PublicClient } from 'viem'
import PWN_LOAN_ABI from '~/assets/abis/v1.5/PWNLoan'
import { PWN_LOAN_ADDRESS } from '~/constants/addresses'

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

const getLoanRepaymentsForBlockRange = async (
    client: PublicClient,
    loanId: bigint,
    fromBlock: bigint,
    toBlock: bigint,
): Promise<bigint> => {
    try {
        const logs = await client.getContractEvents({
            abi: PWN_LOAN_ABI,
            address: PWN_LOAN_ADDRESS,
            eventName: 'LOANRepaid',
            args: { loanId },
            fromBlock,
            toBlock,
            strict: true,
        })

        return logs.reduce(
            (total, log) => total + (log.args.repaymentAmount ?? 0n),
            0n,
        )
    } catch (error) {
        if (
            !isBlockRangeError(error)
            || fromBlock >= toBlock
        ) {
            throw error
        }

        const midpoint = fromBlock + ((toBlock - fromBlock) / 2n)
        const earlierRepayments = await getLoanRepaymentsForBlockRange(
            client,
            loanId,
            fromBlock,
            midpoint,
        )
        const laterRepayments = await getLoanRepaymentsForBlockRange(
            client,
            loanId,
            midpoint + 1n,
            toBlock,
        )

        return earlierRepayments + laterRepayments
    }
}

export const getTotalLoanRepayments = async (
    client: PublicClient,
    loanId: bigint,
    fromBlock: bigint,
): Promise<bigint> => {
    const toBlock = await client.getBlockNumber()
    if (toBlock < fromBlock) return 0n

    return await getLoanRepaymentsForBlockRange(client, loanId, fromBlock, toBlock)
}

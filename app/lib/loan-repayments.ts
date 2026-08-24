import type { PublicClient } from 'viem'
import PWN_LOAN_ABI from '~/assets/abis/v1.5/PWNLoan'
import { PWN_LOAN_ADDRESS } from '~/constants/addresses'
import { getContractEventsInBlockRange } from '~/lib/contract-events'

const getLoanRepaymentsForBlockRange = async (client: PublicClient, loanId: bigint, fromBlock: bigint, toBlock: bigint): Promise<bigint> => {
    const logs = await getContractEventsInBlockRange({
        fromBlock,
        toBlock,
        query: (queryFromBlock, queryToBlock) => client.getContractEvents({
            abi: PWN_LOAN_ABI,
            address: PWN_LOAN_ADDRESS,
            eventName: 'LOANRepaid',
            args: { loanId },
            fromBlock: queryFromBlock,
            toBlock: queryToBlock,
            strict: true,
        }),
    })

    return logs.reduce(
        (total, log) => total + (log.args.repaymentAmount ?? 0n),
        0n,
    )
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

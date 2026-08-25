import { getAddress, zeroAddress, type Address } from 'viem'

export interface LenderBalanceTransfer {
    blockNumber: bigint
    fromAddress: string
    toAddress: string
    value: bigint
}

interface CalculateLenderBalancesOptions {
    snapshotBlock?: bigint
}

export function calculateLenderBalancesFromTransfers(
    transfers: LenderBalanceTransfer[],
    options: CalculateLenderBalancesOptions = {},
): Record<Address, bigint> {
    const balances: Partial<Record<Address, bigint>> = {}

    for (const transfer of transfers) {
        if (options.snapshotBlock !== undefined && transfer.blockNumber > options.snapshotBlock) {
            continue
        }

        const fromAddress = getAddress(transfer.fromAddress)
        const toAddress = getAddress(transfer.toAddress)

        if (fromAddress === zeroAddress) {
            balances[toAddress] = (balances[toAddress] ?? 0n) + transfer.value
        } else if (toAddress === zeroAddress) {
            balances[fromAddress] = (balances[fromAddress] ?? 0n) - transfer.value
        } else {
            balances[fromAddress] = (balances[fromAddress] ?? 0n) - transfer.value
            balances[toAddress] = (balances[toAddress] ?? 0n) + transfer.value
        }
    }

    return Object.fromEntries(
        Object.entries(balances).filter(([, balance]) => balance > 0n),
    ) as Record<Address, bigint>
}

import {
    createPublicClient,
    erc20Abi,
    getAddress,
    http,
    keccak256,
    parseAbi,
    stringToHex,
    zeroAddress,
    type Address,
} from 'viem'
import { mainnet } from 'viem/chains'
import { PWN_CROWDSOURCE_LENDER_VAULT_ADDRESS } from '../app/constants/addresses'
import { LOAN_CREATED_BLOCK } from '../app/constants/loan'
import { calculateLenderBalancesFromTransfers } from '../app/lib/lender-balances'

const SNAPSHOT_BLOCK = LOAN_CREATED_BLOCK
const vaultConversionAbi = parseAbi(['function convertToAssets(uint256 shares) view returns (uint256 assets)'])

if (process.argv.includes('--check-rpcs')) {
    const candidates = [
        'https://eth.llamarpc.com',
        'https://rpc.flashbots.net',
        'https://eth.drpc.org',
        'https://1rpc.io/eth',
        'https://eth-mainnet.public.blastapi.io',
        'https://eth.merkle.io',
    ]
    const checks = await Promise.all(candidates.map(async (url) => {
        const startedAt = performance.now()
        try {
            const response = await fetch(url, {
                body: JSON.stringify({
                    id: 1,
                    jsonrpc: '2.0',
                    method: 'eth_getCode',
                    params: [PWN_CROWDSOURCE_LENDER_VAULT_ADDRESS, `0x${SNAPSHOT_BLOCK.toString(16)}`],
                }),
                headers: { 'content-type': 'application/json' },
                method: 'POST',
                signal: AbortSignal.timeout(15_000),
            })
            const body = await response.json() as { error?: { message?: string }, result?: string }
            return `${url}: ${response.ok && !body.error ? 'ok' : body.error?.message ?? response.status} (${Math.round(performance.now() - startedAt)}ms)`
        } catch (error) {
            return `${url}: ${error instanceof Error ? error.message : 'failed'} (${Math.round(performance.now() - startedAt)}ms)`
        }
    }))
    console.log(checks.join('\n'))
    process.exit(0)
}

const rpcArgument = process.argv.find(argument => argument.startsWith('--rpc='))
const rpcUrl = rpcArgument?.slice('--rpc='.length) ?? process.env.ETH_RPC_URL ?? 'https://eth.drpc.org'
const client = createPublicClient({
    chain: mainnet,
    transport: http(rpcUrl, { retryCount: 1, timeout: 20_000 }),
})

interface VaultSnapshot {
    assetsByAddress: Map<Address, bigint>
    totalAssets: bigint
    totalShares: bigint
}

interface RoutescanTransfer {
    amount: string
    blockNumber: number
    from: string
    to: string
}

interface RoutescanTransferResponse {
    items: RoutescanTransfer[]
    link: { next?: string }
}

async function getTransferLogs(address: Address): Promise<RoutescanTransfer[]> {
    let nextUrl: string | undefined = `https://api.routescan.io/v2/network/mainnet/evm/1/erc20-transfers?tokenAddress=${address}&sort=asc&limit=100`
    const transfers: RoutescanTransfer[] = []

    while (nextUrl) {
        const response = await fetch(nextUrl)
        if (!response.ok) {
            throw new Error(`Routescan request failed for ${address}: ${response.status}`)
        }
        const data = await response.json() as RoutescanTransferResponse
        transfers.push(...data.items)
        nextUrl = data.link.next
    }

    return transfers
}

async function createVaultSnapshot(vaultAddress: Address): Promise<VaultSnapshot> {
    const logs = await getTransferLogs(vaultAddress)
    const candidates = new Set<Address>()

    const transfers = logs.map((log) => {
        const fromAddress = getAddress(log.from)
        const toAddress = getAddress(log.to)
        if (fromAddress !== zeroAddress) candidates.add(fromAddress)
        if (toAddress !== zeroAddress) candidates.add(toAddress)

        return {
            blockNumber: BigInt(log.blockNumber),
            fromAddress,
            toAddress,
            value: BigInt(log.amount),
        }
    })
    const reconstructedShares = calculateLenderBalancesFromTransfers(transfers, {
        snapshotBlock: SNAPSHOT_BLOCK,
    })
    const candidateAddresses = [...candidates]
    const historicalBalances = await client.multicall({
        allowFailure: false,
        blockNumber: SNAPSHOT_BLOCK,
        contracts: candidateAddresses.map(address => ({
            abi: erc20Abi,
            address: vaultAddress,
            functionName: 'balanceOf' as const,
            args: [address] as const,
        })),
    })

    for (let index = 0; index < candidateAddresses.length; index++) {
        const address = candidateAddresses[index]
        const historicalBalance = historicalBalances[index]
        if (address === undefined || historicalBalance === undefined) continue
        const reconstructedBalance = reconstructedShares[address] ?? 0n
        if (historicalBalance !== reconstructedBalance) {
            throw new Error(
                `Transfer reconstruction mismatch for ${vaultAddress}/${address}: ${reconstructedBalance} != ${historicalBalance}`,
            )
        }
    }

    const totalShares = await client.readContract({
        abi: erc20Abi,
        address: vaultAddress,
        functionName: 'totalSupply',
        blockNumber: SNAPSHOT_BLOCK,
    })
    const reconstructedTotalShares = Object.values(reconstructedShares).reduce((sum, shares) => sum + shares, 0n)
    if (totalShares !== reconstructedTotalShares) {
        throw new Error(
            `Total supply mismatch for ${vaultAddress}: ${reconstructedTotalShares} != ${totalShares}`,
        )
    }

    const shareEntries = Object.entries(reconstructedShares) as [Address, bigint][]
    const convertedAssets = await client.multicall({
        allowFailure: false,
        blockNumber: SNAPSHOT_BLOCK,
        contracts: shareEntries.map(([, shares]) => ({
            abi: vaultConversionAbi,
            address: vaultAddress,
            functionName: 'convertToAssets' as const,
            args: [shares] as const,
        })),
    })
    const assetsByAddress = new Map<Address, bigint>()
    for (let index = 0; index < shareEntries.length; index++) {
        const entry = shareEntries[index]
        const assets = convertedAssets[index]
        if (entry !== undefined && assets !== undefined) {
            assetsByAddress.set(entry[0], assets)
        }
    }

    return {
        assetsByAddress,
        totalAssets: convertedAssets.reduce((sum, assets) => sum + assets, 0n),
        totalShares,
    }
}

const snapshotBlock = await client.getBlock({ blockNumber: SNAPSHOT_BLOCK })
const vaultSnapshot = await createVaultSnapshot(PWN_CROWDSOURCE_LENDER_VAULT_ADDRESS)
const lenders = [...vaultSnapshot.assetsByAddress.entries()].sort((a, b) => {
    if (a[1] > b[1]) return -1
    if (a[1] < b[1]) return 1
    return a[0].localeCompare(b[0])
})

console.log(`Snapshot block: ${SNAPSHOT_BLOCK}`)
console.log(`Snapshot block hash: ${snapshotBlock.hash}`)
console.log(
    `Vault ${PWN_CROWDSOURCE_LENDER_VAULT_ADDRESS}: shares=${vaultSnapshot.totalShares} assets=${vaultSnapshot.totalAssets}`,
)
console.log(`Lenders: ${lenders.length}`)
console.log(`Assets: ${lenders.reduce((sum, [, assets]) => sum + assets, 0n)}`)
console.log(`Snapshot digest: ${keccak256(stringToHex(lenders.map(([address, assets]) => `${address}:${assets}`).join('|')))}`)
console.log('')
console.log('export const LENDER_COMMITMENTS = [')
for (const [address, assets] of lenders) {
    console.log(`    { address: '${address}', assets: ${assets}n },`)
}
console.log('] as const')

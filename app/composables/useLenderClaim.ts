import { useQuery } from '@tanstack/vue-query'
import { getBlockNumber, getPublicClient, readContracts } from '@wagmi/core/actions'
import { erc20Abi, type Address } from 'viem'
import PWN_CROWDSOURCE_LENDER_VAULT_ABI from '~/assets/abis/v1.5/PWNCrowdsourceLenderVault'
import PWN_LOAN_ABI from '~/assets/abis/v1.5/PWNLoan'
import { wagmiConfig } from '~/config/appkit'
import { PROPOSAL_CHAIN_ID } from '~/constants/proposalConstants'
import { getContractEventsInBlockRange } from '~/lib/contract-events'
import {
    calculateLenderClaim,
    getLenderClaimExitMode,
    type LenderClaimExitMode,
    type LenderClaimRepayment,
    type LenderClaimWithdrawal,
} from '~/lib/lender-claim'

export interface LenderClaimData {
    claimableAssets: bigint
    cumulativeEntitlement: bigint
    exitMode: LenderClaimExitMode
    initialUserShares: bigint
    isLoanActive: boolean
    loanStatus: number | null
    totalCollateralAssets: bigint
    userShares: bigint
    userWithdrawnAssets: bigint
}

export function useLenderClaim(
    vaultAddress: Address,
    owner: Ref<Address | undefined>,
    loanStartBlock?: bigint,
) {
    return useQuery({
        queryKey: computed(() => [
            'lenderClaim',
            PROPOSAL_CHAIN_ID,
            vaultAddress,
            owner.value?.toLowerCase(),
            loanStartBlock?.toString(),
        ]),
        enabled: computed(() => !!owner.value),
        refetchInterval: 60_000,
        staleTime: 30_000,
        queryFn: async (): Promise<LenderClaimData> => {
            if (!owner.value) {
                throw new Error('Wallet address is required to calculate a lender claim.')
            }

            const publicClient = getPublicClient(wagmiConfig, { chainId: PROPOSAL_CHAIN_ID })
            if (!publicClient) {
                throw new Error('Public client is not available.')
            }

            const currentBlock = await getBlockNumber(wagmiConfig, { chainId: PROPOSAL_CHAIN_ID })
            const [loanId, loanContract, creditAddress, currentUserShares, currentTotalShares, onChainMaxWithdraw, totalCollateralAssets] = await readContracts(wagmiConfig, {
                allowFailure: false,
                blockNumber: currentBlock,
                contracts: [
                    {
                        abi: PWN_CROWDSOURCE_LENDER_VAULT_ABI,
                        address: vaultAddress,
                        functionName: 'loanId',
                        chainId: PROPOSAL_CHAIN_ID,
                    },
                    {
                        abi: PWN_CROWDSOURCE_LENDER_VAULT_ABI,
                        address: vaultAddress,
                        functionName: 'loanContract',
                        chainId: PROPOSAL_CHAIN_ID,
                    },
                    {
                        abi: PWN_CROWDSOURCE_LENDER_VAULT_ABI,
                        address: vaultAddress,
                        functionName: 'asset',
                        chainId: PROPOSAL_CHAIN_ID,
                    },
                    {
                        abi: PWN_CROWDSOURCE_LENDER_VAULT_ABI,
                        address: vaultAddress,
                        functionName: 'balanceOf',
                        args: [owner.value],
                        chainId: PROPOSAL_CHAIN_ID,
                    },
                    {
                        abi: PWN_CROWDSOURCE_LENDER_VAULT_ABI,
                        address: vaultAddress,
                        functionName: 'totalSupply',
                        chainId: PROPOSAL_CHAIN_ID,
                    },
                    {
                        abi: PWN_CROWDSOURCE_LENDER_VAULT_ABI,
                        address: vaultAddress,
                        functionName: 'maxWithdraw',
                        args: [owner.value],
                        chainId: PROPOSAL_CHAIN_ID,
                    },
                    {
                        abi: PWN_CROWDSOURCE_LENDER_VAULT_ABI,
                        address: vaultAddress,
                        functionName: 'totalCollateralAssets',
                        chainId: PROPOSAL_CHAIN_ID,
                    },
                ],
            })

            if (loanId === 0n) {
                return {
                    claimableAssets: onChainMaxWithdraw,
                    cumulativeEntitlement: onChainMaxWithdraw,
                    exitMode: 'withdraw',
                    initialUserShares: currentUserShares,
                    isLoanActive: false,
                    loanStatus: null,
                    totalCollateralAssets,
                    userShares: currentUserShares,
                    userWithdrawnAssets: 0n,
                }
            }
            if (loanStartBlock === undefined) {
                throw new Error(`Loan start block is not configured for vault ${vaultAddress}.`)
            }

            const loanStatus = await publicClient.readContract({
                abi: PWN_LOAN_ABI,
                address: loanContract,
                functionName: 'getLOANStatus',
                args: [loanId],
                blockNumber: currentBlock,
            })
            const exitMode = getLenderClaimExitMode(loanStatus, totalCollateralAssets)
            const onChainAssetLimit = exitMode === 'withdraw'
                ? onChainMaxWithdraw
                : await publicClient.readContract({
                    abi: PWN_CROWDSOURCE_LENDER_VAULT_ABI,
                    address: vaultAddress,
                    functionName: 'convertToAssets',
                    args: [currentUserShares],
                    blockNumber: currentBlock,
                })

            const [currentLiquidAssets, withdrawalLogs, repaymentLogs] = await Promise.all([
                publicClient.readContract({
                    abi: erc20Abi,
                    address: creditAddress,
                    functionName: 'balanceOf',
                    args: [vaultAddress],
                    blockNumber: currentBlock,
                }),
                getContractEventsInBlockRange({
                    fromBlock: loanStartBlock,
                    toBlock: currentBlock,
                    query: (fromBlock, toBlock) => publicClient.getContractEvents({
                        abi: PWN_CROWDSOURCE_LENDER_VAULT_ABI,
                        address: vaultAddress,
                        eventName: 'Withdraw',
                        fromBlock,
                        toBlock,
                        strict: true,
                    }),
                }),
                getContractEventsInBlockRange({
                    fromBlock: loanStartBlock,
                    toBlock: currentBlock,
                    query: (fromBlock, toBlock) => publicClient.getContractEvents({
                        abi: PWN_LOAN_ABI,
                        address: loanContract,
                        eventName: 'LOANRepaid',
                        args: { loanId },
                        fromBlock,
                        toBlock,
                        strict: true,
                    }),
                }),
            ])

            const withdrawals = withdrawalLogs.flatMap<LenderClaimWithdrawal>((log) => {
                const { assets, owner: withdrawalOwner, shares } = log.args
                if (
                    assets === undefined
                    || withdrawalOwner === undefined
                    || shares === undefined
                    || log.blockNumber === null
                    || log.logIndex === null
                ) {
                    return []
                }
                return [{
                    assets,
                    blockNumber: log.blockNumber,
                    logIndex: log.logIndex,
                    owner: withdrawalOwner,
                    shares,
                }]
            })
            const repayments = repaymentLogs.flatMap<LenderClaimRepayment>((log) => {
                const { repaymentAmount } = log.args
                if (repaymentAmount === undefined || log.blockNumber === null || log.logIndex === null) {
                    return []
                }
                return [{
                    amount: repaymentAmount,
                    blockNumber: log.blockNumber,
                    logIndex: log.logIndex,
                }]
            })

            const calculation = calculateLenderClaim({
                currentLiquidAssets,
                currentTotalShares,
                currentUserShares,
                onChainMaxWithdraw: onChainAssetLimit,
                owner: owner.value,
                repayments,
                withdrawals,
            })

            return {
                claimableAssets: calculation.claimableAssets,
                cumulativeEntitlement: calculation.cumulativeEntitlement,
                exitMode,
                initialUserShares: calculation.initialUserShares,
                isLoanActive: true,
                loanStatus,
                totalCollateralAssets,
                userShares: currentUserShares,
                userWithdrawnAssets: calculation.userWithdrawnAssets,
            }
        },
    })
}

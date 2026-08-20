import { useReadContract, useAccount } from '@wagmi/vue'
import { CREDIT_DECIMALS, PROPOSAL_CHAIN_ID } from '~/constants/proposalConstants'
import { formatUnits, type Address } from 'viem'
import { PWN_CROWDSOURCE_LENDER_VAULT_ADDRESS, OLD_PWN_CROWDSOURCE_LENDER_VAULT_ADDRESS } from '~/constants/addresses'
import PWN_CROWDSOURCE_LENDER_VAULT_ABI from '~/assets/abis/v1.5/PWNCrowdsourceLenderVault'
import { formatDecimalPoint } from '~/lib/format-decimals'
import { computedAsync } from '@vueuse/core'
import { wagmiConfig } from '~/config/appkit'
import { readContract } from '@wagmi/core/actions'

export const useUserDepositStore = defineStore('userDeposit', () => {
    const { address: userAddress } = useAccount()

    // Fetch shares from old vault
    const oldVaultUserSharesQuery = useReadContract({
        abi: PWN_CROWDSOURCE_LENDER_VAULT_ABI,
        // @ts-expect-error not sure why this throws TS error, but it works
        address: OLD_PWN_CROWDSOURCE_LENDER_VAULT_ADDRESS,
        functionName: 'balanceOf',
        args: [userAddress as Ref<Address>],
        chainId: PROPOSAL_CHAIN_ID,
        enabled: computed(() => !!userAddress.value),
    })
    const oldVaultUserShares = computed<bigint>(() => oldVaultUserSharesQuery.data?.value ?? 0n)

    // Fetch shares from new vault
    const newVaultUserSharesQuery = useReadContract({
        abi: PWN_CROWDSOURCE_LENDER_VAULT_ABI,
        // @ts-expect-error not sure why this throws TS error, but it works
        address: PWN_CROWDSOURCE_LENDER_VAULT_ADDRESS,
        functionName: 'balanceOf',
        args: [userAddress as Ref<Address>],
        chainId: PROPOSAL_CHAIN_ID,
        enabled: computed(() => !!userAddress.value),
    })
    const newVaultUserShares = computed<bigint>(() => newVaultUserSharesQuery.data?.value ?? 0n)

    const refetchUserShares = async () => {
        await Promise.allSettled([
            oldVaultUserSharesQuery.refetch(),
            newVaultUserSharesQuery.refetch()
        ])
    }

    // Sum of shares from both vaults (for backward compatibility)
    const userShares = computed<bigint>(() => oldVaultUserShares.value + newVaultUserShares.value)
    const convertedUserShares = ref<bigint>(0n)
    const isUserDepositEvaluating = ref(false)

    const isFetchingUserDeposit = computed(() =>
        oldVaultUserSharesQuery.isFetching.value || newVaultUserSharesQuery.isFetching.value
    )

    // Convert shares to assets and sum from both vaults
    const userDeposit = computedAsync<bigint>(
        async () => {
            const sourceShares = userShares.value
            const promises: Promise<bigint>[] = []

            if (oldVaultUserShares.value > 0n) {
                promises.push(
                    readContract(wagmiConfig, {
                        abi: PWN_CROWDSOURCE_LENDER_VAULT_ABI,
                        functionName: 'convertToAssets',
                        args: [oldVaultUserShares.value],
                        address: OLD_PWN_CROWDSOURCE_LENDER_VAULT_ADDRESS as Address,
                        chainId: PROPOSAL_CHAIN_ID,
                    }).then(result => result as bigint ?? 0n)
                )
            }

            if (newVaultUserShares.value > 0n) {
                promises.push(
                    readContract(wagmiConfig, {
                        abi: PWN_CROWDSOURCE_LENDER_VAULT_ABI,
                        functionName: 'convertToAssets',
                        args: [newVaultUserShares.value],
                        address: PWN_CROWDSOURCE_LENDER_VAULT_ADDRESS as Address,
                        chainId: PROPOSAL_CHAIN_ID,
                    }).then(result => result as bigint ?? 0n)
                )
            }

            if (promises.length === 0) {
                convertedUserShares.value = sourceShares
                return 0n
            }

            try {
                const results = await Promise.all(promises)
                convertedUserShares.value = sourceShares
                return results.reduce((sum, value) => sum + value, 0n)
            } catch {
                convertedUserShares.value = sourceShares
                return 0n
            }
        },
        0n,
        isUserDepositEvaluating,
    )

    const isUserDepositReady = computed(() => !userAddress.value || (
        !oldVaultUserSharesQuery.isPending.value
        && !newVaultUserSharesQuery.isPending.value
        && !oldVaultUserSharesQuery.isFetching.value
        && !newVaultUserSharesQuery.isFetching.value
        && !isUserDepositEvaluating.value
        && convertedUserShares.value === userShares.value
    ))

    // Track old vault deposit separately for upgrade flow
    const oldVaultUserDeposit = computedAsync<bigint>(
        async () => {
            if (!oldVaultUserShares.value) {
                return 0n
            }

            const userAssets = await readContract(wagmiConfig, {
                abi: PWN_CROWDSOURCE_LENDER_VAULT_ABI,
                functionName: 'convertToAssets',
                args: [oldVaultUserShares.value],
                address: OLD_PWN_CROWDSOURCE_LENDER_VAULT_ADDRESS as Address,
                chainId: PROPOSAL_CHAIN_ID,
            })
            return userAssets as bigint ?? 0n
        },
        0n
    )


    const userDepositFormatted = computed<string>(() => {
        if (!userDeposit.value) {
            return '0'
        }
        return formatUnits(userDeposit.value, CREDIT_DECIMALS)
    })

    const userDepositFormattedDecimals = computed<string>(() => {
        if (!userDeposit.value) {
            return '0'
        }
        return formatDecimalPoint(userDepositFormatted.value, 2)
    })

    return {
        userShares,
        oldVaultUserShares,
        newVaultUserShares,
        userDeposit,
        oldVaultUserDeposit,
        userDepositFormatted,
        userDepositFormattedDecimals,
        isFetchingUserDeposit,
        isUserDepositReady,
        refetchUserShares,
    }
})

export default useUserDepositStore

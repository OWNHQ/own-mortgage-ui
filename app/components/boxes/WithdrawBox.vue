<template>
    <div class="bg-gray-900/30 border rounded-xl p-4 sm:p-6 order-3 lg:order-none shadow-lg">
        <div class="mb-3">
            <h3 class="font-heading text-xl sm:text-2xl mb-1">Claim or Donate Repayments</h3>
            <p class="text-gray-400 text-sm sm:text-base">
                Send any amount of your cumulative pro-rata share to your wallet, or donate it directly to BORDEL.
            </p>
        </div>
        <hr class="mb-4" />

        <!-- Not connected state -->
        <div v-if="!isConnected" class="text-center py-4">
            <p class="text-gray-400 mb-3 text-sm">Connect your wallet to see your position and claim or donate.</p>
            <Button size="lg" class="h-[3rem] w-full rounded-bttn" @click="open({ view: 'Connect' })">
                <span class="text-base sm:text-lg font-bold">Connect Wallet</span>
            </Button>
        </div>

        <!-- Connected state -->
        <div v-else>
            <!-- User position summary -->
            <div class="space-y-3 mb-4">
                <div class="flex justify-between items-center">
                    <span class="text-gray-400 text-sm">Your Deposit</span>
                    <span class="font-semibold flex items-center gap-1">
                        {{ userDepositFormattedDecimals }}
                        <img width="16" height="16" :src="CREDIT_ASSET_ICON" :alt="CREDIT_NAME" />
                        {{ CREDIT_NAME }}
                    </span>
                </div>
                <div class="flex justify-between items-center">
                    <span class="text-gray-400 text-sm">
                        {{ isDefaultedExit ? 'Defaulted Position' : 'Available to Claim or Donate' }}
                    </span>
                    <span class="font-semibold flex items-center gap-1 text-green-400">
                        <template v-if="isDefaultedExit">Redeem to wallet</template>
                        <template v-else>
                            {{ isNewVaultClaimLoading ? '...' : newVaultClaimableFormatted }}
                            <img width="16" height="16" :src="CREDIT_ASSET_ICON" :alt="CREDIT_NAME" />
                            {{ CREDIT_NAME }}
                        </template>
                    </span>
                </div>
                <div v-if="oldVaultUserDeposit > 0n" class="flex justify-between items-center">
                    <span class="text-gray-400 text-sm">Old Vault - Available to Withdraw</span>
                    <span class="font-semibold flex items-center gap-1 text-yellow-400">
                        {{ isOldVaultClaimLoading ? '...' : oldVaultWithdrawableFormatted }}
                        <img width="16" height="16" :src="CREDIT_ASSET_ICON" :alt="CREDIT_NAME" />
                        {{ CREDIT_NAME }}
                    </span>
                </div>
            </div>

            <div v-if="newVaultCalculationError" class="mb-3 space-y-2">
                <p class="text-sm text-red-400">{{ newVaultCalculationError }}</p>
                <Button size="sm" variant="outline" :disabled="isNewVaultClaimLoading" @click="retryNewVaultCalculation">
                    Retry calculation
                </Button>
            </div>

            <div v-if="oldVaultCalculationError && oldVaultUserDeposit > 0n" class="mb-3 space-y-2">
                <p class="text-sm text-red-400">{{ oldVaultCalculationError }}</p>
                <Button size="sm" variant="outline" :disabled="isOldVaultClaimLoading" @click="retryOldVaultCalculation">
                    Retry old vault
                </Button>
            </div>

            <p v-if="claimActionError" class="mb-3 text-sm text-red-400">
                {{ claimActionError }}
            </p>

            <!-- A defaulted vault must redeem all remaining shares because credit and collateral share one receiver. -->
            <div v-if="isDefaultedExit && newVaultUserShares > 0n" class="mb-3 space-y-3 rounded-lg border border-yellow-500/30 bg-yellow-500/5 p-3">
                <p class="text-sm leading-relaxed text-gray-300">
                    This loan defaulted. Redeeming your remaining position may send both {{ CREDIT_NAME }} and proportional collateral, so it can only be sent to your wallet.
                </p>
                <Button
                    size="lg"
                    class="h-[3.5rem] w-full rounded-bttn"
                    :disabled="isNewVaultClaimUnavailable || isAnyClaimPending"
                    @click="handleDefaultedRedeem"
                >
                    <span class="flex flex-col items-center leading-tight">
                        <span class="text-base font-bold">
                            {{ isWithdrawing ? 'Redeeming...' : 'Redeem Remaining Position' }}
                        </span>
                        <span class="text-xs font-medium opacity-80">to Your Wallet</span>
                    </span>
                </Button>
                <p class="text-xs text-gray-400">Donation is unavailable because the vault cannot send {{ CREDIT_NAME }} and collateral to different receivers.</p>
            </div>

            <!-- Claim repayments from new vault -->
            <div v-if="!isDefaultedExit && newVaultClaimable > 0n" class="mb-3 space-y-3">
                <div>
                    <div class="mb-2 flex items-center justify-between">
                        <label for="claim-amount" class="text-sm font-medium">Amount</label>
                        <button
                            type="button"
                            class="text-sm font-semibold text-green-400 transition-colors hover:text-green-300 disabled:cursor-not-allowed disabled:opacity-50"
                            :disabled="isAnyClaimPending || isNewVaultClaimUnavailable"
                            @click="setClaimAmountToMax"
                        >
                            Max
                        </button>
                    </div>
                    <div class="relative">
                        <Input
                            id="claim-amount"
                            :model-value="claimAmountInput"
                            type="number"
                            inputmode="decimal"
                            min="0"
                            step="0.000001"
                            placeholder="0.00"
                            class="h-[3.5rem] pr-12 text-lg [&::-webkit-inner-spin-button]:[appearance:none] [&::-webkit-outer-spin-button]:[appearance:none] [&[type=number]]:[appearance:textfield]"
                            :aria-invalid="!!claimAmountError"
                            :disabled="isAnyClaimPending || isNewVaultClaimUnavailable"
                            @update:model-value="updateClaimAmount"
                        />
                        <img
                            :src="CREDIT_ASSET_ICON"
                            :alt="CREDIT_NAME"
                            width="24"
                            height="24"
                            class="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2"
                        />
                    </div>
                    <p v-if="claimAmountError" class="mt-1 text-xs text-red-400">
                        {{ claimAmountError }}
                    </p>
                </div>

                <div class="space-y-2 rounded-lg border border-green-500/20 bg-black/20 p-3">
                    <p class="text-sm text-gray-300">
                        Choose where to send
                        <span v-if="claimAmountActionLabel" class="font-semibold text-green-400">
                            {{ claimAmountActionLabel }}
                        </span>
                        <span v-else>this amount</span>:
                    </p>

                    <div class="grid gap-2">
                        <Button
                            size="lg"
                            class="h-[3.5rem] w-full rounded-bttn"
                            :disabled="!isClaimAmountValid || isAnyClaimPending || isNewVaultClaimUnavailable"
                            @click="handleWithdraw"
                        >
                            <span class="flex flex-col items-center leading-tight">
                                <span class="text-base font-bold">
                                    {{ isWithdrawing ? 'Claiming...' : claimAmountActionLabel ? `Claim ${claimAmountActionLabel}` : 'Claim' }}
                                </span>
                                <span class="text-xs font-medium opacity-80">to Your Wallet</span>
                            </span>
                        </Button>
                        <div class="flex items-center gap-3 px-2" aria-hidden="true">
                            <span class="h-px flex-1 bg-gray-700" />
                            <span class="text-xs font-semibold uppercase tracking-widest text-gray-500">or</span>
                            <span class="h-px flex-1 bg-gray-700" />
                        </div>
                        <Button
                            size="lg"
                            variant="outline"
                            class="h-[3.5rem] w-full rounded-bttn border-green-500/60 text-green-400 hover:bg-green-500/10 hover:text-green-300"
                            :disabled="!isClaimAmountValid || isAnyClaimPending || isNewVaultClaimUnavailable"
                            @click="handleDonate"
                        >
                            <span class="flex flex-col items-center leading-tight">
                                <span class="text-base font-bold">
                                    {{ isDonating ? 'Donating...' : claimAmountActionLabel ? `Donate ${claimAmountActionLabel}` : 'Donate' }}
                                </span>
                                <span class="text-xs font-medium opacity-80">to BORDEL</span>
                            </span>
                        </Button>
                    </div>
                </div>

                <p class="text-xs leading-relaxed text-gray-400">
                    Donations are sent directly from the vault to the BORDEL team multisig
                    <a
                        :href="bordelMultisigExplorerLink"
                        target="_blank"
                        rel="noopener noreferrer"
                        class="break-all font-mono text-gray-300 underline decoration-gray-600 underline-offset-2 transition-colors hover:text-green-300"
                    >{{ BORDEL_TEAM_MULTISIG_ADDRESS }}</a>.
                </p>
            </div>

            <!-- Withdraw from old vault -->
            <Button
                v-if="oldVaultUserDeposit > 0n && oldVaultWithdrawable > 0n"
                size="lg"
                variant="outline"
                class="h-[3rem] w-full rounded-bttn mb-2"
                :disabled="isAnyClaimPending || isOldVaultClaimUnavailable"
                @click="handleRedeemOldVault"
            >
                <span class="text-base sm:text-lg font-bold">
                    Withdraw {{ oldVaultWithdrawableFormatted }} {{ CREDIT_NAME }} from Old Vault
                </span>
            </Button>

            <!-- No position state -->
            <div v-if="!isClaimCalculationLoading && !hasCalculationError && userDeposit === 0n && newVaultUserShares === 0n && newVaultClaimable === 0n && oldVaultUserDeposit === 0n" class="text-center py-4">
                <p class="text-gray-400 text-sm">You don't have a position in this loan.</p>
            </div>

            <!-- Nothing to withdraw -->
            <div v-else-if="!isDefaultedExit && !isClaimCalculationLoading && !hasCalculationError && newVaultClaimable === 0n && oldVaultWithdrawable === 0n" class="text-center py-2">
                <p class="text-gray-400 text-sm">No repayments available to claim or donate yet.</p>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { formatUnits, parseUnits } from 'viem'
import { readContract } from '@wagmi/core/actions'
import { useAccount, useReadContract } from '@wagmi/vue'
import PWN_CROWDSOURCE_LENDER_VAULT_ABI from '~/assets/abis/v1.5/PWNCrowdsourceLenderVault'
import { CREDIT_NAME, CREDIT_ASSET_ICON, CREDIT_DECIMALS, LOAN_CREATED_BLOCK, PROPOSAL_CHAIN_ID } from '~/constants/proposalConstants'
import { ToastStep, Toast, ToastActionEnum } from '~/components/ui/toast/useToastsStore'
import useActionFlow from '~/components/ui/toast/useActionFlow'
import { useAppKit } from '@reown/appkit/vue'
import {
    BORDEL_TEAM_MULTISIG_ADDRESS,
    OLD_PWN_CROWDSOURCE_LENDER_VAULT_ADDRESS,
    PWN_CROWDSOURCE_LENDER_VAULT_ADDRESS,
} from '~/constants/addresses'
import { wagmiConfig } from '~/config/appkit'
import { getExplorerTokenAddressLink } from '~/constants/links'
import { formatDecimalPoint } from '~/lib/format-decimals'

const { address, isConnected } = useAccount()
const { open } = useAppKit()

const userDepositStore = useUserDepositStore()
const { userDeposit, oldVaultUserDeposit, userDepositFormattedDecimals } = storeToRefs(userDepositStore)

const { refetchLoanData } = useLoanStatus()

const newVaultClaimResult = useLenderClaim(
    PWN_CROWDSOURCE_LENDER_VAULT_ADDRESS,
    address,
    LOAN_CREATED_BLOCK,
)
const newVaultClaimable = computed<bigint>(() => newVaultClaimResult.data.value?.claimableAssets ?? 0n)
const newVaultUserShares = computed<bigint>(() => newVaultClaimResult.data.value?.userShares ?? 0n)
const isDefaultedExit = computed(() => newVaultClaimResult.data.value?.exitMode === 'redeem-defaulted')
const newVaultClaimableFormatted = computed(() => {
    if (!newVaultClaimable.value) return '0'
    return formatDecimalPoint(formatUnits(newVaultClaimable.value, CREDIT_DECIMALS), 2)
})

const claimAmountInput = ref('')
const claimAmountWasEdited = ref(false)
const claimActionError = ref<string | null>(null)

const setClaimAmountToMax = () => {
    claimAmountInput.value = formatUnits(newVaultClaimable.value, CREDIT_DECIMALS)
    claimAmountWasEdited.value = false
}

const updateClaimAmount = (value: string | number) => {
    claimAmountInput.value = String(value)
    claimAmountWasEdited.value = true
    claimActionError.value = null
}

watch(address, () => {
    claimAmountWasEdited.value = false
    claimActionError.value = null
    setClaimAmountToMax()
})

watch(newVaultClaimable, () => {
    if (!claimAmountWasEdited.value) {
        setClaimAmountToMax()
    }
}, { immediate: true })

const parsedClaimAmount = computed<bigint | null>(() => {
    const value = claimAmountInput.value.trim()
    if (!value) return null

    try {
        return parseUnits(value, CREDIT_DECIMALS)
    } catch {
        return null
    }
})

const claimAmountError = computed(() => {
    if (!claimAmountInput.value.trim()) return 'Enter an amount.'
    if (parsedClaimAmount.value === null) return `Enter a valid amount with up to ${CREDIT_DECIMALS} decimal places.`
    if (parsedClaimAmount.value <= 0n) return 'Amount must be greater than zero.'
    if (parsedClaimAmount.value > newVaultClaimable.value) return 'Amount exceeds your available claim.'
    return null
})

const isClaimAmountValid = computed(() => claimAmountError.value === null && parsedClaimAmount.value !== null)
const claimAmountActionLabel = computed(() => {
    if (parsedClaimAmount.value === null || parsedClaimAmount.value <= 0n) return null
    return `${formatDecimalPoint(formatUnits(parsedClaimAmount.value, CREDIT_DECIMALS), CREDIT_DECIMALS)} ${CREDIT_NAME}`
})
const bordelMultisigExplorerLink = getExplorerTokenAddressLink(BORDEL_TEAM_MULTISIG_ADDRESS)

const oldVaultMaxWithdrawResult = useReadContract({
    abi: PWN_CROWDSOURCE_LENDER_VAULT_ABI,
    address: OLD_PWN_CROWDSOURCE_LENDER_VAULT_ADDRESS,
    functionName: 'maxWithdraw',
    args: computed(() => [address.value!] as const),
    chainId: PROPOSAL_CHAIN_ID,
    query: {
        enabled: computed(() => !!address.value && oldVaultUserDeposit.value > 0n),
        refetchInterval: 60_000,
        staleTime: 30_000,
    },
})
const oldVaultWithdrawable = computed<bigint>(() => oldVaultMaxWithdrawResult.data.value ?? 0n)
const oldVaultWithdrawableFormatted = computed(() => {
    if (!oldVaultWithdrawable.value) return '0'
    return formatDecimalPoint(formatUnits(oldVaultWithdrawable.value, CREDIT_DECIMALS), 2)
})
const isNewVaultClaimLoading = computed(() => newVaultClaimResult.isPending.value || newVaultClaimResult.isFetching.value)
const isOldVaultClaimLoading = computed(() => oldVaultUserDeposit.value > 0n && (oldVaultMaxWithdrawResult.isPending.value || oldVaultMaxWithdrawResult.isFetching.value))
const isClaimCalculationLoading = computed(() => isNewVaultClaimLoading.value || isOldVaultClaimLoading.value)
const newVaultCalculationError = computed(() => newVaultClaimResult.isError.value
    ? 'Repayment entitlement could not be calculated. Claims and donations are disabled until it is refreshed.'
    : null)
const oldVaultCalculationError = computed(() => oldVaultMaxWithdrawResult.isError.value
    ? 'The old vault balance could not be loaded.'
    : null)
const hasCalculationError = computed(() => !!newVaultCalculationError.value || (oldVaultUserDeposit.value > 0n && !!oldVaultCalculationError.value))

const { claimVaultExit } = useLend()

const toast = ref<Toast>()
let continueFlow: () => Promise<void> | undefined

const isWithdrawing = ref(false)
const isDonating = ref(false)
const isRedeemingOldVault = ref(false)
const isValidatingClaim = ref(false)
const isAnyClaimPending = computed(() => isValidatingClaim.value || isWithdrawing.value || isDonating.value || isRedeemingOldVault.value)
const isNewVaultClaimUnavailable = computed(() => isNewVaultClaimLoading.value || newVaultClaimResult.isError.value || isValidatingClaim.value)
const isOldVaultClaimUnavailable = computed(() => isOldVaultClaimLoading.value || oldVaultMaxWithdrawResult.isError.value)

const retryNewVaultCalculation = () => {
    claimActionError.value = null
    void newVaultClaimResult.refetch()
}
const retryOldVaultCalculation = () => void oldVaultMaxWithdrawResult.refetch()

const CLAIM_DESTINATIONS = {
    wallet: {
        action: ToastActionEnum.WITHDRAW_LENDER,
        pendingText: 'Claiming',
        title: 'Claiming Repayments',
    },
    bordel: {
        action: ToastActionEnum.DONATE_LENDER_CLAIM,
        pendingText: 'Donating',
        title: 'Donating Repayments',
    },
} as const

type ClaimDestination = keyof typeof CLAIM_DESTINATIONS
type PreparedClaimExit =
    | { assets: bigint, method: 'withdraw' }
    | { assets: bigint, method: 'redeem', shares: bigint }

const refreshAfterNewVaultExit = async () => {
    claimAmountWasEdited.value = false
    await Promise.allSettled([
        refetchLoanData(),
        userDepositStore.refetchUserShares(),
        newVaultClaimResult.refetch(),
    ])
}

const submitClaim = async (destinationKey: ClaimDestination) => {
    if (!isClaimAmountValid.value || parsedClaimAmount.value === null || !address.value || isNewVaultClaimUnavailable.value) return

    const ownerAddress = address.value
    const receiverAddress = destinationKey === 'wallet' ? ownerAddress : BORDEL_TEAM_MULTISIG_ADDRESS
    const destination = CLAIM_DESTINATIONS[destinationKey]
    const requestedAssets = parsedClaimAmount.value
    claimActionError.value = null
    isValidatingClaim.value = true

    let preparedExit: PreparedClaimExit
    try {
        const refreshed = await newVaultClaimResult.refetch({ throwOnError: true })
        const freshClaim = refreshed.data
        if (!freshClaim) throw new Error('Fresh lender claim data is unavailable.')
        if (freshClaim.exitMode === 'redeem-defaulted') {
            claimActionError.value = 'The vault state changed. Review the defaulted-position redemption now shown below.'
            return
        }
        if (requestedAssets > freshClaim.claimableAssets) {
            claimActionError.value = 'Your available claim changed. Review the updated maximum before continuing.'
            return
        }

        if (freshClaim.exitMode === 'withdraw') {
            preparedExit = { assets: requestedAssets, method: 'withdraw' }
        } else {
            const shares = await readContract(wagmiConfig, {
                abi: PWN_CROWDSOURCE_LENDER_VAULT_ABI,
                address: PWN_CROWDSOURCE_LENDER_VAULT_ADDRESS,
                functionName: 'convertToShares',
                args: [requestedAssets],
                chainId: PROPOSAL_CHAIN_ID,
            })
            if (shares <= 0n) {
                claimActionError.value = 'This amount is too small to redeem.'
                return
            }

            const assets = await readContract(wagmiConfig, {
                abi: PWN_CROWDSOURCE_LENDER_VAULT_ABI,
                address: PWN_CROWDSOURCE_LENDER_VAULT_ADDRESS,
                functionName: 'previewRedeem',
                args: [shares],
                chainId: PROPOSAL_CHAIN_ID,
            })
            if (assets <= 0n || assets > freshClaim.claimableAssets) {
                claimActionError.value = 'The requested amount cannot be redeemed safely. Refresh and try again.'
                return
            }

            preparedExit = { assets, method: 'redeem', shares }
        }
    } catch {
        if (!newVaultClaimResult.isError.value) {
            claimActionError.value = 'The claim could not be prepared safely. Refresh and try again.'
        }
        return
    } finally {
        isValidatingClaim.value = false
    }

    const amountFormatted = formatDecimalPoint(formatUnits(preparedExit.assets, CREDIT_DECIMALS), CREDIT_DECIMALS)
    const attemptId = crypto.randomUUID()
    const actionValue = preparedExit.method === 'withdraw' ? preparedExit.assets : preparedExit.shares
    const steps = [new ToastStep({
        text: `${destination.pendingText} ${amountFormatted} ${CREDIT_NAME}...`,
        async fn(step) {
            if (preparedExit.method === 'withdraw') {
                await claimVaultExit({
                    assets: preparedExit.assets,
                    method: 'withdraw',
                    ownerAddress,
                    receiverAddress,
                    step,
                    vaultAddress: PWN_CROWDSOURCE_LENDER_VAULT_ADDRESS,
                })
            } else {
                await claimVaultExit({
                    method: 'redeem',
                    ownerAddress,
                    receiverAddress,
                    shares: preparedExit.shares,
                    step,
                    vaultAddress: PWN_CROWDSOURCE_LENDER_VAULT_ADDRESS,
                })
            }
            await refreshAfterNewVaultExit()
            return true
        },
    })]

    toast.value = new Toast({
        steps,
        chainId: PROPOSAL_CHAIN_ID,
        title: destination.title,
    }, destination.action, ownerAddress, PWN_CROWDSOURCE_LENDER_VAULT_ADDRESS, receiverAddress, actionValue.toString(), attemptId)
    continueFlow = useActionFlow(toast as Ref<Toast>).continueFlow

    const pendingState = destinationKey === 'bordel' ? isDonating : isWithdrawing
    pendingState.value = true
    try {
        await continueFlow()
    } finally {
        pendingState.value = false
    }
}

const handleWithdraw = () => submitClaim('wallet')
const handleDonate = () => submitClaim('bordel')

const handleDefaultedRedeem = async () => {
    if (!address.value || isNewVaultClaimUnavailable.value) return

    const ownerAddress = address.value
    claimActionError.value = null
    isValidatingClaim.value = true

    let shares: bigint
    try {
        const refreshed = await newVaultClaimResult.refetch({ throwOnError: true })
        if (!refreshed.data || refreshed.data.exitMode !== 'redeem-defaulted' || refreshed.data.userShares <= 0n) {
            claimActionError.value = 'The vault state changed. Review the updated claim options before continuing.'
            return
        }
        shares = refreshed.data.userShares
    } catch {
        if (!newVaultClaimResult.isError.value) {
            claimActionError.value = 'The defaulted position could not be prepared safely. Refresh and try again.'
        }
        return
    } finally {
        isValidatingClaim.value = false
    }

    const attemptId = crypto.randomUUID()
    const steps = [new ToastStep({
        text: 'Redeeming your remaining vault position to your wallet...',
        async fn(step) {
            await claimVaultExit({
                method: 'redeem',
                ownerAddress,
                receiverAddress: ownerAddress,
                shares,
                step,
                vaultAddress: PWN_CROWDSOURCE_LENDER_VAULT_ADDRESS,
            })
            await refreshAfterNewVaultExit()
            return true
        },
    })]

    toast.value = new Toast({
        steps,
        chainId: PROPOSAL_CHAIN_ID,
        title: 'Redeeming Defaulted Position',
    }, ToastActionEnum.WITHDRAW_LENDER, ownerAddress, PWN_CROWDSOURCE_LENDER_VAULT_ADDRESS, ownerAddress, shares.toString(), attemptId)
    continueFlow = useActionFlow(toast as Ref<Toast>).continueFlow

    isWithdrawing.value = true
    try {
        await continueFlow()
    } finally {
        isWithdrawing.value = false
    }
}

const handleRedeemOldVault = async () => {
    if (!address.value || isOldVaultClaimUnavailable.value) return

    const ownerAddress = address.value
    isRedeemingOldVault.value = true
    let freshWithdrawable: bigint
    try {
        const refreshed = await oldVaultMaxWithdrawResult.refetch({ throwOnError: true })
        freshWithdrawable = refreshed.data ?? 0n
        if (freshWithdrawable <= 0n) return
    } catch {
        return
    } finally {
        isRedeemingOldVault.value = false
    }

    const freshWithdrawableFormatted = formatDecimalPoint(formatUnits(freshWithdrawable, CREDIT_DECIMALS), 2)
    const attemptId = crypto.randomUUID()
    const steps = [new ToastStep({
        text: `Withdrawing ${freshWithdrawableFormatted} ${CREDIT_NAME} from old vault...`,
        async fn(step) {
            await claimVaultExit({
                assets: freshWithdrawable,
                method: 'withdraw',
                ownerAddress,
                receiverAddress: ownerAddress,
                step,
                vaultAddress: OLD_PWN_CROWDSOURCE_LENDER_VAULT_ADDRESS,
            })
            await Promise.allSettled([
                refetchLoanData(),
                userDepositStore.refetchUserShares(),
                oldVaultMaxWithdrawResult.refetch(),
            ])
            return true
        },
    })]

    toast.value = new Toast({
        steps,
        chainId: PROPOSAL_CHAIN_ID,
        title: 'Withdrawing from Old Vault',
    }, ToastActionEnum.WITHDRAW_LENDER, ownerAddress, OLD_PWN_CROWDSOURCE_LENDER_VAULT_ADDRESS, ownerAddress, freshWithdrawable.toString(), attemptId)
    continueFlow = useActionFlow(toast as Ref<Toast>).continueFlow

    isRedeemingOldVault.value = true
    try {
        await continueFlow()
    } finally {
        isRedeemingOldVault.value = false
    }
}
</script>

<style scoped>
.rounded-bttn {
    border-radius: 4rem;
}
</style>

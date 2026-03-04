<template>
    <div class="bg-gray-900/30 border rounded-xl p-4 sm:p-6 order-3 lg:order-none shadow-lg">
        <div class="mb-3">
            <h3 class="font-heading text-xl sm:text-2xl mb-1">Withdraw Repayments</h3>
            <p class="text-gray-400 text-sm sm:text-base">
                Withdraw your pro-rata share of repayments from the vault.
            </p>
        </div>
        <hr class="mb-4" />

        <!-- Not connected state -->
        <div v-if="!isConnected" class="text-center py-4">
            <p class="text-gray-400 mb-3 text-sm">Connect your wallet to see your position and withdraw.</p>
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
                    <span class="text-gray-400 text-sm">Available to Withdraw</span>
                    <span class="font-semibold flex items-center gap-1 text-green-400">
                        {{ maxWithdrawFormatted }}
                        <img width="16" height="16" :src="CREDIT_ASSET_ICON" :alt="CREDIT_NAME" />
                        {{ CREDIT_NAME }}
                    </span>
                </div>
                <div v-if="oldVaultUserDeposit > 0n" class="flex justify-between items-center">
                    <span class="text-gray-400 text-sm">Old Vault Deposit</span>
                    <span class="font-semibold flex items-center gap-1 text-yellow-400">
                        {{ oldVaultUserDepositFormatted }}
                        <img width="16" height="16" :src="CREDIT_ASSET_ICON" :alt="CREDIT_NAME" />
                        {{ CREDIT_NAME }}
                    </span>
                </div>
            </div>

            <!-- Withdraw from new vault -->
            <Button
                v-if="maxWithdraw > 0n"
                size="lg"
                class="h-[3rem] w-full rounded-bttn mb-2"
                :disabled="isWithdrawing"
                @click="handleWithdraw"
            >
                <span class="text-base sm:text-lg font-bold">
                    Withdraw {{ maxWithdrawFormatted }} {{ CREDIT_NAME }}
                </span>
            </Button>

            <!-- Redeem from old vault -->
            <Button
                v-if="oldVaultUserDeposit > 0n"
                size="lg"
                variant="outline"
                class="h-[3rem] w-full rounded-bttn mb-2"
                :disabled="isRedeemingOldVault"
                @click="handleRedeemOldVault"
            >
                <span class="text-base sm:text-lg font-bold">
                    Redeem from Old Vault
                </span>
            </Button>

            <!-- No position state -->
            <div v-if="userDeposit === 0n && maxWithdraw === 0n && oldVaultUserDeposit === 0n" class="text-center py-4">
                <p class="text-gray-400 text-sm">You don't have a position in this loan.</p>
            </div>

            <!-- Nothing to withdraw -->
            <div v-else-if="maxWithdraw === 0n && oldVaultUserDeposit === 0n" class="text-center py-2">
                <p class="text-gray-400 text-sm">No repayments available to withdraw yet.</p>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { formatUnits } from 'viem'
import { CREDIT_NAME, CREDIT_ASSET_ICON, CREDIT_DECIMALS, PROPOSAL_CHAIN_ID } from '~/constants/proposalConstants'
import { useAccount } from '@wagmi/vue'
import { useMutation } from '@tanstack/vue-query'
import { ToastStep, Toast, ToastActionEnum } from '~/components/ui/toast/useToastsStore'
import useActionFlow from '~/components/ui/toast/useActionFlow'
import MutationIds from '~/constants/mutationIds'
import { useAppKit } from '@reown/appkit/vue'
import { OLD_PWN_CROWDSOURCE_LENDER_VAULT_ADDRESS, PWN_CROWDSOURCE_LENDER_VAULT_ADDRESS } from '~/constants/addresses'
import { formatDecimalPoint } from '~/lib/format-decimals'

const { address, isConnected } = useAccount()
const { open } = useAppKit()

const userDepositStore = useUserDepositStore()
const { userDeposit, oldVaultUserDeposit, oldVaultUserShares, newVaultUserShares, userDepositFormattedDecimals } = storeToRefs(userDepositStore)

const { maxWithdrawQuery, refetchLoanData } = useLoanStatus()
const maxWithdrawResult = maxWithdrawQuery(address)
const maxWithdraw = computed<bigint>(() => maxWithdrawResult.data.value ?? 0n)
const maxWithdrawFormatted = computed(() => {
    if (!maxWithdraw.value) return '0'
    return formatDecimalPoint(formatUnits(maxWithdraw.value, CREDIT_DECIMALS), 2)
})

const oldVaultUserDepositFormatted = computed(() => {
    if (!oldVaultUserDeposit.value) return '0'
    return formatDecimalPoint(formatUnits(oldVaultUserDeposit.value, CREDIT_DECIMALS), 2)
})

const { withdraw, redeemAll } = useLend()

const toast = ref<Toast>()
let continueFlow: () => Promise<void> | undefined

// Withdraw mutation
const { isPending: isWithdrawing } = useMutation({
    mutationKey: [MutationIds.WithdrawLender],
    mutationFn: async ({ step }: { step: ToastStep }) => {
        await withdraw(maxWithdraw.value, step)
    },
    onSuccess() {
        refetchLoanData()
        userDepositStore.refetchUserShares()
        maxWithdrawResult.refetch()
    },
    throwOnError: true,
})

// Redeem all from old vault mutation
const { isPending: isRedeemingOldVault } = useMutation({
    mutationKey: [MutationIds.WithdrawLenderAll],
    mutationFn: async ({ step }: { step: ToastStep }) => {
        await redeemAll(OLD_PWN_CROWDSOURCE_LENDER_VAULT_ADDRESS, oldVaultUserShares.value, step)
    },
    onSuccess() {
        refetchLoanData()
        userDepositStore.refetchUserShares()
    },
    throwOnError: true,
})

const handleWithdraw = async () => {
    const steps: ToastStep[] = []

    steps.push(new ToastStep({
        text: `Withdrawing ${maxWithdrawFormatted.value} ${CREDIT_NAME}...`,
        async fn(step) {
            await withdraw(maxWithdraw.value, step)
            refetchLoanData()
            userDepositStore.refetchUserShares()
            maxWithdrawResult.refetch()
            return true
        }
    }))

    toast.value = new Toast({
        steps,
        chainId: PROPOSAL_CHAIN_ID,
        title: 'Withdrawing',
    }, ToastActionEnum.WITHDRAW_LENDER, address.value!);
    ({ continueFlow } = useActionFlow(toast as Ref<Toast>))

    await continueFlow()
}

const handleRedeemOldVault = async () => {
    const steps: ToastStep[] = []

    steps.push(new ToastStep({
        text: `Redeeming ${CREDIT_NAME} from old vault...`,
        async fn(step) {
            await redeemAll(OLD_PWN_CROWDSOURCE_LENDER_VAULT_ADDRESS, oldVaultUserShares.value, step)
            refetchLoanData()
            userDepositStore.refetchUserShares()
            return true
        }
    }))

    toast.value = new Toast({
        steps,
        chainId: PROPOSAL_CHAIN_ID,
        title: 'Redeeming from Old Vault',
    }, ToastActionEnum.WITHDRAW_LENDER, address.value!);
    ({ continueFlow } = useActionFlow(toast as Ref<Toast>))

    await continueFlow()
}
</script>

<style scoped>
.rounded-bttn {
    border-radius: 4rem;
}
</style>

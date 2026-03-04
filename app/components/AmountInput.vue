<template>
    <div>
        <div class="flex items-center justify-between mb-2">
            <label class="text-sm font-medium">{{ lendAmount === userDepositFormatted ? 'Total Amount Committed Now' : 'Total Amount to Lend' }}</label>
            <div class="flex items-center gap-2">
                <div
                    v-if="walletBalancePlusUserDeposit > 0n"
                    class="flex items-center gap-2 font-sm text-sm border-b-1 border-gray-2 hover:border-gray font-supreme hover:cursor-pointer text-gray-2 hover:text-gray transition duration-300"
                    @click="handleWalletBalanceClick">
                    <WalletIcon
                        class="w-5 h-5"
                        color="var(--gray-2)"/>
                    <SafeDisplayDecimals
                        :value="walletBalancePlusUserDepositFormatted"
                        :text-after-value="CREDIT_NAME"/>
                </div>
            </div>
        </div>

        <div class="relative">
            <Input
                v-model="lendAmount"
                type="number"
                placeholder="-"
                :disabled="isAmountInputDisabled"
                step="1000"
                min="0"
                :class="['w-full', inputHeight, 'border-none focus:border-none focus:outline-none focus:ring-0 input-txtsize [&::-webkit-outer-spin-button]:[appearance:none] [&::-webkit-inner-spin-button]:[appearance:none] [&[type=number]]:[appearance:textfield]', creditIcon ? 'pr-12 sm:pr-14' : '', { 'border-red-500': isAmountInvalid }]"
            />
            <img v-if="creditIcon" :src="creditIcon" :alt="creditName" width="32" height="32" class="absolute right-3 top-1/2 -translate-y-1/2 w-6 h-6 sm:w-8 sm:h-8 pointer-events-none">
        </div>
        <div v-if="hasNoCreditAssets" class="text-xs text-amber-500 mt-1">
            You don't have any {{ CREDIT_NAME }} assets. Please acquire some to lend.
        </div>
        <div v-else-if="isAmountInvalid" class="text-xs text-red-500 mt-1">
            {{ amountInvalidMessage }}
        </div>
    </div>
</template>

<script setup lang="ts">
import { CREDIT_ADDRESS, CREDIT_DECIMALS, CREDIT_NAME } from '~/constants/proposalConstants'
import { formatUnits, parseUnits, erc20Abi, type Address } from 'viem'
import useAmountInputStore from '~/composables/useAmountInputStore'
import { useReadContract, useAccount } from '@wagmi/vue'
import { formatDecimalPoint } from '~/lib/format-decimals'
import { useIsMutating } from '@tanstack/vue-query'
import MutationIds from '~/constants/mutationIds'
import useUserDepositStore from '~/composables/useUserDepositStore'
import useProposal from '~/composables/useProposal'

// Accept inputHeight as a prop, default to h-[40px]
const props = defineProps({
    prefilledAmount: {
        type: String,
        default: ''
    },
    inputHeight: {
        type: String,
        default: 'h-[40px]'
    },
    creditIcon: {
        type: String,
        default: ''
    },
    creditName: {
        type: String,
        default: ''
    },
    overrideIsDisabled: {
        type: Boolean,
        default: false
    }
})

const { missingAmount } = useProposal()

const userDepositStore = useUserDepositStore()
const { userDeposit, userDepositFormatted } = storeToRefs(userDepositStore)

const amountInputStore = useAmountInputStore()

// Use a local ref for the input and sync it with the store
const lendAmount = ref<string>('')

// Sync local ref with store
watch(() => amountInputStore.lendAmount, (newVal) => {
    if (lendAmount.value !== newVal) {
        lendAmount.value = newVal
    }
}, { immediate: true })

// Sync store with local ref
watch(lendAmount, (newVal) => {
    // Ensure it's always a string, but preserve '0' as a valid value
    const stringVal = newVal === null || newVal === undefined ? '' : String(newVal)
    if (amountInputStore.lendAmount !== stringVal) {
        amountInputStore.lendAmount = stringVal
    }
})

// Pre-fill with user deposit when they have one
watch(userDepositFormatted, (newVal) => {
    if (newVal !== '0' && !lendAmount.value) {
        lendAmount.value = newVal
    }
}, { immediate: true })

const withdrawingMutationsCount = useIsMutating({ mutationKey: [MutationIds.Withdraw] })
const depositingMutationsCount = useIsMutating({ mutationKey: [MutationIds.Deposit] })
const approvingMutationsCount = useIsMutating({ mutationKey: [MutationIds.ApproveForDepositIfNeeded] })

const isPerformingMutations = computed(() => {
    return withdrawingMutationsCount.value > 0 || depositingMutationsCount.value > 0 || approvingMutationsCount.value > 0
})

const { address, isConnected } = useAccount()

const walletBalanceQuery = useReadContract({
    abi: erc20Abi,
    // @ts-expect-error not sure why this throws TS error, but it works
    address: CREDIT_ADDRESS,
    functionName: 'balanceOf',
    args: [address as Ref<Address>],
    enabled: computed(() => !!address.value),
})

const walletBalance = computed(() => walletBalanceQuery.data.value)

const isFetchingWalletBalance = computed(() => walletBalanceQuery.isFetching.value)

const walletBalancePlusUserDeposit = computed(() => {
    return (walletBalance.value ?? 0n) + (userDeposit.value ?? 0n)
})

// Check if user has no credit assets (for warning message)
const hasNoCreditAssets = computed(() => {
    return isConnected.value && walletBalancePlusUserDeposit.value <= 0n && !userDeposit.value && !isFetchingWalletBalance.value
})

const isAmountInputDisabled = computed(() => {
    if (props.overrideIsDisabled) {
        return true
    }

    if (isPerformingMutations.value) {
        return true
    }

    if (!isConnected.value) {
        return false
    }

    return walletBalancePlusUserDeposit.value <= 0n && !userDeposit.value
})

const walletBalancePlusUserDepositFormatted = computed(() => {
    if (!walletBalancePlusUserDeposit.value) {
        return '0'
    }
    return formatDecimalPoint(formatUnits(walletBalancePlusUserDeposit.value, CREDIT_DECIMALS), 2)
})

// Check if amount input is invalid (exceeds balance or missing amount)
const isAmountInvalid = computed(() => {
    // Use local ref for reactivity
    const currentAmount = lendAmount.value
    
    if (walletBalancePlusUserDeposit.value <= 0n) {
        return false
    }

    const amountStr = String(currentAmount || '').trim()
    
    // If the input is empty or just whitespace, consider it valid (no error shown)
    if (!amountStr || amountStr === '') {
        return false
    }
    
    try {
        // Parse the input amount using viem parseUnits with the token's decimals
        const amount = parseUnits(amountStr, CREDIT_DECIMALS)
        return amount > walletBalancePlusUserDeposit.value || amount > missingAmount.value
    } catch {
        // If parsing fails (invalid input), consider it invalid
        return true
    }
})

// Get the appropriate error message for invalid amount
const amountInvalidMessage = computed(() => {
    // Use local ref for reactivity
    const currentAmount = lendAmount.value
    
    if (walletBalancePlusUserDeposit.value <= 0n) {
        return ''
    }

    const amountStr = String(currentAmount || '').trim()
    
    // If the input is empty or just whitespace, no error message
    if (!amountStr || amountStr === '') {
        return ''
    }
    
    try {
        const amount = parseUnits(amountStr, CREDIT_DECIMALS)
        if (amount > walletBalancePlusUserDeposit.value) {
            return 'Amount exceeds balance'
        }
    } catch {
        return 'Invalid amount'
    }
    
    return ''
})

const handleWalletBalanceClick = () => {
    handleMaxClick()
}

const handleMaxClick = () => {
    if (walletBalancePlusUserDeposit.value > missingAmount.value) {
        lendAmount.value = formatUnits(missingAmount.value, CREDIT_DECIMALS)
    } else if (walletBalancePlusUserDeposit.value) {
        lendAmount.value = formatUnits(walletBalancePlusUserDeposit.value, CREDIT_DECIMALS)
    }
}
</script>

<style scoped>
.input-txtsize {
    font-size: 2rem; 
}

.rounded-bttn {
    border-radius: 4rem;
}
</style>
<template>
    <div class="flex gap-4 mt-5">
        <div v-if="!isLoanActive" class="border p-4 flex flex-col gap-4">
            <h2 class="text-xl font-bold">Accept Proposal</h2>
            <label>
                Credit Amount You Want to Borrow: 
                <Input v-model="creditAmount" />
            </label>
            <div v-if="collateralAmount">
                That corresponds to roughly: {{ collateralAmount }} {{ COLLATERAL_NAME }}
            </div>
            <div>
                Note: max available credit amount is {{ totalDepositedAssetsFormatted }} {{ CREDIT_NAME }}
            </div>
            <Button :disabled="isApproving || isAccepting" @click="handleAcceptProposalClick">Accept</Button>
        </div>
        <!-- TODO make full box disabled if not running yet -->
        <div class="border p-4 flex flex-col gap-4">
            <h2 class="text-xl font-bold">Repay</h2>
            <label>
                Repayment Amount:
                <Input v-model="repaymentAmount" />
            </label>
            <div>
                Remaining debt: {{ remainingDebtFormatted }} {{ CREDIT_NAME }}
            </div>
            <div v-if="nextPaymentDeadline">
                <div class="text-sm text-gray-600">
                    Next payment deadline: {{ nextPaymentDeadlineFormatted }}
                </div>
                <div class="text-xs text-gray-500 mt-1">
                    Make a payment before this time to avoid default
                </div>
            </div>
            <Button :disabled="isApprovingForRepay || isRepaying" @click="handleRepayClick">Repay</Button>
        </div>
    </div>
</template>

<script setup lang="ts">
import useBorrow from '~/composables/useBorrow'
import MutationIds from '~/constants/mutationIds'
import { COLLATERAL_DECIMALS, COLLATERAL_NAME, CREDIT_DECIMALS, PROPOSAL_CHAIN_ID, CREDIT_NAME } from '~/constants/proposalConstants'
import { computedAsync } from '@vueuse/core'
import { formatUnits, parseUnits } from 'viem'
import { useMutation } from '@tanstack/vue-query'
import { useAccount } from '@wagmi/vue'
import { useAppKit } from "@reown/appkit/vue";
import { Toast, ToastStep, TOAST_ACTION_ID_TO_UNIQUE_ID_FN, ToastActionEnum } from '~/components/ui/toast/useToastsStore';
import useActionFlow from '~/components/ui/toast/useActionFlow';

const { isConnected, address: userAddress } = useAccount()
const { approveForAcceptIfNeeded, acceptProposal, getCollateralAmountFromCreditAmount, approveForRepayIfNeeded, repay, getRemainingDebt, getLoanId, getNextPaymentDeadline } = useBorrow()
const { open } = useAppKit();
const { totalDepositedAssetsFormatted } = useProposal()
const { isLoanActive } = useLoanStatus()

const toast = ref<Toast>()
let continueFlow: () => Promise<void> | undefined

const creditAmount = ref<number | string>(0)
const creditAmountBigInt = computed(() => {
    if (!creditAmount.value || creditAmount.value === 0 || creditAmount.value === '0') {
        return 0n
    }
    return parseUnits(String(creditAmount.value), CREDIT_DECIMALS)
})
const repaymentAmount = ref<number | string>(0)
const repaymentAmountBigInt = computed(() => {
    if (!repaymentAmount.value || repaymentAmount.value === 0 || repaymentAmount.value === '0') {
        return 0n
    }
    return parseUnits(String(repaymentAmount.value), CREDIT_DECIMALS)
})

const remainingDebt = computedAsync(async () => {
    const loanId = await getLoanId()
    return await getRemainingDebt(loanId)
})
const remainingDebtFormatted = computed<string>(() => remainingDebt.value ? formatUnits(remainingDebt.value, CREDIT_DECIMALS) : '0')

const nextPaymentDeadline = computedAsync(async () => {
    try {
        const loanId = await getLoanId()
        return await getNextPaymentDeadline(loanId)
    } catch {
        return null
    }
})

const nextPaymentDeadlineFormatted = computed<string>(() => {
    if (!nextPaymentDeadline.value) return 'N/A'
    const deadline = Number(nextPaymentDeadline.value) * 1000 // Convert to milliseconds
    const date = new Date(deadline)
    const now = Date.now()
    const timeUntilDeadline = deadline - now
    
    if (timeUntilDeadline < 0) {
        return `Overdue (${date.toLocaleString()})`
    }
    
    const days = Math.floor(timeUntilDeadline / (1000 * 60 * 60 * 24))
    const hours = Math.floor((timeUntilDeadline % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
    const minutes = Math.floor((timeUntilDeadline % (1000 * 60 * 60)) / (1000 * 60))
    
    if (days > 0) {
        return `${days} day${days !== 1 ? 's' : ''} ${hours} hour${hours !== 1 ? 's' : ''} (${date.toLocaleString()})`
    } else {
        return `${hours} hour${hours !== 1 ? 's' : ''} ${minutes} minute${minutes !== 1 ? 's' : ''} (${date.toLocaleString()})`
    }
})

const collateralAmount = computedAsync(async () => {
    const amount = await getCollateralAmountFromCreditAmount(creditAmountBigInt.value)
    return formatUnits(amount, COLLATERAL_DECIMALS)
})

const { isPending: isApproving, mutateAsync: approveForAcceptIfNeededMutateAsync } = useMutation({
    mutationKey: [MutationIds.ApproveForAcceptIfNeeded],
    mutationFn: async ({ step }: { step: ToastStep }) => {
        await approveForAcceptIfNeeded(step, creditAmountBigInt.value)
    },
    throwOnError: true,
})

const { isPending: isAccepting, mutateAsync: acceptProposalMutateAsync } = useMutation({
    mutationKey: [MutationIds.AcceptProposal],
    mutationFn: async ({ step }: { step: ToastStep }) => {
        await acceptProposal(step, creditAmountBigInt.value)
    },
    throwOnError: true,
})

const { isPending: isApprovingForRepay, mutateAsync: approveForRepayIfNeededMutateAsync } = useMutation({
    mutationKey: [MutationIds.ApproveForRepayIfNeeded],
    mutationFn: async ({ step }: { step: ToastStep }) => {
        await approveForRepayIfNeeded(step, repaymentAmountBigInt.value)
    },
    throwOnError: true,
})

const { isPending: isRepaying, mutateAsync: repayMutateAsync } = useMutation({
    mutationKey: [MutationIds.Repay],
    mutationFn: async ({ step }: { step: ToastStep }) => {
        await repay(step, repaymentAmountBigInt.value)
    },
    throwOnError: true,
})

const handleAcceptProposalClick = async () => {
    if (isLoanActive.value) {
        return
    }

    if (!isConnected.value) {
        open({ view: 'Connect' })
        return
    }

  const actionId = TOAST_ACTION_ID_TO_UNIQUE_ID_FN[ToastActionEnum.ACCEPT_PROPOSAL](String(creditAmount.value), userAddress.value!)

  if (toast.value?.id !== actionId) {
    const steps: ToastStep[] = []
    steps.push(new ToastStep({
        text: `Approving ${collateralAmount.value} ${COLLATERAL_NAME}...`,
        async fn(step) {
            await approveForAcceptIfNeededMutateAsync({ step })
            return true
        }
    }))

    steps.push(new ToastStep({
        text: `Accepting proposal with credit amount ${creditAmount.value} ${CREDIT_NAME}...`,
        async fn(step) {
            await acceptProposalMutateAsync({ step })
            return true
        },
    }))

    toast.value = new Toast({
      steps,
      chainId: PROPOSAL_CHAIN_ID,
      title: 'Accepting proposal',
    }, ToastActionEnum.ACCEPT_PROPOSAL, String(creditAmount.value), userAddress.value!);
    ({ continueFlow } = useActionFlow(toast as Ref<Toast>))
  }

  await continueFlow()
}

const handleRepayClick = async () => {
    if (!isConnected.value) {
        open({ view: 'Connect' })
        return
    }

    const actionId = TOAST_ACTION_ID_TO_UNIQUE_ID_FN[ToastActionEnum.REPAY](String(repaymentAmount.value), userAddress.value!)

    if (toast.value?.id !== actionId) {
        const steps: ToastStep[] = []
        steps.push(new ToastStep({
            text: `Approving ${repaymentAmount.value} ${CREDIT_NAME}...`,
            async fn(step) {
                await approveForRepayIfNeededMutateAsync({ step })
                return true
            }
        }))

        steps.push(new ToastStep({
            text: `Repaying ${repaymentAmount.value} ${CREDIT_NAME}...`,
            async fn(step) {
                await repayMutateAsync({ step })
                return true
            },
        }))

        toast.value = new Toast({
        steps,
        chainId: PROPOSAL_CHAIN_ID,
        title: 'Repaying',
        }, ToastActionEnum.REPAY, String(repaymentAmount.value), userAddress.value!);
        ({ continueFlow } = useActionFlow(toast as Ref<Toast>))
    }

    await continueFlow()    
}
</script>

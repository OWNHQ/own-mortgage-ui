<template>
    <div
class="bg-gray-900/30 border rounded-xl p-4 sm:p-6 order-3 lg:order-none shadow-lg hover:bg-gray-800/80 hover:shadow-xl hover:shadow-green-900/20 transition-all duration-300 cursor-text"
        @click="focusInput">
        <div class="mb-3">
            <h3 class="font-heading text-xl sm:text-2xl mb-1">Fund This Loan</h3>
            <p class="text-green-400 text-sm sm:text-base font-semibold">Get exclusive perks + fixed {{ MINIMAL_APR }}% APR for 5 years</p>
        </div>
        <hr class="mb-4" />
        <div class="mb-3">
            <AmountInput
                ref="amountInputRef" 
                placeholder="0.0" 
                :prefilled-amount="userDepositFormatted"
                input-height="h-[5rem] sm:h-[5rem]"
                override-is-disabled
                :credit-icon="CREDIT_ASSET_ICON" :credit-name="CREDIT_NAME" />
            <div v-if="isAmountInputLowerThanUserDeposit" class="mt-2 text-sm text-gray-2">
                Setting amount to {{ lendAmountFormatted }} {{ CREDIT_NAME }} will withdraw {{ amountToWithdrawFormatted
                }} {{ CREDIT_NAME }} from your commitment.
            </div>

            <Button
                size="lg"
                class="h-[3rem] w-full flex items-center mt-3 pl-6 pr-2 sm:pl-8 sm:pr-4 shadow-xl hover:shadow-2xl transition-all duration-300 rounded-bttn overflow-hidden"
                :disabled="!canSubmit || true" 
                @click="handleDepositClick">
                <div class="w-full min-w-0 overflow-hidden">
                    <div class="text-base sm:text-lg md:text-2xl font-bold text-left truncate whitespace-nowrap overflow-hidden">
                        Deposits ended
                    </div>
                    <div class="flex items-center gap-1 text-xs sm:text-sm mt-1">
                        <!-- <span v-if="amountToDepositAdditionally > 0n">+ earn minimum {{ MINIMAL_APR }}% or more</span> -->
                    </div>
                </div>
            </Button>

        </div>
        <DepositSuccessModal ref="notificationModal" />
    </div>
</template>

<script setup lang="ts">
import { CREDIT_NAME, CREDIT_DECIMALS, CREDIT_ADDRESS, CREDIT_ASSET_ICON, PROPOSAL_CHAIN_ID, MINIMAL_APR } from '~/constants/proposalConstants';
import { erc20Abi, parseUnits, encodeFunctionData, type Address, type Call } from 'viem';
import useAmountInputStore from '~/composables/useAmountInputStore';
import { useMutation } from '@tanstack/vue-query';
import { useReadContract, useAccount } from '@wagmi/vue';
import { ToastStep, Toast, TOAST_ACTION_ID_TO_UNIQUE_ID_FN, ToastActionEnum } from '~/components/ui/toast/useToastsStore';
import useActionFlow from '~/components/ui/toast/useActionFlow';
import DepositSuccessModal from '~/components/modals/DepositSuccessModal.vue';
import MutationIds from '~/constants/mutationIds';
import { useAppKit } from "@reown/appkit/vue";
import useProposal from '~/composables/useProposal';
import useUserDepositStore from '~/composables/useUserDepositStore';
import AmountInput from '~/components/AmountInput.vue';
import { OLD_PWN_CROWDSOURCE_LENDER_VAULT_ADDRESS, PWN_CROWDSOURCE_LENDER_VAULT_ADDRESS } from '~/constants/addresses';
import { useSendCalls } from '~/composables/useSendCalls';
import PWN_CROWDSOURCE_LENDER_VAULT_ABI from '~/assets/abis/v1.5/PWNCrowdsourceLenderVault';

const amountInputStore = useAmountInputStore()

const userDepositStore = useUserDepositStore()
const { userShares, oldVaultUserShares, oldVaultUserDeposit, userDeposit, userDepositFormatted } = storeToRefs(userDepositStore)
const {
    lendAmount,
    lendAmountBigInt,
    lendAmountFormatted,
    amountToWithdrawFormatted,
    amountToDepositAdditionally,
    amountToDepositAdditionallyFormatted,
    isAmountInputLowerThanUserDeposit
} = storeToRefs(amountInputStore)
const { address, isConnected } = useAccount()

const { refetchTotalDepositedAssets } = useProposal()

const { open } = useAppKit();

const { isWalletSupportsSendCalls, sendCallsMutation } = useSendCalls()

const notificationModal = ref<InstanceType<typeof DepositSuccessModal> | null>(null)

const amountInputRef = ref<InstanceType<typeof AmountInput> | null>(null)

const focusInput = () => {
    if (amountInputRef.value?.$el) {
        const input = amountInputRef.value.$el.querySelector('input')
        input?.focus()
    }
}

const isWithdrawingAll = computed(() => amountToWithdrawFormatted.value === userDepositFormatted.value)

const lendButtonText = computed(() => {
    // Show upgrade button if user has deposit in old vault and not withdrawing all
    if (oldVaultUserDeposit.value > 0n && !isWithdrawingAll.value && lendAmount.value !== '') {
        if (lendAmountBigInt.value === oldVaultUserDeposit.value) {
            return 'Upgrade for Higher Yield'
        } else if (isAmountInputLowerThanUserDeposit.value) {
            return 'Upgrade for Higher Yield & Withdraw ' + amountToWithdrawFormatted.value + ' ' + CREDIT_NAME
        } else {
            return 'Upgrade for Higher Yield & Deposit ' + amountToDepositAdditionallyFormatted.value + ' ' + CREDIT_NAME + ' More'
        }
    } else if (isAmountInputLowerThanUserDeposit.value) {
        if (isWithdrawingAll.value) {
            return 'Withdraw All ' + CREDIT_NAME
        } else if (Number(amountToWithdrawFormatted.value) >= 1000000000) {
            return 'Withdraw ' + parseFloat(amountToWithdrawFormatted.value).toExponential(3) + ' ' + CREDIT_NAME
        } else {
            return 'Withdraw ' + amountToWithdrawFormatted.value + ' ' + CREDIT_NAME
        }
    } else if (userDeposit.value > 0n && amountToDepositAdditionally.value > 0n) {
        if (Number(amountToDepositAdditionallyFormatted.value) >= 1000000000) {
            return 'Deposit ' + parseFloat(amountToDepositAdditionallyFormatted.value).toExponential(3) + ' ' + CREDIT_NAME
        } else {
            return 'Deposit ' + amountToDepositAdditionallyFormatted.value + ' ' + CREDIT_NAME + ' More'
        }
    } else if (userDeposit.value === 0n && amountToDepositAdditionally.value > 0n) {
        return 'Deposit & Earn'
    } else {
        return 'Change amount'
    }
})
 
console.log(lendButtonText)

const walletBalanceQuery = useReadContract({
    abi: erc20Abi,
    address: CREDIT_ADDRESS,
    functionName: 'balanceOf',
    args: [address as Ref<Address>],
})

const walletBalance = computed(() => walletBalanceQuery.data.value)

const walletBalancePlusUserDeposit = computed(() => {
    return (walletBalance.value ?? 0n) + (userDeposit.value ?? 0n)
})

const canSubmit = computed(() => {
    if (isApproving.value || isDepositing.value || isWithdrawing.value || isWithdrawingAllPending.value || isRedeemingFromOldVault.value || sendCallsMutation.isPending.value || lendAmount.value === '') {
        return false
    }

    if (!isConnected.value) {
        return true
    }

    if (oldVaultUserDeposit.value > 0n) {
        return true
    }

    // Allow withdrawal when user has deposit and wants to withdraw (amount is lower than deposit)
    // This includes empty string or '0' which means withdraw all
    if (userDeposit.value && userDeposit.value > 0n && isAmountInputLowerThanUserDeposit.value) {
        return true
    }

    // Don't allow submission if input is empty and user has no deposit
    if (lendAmount.value === '' && (!userDeposit.value || userDeposit.value === 0n)) {
        return false
    }

    if (amountToDepositAdditionally.value === 0n) {
        return false
    }

    if (userDeposit.value) {
        return true
    }

    const amountStr = lendAmount.value || '0'
    if (amountStr === '0' || amountStr === '') {
        return false
    }

    try {
        const amount = parseUnits(amountStr, CREDIT_DECIMALS)
        return amount > 0n && amount <= walletBalancePlusUserDeposit.value
    } catch {
        console.error('error parsing amount', amountStr)
        return false
    }
})

const toast = ref<Toast>()
let continueFlow: () => Promise<void> | undefined

const { checkApprovalNeeded, approveForDepositIfNeeded, deposit, withdraw, redeemAll, redeemFromOldVault } = useLend()

const { isPending: isApproving, mutateAsync: approveForDepositIfNeededMutateAsync } = useMutation({
    mutationKey: [MutationIds.ApproveForDepositIfNeeded],
    mutationFn: async ({ step }: { step: ToastStep }) => {
        await approveForDepositIfNeeded(step)
    },
    throwOnError: true,
})

const { isPending: isWithdrawing, mutateAsync: withdrawMutateAsync } = useMutation({
    mutationKey: [MutationIds.Withdraw],
    mutationFn: async ({ step }: { step: ToastStep }) => {
        await withdraw(parseUnits(amountToWithdrawFormatted.value, CREDIT_DECIMALS), step)
    },
    onSuccess() {
        refetchTotalDepositedAssets()
        userDepositStore.refetchUserShares()
    },
    throwOnError: true,
})

const { isPending: isWithdrawingAllPending, mutateAsync: withdrawAllMutateAsync } = useMutation({
    mutationKey: [MutationIds.WithdrawAll],
    mutationFn: async ({ step }: { step: ToastStep }) => {
        const vaultAddress = oldVaultUserDeposit.value > 0n ? OLD_PWN_CROWDSOURCE_LENDER_VAULT_ADDRESS : PWN_CROWDSOURCE_LENDER_VAULT_ADDRESS
        await redeemAll(vaultAddress, userShares.value, step)
    },
    onSuccess() {
        refetchTotalDepositedAssets()
        userDepositStore.refetchUserShares()
    },
    throwOnError: true,
})

const { isPending: isDepositing, mutateAsync: depositMutateAsync } = useMutation({
    mutationKey: [MutationIds.Deposit],
    mutationFn: async ({ step }: { step: ToastStep }) => {
        await deposit(step)
    },
    onSuccess() {
        refetchTotalDepositedAssets()
        userDepositStore.refetchUserShares()
        notificationModal.value?.openModal()
    },
    throwOnError: true,
})

const { isPending: isRedeemingFromOldVault, mutateAsync: redeemFromOldVaultMutateAsync } = useMutation({
    mutationKey: [MutationIds.RedeemFromOldVault],
    mutationFn: async ({ step }: { step: ToastStep }) => {
        await redeemFromOldVault(oldVaultUserShares.value, step)
    },
    throwOnError: true,
})

const handleDepositClick = async () => {
    if (!isConnected.value) {
        open({ view: 'Connect' })
        return
    }

    const actionId = TOAST_ACTION_ID_TO_UNIQUE_ID_FN[ToastActionEnum.DEPOSIT](lendAmount.value, address.value!)

    if (toast.value?.id !== actionId) {
        const steps: ToastStep[] = []

        // If user has old vault deposit and not withdrawing all, do upgrade flow
        if (oldVaultUserDeposit.value > 0n && !isWithdrawingAll.value && lendAmount.value !== '') {
            // Upgrade flow: redeem from old vault and deposit specified amount to new vault
            
            if (isWalletSupportsSendCalls.value) {
                // Batch transaction: create 1 step
                const calls: Call[] = []
                
                // Add redeem call from old vault
                const redeemCallData = encodeFunctionData({
                    abi: PWN_CROWDSOURCE_LENDER_VAULT_ABI,
                    functionName: 'redeem',
                    args: [oldVaultUserShares.value, address.value!, address.value!],
                })
                calls.push({
                    to: OLD_PWN_CROWDSOURCE_LENDER_VAULT_ADDRESS,
                    data: redeemCallData,
                })

                // Add approve call for new vault
                const approveCallData = encodeFunctionData({
                    abi: erc20Abi,
                    functionName: 'approve',
                    args: [PWN_CROWDSOURCE_LENDER_VAULT_ADDRESS, amountToDepositAdditionally.value],
                })
                calls.push({
                    to: CREDIT_ADDRESS,
                    data: approveCallData,
                })

                // Add deposit call to new vault
                const depositCallData = encodeFunctionData({
                    abi: PWN_CROWDSOURCE_LENDER_VAULT_ABI,
                    functionName: 'deposit',
                    args: [lendAmountBigInt.value, address.value!],
                })
                calls.push({
                    to: PWN_CROWDSOURCE_LENDER_VAULT_ADDRESS,
                    data: depositCallData,
                })

                const upgradeStep = new ToastStep({
                    text: `Upgrading to new vault: redeeming, approving, and depositing ${lendAmount.value} ${CREDIT_NAME}...`,
                    async fn(step) {
                        await sendCallsMutation.mutateAsync({ calls, step })
                        refetchTotalDepositedAssets()
                        notificationModal.value?.openModal()
                        return true
                    }
                })
                steps.push(upgradeStep)
            } else {
                // Individual transactions: create 3 separate steps
                steps.push(new ToastStep({
                    text: `Redeeming ${CREDIT_NAME} from old vault...`,
                    async fn(step) {
                        await redeemFromOldVaultMutateAsync({ step })
                        return true
                    }
                }))

                steps.push(new ToastStep({
                    text: `Approving ${amountToDepositAdditionallyFormatted.value} ${CREDIT_NAME}...`,
                    async fn(step) {
                        await approveForDepositIfNeededMutateAsync({ step })
                        return true
                    }
                }))

                steps.push(new ToastStep({
                    text: `Depositing ${lendAmount.value} ${CREDIT_NAME} to new vault...`,
                    async fn(step) {
                        await depositMutateAsync({ step })
                        return true
                    }
                }))
            }
        } else if (isAmountInputLowerThanUserDeposit.value) {
            if (isWithdrawingAll.value) {
                steps.push(new ToastStep({
                    text: `Withdrawing all your committed ${CREDIT_NAME}...`,
                    async fn(step) {
                        await withdrawAllMutateAsync({ step })
                        return true
                    }
                }))
            } else {
                steps.push(new ToastStep({
                    text: `Withdrawing ${amountToWithdrawFormatted.value} ${CREDIT_NAME}...`,
                    async fn(step) {
                        await withdrawMutateAsync({ step })
                        return true
                    }
                }))
            }
        } else {
            // Normal deposit flow
            // Check if approval is needed
            const needsApproval = await checkApprovalNeeded()

            if (needsApproval) {
                if (isWalletSupportsSendCalls.value) {
                    // Batch transaction: create 1 step
                    const calls: Call[] = []
                    
                    // Add approve call
                    const approveCallData = encodeFunctionData({
                        abi: erc20Abi,
                        functionName: 'approve',
                        args: [PWN_CROWDSOURCE_LENDER_VAULT_ADDRESS, amountToDepositAdditionally.value],
                    })
                    calls.push({
                        to: CREDIT_ADDRESS,
                        data: approveCallData,
                    })

                    // Add deposit call
                    const depositCallData = encodeFunctionData({
                        abi: PWN_CROWDSOURCE_LENDER_VAULT_ABI,
                        functionName: 'deposit',
                        args: [amountToDepositAdditionally.value, address.value!],
                    })
                    calls.push({
                        to: PWN_CROWDSOURCE_LENDER_VAULT_ADDRESS,
                        data: depositCallData,
                    })

                    let batchText
                    if (userDeposit.value > 0n) {
                        batchText = `Approving and depositing ${amountToDepositAdditionallyFormatted.value} ${CREDIT_NAME} more (on top of your ${userDepositFormatted.value} ${CREDIT_NAME})...`
                    } else {
                        batchText = `Approving and depositing ${lendAmount.value} ${CREDIT_NAME}...`
                    }

                    const batchStep = new ToastStep({
                        text: batchText,
                        async fn(step) {
                            await sendCallsMutation.mutateAsync({ calls, step })
                            refetchTotalDepositedAssets()
                            notificationModal.value?.openModal()
                            return true
                        }
                    })
                    steps.push(batchStep)
                } else {
                    // Individual transactions: create 2 separate steps
                    steps.push(new ToastStep({
                        text: `Approving ${amountToDepositAdditionallyFormatted.value} ${CREDIT_NAME}...`,
                        async fn(step) {
                            await approveForDepositIfNeededMutateAsync({ step })
                            return true
                        }
                    }))

                    let depositText
                    if (userDeposit.value > 0n) {
                        depositText = `Depositing ${amountToDepositAdditionallyFormatted.value} ${CREDIT_NAME} more (on top of your ${userDepositFormatted.value} ${CREDIT_NAME})...`
                    } else {
                        depositText = `Depositing ${lendAmount.value} ${CREDIT_NAME}...`
                    }

                    steps.push(new ToastStep({
                        text: depositText,
                        async fn(step) {
                            await depositMutateAsync({ step })
                            return true
                        }
                    }))
                }
            } else {
                steps.push(new ToastStep({
                    text: userDeposit.value > 0n ? `Depositing ${amountToDepositAdditionallyFormatted.value} ${CREDIT_NAME} more (on top of your ${userDepositFormatted.value} ${CREDIT_NAME})...` : `Depositing ${lendAmount.value} ${CREDIT_NAME}...`,
                    async fn(step) {
                        await depositMutateAsync({ step })
                        return true
                    }
                }))
            }
        }

        const isUpgrading = oldVaultUserDeposit.value > 0n && !isWithdrawingAll.value && lendAmount.value !== ''
        
        toast.value = new Toast({
            steps,
            chainId: PROPOSAL_CHAIN_ID,
            title: isAmountInputLowerThanUserDeposit.value ? 'Withdrawing' : (isUpgrading ? 'Upgrading' : 'Depositing'),
        }, ToastActionEnum.DEPOSIT, lendAmount.value, address.value!);
        ({ continueFlow } = useActionFlow(toast as Ref<Toast>))
    }

    await continueFlow()
}
</script>

<style scoped>
.rounded-bttn {
    border-radius: 4rem;
}
</style>
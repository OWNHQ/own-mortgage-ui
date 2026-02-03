<template>
    <div 
        id="rewards-section" 
        ref="rewardsBoxRef"
        class="bg-card border rounded-xl p-4 sm:p-6 order-4 lg:order-none shadow-lg transition-all duration-1000"
        :class="{ 'bg-gray-800/80 shadow-xl shadow-green-900/20': isHighlighted }"
    >
        <h3 class="font-heading text-xl sm:text-2xl mb-2">Exclusive Rewards</h3>
        <div class="mb-4 text-sm sm:text-base text-justify">
            Lend and get rewards! Get various rewards based on the amount of liquidity you are able to lend. <b>Remember you are only lending, not donating this amount</b> and the loan is slowly repayed every few months. You can claim any time!
        </div>
        <div class="mb-4 p-3 bg-blue-900/20 border border-blue-600/30 rounded-lg">
            <p class="text-sm text-blue-200">
                💡 To see what rewards you are eligible for, input the total amount in the amount input field in the Contribute box above.
            </p>
        </div>
        <hr class="mb-4"/>
        
        <!-- Rewards list -->
        <div class="space-y-3">
            <div 
                v-for="reward in REWARDS" 
                :key="reward.amount" 
                class="border rounded-lg p-3 transition-all duration-200 bg-background/30"
                :class="{
                    'bg-green-900/20 border-green-600/50': isAmountInputFilledAndEligibleForReward(reward.threshold),
                    'opacity-60': isAmountInputFilledAndNotEligibleForReward(reward.threshold)
                }"
            >
                <div class="flex justify-between items-center">
                    <div :class="{ 'opacity-75': isAmountInputFilledAndNotEligibleForReward(reward.threshold) }">
                        <div
                        class="font-medium" 
                        :class="{ 
                            'text-green-400': isAmountInputFilledAndEligibleForReward(reward.threshold), 
                            'text-gray-500': isAmountInputFilledAndNotEligibleForReward(reward.threshold),
                        }">
                            {{ reward.amount }}
                        </div>
                        <div
                        class="text-sm whitespace-pre-wrap" 
                        :class="{ 
                            'text-green-300': isAmountInputFilledAndEligibleForReward(reward.threshold), 
                            'text-gray-400': isAmountInputFilledAndNotEligibleForReward(reward.threshold),
                        }">
                            {{ reward.reward }}
                        </div>
                    </div>
                    <div v-if="isAmountInputFilledAndEligibleForReward(reward.threshold)" class="flex items-center gap-2 text-green-400 font-semibold text-sm">
                        <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                            <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
                        </svg>
                        <span>Eligible</span>
                    </div>
                    <!-- <div v-else-if="isAmountInputFilled" class="text-sm">
                        {{ getMissingAmount(reward.threshold) }} {{ CREDIT_NAME }} more needed
                    </div> -->
                </div>
            </div>
        </div>

        <div class="text-gray-2 mt-4 pl-1 italic">
            The reward will be tied to the address you are using to lend. Stay updated to claim your rewards:
            <button 
                class="text-blue-400 hover:text-blue-300 underline cursor-pointer"
                @click="notificationModalRef?.openModal()"
            >
                Subscribe
            </button>
            to our updates or contact info@bordel.wtf
        </div>

        <!-- Lenders Accordion -->
        <Accordion type="single" collapsible class="mt-4">
            <AccordionItem value="lenders" class="border-none">
                <AccordionTrigger class="py-3 px-0 hover:no-underline">
                    <span class="font-heading text-lg">Lenders ({{ totalLenders }})</span>
                </AccordionTrigger>
                <AccordionContent>
                    <template v-if="isConnected && userDeposit > 0n">
                        <div class="mb-4 p-3 border rounded-lg bg-background/50">
                            <div class="flex justify-between items-center">
                                <span class="font-medium text-sm text-gray-300">Your deposit:</span>
                                <span class="font-bold text-lg text-white">{{ userDepositFormatted }} {{ CREDIT_NAME }}</span>
                            </div>
                        </div>
                        <hr class="mb-4">
                    </template>

                    <div class="overflow-y-auto max-h-72 md:max-h-48 custom-scrollbar">
                        <template v-if="isLendersLoading && !lenders?.length">
                            <div v-for="i in 5" :key="i" class="py-1">
                                <Skeleton class="h-4 w-full" />
                            </div>
                        </template>
                        <template v-else>
                            <div 
                                v-for="lender in lenders" 
                                :key="lender.address" 
                                class="flex justify-between items-center py-1 text-xs sm:text-sm gap-2"
                            >
                                <span 
                                    class="max-w-[40%] sm:max-w-44 md:max-w-36 overflow-hidden text-ellipsis whitespace-nowrap" 
                                    :title="lender.address"
                                >
                                    {{ formatAddress(lender.address) }}
                                </span>
                                <span 
                                    class="font-bold transition-colors duration-300 text-right flex-shrink-0"
                                >
                                    {{ lender.formattedBalance }} {{ CREDIT_NAME }}
                                </span>
                            </div>
                            <template v-if="isLendersLoading">
                                <div v-for="i in 3" :key="i" class="py-1">
                                    <Skeleton class="h-4 w-full" />
                                </div>
                            </template>
                        </template>
                    </div>
                </AccordionContent>
            </AccordionItem>
        </Accordion>
    </div>
    <DepositSuccessModal ref="notificationModalRef" />
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { CREDIT_NAME } from '~/constants/proposalConstants';
import useAmountInputStore from '~/composables/useAmountInputStore';
import DepositSuccessModal from '~/components/modals/DepositSuccessModal.vue';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '~/components/ui/accordion';
import { Skeleton } from '~/components/ui/skeleton';
import { useCrowdsourceLender } from '~/composables/useCrowdsourceLender';
import { useAccount } from '@wagmi/vue';
import useUserDepositStore from '~/composables/useUserDepositStore';
import { useEnsNames } from '~/composables/useEnsNames';
import type { Address } from 'viem';

const amountInputStore = useAmountInputStore()
const { lendAmount } = storeToRefs(amountInputStore)

const notificationModalRef = ref<InstanceType<typeof DepositSuccessModal> | null>(null)
const rewardsBoxRef = ref<HTMLElement | null>(null)
const isHighlighted = ref(false)

// Lenders data
const { lenders, totalLenders, isLoading: isLendersLoading } = useCrowdsourceLender()
const { isConnected } = useAccount()
const userDepositStore = useUserDepositStore()
const { userDeposit, userDepositFormatted } = storeToRefs(userDepositStore)

// Extract addresses from lenders for ENS lookup
const lenderAddresses = computed(() => (lenders.value ?? []).map(lender => lender.address as Address))

// Fetch ENS names for all lenders
const { data: ensNamesMap } = useEnsNames(lenderAddresses)

// Format addresses to be more readable, using ENS name if available
const formatAddress = (address: string) => {
    // Check if we have an ENS name for this address (normalize for lookup)
    const normalizedAddress = address.toLowerCase()
    const ensName = ensNamesMap.value?.get(normalizedAddress)
    if (ensName) {
        return ensName
    }
    
    // Don't truncate named addresses (those ending with .eth)
    if (address.endsWith('.eth')) {
        return address
    }
    // Truncate regular addresses
    return address.substring(0, 6) + '...' + address.substring(address.length - 4)
}

// Watch for hash changes to trigger highlight effect
onMounted(() => {
    const handleHashChange = () => {
        if (window.location.hash === '#rewards-section') {
            isHighlighted.value = true
            setTimeout(() => {
                isHighlighted.value = false
            }, 3000)
        }
    }
    
    // Check on mount if already navigated to hash
    if (window.location.hash === '#rewards-section') {
        handleHashChange()
    }
    
    // Listen for hash changes
    window.addEventListener('hashchange', handleHashChange)
    
    // Cleanup
    onUnmounted(() => {
        window.removeEventListener('hashchange', handleHashChange)
    })
})

const isAmountInputFilled = computed(() => {
    return lendAmount.value && lendAmount.value.trim() !== ''
})

const isAmountInputFilledAndEligibleForReward = (rewardThreshold: number) => {
    return isAmountInputFilled.value && isEligibleForReward(rewardThreshold)
}

const isAmountInputFilledAndNotEligibleForReward = (rewardThreshold: number) => {
    return isAmountInputFilled.value && !isEligibleForReward(rewardThreshold)
}

const REWARDS = [
    {
        amount: `$1000+ ${CREDIT_NAME}`,
        reward: '2 month membership in BORDEL hackerspace \n\t + zk badge with opening party invite POAP NFT',
        threshold: 1000,
    },
    {
        amount: `$3000+ ${CREDIT_NAME}`,
        reward: '6 month membership \n\t + BORDEL supporter T-shirt \n\t + all extras above',
        threshold: 3000,
    },
    {
        amount: `$5000+ ${CREDIT_NAME}`,
        reward: '1 year membership \n\t + your free private event \n\t + all extras above',
        threshold: 5000,
    },
    {
        amount: `$10 000+ ${CREDIT_NAME}`,
        reward: '2 year VIP membership \n\t + own private zone, server hosting \n\t + 1x ETHPrague26 ticket \n\t + all extras above',
        threshold: 10000,
    },
    {
        amount: `$25 000+ ${CREDIT_NAME}`,
        reward: '5 year VIP membership \n\t + access all events, supporter art plaque \n\t + 1x ETHPrague26 VIP ticket \n\t + all extras above',
        threshold: 25000,
    },
    {
        amount: `$50 000+ ${CREDIT_NAME}`,
        reward: 'VIP supporter, custom reward and collaboration \n\t +1x ETHPrague VIP ticket until 2030',
        threshold: 50000,
    },
]

const isEligibleForReward = (reward: number) => {
    const amount = Number(lendAmount.value) || 0
    return amount >= reward
}

const _getMissingAmount = (reward: number) => {
    const amount = Number(lendAmount.value) || 0
    const missing = reward - amount
    return missing > 0 ? missing : 0
}
</script>

<style scoped>
.custom-scrollbar::-webkit-scrollbar {
    width: 6px;
}

.custom-scrollbar::-webkit-scrollbar-track {
    background: transparent;
}

.custom-scrollbar::-webkit-scrollbar-thumb {
    background: #374151;
    border-radius: 3px;
}

.custom-scrollbar::-webkit-scrollbar-thumb:hover {
    background: #4b5563;
}

/* Firefox */
.custom-scrollbar {
    scrollbar-width: thin;
    scrollbar-color: #374151 transparent;
}
</style>

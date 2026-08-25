<template>
    <div class="bg-card border rounded-xl p-4 sm:p-6 order-5 lg:order-none shadow-lg">
        <div class="mb-4">
            <h3 class="font-heading text-lg sm:text-xl mb-4">Lenders ({{ totalLenders }})</h3>
        </div>
        <hr class="mb-4">
        
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
            <template v-if="isLoading && !lenders?.length">
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
                <template v-if="isLoading">
                    <div v-for="i in 3" :key="i" class="py-1">
                        <Skeleton class="h-4 w-full" />
                    </div>
                </template>
            </template>
        </div>
    </div>
</template>

<script setup lang="ts">
import { CREDIT_NAME } from '~/constants/proposalConstants';
import { useCrowdsourceLender } from '~/composables/useCrowdsourceLender';
import { useAccount } from '@wagmi/vue';
import { Skeleton } from '~/components/ui/skeleton';
import useUserDepositStore from '~/composables/useUserDepositStore';
import { useEnsNames } from '~/composables/useEnsNames';
import type { Address } from 'viem';

// TODO adjust user deposits amount after the loan has defaulted so they show up correctly...

const { lenders, totalLenders, isLoading } = useCrowdsourceLender()

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

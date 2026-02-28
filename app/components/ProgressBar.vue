<template>
    <div>
        <!-- Stats Row -->
        <div class="hidden sm:flex justify-between items-center mb-3 text-sm sm:text-base">
            <div class="flex items-center gap-2">
                <span class="text-gray-400">Progress:</span>
                <span class="font-bold text-white">{{ progress }}% funded</span>
            </div>
            <div class="flex items-center gap-2">
                <span class="text-gray-400">Remaining:</span>
                <span class="font-bold text-white">{{ remainingFormatted }} {{ CREDIT_NAME }}</span>
            </div>
        </div>
        
        <!-- Progress Bar -->
        <div class="relative border p-3 rounded-lg">
            <div class="absolute inset-0 bg-gradient-to-r from-green-900/30 to-green-600/30 transition-all duration-500 ease-out rounded-lg" :style="{ width: `${progress}%` }"/>
            <div class="flex justify-center items-center gap-2 text-center relative font-semibold text-2xl sm:text-3xl transition-colors duration-300" :class="{ 'text-green-400': isHighlighting, 'text-white': !isHighlighting }">
                <span>{{ totalDepositedAssetsFormattedDecimals }} / {{ maxAmountFormattedDecimals }}</span>
                <img width="24" height="24" :src="CREDIT_ASSET_ICON" :alt="CREDIT_NAME" />
                <span> {{ CREDIT_NAME }}</span>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { CREDIT_NAME, MAX_AMOUNT_FORMATTED, CREDIT_ASSET_ICON } from '~/constants/proposalConstants'

const { totalDepositedAssets, totalDepositedAssetsFormatted } = useProposal()

const totalDepositedAssetsFormattedDecimals = computed(() => {
    return Math.floor(Number(totalDepositedAssetsFormatted.value)).toLocaleString()
})

const maxAmountFormattedDecimals = computed(() => MAX_AMOUNT_FORMATTED.toLocaleString())

// Calculate remaining amount
const remainingFormatted = computed(() => {
    const remaining = MAX_AMOUNT_FORMATTED - Number(totalDepositedAssetsFormatted.value)
    return Math.max(0, Math.floor(remaining)).toLocaleString()
})

// Calculate progress percentage
const progress = computed(() => {
    const percentage = (Number(totalDepositedAssetsFormatted.value) / MAX_AMOUNT_FORMATTED) * 100
    if (percentage > 100) {
        return 100
    }
    return Math.floor(percentage)
})

// Animation for value changes
const isHighlighting = ref(false)
const previousTotal = ref(totalDepositedAssets.value ?? 0n)

// Watch for changes in the total to trigger highlighting
watch(totalDepositedAssets, (newValue) => {
    if (newValue && newValue > previousTotal.value) {
        isHighlighting.value = true
        setTimeout(() => {
            isHighlighting.value = false
        }, 300) // Animation duration
    }
    previousTotal.value = newValue ?? 0n
})
</script>

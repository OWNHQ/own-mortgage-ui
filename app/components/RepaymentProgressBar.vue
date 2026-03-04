<template>
    <div>
        <!-- Progress Bar -->
        <div class="relative border p-3 rounded-lg">
            <div
                class="absolute inset-0 bg-gradient-to-r from-green-900/30 to-green-600/30 transition-all duration-500 ease-out rounded-lg"
                :style="{ width: `${repaymentProgress}%` }"
            />
            <div
                class="flex justify-center items-center gap-2 text-center relative font-semibold text-2xl sm:text-3xl transition-colors duration-300"
                :class="{ 'text-green-400': isHighlighting, 'text-white': !isHighlighting }"
            >
                <span>{{ totalAmountRepaidFormatted }} / {{ totalOwedFormatted }}</span>
                <img width="24" height="24" :src="CREDIT_ASSET_ICON" :alt="CREDIT_NAME" />
                <span>{{ CREDIT_NAME }}</span>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { CREDIT_NAME, CREDIT_ASSET_ICON } from '~/constants/proposalConstants'

const {
    totalAmountRepaid,
    totalAmountRepaidFormatted,
    totalOwedFormatted,
    repaymentProgress,
} = useLoanStatus()

// Animation for value changes
const isHighlighting = ref(false)
const previousRepaid = ref(totalAmountRepaid.value ?? 0n)

watch(totalAmountRepaid, (newValue) => {
    if (newValue && newValue > previousRepaid.value) {
        isHighlighting.value = true
        setTimeout(() => {
            isHighlighting.value = false
        }, 300)
    }
    previousRepaid.value = newValue ?? 0n
})
</script>

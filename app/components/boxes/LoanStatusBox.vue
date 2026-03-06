<template>
    <div class="bg-card border rounded-xl p-4 sm:p-6 mb-4 shadow-lg">
        <div class="flex flex-col sm:flex-row items-start sm:items-center gap-3 mb-4">
            <div class="flex-2">
                <div class="flex items-center gap-3 mb-1">
                    <h3 class="text-xl sm:text-2xl font-heading">Loan Dashboard</h3>
                    <span
                        class="px-2 py-0.5 rounded-full text-xs font-semibold"
                        :class="statusBadgeClass"
                    >
                        {{ statusBadgeText }}
                    </span>
                </div>
                <p class="text-gray-2 text-sm sm:text-base">
                    Track repayment progress, next payment deadline, and loan health.
                </p>
            </div>

            <div v-if="nextPaymentDeadline && loanStatus === 'active'" class="flex flex-1 items-center justify-end sm:justify-end">
                <div
                    class="flex items-center gap-2 py-2"
                    :class="isDeadlineClose ? 'px-3 bg-yellow-900/20 border border-yellow-600/30 rounded-lg' : 'px-0'"
                >
                    <span
                        class="text-sm font-semibold"
                        :class="isDeadlineClose ? 'text-yellow-400' : 'text-gray-400'"
                    >
                        Next Repayment Deadline:
                    </span>
                    <span
                        class="font-bold text-base sm:text-lg"
                        :class="isDeadlineClose ? 'text-yellow-400' : 'text-white'"
                    >
                        {{ deadlineCountdownText }}
                    </span>
                </div>
            </div>
        </div>

        <RepaymentProgressBar />

        <!-- Key Stats Grid -->
        <div class="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-4">
            <div class="border rounded-lg p-3 bg-background/50">
                <div class="text-sm text-gray">Principal</div>
                <div class="text-lg sm:text-xl font-semibold flex items-center gap-1">
                    <span>{{ maxAmountFormatted }}</span>
                    <img width="16" height="16" :src="CREDIT_ASSET_ICON" :alt="CREDIT_NAME" />
                </div>
            </div>
            <div class="border rounded-lg p-3 bg-background/50">
                <div class="text-sm text-gray">Total to Repay</div>
                <div class="text-lg sm:text-xl font-semibold flex items-center gap-1">
                    <span>{{ TOTAL_TO_REPAY.toLocaleString() }}</span>
                    <img width="16" height="16" :src="CREDIT_ASSET_ICON" :alt="CREDIT_NAME" />
                </div>
            </div>
            <div class="border rounded-lg p-3 bg-background/50">
                <div class="text-sm text-gray">Total Repaid</div>
                <div class="text-lg sm:text-xl font-semibold flex items-center gap-1 text-green-400">
                    <span>{{ totalAmountRepaidFormatted }}</span>
                    <img width="16" height="16" :src="CREDIT_ASSET_ICON" :alt="CREDIT_NAME" />
                </div>
            </div>
            <div class="border rounded-lg p-3 bg-background/50">
                <div class="text-sm text-gray">APR</div>
                <div class="text-lg sm:text-xl font-semibold">{{ MINIMAL_APR }}%</div>
            </div>
            <div class="border rounded-lg p-3 bg-background/50">
                <div class="text-sm text-gray">Loan Ends In</div>
                <div class="text-lg sm:text-xl font-semibold">{{ loanEndCountdownText }}</div>
            </div>
            <div v-if="isDefaulted" class="border border-red-600/30 rounded-lg p-3 bg-red-900/10">
                <div class="text-sm text-gray">Collateral Claimable</div>
                <div class="text-lg sm:text-xl font-semibold flex items-center gap-1 text-red-400">
                    <span>{{ totalCollateralAssetsFormatted }}</span>
                    <img width="16" height="16" :src="COLLATERAL_ASSET_ICON" :alt="COLLATERAL_NAME" />
                </div>
            </div>
            <div v-else class="border rounded-lg p-3 bg-background/50">
                <div class="text-sm text-gray">Avg. Monthly Payment</div>
                <div class="text-lg sm:text-xl font-semibold flex items-center gap-1">
                    <span>~{{ AVG_MONTHLY_PAYMENT.toLocaleString() }}</span>
                    <img width="16" height="16" :src="CREDIT_ASSET_ICON" :alt="CREDIT_NAME" />
                </div>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import {
    CREDIT_NAME,
    CREDIT_ASSET_ICON,
    COLLATERAL_NAME,
    COLLATERAL_ASSET_ICON,
    MINIMAL_APR,
    AVG_MONTHLY_PAYMENT,
} from '~/constants/proposalConstants'

const PRINCIPAL_AMOUNT = 180_295
const TOTAL_TO_REPAY = 192_500

const {
    loanStatus,
    isDefaulted,
    totalAmountRepaidFormatted,
    totalCollateralAssetsFormatted,
    nextPaymentDeadline,
    defaultTimestamp,
} = useLoanStatus()

const maxAmountFormatted = PRINCIPAL_AMOUNT.toLocaleString()

// Status badge
const statusBadgeText = computed(() => {
    switch (loanStatus.value) {
        case 'active': return 'Active'
        case 'defaulted': return 'Defaulted'
        case 'repaid': return 'Repaid'
        default: return 'Funding'
    }
})

const statusBadgeClass = computed(() => {
    switch (loanStatus.value) {
        case 'active': return 'bg-green-900/30 text-green-400 border border-green-600/30'
        case 'defaulted': return 'bg-red-900/30 text-red-400 border border-red-600/30'
        case 'repaid': return 'bg-blue-900/30 text-blue-400 border border-blue-600/30'
        default: return 'bg-gray-900/30 text-gray-400 border border-gray-600/30'
    }
})

// Deadline countdown
const deadlineCountdownText = ref('')
const loanEndCountdownText = ref('N/A')
let timer: ReturnType<typeof setInterval> | null = null

const isDeadlineClose = computed(() => {
    if (!nextPaymentDeadline.value) return false
    const deadlineMs = Number(nextPaymentDeadline.value) * 1000
    const now = Date.now()
    const daysRemaining = (deadlineMs - now) / (1000 * 60 * 60 * 24)
    return daysRemaining < 7
})

const updateCountdown = () => {
    if (!nextPaymentDeadline.value) {
        deadlineCountdownText.value = 'N/A'
        return
    }

    const deadlineMs = Number(nextPaymentDeadline.value) * 1000
    const now = Date.now()
    const distance = deadlineMs - now

    if (distance < 0) {
        deadlineCountdownText.value = 'Overdue'
        if (timer) clearInterval(timer)
        return
    }

    const days = Math.floor(distance / (1000 * 60 * 60 * 24))
    const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
    const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60))
    const seconds = Math.floor((distance % (1000 * 60)) / 1000)

    let str = ''
    if (days > 0) str += `${days}d `
    if (hours > 0) str += `${hours}h `
    if (minutes > 0 || days > 0 || hours > 0) str += `${minutes}m `
    str += `${seconds}s`

    deadlineCountdownText.value = str || '0s'
}

const updateLoanEndCountdown = () => {
    if (!defaultTimestamp.value || defaultTimestamp.value === 0n) {
        loanEndCountdownText.value = 'N/A'
        return
    }

    const endMs = Number(defaultTimestamp.value) * 1000
    const now = Date.now()
    const distance = endMs - now

    if (distance <= 0) {
        loanEndCountdownText.value = 'Ended'
        return
    }

    const days = Math.floor(distance / (1000 * 60 * 60 * 24))
    const months = Math.floor(days / 30)
    const remainingDays = days % 30

    if (months > 0) {
        loanEndCountdownText.value = remainingDays > 0 ? `${months}mo ${remainingDays}d` : `${months}mo`
    } else {
        const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
        loanEndCountdownText.value = days > 0 ? `${days}d ${hours}h` : `${hours}h`
    }
}

onMounted(() => {
    updateCountdown()
    updateLoanEndCountdown()
    timer = setInterval(() => {
        updateCountdown()
        updateLoanEndCountdown()
    }, 1000)
})

onUnmounted(() => {
    if (timer) clearInterval(timer)
})
</script>

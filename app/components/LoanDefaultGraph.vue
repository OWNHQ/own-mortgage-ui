<template>
    <div>
        <div class="mb-4">
            <p class="mb-2 text-sm sm:text-base text-justify">
                Repayments need to stay at or above the repayment threshold before the loan reaches default.
            </p>
            <ul class="list-disc list-inside space-y-1 text-xs sm:text-sm">
                <li>
                    <span class="font-semibold">Repayment threshold</span>
                    is the cumulative repayment amount needed before each point in the loan timeline. If repayments fall below this threshold, the loan defaults and repayment is no longer available.

                </li>
            </ul>
        </div>
        <div
            v-if="currentLoanMonth !== null"
            class="mb-3 grid gap-2 text-xs sm:grid-cols-2 sm:text-sm"
        >
            <div class="border rounded-lg bg-background/40 p-2">
                <div class="text-gray-2">Repayment threshold now</div>
                <div class="font-semibold text-[#60a5fa]">{{ currentRequiredRepaymentFormatted }} {{ CREDIT_NAME }}</div>
            </div>
            <div class="border rounded-lg bg-background/40 p-2">
                <div class="text-gray-2">Paid so far</div>
                <div class="font-semibold text-[#059669]">{{ currentRepaymentFormatted }} {{ CREDIT_NAME }}</div>
            </div>
        </div>
        <div class="h-72 sm:h-80">
            <Line :data="data" :options="options" :plugins="[currentRepaymentMarkerPlugin]" />
        </div>
    </div>
</template>
  
<script setup lang="ts">
import Decimal from "decimal.js";
import { formatUnits } from 'viem'
import {
  Chart as ChartJS,
  Title,
  Tooltip,
  Legend,
  LineElement,
  PointElement,
  LinearScale,
  type ChartData,
  type ChartOptions,
  type Plugin,
  type TooltipItem
} from 'chart.js'
import { Line } from 'vue-chartjs'
import {
  CREDIT_DECIMALS,
  CREDIT_NAME,
  LOAN_APY,
  LOAN_DURATION,
  LOAN_DURATION_IN_MONTHS,
  MAX_AMOUNT_FORMATTED,
  POSTPONEMENT,
} from '~/constants/proposalConstants'

ChartJS.register(Title, Tooltip, Legend, LineElement, PointElement, LinearScale)

type LoanChartPoint = {
  x: number
  y: number
}

const MONTH_IN_SECONDS = 365 * 24 * 60 * 60 / 12
const DAY_IN_SECONDS = 24 * 60 * 60
const YEAR_IN_SECONDS = 365 * DAY_IN_SECONDS
const APR_DECIMALS = 10_000
const CURRENT_REPAYMENT_DATASET_INDEX = 1
const REPAYMENT_THRESHOLD_COLOR = '#60a5fa'
const PAID_SO_FAR_COLOR = '#059669'
const amountFormatter = new Intl.NumberFormat('en-US', {
  maximumFractionDigits: 2,
})
const daysFormatter = new Intl.NumberFormat('en-US', {
  maximumFractionDigits: 0,
})
const monthFormatter = new Intl.NumberFormat('en-US', {
  maximumFractionDigits: 1,
})

const {
  isLoanActive,
  totalAmountRepaid,
  defaultTimestamp,
} = useLoanStatus()
const currentTimestamp = ref(Date.now() / 1000)
let currentTimestampTimer: ReturnType<typeof setInterval> | null = null

const formatAmount = (value: number) => amountFormatter.format(value)
const formatMonth = (value: number) => `${monthFormatter.format(value)}m`
const formatDays = (value: number) => `${daysFormatter.format(value)} days`
const formatTimelineTick = (value: number) => {
  if (value === 0) return 'Start'
  if (value === zeroRepaymentWindowMonths.value) return `Grace ends (${formatDays(zeroRepaymentWindowDays.value)})`
  if (value % 12 === 0) return `${value / 12}y`
  return `${value}m`
}

const loanApr = LOAN_APY / APR_DECIMALS
const repaymentPeriodSeconds = LOAN_DURATION - POSTPONEMENT
const principalAmount = MAX_AMOUNT_FORMATTED
const debtLimitAtSecond = (elapsedSeconds: number) => {
  return principalAmount * (LOAN_DURATION - elapsedSeconds) / repaymentPeriodSeconds
}
const debtWithoutRepaymentAtSecond = (elapsedSeconds: number) => {
  return principalAmount * (1 + (loanApr * elapsedSeconds / YEAR_IN_SECONDS))
}
const zeroRepaymentWindowSeconds = computed(() => {
  const numerator = POSTPONEMENT / repaymentPeriodSeconds
  const denominator = (loanApr / YEAR_IN_SECONDS) + (1 / repaymentPeriodSeconds)

  return numerator / denominator
})
const zeroRepaymentWindowDays = computed(() => zeroRepaymentWindowSeconds.value / DAY_IN_SECONDS)
const zeroRepaymentWindowMonths = computed(() => zeroRepaymentWindowSeconds.value / MONTH_IN_SECONDS)
const zeroRepaymentWindowFormatted = computed(() => formatDays(zeroRepaymentWindowDays.value))
const getRequiredRepaymentAtMonth = (month: number) => {
  const elapsedSeconds = month * MONTH_IN_SECONDS
  if (elapsedSeconds <= zeroRepaymentWindowSeconds.value) return 0

  return new Decimal(debtWithoutRepaymentAtSecond(elapsedSeconds))
    .minus(debtLimitAtSecond(elapsedSeconds))
    .toDecimalPlaces(2)
    .toNumber()
}
const getRequiredRepaymentChartPoint = (month: number) => {
  return {
    x: month,
    y: Math.max(0, getRequiredRepaymentAtMonth(month)),
  }
}
const finalRequiredRepayment = computed(() => {
  return new Decimal(debtWithoutRepaymentAtSecond(LOAN_DURATION))
    .toDecimalPlaces(2)
    .toNumber()
})

const repaymentData = computed<LoanChartPoint[]>(() => [
  ...Array.from({ length: LOAN_DURATION_IN_MONTHS + 1 }, (_, month) => getRequiredRepaymentChartPoint(month)),
  getRequiredRepaymentChartPoint(zeroRepaymentWindowMonths.value),
].sort((a, b) => a.x - b.x))

const currentLoanMonth = computed<number | null>(() => {
  if (!isLoanActive.value || defaultTimestamp.value === 0n) return null

  const loanStartTimestamp = Number(defaultTimestamp.value) - LOAN_DURATION
  const elapsedSeconds = currentTimestamp.value - loanStartTimestamp
  const elapsedMonths = elapsedSeconds / MONTH_IN_SECONDS

  return Math.min(Math.max(elapsedMonths, 0), LOAN_DURATION_IN_MONTHS)
})

const currentRepayment = computed(() => {
  return Number(formatUnits(totalAmountRepaid.value, CREDIT_DECIMALS))
})

const currentRequiredRepayment = computed(() => {
  if (currentLoanMonth.value === null) return 0
  return getRequiredRepaymentAtMonth(currentLoanMonth.value)
})

const currentRepaymentPoint = computed<LoanChartPoint[]>(() => {
  if (currentLoanMonth.value === null) return []

  return [{
    x: currentLoanMonth.value,
    y: currentRepayment.value,
  }]
})

const currentRepaymentFormatted = computed(() => formatAmount(currentRepayment.value))
const currentRequiredRepaymentFormatted = computed(() => formatAmount(currentRequiredRepayment.value))

onMounted(() => {
  currentTimestamp.value = Date.now() / 1000
  currentTimestampTimer = setInterval(() => {
    currentTimestamp.value = Date.now() / 1000
  }, 60_000)
})

onUnmounted(() => {
  if (currentTimestampTimer) clearInterval(currentTimestampTimer)
})

const data = computed<ChartData<'line', LoanChartPoint[]>>(() => ({
  datasets: [
    {
      label: 'Repayment Threshold',
      data: repaymentData.value,
      borderColor: REPAYMENT_THRESHOLD_COLOR,
      borderDash: [],
      borderWidth: 2,
      fill: false,
      tension: 0,
      pointRadius: 0,
      hoverRadius: 5,
    },
    {
      label: 'Paid So Far',
      data: currentRepaymentPoint.value,
      borderColor: PAID_SO_FAR_COLOR,
      backgroundColor: PAID_SO_FAR_COLOR,
      borderWidth: 2,
      pointRadius: 5,
      pointHoverRadius: 7,
      showLine: false,
    },
  ]
}))

const currentRepaymentMarkerPlugin: Plugin<'line'> = {
  id: 'currentRepaymentMarkerLabel',
  afterDatasetsDraw(chart) {
    if (currentLoanMonth.value === null) return

    const point = chart.getDatasetMeta(CURRENT_REPAYMENT_DATASET_INDEX).data[0]
    if (!point) return

    const position = point.tooltipPosition(true)
    if (position.x === null || position.y === null) return

    const text = `Paid so far: ${currentRepaymentFormatted.value} ${CREDIT_NAME}`
    const paddingX = 8
    const paddingY = 5
    const borderRadius = 6
    const labelHeight = 14 + paddingY * 2
    const { ctx, chartArea } = chart

    ctx.save()
    ctx.font = '600 12px sans-serif'
    const labelWidth = ctx.measureText(text).width + paddingX * 2
    const labelX = Math.min(Math.max(position.x + 10, chartArea.left), chartArea.right - labelWidth)
    const labelY = Math.max(position.y - 34, chartArea.top + 2)

    ctx.fillStyle = 'rgba(17, 24, 39, 0.92)'
    ctx.strokeStyle = PAID_SO_FAR_COLOR
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.roundRect(labelX, labelY, labelWidth, labelHeight, borderRadius)
    ctx.fill()
    ctx.stroke()
    ctx.fillStyle = PAID_SO_FAR_COLOR
    ctx.textBaseline = 'middle'
    ctx.fillText(text, labelX + paddingX, labelY + labelHeight / 2)
    ctx.restore()
  },
}

const options: ChartOptions<'line'> = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    tooltip: {
      mode: 'nearest',
      intersect: false,
      callbacks: {
        title: (items) => {
          const month = items[0]?.parsed.x
          return typeof month === 'number' ? `Loan timeline: month ${formatMonth(month)}` : ''
        },
        label: (context: TooltipItem<'line'>) => {
          if (context.parsed.y === null) return ''

          const formattedValue = formatAmount(context.parsed.y)
          return `${context.dataset.label}: ${formattedValue} ${CREDIT_NAME}`
        }
      }
    }
  },
  interaction: {
    mode: 'nearest',
    intersect: false,
    axis: 'x',
  },
  scales: {
    y: {
      type: 'linear',
      title: {
        display: true,
        text: `Cumulative repayments (${CREDIT_NAME})`
      },
      beginAtZero: true,
      suggestedMax: finalRequiredRepayment.value,
      ticks: {
        callback: (value) => formatAmount(Number(value)),
      },
    },
    x: {
      type: 'linear',
      min: 0,
      max: LOAN_DURATION_IN_MONTHS,
      title: {
        display: true,
        text: `Loan timeline (grace period ends after ${zeroRepaymentWindowFormatted.value})`
      },
      ticks: {
        stepSize: 6,
        callback: (value) => formatTimelineTick(Number(value)),
      },
    },
  }
}
</script>

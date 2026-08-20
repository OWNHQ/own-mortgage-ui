<template>
  <section
    id="repayment-history"
    ref="rootElement"
    class="repayment-performance"
    :class="{ 'is-collapsed': !isExpanded }"
    data-repayment-schedule
    tabindex="-1"
    :aria-busy="isInitialHistoryLoading"
    aria-labelledby="repayment-performance-title"
  >
    <header class="repayment-performance__header">
      <div>
        <h3 id="repayment-performance-title">Repayment schedule &amp; history</h3>
        <span>{{ summary }}</span>
      </div>

      <button
        class="repayment-performance__disclosure"
        type="button"
        :aria-expanded="isExpanded"
        aria-controls="repayment-performance-content"
        :disabled="!canExpandRepayment"
        @click="toggleExpanded"
      >
        {{ isExpanded ? 'HIDE SCHEDULE & HISTORY ↑' : 'SHOW SCHEDULE & HISTORY ↓' }}
      </button>

      <div v-if="!isExpanded" class="repayment-performance__snapshot">
        <div class="repayment-performance__snapshot-labels" aria-hidden="true">
          <span>{{ repaymentRepaidLabel }} REPAID</span>
          <span>{{ repaymentRemainingLabel }} {{ repaymentRemainingCaption }}</span>
          <span>{{ repaymentTargetLabel }} TOTAL TARGET</span>
        </div>
        <progress
          :value="repaymentProgressKnown ? repaymentProgressValue : undefined"
          :max="repaymentProgressMax"
          aria-label="Repayment progress"
          :aria-valuetext="repaymentProgressText"
        />
      </div>
    </header>

    <div v-if="isExpanded" id="repayment-performance-content">
      <div class="repayment-chart-band">
        <div class="repayment-chart-band__top">
          <div class="repayment-chart-band__metric">
            <p>{{ metricLabel }}</p>
            <div>
              <strong>{{ metricValue }}</strong>
            </div>
          </div>

          <div class="repayment-performance__legend" aria-label="Chart series">
            <button
              type="button"
              :aria-pressed="hasActualSeries && showActual"
              :disabled="!hasActualSeries"
              @click="showActual = !showActual"
            >
              <i class="is-actual" aria-hidden="true" />
              {{ actualLegendLabel }}
            </button>
            <button type="button" :aria-pressed="showScheduled" @click="showScheduled = !showScheduled">
              <i class="is-scheduled" aria-hidden="true" />
              ESTIMATED
            </button>
          </div>
        </div>

        <div
          ref="chartElement"
          class="repayment-chart"
          tabindex="0"
          role="group"
          :aria-label="chartAriaLabel"
          aria-describedby="repayment-chart-instructions"
          @blur="isKeyboardActive = false"
          @focus="isKeyboardActive = true"
          @keydown="handleChartKeydown"
          @pointerleave="isPointerActive = false"
          @pointermove="setChartMonthFromPointer"
        >
          <p id="repayment-chart-instructions" class="sr-only">
            Use the left and right arrow keys to inspect estimated and actual cumulative repayments by month.
          </p>

          <svg
            class="repayment-chart__svg"
            :viewBox="`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`"
            aria-hidden="true"
          >
            <g class="repayment-chart__grid">
              <line
                v-for="tick in yAxisTicks"
                :key="tick.value"
                :x1="PLOT_LEFT"
                :x2="PLOT_RIGHT"
                :y1="tick.y"
                :y2="tick.y"
              />
            </g>

            <g class="repayment-chart__axis-labels">
              <text
                v-for="tick in yAxisTicks"
                :key="`y-${tick.value}`"
                x="0"
                :y="tick.y + 4"
              >{{ tick.label }}</text>
              <text
                v-for="tick in xAxisTicks"
                :key="`x-${tick.month}`"
                :x="tick.x"
                :y="tick.y"
                :text-anchor="tick.anchor"
              >{{ tick.label }}</text>
            </g>

            <path
              v-if="showScheduled"
              class="repayment-chart__scheduled"
              :d="scheduledPath"
            />

            <g v-if="showActual && hasActualSeries" class="repayment-chart__actual">
              <path :d="actualPath" />
              <template v-if="!isRunningDesignPreview">
                <circle
                  v-for="point in actualChartPoints"
                  :key="point.key"
                  :cx="point.x"
                  :cy="point.y"
                  r="5"
                />
              </template>
            </g>

            <g class="repayment-chart__marker">
              <line
                :x1="timelineMarker.x"
                :x2="timelineMarker.x"
                :y1="PLOT_TOP - 18"
                :y2="PLOT_BOTTOM"
              />
              <text
                v-if="!isRunningDesignPreview"
                :x="timelineMarker.x"
                :y="PLOT_TOP - 25"
                text-anchor="middle"
              >
                {{ timelineMarker.label }}
              </text>
            </g>
          </svg>

          <div
            v-if="showChartTooltip"
            class="repayment-chart__tooltip"
            :style="tooltipStyle"
            aria-live="polite"
          >
            <span>MONTH {{ activeMonth }}</span>
            <div class="repayment-chart__tooltip-series is-scheduled">
              <small>EXPECTED CUMULATIVE</small>
              <strong>{{ formatCurrency(activeScheduledAmount) }}</strong>
            </div>
            <div v-if="hasActualSeries" class="repayment-chart__tooltip-series is-actual">
              <small>REPAID</small>
              <strong>{{ formatCurrency(activeActualAmount) }}</strong>
            </div>
          </div>
        </div>
      </div>

      <div class="repayment-ledger__intro">
        <div>
          <h4>Repayment ledger</h4>
          <p id="repayment-ledger-caption">{{ ledgerCaption }}</p>
        </div>

        <button
          v-if="historyError"
          type="button"
          :disabled="isLoading"
          @click="refreshHistory"
        >
          RETRY HISTORY
        </button>
      </div>

      <div class="repayment-ledger" tabindex="0">
        <table aria-describedby="repayment-ledger-caption">
          <thead>
            <tr>
              <th scope="col">DUE</th>
              <th scope="col">ESTIMATED</th>
              <th scope="col">PAID</th>
              <th scope="col">PAID ON</th>
              <th scope="col">STATUS</th>
              <th scope="col">TRANSACTION</th>
            </tr>
          </thead>
          <tbody>
            <template v-for="entry in visibleEntries" :key="entry.index">
              <tr
                v-if="isCompactGapBoundary(entry)"
                class="repayment-ledger__omitted"
                :class="{ 'is-today-boundary-before': isTodayBoundaryInCompactGap(entry) }"
              >
                <td colspan="6">
                  <button type="button" @click="showAllEntries = true">
                    {{ hiddenCompactEntryCount }} PAID {{ hiddenCompactEntryCount === 1 ? 'REPAYMENT' : 'REPAYMENTS' }} HIDDEN · SHOW ALL ↓
                  </button>
                </td>
              </tr>
              <tr
                :class="{
                  'is-first-deadline': entry.index === 0,
                  'is-today-boundary-before': isTodayBoundaryBefore(entry),
                  'is-today-boundary-after': isTodayBoundaryAfterVisibleEntries(entry),
                }"
              >
                <td>
                  <div class="repayment-ledger__due">
                    <span>{{ entry.dueLabel }}</span>
                    <small v-if="entry.index === 0" class="repayment-ledger__first-label">FIRST</small>
                  </div>
                </td>
                <td>{{ formatLedgerCurrency(entry.scheduledAmount) }}</td>
                <td>{{ rowPaid(entry) }}</td>
                <td>{{ rowPaidOn(entry) }}</td>
                <td :class="statusClass(entry)">{{ rowStatus(entry) }}</td>
                <td>
                  <template v-if="entry.allocations.length">
                    <a
                      v-for="allocation in entry.allocations"
                      :key="`${allocation.event.transactionHash}:${allocation.event.logIndex}`"
                      :href="transactionUrl(allocation.event.transactionHash)"
                      target="_blank"
                      rel="noopener noreferrer"
                    >{{ shortHash(allocation.event.transactionHash) }} ↗</a>
                  </template>
                  <span v-else>—</span>
                </td>
              </tr>
            </template>
          </tbody>
        </table>
      </div>

      <footer class="repayment-ledger__footer">
        <button type="button" :aria-expanded="showAllEntries" @click="showAllEntries = !showAllEntries">
          {{ showAllEntries ? 'SHOW 3 LAST + 3 NEXT ↑' : `SHOW ALL ${scheduleEntries.length} REPAYMENTS ↓` }}
        </button>
      </footer>
    </div>
  </section>
</template>

<script setup lang="ts">
import { useNow } from '@vueuse/core'
import { computed, nextTick, ref, watch } from 'vue'
import { formatUnits, type Hex } from 'viem'
import useLoanStatus from '~/composables/useLoanStatus'
import type { RepaymentHistoryEvent } from '~/composables/useRepaymentHistory'
import { getExplorerTransactionDetailsLink } from '~/constants/links'
import {
  calculateAmortizedCumulativeRepayment,
  calculateScheduledRepaymentAmount,
  calculateZeroRepaymentWindowSeconds,
  REPAYMENT_MONTH_IN_SECONDS as MONTH_IN_SECONDS,
  REPAYMENT_YEAR_IN_SECONDS as YEAR_IN_SECONDS,
} from '~/lib/repayment-model'
import {
  CREDIT_DECIMALS,
  MAX_AMOUNT_FORMATTED,
} from '~/constants/proposalConstants'
import type { LoanLifecycleViewState } from './types'

type RepaymentAllocation = {
  amount: bigint
  event: RepaymentHistoryEvent
}

type ScheduleEntry = {
  allocations: RepaymentAllocation[]
  cumulativeActual: number
  cumulativeScheduled: number
  dueLabel: string
  dueTimestamp: number
  index: number
  month: number
  paidAmount: bigint
  scheduledAmount: number
}

const props = withDefaults(defineProps<{
  defaultExpanded?: boolean
  state: LoanLifecycleViewState
}>(), {
  defaultExpanded: false,
})
const emit = defineEmits<{
  ready: []
}>()

const CHART_WIDTH = 1250
const CHART_HEIGHT = 347
const PLOT_LEFT = 62
const PLOT_RIGHT = 1205
const PLOT_TOP = 127
const PLOT_BOTTOM = 259
const X_AXIS_LABEL_Y = 313
const DESIGN_PREVIEW_DURATION_MONTHS = 36
const DESIGN_PREVIEW_TOTAL_INTEREST_RATE = .0875
const DESIGN_PREVIEW_PRINCIPAL = 1_000_000
const RUNNING_PREVIEW_PAYMENT = 24_167
const RUNNING_PREVIEW_ACTUAL_POINTS = [
  { month: 3.466, value: 132_353 },
  { month: 6.689, value: 294_118 },
  { month: 9.974, value: 426_471 },
  { month: 13.377, value: 426_471 },
] as const
const VALID_PREVIEW_STATES: LoanLifecycleViewState[] = ['under-review', 'fundraising', 'running', 'repaid', 'defaulted']

const route = useRoute()
const rootElement = ref<HTMLElement>()
const chartElement = ref<HTMLElement>()
const isExpanded = ref(false)
const showActual = ref(true)
const showScheduled = ref(true)
const showAllEntries = ref(false)
const activeMonth = ref(0)
const isPointerActive = ref(false)
const isKeyboardActive = ref(false)
const currentTime = useNow({ interval: 60_000 })

const {
  apr,
  aprDecimals,
  defaultTimestamp,
  firstPaymentDeadline,
  loanDurationMonths,
  loanDurationSeconds,
  loanPostponementMonths,
  loanPostponementSeconds,
  loanStartTimestamp: onchainLoanStartTimestamp,
  originalPrincipal,
  repaymentCount,
  repaymentEvents,
  repaymentPlan,
  repaymentPeriodSeconds,
  isLoanStatusReady,
  loanStatusError,
  loanEventsError: historyError,
  areLoanEventsLoading: isLoading,
  refetchLoanEvents: refreshHistory,
} = useLoanStatus()

const routePreviewState = computed<LoanLifecycleViewState | undefined>(() => {
  if (!import.meta.dev) return undefined
  const requestedState = typeof route.query.state === 'string' ? route.query.state : ''
  return VALID_PREVIEW_STATES.includes(requestedState as LoanLifecycleViewState)
    ? requestedState as LoanLifecycleViewState
    : undefined
})
const isBorrowerDesignPreview = computed(() => import.meta.dev
  && props.state === 'running'
  && (route.query.previewWallet === '1' || typeof route.query.repaymentStep === 'string'))
const isDesignPreview = computed(() => routePreviewState.value === props.state || isBorrowerDesignPreview.value)
const isRunningDesignPreview = computed(() => isDesignPreview.value && props.state === 'running')
const displayDurationMonths = computed(() => isDesignPreview.value
  ? DESIGN_PREVIEW_DURATION_MONTHS
  : loanDurationMonths.value)
const displayDurationSeconds = computed(() => isDesignPreview.value
  ? DESIGN_PREVIEW_DURATION_MONTHS * MONTH_IN_SECONDS
  : loanDurationSeconds.value)
const displayPostponementSeconds = computed(() => isDesignPreview.value
  ? 0
  : loanPostponementSeconds.value)
const displayPostponementMonths = computed(() => isDesignPreview.value
  ? 0
  : loanPostponementMonths.value)
const displayRepaymentCount = computed(() => isDesignPreview.value
  ? DESIGN_PREVIEW_DURATION_MONTHS
  : repaymentCount.value)
const displayApr = computed(() => {
  if (isDesignPreview.value) {
    return DESIGN_PREVIEW_TOTAL_INTEREST_RATE * YEAR_IN_SECONDS / displayDurationSeconds.value
  }
  return aprDecimals.value > 0n
    ? Number(apr.value) / 10 ** Number(aprDecimals.value)
    : 0
})
const previewPaidCount = computed(() => ({
  'under-review': 0,
  fundraising: 0,
  running: 12,
  repaid: 36,
  defaulted: 15,
})[props.state])
const previewPrincipalPaid = computed(() => ({
  'under-review': 0,
  fundraising: 0,
  running: 300_000,
  repaid: 1_000_000,
  defaulted: 416_667,
})[props.state])

const historyEnabled = computed(() => !isDesignPreview.value
  && props.state !== 'fundraising'
  && props.state !== 'under-review')

const principalTarget = computed(() => {
  if (isDesignPreview.value) return DESIGN_PREVIEW_PRINCIPAL
  if (props.state === 'fundraising' || props.state === 'under-review') return MAX_AMOUNT_FORMATTED
  return Number(formatUnits(originalPrincipal.value, CREDIT_DECIMALS))
})
const loanStartTimestamp = computed(() => Number(onchainLoanStartTimestamp.value))
const previewRepaymentModelTerms = computed(() => ({
  annualRate: displayApr.value,
  durationSeconds: displayDurationSeconds.value,
  postponementSeconds: displayPostponementSeconds.value,
  principal: principalTarget.value,
}))
const zeroRepaymentWindowSeconds = computed(() => isDesignPreview.value
  ? calculateZeroRepaymentWindowSeconds(previewRepaymentModelTerms.value)
  : displayPostponementSeconds.value)
const zeroRepaymentWindowMonths = computed(() => zeroRepaymentWindowSeconds.value / MONTH_IN_SECONDS)
const firstRepaymentTimestamp = computed(() => {
  return firstPaymentDeadline.value ? Number(firstPaymentDeadline.value) : 0
})
const hasLiveRepaymentTerms = computed(() => loanDurationSeconds.value > 0
  && repaymentPeriodSeconds.value > 0
  && repaymentCount.value > 0
  && repaymentPlan.value.paymentCount === repaymentCount.value
  && repaymentPlan.value.monthlyPayment > 0)
const finalScheduledAmount = computed(() => isDesignPreview.value
  ? scheduledAmountAtMonth(displayDurationMonths.value)
  : repaymentPlan.value.totalRepayment)
const previewCumulativeRepayment = computed(() => {
  if (isRunningDesignPreview.value) return previewPrincipalPaid.value
  return isDesignPreview.value
    ? finalScheduledAmount.value * previewPaidCount.value / DESIGN_PREVIEW_DURATION_MONTHS
    : 0
})
const cumulativeActualAmount = computed(() => {
  if (isDesignPreview.value) return previewCumulativeRepayment.value
  const lastEvent = repaymentEvents.value.at(-1)
  return lastEvent ? toTokenAmount(lastEvent.cumulativeRepayment) : 0
})
const hasActualHistory = computed(() => historyEnabled.value && repaymentEvents.value.length > 0)
const isInitialHistoryLoading = computed(() => historyEnabled.value
  && isLoading.value
  && !hasActualHistory.value)
const isRepaymentViewReady = computed(() => {
  if (isDesignPreview.value || props.state === 'under-review') return true
  if (historyError.value || loanStatusError.value) return true
  if (!isLoanStatusReady.value || isInitialHistoryLoading.value) return false
  if (props.state === 'fundraising') return true
  return hasLiveRepaymentTerms.value && originalPrincipal.value > 0n
})
const canExpandRepayment = computed(() => {
  if (isDesignPreview.value) return true
  if (!historyEnabled.value) return false

  return !loanStatusError.value
    && isLoanStatusReady.value
    && !isInitialHistoryLoading.value
    && hasLiveRepaymentTerms.value
    && originalPrincipal.value > 0n
    && firstPaymentDeadline.value !== null
})
const hasAppliedDefaultExpansion = ref(false)
const hasEmittedReady = ref(false)

watch(canExpandRepayment, (canExpand) => {
  if (!canExpand) {
    isExpanded.value = false
    hasAppliedDefaultExpansion.value = false
    return
  }
  if (hasAppliedDefaultExpansion.value) return

  hasAppliedDefaultExpansion.value = true
  if (props.defaultExpanded) isExpanded.value = true
}, { immediate: true })

watch(isRepaymentViewReady, (isReady) => {
  if (!isReady || hasEmittedReady.value) return
  hasEmittedReady.value = true
  emit('ready')
}, { immediate: true })
const hasActualSeries = computed(() => isDesignPreview.value ? previewPaidCount.value > 0 : hasActualHistory.value)
const repaymentTargetAmount = computed(() => {
  if (isRunningDesignPreview.value) return DESIGN_PREVIEW_PRINCIPAL
  return Math.max(0, finalScheduledAmount.value)
})
const repaymentRepaidAmount = computed(() => Math.max(0, cumulativeActualAmount.value))
const repaymentRemainingAmount = computed(() => Math.max(
  0,
  repaymentTargetAmount.value - repaymentRepaidAmount.value,
))
const repaymentProgressKnown = computed(() => {
  if (isDesignPreview.value || !historyEnabled.value) return true
  return hasLiveRepaymentTerms.value && !isLoading.value && originalPrincipal.value > 0n
})
const repaymentProgressValue = computed(() => Math.min(
  repaymentRepaidAmount.value,
  repaymentTargetAmount.value,
))
const repaymentProgressMax = computed(() => Math.max(1, repaymentTargetAmount.value))
const repaymentRepaidLabel = computed(() => repaymentProgressKnown.value
  ? formatCurrency(repaymentRepaidAmount.value)
  : '—')
const repaymentRemainingLabel = computed(() => repaymentProgressKnown.value
  ? formatCurrency(repaymentRemainingAmount.value)
  : '—')
const repaymentTargetLabel = computed(() => formatCurrency(repaymentTargetAmount.value))
const repaymentRemainingCaption = computed(() => props.state === 'defaulted'
  ? 'UNPAID AT DEFAULT'
  : 'STILL TO PAY')
const repaymentProgressText = computed(() => {
  if (!repaymentProgressKnown.value) {
    const state = historyError.value ? 'unavailable' : 'syncing'
    return `Repayment history ${state}; ${repaymentTargetLabel.value} total repayment target.`
  }
  return `${repaymentRepaidLabel.value} currently repaid; ${repaymentRemainingLabel.value} ${repaymentRemainingCaption.value.toLowerCase()}; ${repaymentTargetLabel.value} total repayment target.`
})
const lastEventTimestamp = computed(() => repaymentEvents.value.at(-1)?.timestamp ?? 0)
const observationTimestamp = computed(() => {
  if (isDesignPreview.value) {
    if (props.state === 'running') return repaymentDueTimestamp(previewPaidCount.value - 1)
    if (props.state === 'repaid') return repaymentDueTimestamp(previewPaidCount.value - 1)
    if (props.state === 'defaulted') return repaymentDueTimestamp(previewPaidCount.value - 1)
    return loanStartTimestamp.value
  }
  if (props.state === 'fundraising' || props.state === 'under-review') {
    return loanStartTimestamp.value + zeroRepaymentWindowSeconds.value
  }
  if (props.state === 'repaid') return lastEventTimestamp.value || Number(defaultTimestamp.value)
  if (props.state === 'defaulted') return Number(defaultTimestamp.value) || lastEventTimestamp.value

  const nowTimestamp = currentTime.value.getTime() / 1000
  const maturity = Number(defaultTimestamp.value)
  return maturity > 0 ? Math.min(nowTimestamp, maturity) : nowTimestamp
})
const observationMonth = computed(() => {
  if (!loanStartTimestamp.value) {
    return props.state === 'fundraising' || props.state === 'under-review'
      ? zeroRepaymentWindowMonths.value
      : 0
  }
  return clamp(
    (observationTimestamp.value - loanStartTimestamp.value) / MONTH_IN_SECONDS,
    0,
    displayDurationMonths.value,
  )
})

const scheduleEntries = computed<ScheduleEntry[]>(() => {
  const entries = createScheduleEntries()

  for (const event of repaymentEvents.value) {
    let unallocatedAmount = event.repaymentAmount

    for (const entry of entries) {
      if (unallocatedAmount <= 0n) break
      const availableCapacity = scheduledAmountInUnits(entry) - entry.paidAmount
      if (availableCapacity <= 0n) continue

      const amount = unallocatedAmount < availableCapacity ? unallocatedAmount : availableCapacity
      entry.allocations.push({ amount, event })
      entry.paidAmount += amount
      unallocatedAmount -= amount
    }

    const finalEntry = entries.at(-1)
    if (unallocatedAmount > 0n && finalEntry) {
      const existingAllocation = finalEntry.allocations.find(allocation => allocation.event === event)
      if (existingAllocation) existingAllocation.amount += unallocatedAmount
      else finalEntry.allocations.push({ amount: unallocatedAmount, event })
      finalEntry.paidAmount += unallocatedAmount
    }
  }

  for (const entry of entries) {
    if (isDesignPreview.value) {
      entry.cumulativeActual = previewCumulativePaid(entry.index)
      continue
    }
    const dueTimestamp = entry.dueTimestamp || Number.POSITIVE_INFINITY
    const lastEvent = repaymentEvents.value.findLast(event => event.timestamp <= dueTimestamp)
    entry.cumulativeActual = lastEvent ? toTokenAmount(lastEvent.cumulativeRepayment) : 0
  }

  return entries
})
const lastAllocatedEntryIndex = computed(() => scheduleEntries.value.findLastIndex(entry => entry.paidAmount > 0n))
const lastPaidEntryIndex = computed(() => {
  if (props.state === 'repaid') return scheduleEntries.value.length - 1
  if (isDesignPreview.value) {
    return Math.min(scheduleEntries.value.length, previewPaidCount.value) - 1
  }
  return lastAllocatedEntryIndex.value
})
const todayBoundaryIndex = computed(() => {
  const entries = scheduleEntries.value
  if (!entries.length || entries.some(entry => entry.dueTimestamp <= 0)) return -1

  const todayTimestamp = currentTime.value.getTime() / 1000
  const nextEntryIndex = entries.findIndex(entry => entry.dueTimestamp > todayTimestamp)
  return nextEntryIndex >= 0 ? nextEntryIndex : entries.length
})
const defaultVisibleEntries = computed(() => {
  const entries = scheduleEntries.value
  const lastPaidIndex = lastPaidEntryIndex.value
  const paidEntries = lastPaidIndex >= 0
    ? entries.slice(Math.max(0, lastPaidIndex - 2), lastPaidIndex + 1)
    : []
  const futureEntries = entries.slice(lastPaidIndex + 1, lastPaidIndex + 4)
  const firstEntry = entries[0]
  const shouldPinFirstEntry = firstEntry && paidEntries.length > 0 && paidEntries[0]?.index !== 0
  return [...(shouldPinFirstEntry ? [firstEntry] : []), ...paidEntries, ...futureEntries]
})
const visibleEntries = computed(() => {
  if (showAllEntries.value) return scheduleEntries.value
  return defaultVisibleEntries.value
})
const compactGapBoundaryIndex = computed(() => {
  if (showAllEntries.value) return -1
  const entries = defaultVisibleEntries.value
  const gapIndex = entries.findIndex((entry, index) => index > 0 && entry.index - entries[index - 1]!.index > 1)
  return gapIndex >= 0 ? entries[gapIndex]!.index : -1
})
const hiddenCompactEntryCount = computed(() => {
  const boundaryIndex = compactGapBoundaryIndex.value
  if (boundaryIndex < 0) return 0
  const entries = defaultVisibleEntries.value
  const previousEntry = entries.findLast(entry => entry.index < boundaryIndex)
  return previousEntry ? boundaryIndex - previousEntry.index - 1 : 0
})

const summary = computed(() => {
  if (isDesignPreview.value) {
    if (props.state === 'running') {
      const principalPercent = Math.round(previewPrincipalPaid.value / DESIGN_PREVIEW_PRINCIPAL * 100)
      return `12 of 36 repayments · ${principalPercent}% principal repaid`
    }
    if (props.state === 'repaid') return '36 of 36 repayments · Fully repaid'
    if (props.state === 'defaulted') return `15 of 36 repayments · Defaulted ${formatDate(observationTimestamp.value)}`
    return '36 repayments · Illustrative schedule'
  }
  if (props.state === 'fundraising' || props.state === 'under-review') {
    return displayRepaymentCount.value > 0
      ? `${displayRepaymentCount.value} estimated monthly repayments · history begins after activation`
      : 'Repayment estimate becomes available after activation'
  }
  if (isInitialHistoryLoading.value) return 'Syncing repayment proofs from Ethereum'
  if (historyError.value && originalPrincipal.value <= 0n) return 'Onchain repayment history is temporarily unavailable'
  if (historyError.value && !hasActualHistory.value) return 'Repayment history refresh unavailable · showing last verified state'
  if (!hasActualHistory.value) return 'No PWNLoan repayment events recorded for this loan'

  const eventCount = repaymentEvents.value.length
  if (historyError.value) {
    return `${formatCurrency(cumulativeActualAmount.value)} paid · ${eventCount} verified ${pluralize(eventCount, 'event')} · refresh unavailable`
  }
  if (props.state === 'repaid') return `Settled · ${eventCount} verified repayment ${pluralize(eventCount, 'event')}`
  if (props.state === 'defaulted') return `Last paid ${formatDate(lastEventTimestamp.value)} · ${eventCount} verified ${pluralize(eventCount, 'event')}`
  return `${formatCurrency(cumulativeActualAmount.value)} paid · ${eventCount} verified ${pluralize(eventCount, 'event')}`
})
const actualLegendLabel = computed(() => {
  if (isRunningDesignPreview.value) return 'ACTUAL'
  if (isDesignPreview.value) return hasActualSeries.value ? 'DESIGN PREVIEW' : 'NO ACTUALS YET'
  if (isInitialHistoryLoading.value) return 'SYNCING ACTUAL'
  if (hasActualHistory.value) return 'ACTUAL ONCHAIN'
  return 'NO ACTUAL EVENTS'
})
const metricValue = computed(() => {
  if (isRunningDesignPreview.value) {
    return `${Math.round(previewPrincipalPaid.value / DESIGN_PREVIEW_PRINCIPAL * 100)}%`
  }
  if (isDesignPreview.value && previewPaidCount.value > 0) return formatCurrency(previewCumulativeRepayment.value)
  if (props.state === 'fundraising' || props.state === 'under-review') return formatCurrency(finalScheduledAmount.value)
  return hasActualHistory.value ? formatCurrency(cumulativeActualAmount.value) : '—'
})
const metricLabel = computed(() => props.state === 'fundraising' || props.state === 'under-review'
  ? 'ESTIMATED REPAYMENT'
  : 'ALREADY REPAID')
const ledgerCaption = computed(() => isDesignPreview.value
  ? 'Design-preview repayments mirror the lifecycle fixture. Transaction proofs appear only for live PWNLoan events.'
  : `Estimated equal monthly amounts use the active loan principal, APR, payment holiday and repayment count. The first protocol deadline is ${firstRepaymentTimestamp.value ? formatDate(firstRepaymentTimestamp.value) : 'syncing'}; only paid amounts and proofs are onchain.`)

const chartMaximum = computed(() => isRunningDesignPreview.value
  ? DESIGN_PREVIEW_PRINCIPAL
  : Math.max(finalScheduledAmount.value, cumulativeActualAmount.value, 1))
const scheduledPath = computed(() => {
  if (isRunningDesignPreview.value) {
    return `M ${PLOT_LEFT} ${PLOT_BOTTOM} L ${PLOT_RIGHT} ${PLOT_TOP}`
  }

  const firstEntry = scheduleEntries.value[0]
  const points = [
    { month: 0, value: 0 },
    ...(firstEntry ? [{ month: firstEntry.month, value: 0 }] : []),
    ...scheduleEntries.value.map(entry => ({
      month: entry.month,
      value: entry.cumulativeScheduled,
    })),
    ...(scheduleEntries.value.length ? [{
      month: displayDurationMonths.value,
      value: finalScheduledAmount.value,
    }] : []),
  ]
  return points.map((point, index) => `${index === 0 ? 'M' : 'L'} ${xForMonth(point.month)} ${yForAmount(point.value)}`).join(' ')
})
const actualChartPoints = computed(() => {
  if (isRunningDesignPreview.value) {
    return RUNNING_PREVIEW_ACTUAL_POINTS.map((point, index) => ({
      key: `running-preview-${index}`,
      x: xForMonth(point.month),
      y: yForAmount(point.value),
    }))
  }

  if (isDesignPreview.value) {
    return scheduleEntries.value
      .filter(entry => entry.index < previewPaidCount.value)
      .map(entry => ({
        key: `preview-${props.state}-${entry.index}`,
        x: xForMonth(entry.month),
        y: yForAmount(entry.cumulativeActual),
      }))
  }

  return repaymentEvents.value.map(event => ({
    key: `${event.transactionHash}:${event.logIndex}`,
    x: xForTimestamp(event.timestamp),
    y: yForAmount(toTokenAmount(event.cumulativeRepayment)),
  }))
})
const actualPath = computed(() => {
  if (!actualChartPoints.value.length) return ''
  let path = `M ${xForMonth(0)} ${yForAmount(0)}`
  for (const point of actualChartPoints.value) path += ` H ${point.x} V ${point.y}`
  return path
})
const timelineMarker = computed(() => {
  if (isRunningDesignPreview.value) return { label: 'TODAY', x: xForMonth(observationMonth.value) }
  if (props.state === 'fundraising' || props.state === 'under-review') {
    return {
      label: isDesignPreview.value ? 'SCHEDULE START' : 'ZERO-REPAYMENT WINDOW',
      x: xForMonth(zeroRepaymentWindowMonths.value),
    }
  }
  if (props.state === 'defaulted') return { label: 'DEFAULT', x: xForMonth(observationMonth.value) }
  if (props.state === 'repaid') return { label: 'SETTLED', x: xForMonth(observationMonth.value) }
  return { label: 'CURRENT', x: xForMonth(observationMonth.value) }
})
const yAxisTicks = computed(() => [
  { label: compactCurrency(chartMaximum.value), value: chartMaximum.value, y: yForAmount(chartMaximum.value) },
  { label: compactCurrency(chartMaximum.value / 2), value: chartMaximum.value / 2, y: yForAmount(chartMaximum.value / 2) },
  { label: '$0', value: 0, y: yForAmount(0) },
])
const xAxisTicks = computed(() => isRunningDesignPreview.value
  ? [0, 12, 24, DESIGN_PREVIEW_DURATION_MONTHS].map((month, index, ticks) => ({
      anchor: index === 0 ? 'start' as const : index === ticks.length - 1 ? 'end' as const : 'middle' as const,
      label: formatMonthYearAtLoanMonth(month),
      month,
      x: xForMonth(month),
      y: X_AXIS_LABEL_Y,
    }))
  : [
      { anchor: 'start' as const, label: 'START', month: 0, x: xForMonth(0), y: X_AXIS_LABEL_Y },
      { anchor: 'middle' as const, label: `${Math.round(displayDurationMonths.value / 2)} MO`, month: Math.round(displayDurationMonths.value / 2), x: xForMonth(Math.round(displayDurationMonths.value / 2)), y: X_AXIS_LABEL_Y },
      { anchor: 'end' as const, label: `${displayDurationMonths.value} MO`, month: displayDurationMonths.value, x: xForMonth(displayDurationMonths.value), y: X_AXIS_LABEL_Y },
    ])
const activeScheduledAmount = computed(() => chartScheduledAmountAtMonth(activeMonth.value))
const activeActualAmount = computed(() => {
  if (isDesignPreview.value) {
    const paidCountAtMonth = Math.min(previewPaidCount.value, Math.floor(activeMonth.value))
    return previewCumulativePaid(paidCountAtMonth - 1)
  }
  if (!loanStartTimestamp.value) return 0
  const timestamp = loanStartTimestamp.value + activeMonth.value * MONTH_IN_SECONDS
  const event = repaymentEvents.value.findLast(candidate => candidate.timestamp <= timestamp)
  return event ? toTokenAmount(event.cumulativeRepayment) : 0
})
const showChartTooltip = computed(() => isPointerActive.value || isKeyboardActive.value)
const tooltipStyle = computed(() => {
  const xPercent = clamp(xForMonth(activeMonth.value) / CHART_WIDTH * 100, 14, 86)
  const yPercent = clamp(yForAmount(Math.max(activeScheduledAmount.value, activeActualAmount.value)) / CHART_HEIGHT * 100, 24, 80)
  return { left: `${xPercent}%`, top: `${yPercent}%` }
})
const chartAriaLabel = computed(() => [
  'Interactive cumulative repayment chart.',
  `Month ${activeMonth.value}: ${formatCurrency(activeScheduledAmount.value)} estimated cumulative repayment.`,
  hasActualSeries.value
    ? `${formatCurrency(activeActualAmount.value)} ${isDesignPreview.value ? 'shown in the design preview' : 'recorded onchain'} by this point.`
    : 'No actual repayments are recorded for this state.',
].join(' '))

function createScheduleEntries(): ScheduleEntry[] {
  if (!isDesignPreview.value && hasLiveRepaymentTerms.value) {
    return Array.from({ length: repaymentPlan.value.paymentCount }, (_, index) => {
      const dueTimestamp = firstRepaymentTimestamp.value
        ? addUtcMonths(firstRepaymentTimestamp.value, index)
        : 0
      const cumulativeScheduled = calculateAmortizedCumulativeRepayment(
        repaymentPlan.value,
        index + 1,
      )
      const previousCumulative = calculateAmortizedCumulativeRepayment(
        repaymentPlan.value,
        index,
      )
      const month = dueTimestamp && loanStartTimestamp.value
        ? (dueTimestamp - loanStartTimestamp.value) / MONTH_IN_SECONDS
        : displayPostponementMonths.value + index + 1

      return {
        allocations: [],
        cumulativeActual: 0,
        cumulativeScheduled,
        dueLabel: dueTimestamp ? formatDate(dueTimestamp) : `ESTIMATE ${index + 1}`,
        dueTimestamp,
        index,
        month,
        paidAmount: 0n,
        scheduledAmount: Math.max(0, cumulativeScheduled - previousCumulative),
      }
    })
  }

  return Array.from({ length: displayRepaymentCount.value }, (_, index) => {
    const month = displayPostponementMonths.value + index + 1
    const cumulativeScheduled = scheduledAmountAtMonth(month)
    const previousCumulative = index === 0 ? 0 : scheduledAmountAtMonth(month - 1)
    const dueTimestamp = isDesignPreview.value ? repaymentDueTimestamp(index) : 0

    return {
      allocations: [],
      cumulativeActual: 0,
      cumulativeScheduled,
      dueLabel: dueTimestamp ? formatDate(dueTimestamp) : `MONTH ${month}`,
      dueTimestamp,
      index,
      month,
      paidAmount: 0n,
      scheduledAmount: isRunningDesignPreview.value
        ? RUNNING_PREVIEW_PAYMENT
        : Math.max(0, cumulativeScheduled - previousCumulative),
    }
  })
}

function scheduledAmountAtMonth(month: number) {
  if (!isDesignPreview.value) {
    if (!hasLiveRepaymentTerms.value || displayDurationMonths.value <= 0) return 0
    const firstPaymentMonth = firstRepaymentTimestamp.value && loanStartTimestamp.value
      ? (firstRepaymentTimestamp.value - loanStartTimestamp.value) / MONTH_IN_SECONDS
      : displayPostponementMonths.value + 1
    const completedPayments = Math.floor(month - firstPaymentMonth) + 1
    return calculateAmortizedCumulativeRepayment(repaymentPlan.value, completedPayments)
  }
  const elapsedSeconds = clamp(month, 0, displayDurationMonths.value) * MONTH_IN_SECONDS
  return scheduledAmountAtElapsedSecond(elapsedSeconds)
}

function scheduledAmountAtElapsedSecond(elapsedSeconds: number) {
  return calculateScheduledRepaymentAmount({
    ...previewRepaymentModelTerms.value,
    elapsedSeconds,
  })
}

function scheduledAmountInUnits(entry: ScheduleEntry) {
  return BigInt(Math.round(entry.scheduledAmount * 10 ** CREDIT_DECIMALS))
}

function chartScheduledAmountAtMonth(month: number) {
  if (isRunningDesignPreview.value) {
    return DESIGN_PREVIEW_PRINCIPAL * clamp(month, 0, DESIGN_PREVIEW_DURATION_MONTHS) / DESIGN_PREVIEW_DURATION_MONTHS
  }
  return scheduledAmountAtMonth(month)
}

function xForTimestamp(timestamp: number) {
  if (!loanStartTimestamp.value) return xForMonth(0)
  return xForMonth((timestamp - loanStartTimestamp.value) / MONTH_IN_SECONDS)
}

function xForMonth(month: number) {
  const duration = Math.max(1, displayDurationMonths.value)
  return PLOT_LEFT + clamp(month, 0, duration) / duration * (PLOT_RIGHT - PLOT_LEFT)
}

function yForAmount(amount: number) {
  const ratio = clamp(amount / chartMaximum.value, 0, 1)
  return PLOT_BOTTOM - ratio * (PLOT_BOTTOM - PLOT_TOP)
}

function setChartMonthFromPointer(event: PointerEvent) {
  const element = event.currentTarget
  if (!(element instanceof HTMLElement)) return
  const bounds = element.getBoundingClientRect()
  const plotLeft = bounds.left + bounds.width * PLOT_LEFT / CHART_WIDTH
  const plotWidth = bounds.width * (PLOT_RIGHT - PLOT_LEFT) / CHART_WIDTH
  const ratio = clamp((event.clientX - plotLeft) / plotWidth, 0, 1)

  activeMonth.value = Math.round(ratio * displayDurationMonths.value)
  isPointerActive.value = true
}

function handleChartKeydown(event: KeyboardEvent) {
  if (event.key === 'ArrowLeft') {
    event.preventDefault()
    activeMonth.value = clamp(activeMonth.value - 1, 0, displayDurationMonths.value)
  } else if (event.key === 'ArrowRight') {
    event.preventDefault()
    activeMonth.value = clamp(activeMonth.value + 1, 0, displayDurationMonths.value)
  } else if (event.key === 'Home') {
    event.preventDefault()
    activeMonth.value = 0
  } else if (event.key === 'End') {
    event.preventDefault()
    activeMonth.value = displayDurationMonths.value
  }
}

function isTodayBoundaryBefore(entry: ScheduleEntry) {
  return entry.index === todayBoundaryIndex.value
}

function isTodayBoundaryInCompactGap(entry: ScheduleEntry) {
  if (!isCompactGapBoundary(entry)) return false
  const previousEntry = visibleEntries.value.findLast(candidate => candidate.index < entry.index)
  return !!previousEntry
    && todayBoundaryIndex.value > previousEntry.index
    && todayBoundaryIndex.value < entry.index
}

function isTodayBoundaryAfterVisibleEntries(entry: ScheduleEntry) {
  const finalVisibleEntry = visibleEntries.value.at(-1)
  return entry.index === finalVisibleEntry?.index && todayBoundaryIndex.value > entry.index
}

function isCompactGapBoundary(entry: ScheduleEntry) {
  return entry.index === compactGapBoundaryIndex.value
}

function rowPaid(entry: ScheduleEntry) {
  if (isRunningDesignPreview.value) {
    return entry.index < 11 ? formatCurrency(RUNNING_PREVIEW_PAYMENT) : '—'
  }
  if (isDesignPreview.value) {
    const paidAmount = previewPaidAmount(entry.index)
    return paidAmount > 0 ? formatCurrency(paidAmount) : '—'
  }
  return entry.paidAmount > 0n ? formatLedgerAmount(entry.paidAmount) : '—'
}

function rowPaidOn(entry: ScheduleEntry) {
  if (isRunningDesignPreview.value) {
    return entry.index < previewPaidCount.value ? entry.dueLabel : '—'
  }
  if (isDesignPreview.value) return entry.index < previewPaidCount.value ? entry.dueLabel : '—'
  if (!entry.allocations.length) return '—'
  const dates = [...new Set(entry.allocations.map(({ event }) => formatDate(event.timestamp)))]
  return dates.length === 1 ? dates[0] : `${dates.length} DATES`
}

function rowStatus(entry: ScheduleEntry) {
  if (isRunningDesignPreview.value) {
    if (entry.index < 10) return 'ON TIME'
    if (entry.index === 10) return '2 DAYS LATE'
    if (entry.index === 11) return 'DUE TODAY'
    return 'UPCOMING'
  }
  if (isDesignPreview.value) {
    if (props.state === 'fundraising' || props.state === 'under-review') return 'ESTIMATED'
    if (entry.index < previewPaidCount.value) return props.state === 'repaid' ? 'SETTLED' : 'PAID'
    if (props.state === 'defaulted') return 'CANCELLED'
    return 'UPCOMING'
  }
  if (props.state === 'fundraising' || props.state === 'under-review') return 'ESTIMATED'
  if (entry.paidAmount > 0n) {
    if (entry.paidAmount < scheduledAmountInUnits(entry)) return 'PARTIAL'
    if (props.state === 'repaid') return 'SETTLED'

    const completedAt = Math.max(...entry.allocations.map(({ event }) => event.timestamp))
    return completedAt < entry.dueTimestamp ? 'PAID EARLY' : 'PAID'
  }
  if (entry.cumulativeActual >= entry.cumulativeScheduled && entry.cumulativeActual > 0) {
    return props.state === 'repaid' ? 'SETTLED' : 'PAID'
  }
  if (entry.dueTimestamp > observationTimestamp.value) return props.state === 'repaid' ? 'SETTLED' : 'UPCOMING'
  return props.state === 'defaulted' ? 'MISSED' : 'OVERDUE'
}

function statusClass(entry: ScheduleEntry) {
  const status = rowStatus(entry)
  return {
    'is-negative': status === 'MISSED' || status === 'OVERDUE' || status === 'CANCELLED' || status === '2 DAYS LATE',
    'is-partial': status === 'PARTIAL',
    'is-positive': status === 'PAID' || status === 'PAID EARLY' || status === 'SETTLED' || status === 'ON TIME',
  }
}

function previewPaidAmount(index: number) {
  const paidCount = previewPaidCount.value
  if (paidCount <= 0 || index < 0 || index >= paidCount) return 0
  const baseAmount = Math.floor(previewCumulativeRepayment.value / paidCount)
  return index === paidCount - 1
    ? previewCumulativeRepayment.value - baseAmount * (paidCount - 1)
    : baseAmount
}

function previewCumulativePaid(index: number) {
  if (index < 0) return 0
  const cappedIndex = Math.min(index, previewPaidCount.value - 1)
  if (cappedIndex < 0) return 0
  return Array.from({ length: cappedIndex + 1 }, (_, paidIndex) => previewPaidAmount(paidIndex))
    .reduce((total, amount) => total + amount, 0)
}

function repaymentDueTimestamp(index: number) {
  if (index < 0 || !firstRepaymentTimestamp.value) return 0
  return addUtcMonths(firstRepaymentTimestamp.value, index)
}

function formatMonthYearAtLoanMonth(month: number) {
  if (!loanStartTimestamp.value) return `${month} MO`
  const timestamp = addUtcMonths(loanStartTimestamp.value, month)
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    timeZone: 'UTC',
    year: '2-digit',
  }).format(timestamp * 1000).toUpperCase().replace(' ', ' ’')
}

function addUtcMonths(timestamp: number, months: number) {
  const source = new Date(timestamp * 1000)
  const targetYear = source.getUTCFullYear() + Math.floor((source.getUTCMonth() + months) / 12)
  const targetMonth = (source.getUTCMonth() + months) % 12
  const lastDay = new Date(Date.UTC(targetYear, targetMonth + 1, 0)).getUTCDate()
  return Date.UTC(
    targetYear,
    targetMonth,
    Math.min(source.getUTCDate(), lastDay),
    source.getUTCHours(),
    source.getUTCMinutes(),
    source.getUTCSeconds(),
  ) / 1000
}

function transactionUrl(hash: Hex) {
  return getExplorerTransactionDetailsLink(hash) ?? `https://etherscan.io/tx/${hash}`
}

function shortHash(hash: Hex) {
  return `${hash.slice(0, 6)}…${hash.slice(-4)}`
}

function formatDate(timestamp: number, includeTime = false) {
  if (!timestamp) return '—'
  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    hour: includeTime ? '2-digit' : undefined,
    hour12: false,
    minute: includeTime ? '2-digit' : undefined,
    month: 'short',
    timeZone: 'UTC',
    year: 'numeric',
  }).format(new Date(timestamp * 1000)).toUpperCase()
}

function toTokenAmount(value: bigint) {
  return Number(formatUnits(value, CREDIT_DECIMALS))
}

const ledgerCurrencyFormatter = new Intl.NumberFormat('en-US', {
  currency: 'USD',
  maximumFractionDigits: 2,
  minimumFractionDigits: 0,
  style: 'currency',
})

function formatLedgerAmount(value: bigint) {
  return formatLedgerCurrency(toTokenAmount(value))
}

function formatLedgerCurrency(value: number) {
  return ledgerCurrencyFormatter.format(value)
}

function formatCurrency(value: number) {
  return `$${Math.round(value).toLocaleString('en-US')}`
}

function compactCurrency(value: number) {
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}m`
  if (value >= 1_000) return `$${Math.round(value / 1_000)}k`
  return formatCurrency(value)
}

function pluralize(count: number, word: string) {
  return count === 1 ? word : `${word}s`
}

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(maximum, Math.max(minimum, value))
}

async function expandAndFocus() {
  if (!canExpandRepayment.value) return
  isExpanded.value = true
  await nextTick()
  chartElement.value?.focus({ preventScroll: true })
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  rootElement.value?.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' })
}

function toggleExpanded() {
  if (!canExpandRepayment.value) return
  isExpanded.value = !isExpanded.value
}

async function refresh() {
  await refreshHistory()
}

defineExpose({ expandAndFocus, refresh })
</script>

<style scoped>
.repayment-performance {
  isolation: isolate;
  width: 100%;
  min-width: 0;
  margin-top: 32px;
  padding: 0 39px;
  overflow: hidden;
  border: 1px solid var(--border);
  border-radius: 0;
  background: var(--paper);
  color: var(--ink);
  font-family: var(--font-geist);
  scroll-margin-top: 24px;
}

.repayment-performance:focus-visible {
  outline: 2px solid var(--teal);
  outline-offset: 3px;
}

.repayment-performance.is-collapsed {
  height: 130px;
}

.repayment-performance__header {
  display: grid;
  min-height: 124px;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: start;
  gap: 5px 24px;
  padding: 12px 0 11px;
}

.repayment-performance__header > div:first-child {
  display: grid;
  min-width: 0;
  gap: 4px;
}

.repayment-performance__header h3,
.repayment-performance__header span,
.repayment-chart-band p,
.repayment-chart-band strong,
.repayment-chart-band span,
.repayment-ledger__intro h4,
.repayment-ledger__intro p {
  margin: 0;
}

.repayment-chart-band__metric > p {
  color: var(--teal-dark);
  font: 700 10px/16px var(--font-mono);
  letter-spacing: .03em;
}

.repayment-performance__header h3 {
  color: var(--ink);
  font-family: var(--font-newsreader);
  font-size: 35px;
  font-variation-settings: "wght" 500;
  font-weight: 500;
  line-height: 41px;
}

.repayment-performance__header > div:first-child > span {
  color: var(--muted-foreground);
  font-size: 15.5px;
  line-height: 23px;
}

.repayment-performance__snapshot {
  display: grid;
  grid-column: 1 / -1;
  width: 100%;
  gap: 5px;
}

.repayment-performance__snapshot-labels {
  display: grid;
  grid-template-columns: repeat(3, max-content);
  justify-content: space-between;
  gap: 16px;
  color: var(--muted-foreground);
  font: 700 9px/14px var(--font-mono);
  letter-spacing: .02em;
}

.repayment-performance__snapshot-labels span:first-child {
  color: var(--teal-dark);
}

.repayment-performance__snapshot progress {
  display: block;
  width: 100%;
  height: 7px;
  overflow: hidden;
  border: 1px solid var(--border);
  border-radius: 0;
  appearance: none;
  background: var(--paper-deep);
}

.repayment-performance__snapshot progress::-webkit-progress-bar {
  background: var(--paper-deep);
}

.repayment-performance__snapshot progress::-webkit-progress-value {
  background: var(--teal);
}

.repayment-performance__snapshot progress::-moz-progress-bar {
  background: var(--teal);
}

.repayment-performance__disclosure {
  align-self: start;
  justify-self: end;
  min-height: 44px;
  padding: 0;
  border: 0;
  border-radius: 0;
  background: transparent;
  color: var(--teal-dark);
  cursor: pointer;
  font: 700 12px/16px var(--font-mono);
}

.repayment-performance__disclosure:hover:not(:disabled) {
  color: var(--teal-dark);
  text-decoration: underline;
  text-underline-offset: 3px;
}

.repayment-performance__disclosure:disabled {
  color: var(--muted-foreground);
  cursor: not-allowed;
  opacity: .55;
}

.repayment-performance__disclosure:focus-visible,
.repayment-performance__legend button:focus-visible,
.repayment-ledger__intro button:focus-visible,
.repayment-ledger__footer button:focus-visible,
.repayment-ledger td button:focus-visible,
.repayment-ledger a:focus-visible {
  outline: 2px solid var(--teal);
  outline-offset: 2px;
}

.repayment-chart-band {
  position: relative;
  height: 347px;
  margin-inline: -39px;
  padding: 24px 39px 18px;
  overflow: hidden;
  background: var(--paper-deep);
}

.repayment-chart-band__top {
  position: relative;
  z-index: 2;
  display: flex;
  min-height: 82px;
  align-items: flex-start;
  justify-content: space-between;
  gap: 24px;
}

.repayment-chart-band__metric {
  display: grid;
  align-content: start;
  gap: 4px;
}

.repayment-chart-band__metric > p {
  color: var(--muted-foreground);
}

.repayment-chart-band__metric > div {
  display: flex;
  align-items: baseline;
  gap: 12px;
}

.repayment-chart-band__metric strong {
  color: var(--ink);
  font-family: var(--font-newsreader);
  font-size: 35px;
  font-variation-settings: "wght" 500;
  font-weight: 500;
  line-height: 41px;
}

.repayment-performance__legend {
  display: flex;
  flex: 0 0 auto;
  gap: 8px;
}

.repayment-performance__legend button {
  display: inline-flex;
  min-height: 44px;
  align-items: center;
  gap: 8px;
  padding: 0 8px;
  border: 1px solid transparent;
  border-radius: 2px;
  background: transparent;
  color: var(--muted-foreground);
  cursor: pointer;
  font: 700 10px/16px var(--font-mono);
}

.repayment-performance__legend button[aria-pressed="true"] {
  border-color: transparent;
  color: var(--ink);
  background: transparent;
}

.repayment-performance__legend button[aria-pressed="false"] {
  text-decoration: line-through;
}

.repayment-performance__legend button:hover:not(:disabled) {
  text-decoration: underline;
  text-underline-offset: 3px;
}

.repayment-performance__legend button:disabled {
  cursor: not-allowed;
  opacity: .45;
}

.repayment-performance__legend i {
  display: inline-block;
  width: 18px;
  height: 2px;
}

.repayment-performance__legend i.is-actual {
  position: relative;
  background: transparent;
}

.repayment-performance__legend i.is-actual::after {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--teal);
  content: '';
  transform: translate(-50%, -50%);
}

.repayment-performance__legend i.is-scheduled {
  border-top: 2px dashed currentcolor;
}

.repayment-chart {
  position: absolute;
  z-index: 1;
  inset: 0 39px;
  width: auto;
  height: 100%;
  min-height: 0;
  cursor: crosshair;
  touch-action: pan-y;
}

.repayment-chart:focus-visible {
  border-radius: 4px;
  outline: 2px solid var(--teal);
  outline-offset: 4px;
}

.repayment-chart__svg {
  display: block;
  width: 100%;
  height: 100%;
  overflow: visible;
}

.repayment-chart__grid line {
  stroke: var(--border);
  stroke-dasharray: 2 6;
  stroke-width: 1;
}

.repayment-chart__axis-labels text,
.repayment-chart__marker text {
  fill: var(--muted-foreground);
  font: 10px var(--font-mono);
}

.repayment-chart__scheduled {
  fill: none;
  stroke: var(--muted-foreground);
  stroke-dasharray: 6 5;
  stroke-linejoin: round;
  stroke-width: 2;
  vector-effect: non-scaling-stroke;
}

.repayment-chart__actual path {
  fill: none;
  stroke: var(--teal);
  stroke-linejoin: miter;
  stroke-width: 3;
  vector-effect: non-scaling-stroke;
}

.repayment-chart__actual circle {
  fill: var(--teal);
  stroke: var(--paper-deep);
  stroke-width: 3;
}

.repayment-chart__marker line {
  stroke: var(--amber-ink);
  stroke-dasharray: 2 4;
  stroke-width: 1;
}

.repayment-chart__marker text {
  fill: var(--muted-foreground);
}

.repayment-chart__tooltip {
  position: absolute;
  z-index: 3;
  display: grid;
  width: 190px;
  gap: 2px;
  padding: 10px 12px;
  border: 1px solid var(--ink);
  border-radius: 10px;
  background: var(--paper);
  box-shadow: 0 8px 24px rgb(23 26 25 / 14%);
  color: var(--ink);
  pointer-events: none;
  transform: translate(-50%, calc(-100% - 10px));
}

.repayment-chart__tooltip > span {
  color: var(--muted-foreground);
  font: 700 9px/14px var(--font-mono);
}

.repayment-chart__tooltip-series {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 10px;
}

.repayment-chart__tooltip-series small {
  font: 700 8px/12px var(--font-mono);
}

.repayment-chart__tooltip-series strong {
  font: 700 14px/20px var(--font-mono);
}

.repayment-chart__tooltip-series.is-scheduled small,
.repayment-chart__tooltip-series.is-scheduled strong {
  color: var(--muted-foreground);
}

.repayment-chart__tooltip-series.is-actual small,
.repayment-chart__tooltip-series.is-actual strong {
  color: var(--teal);
}

.repayment-ledger__intro {
  display: flex;
  min-height: 75px;
  align-items: center;
  justify-content: space-between;
  gap: 24px;
  margin-inline: -39px;
  padding: 14px 39px;
  border-top: 1px solid var(--border);
}

.repayment-ledger__intro > div {
  display: grid;
  gap: 4px;
}

.repayment-ledger__intro h4 {
  color: var(--ink);
  font-size: 16px;
  font-weight: 400;
  line-height: 24px;
}

.repayment-ledger__intro p {
  color: var(--muted-foreground);
  font: 400 11px/16px var(--font-mono);
}

.repayment-ledger__intro button {
  min-height: 44px;
  flex: 0 0 auto;
  color: var(--amber-ink);
  cursor: pointer;
  font: 700 10px/16px var(--font-mono);
}

.repayment-ledger {
  margin-inline: -39px;
  overflow-x: auto;
  border-top: 0;
  box-shadow: inset 0 1px var(--border);
}

.repayment-ledger:focus-visible {
  outline: 2px solid var(--teal);
  outline-offset: -2px;
}

.repayment-ledger table {
  width: 100%;
  min-width: 900px;
  border-collapse: collapse;
  table-layout: fixed;
}

.repayment-ledger th,
.repayment-ledger td {
  height: 56px;
  padding: 0 12px;
  border-bottom: 1px solid var(--border);
  color: var(--ink);
  text-align: left;
  vertical-align: middle;
}

.repayment-ledger th {
  height: 39px;
  background: var(--paper-deep);
  color: var(--muted-foreground);
  font: 700 12px/16px var(--font-mono);
}

.repayment-ledger th:nth-child(1) { width: 14%; }
.repayment-ledger th:nth-child(2) { width: 16%; }
.repayment-ledger th:nth-child(3) { width: 14%; }
.repayment-ledger th:nth-child(4) { width: 16%; }
.repayment-ledger th:nth-child(5) { width: 15%; }
.repayment-ledger th:nth-child(6) { width: 25%; }

.repayment-ledger td {
  font-size: 15.5px;
  line-height: 23px;
}

.repayment-ledger td button {
  display: inline-flex;
  min-height: 44px;
  align-items: center;
  gap: 8px;
  color: var(--ink);
  cursor: pointer;
  text-align: left;
}

.repayment-ledger td > a {
  display: inline-flex;
  min-height: 44px;
  align-items: center;
  margin-right: 10px;
  color: var(--teal-dark);
  font: 700 10px/16px var(--font-mono);
  text-decoration: underline;
  text-underline-offset: 3px;
}

.repayment-ledger td.is-positive {
  color: var(--teal-dark);
}

.repayment-ledger td.is-partial {
  color: var(--amber-ink);
}

.repayment-ledger td.is-negative {
  color: var(--destructive);
}

.repayment-ledger tr.is-today-boundary-before td {
  border-top: 3px solid var(--teal);
}

.repayment-ledger tr.is-today-boundary-after td {
  border-bottom: 3px solid var(--teal);
}

.repayment-ledger tr.is-first-deadline td {
  height: 66px;
}

.repayment-ledger__due {
  display: grid;
  align-content: center;
}

.repayment-ledger__first-label {
  grid-column: 1 / -1;
  color: var(--teal-dark);
  font: 700 8px/12px var(--font-mono);
  letter-spacing: .08em;
}

.repayment-ledger tr.repayment-ledger__omitted td {
  height: 36px;
  padding: 0;
  background: var(--paper-deep);
  text-align: center;
}

.repayment-ledger tr.repayment-ledger__omitted button {
  width: 100%;
  min-height: 36px;
  justify-content: center;
  color: var(--teal-dark);
  font: 700 9px/14px var(--font-mono);
  letter-spacing: .04em;
}

.repayment-ledger__footer {
  display: flex;
  min-height: 54px;
  align-items: center;
  justify-content: space-between;
  gap: 24px;
  margin-inline: -39px;
  padding: 0 39px;
}

.repayment-ledger__footer button {
  font: 700 10px/16px var(--font-mono);
}

.repayment-ledger__footer button {
  min-height: 44px;
  color: var(--teal-dark);
  cursor: pointer;
}

.repayment-ledger__intro button:hover,
.repayment-ledger__intro button:active,
.repayment-ledger__footer button:hover,
.repayment-ledger__footer button:active,
.repayment-ledger td button:hover,
.repayment-ledger td button:active {
  text-decoration: underline;
  text-underline-offset: 3px;
}

@media (max-width: 820px) {
  .repayment-performance {
    padding-inline: 23px;
  }

  .repayment-performance.is-collapsed {
    height: auto;
    min-height: 130px;
  }

  .repayment-performance__header {
    min-height: 0;
    grid-template-columns: 1fr;
    gap: 16px;
    padding: 24px 0;
  }

  .repayment-performance__header h3 {
    font-size: 26px;
    line-height: 32px;
  }

  .repayment-performance__header > div:first-child,
  .repayment-performance__snapshot {
    width: 100%;
  }

  .repayment-performance__snapshot-labels {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 2px 12px;
  }

  .repayment-performance__snapshot-labels span:nth-child(2) {
    text-align: right;
  }

  .repayment-performance__snapshot-labels span:last-child {
    grid-column: 1 / -1;
  }

  .repayment-performance__disclosure {
    grid-column: 1;
    grid-row: 2;
    justify-self: stretch;
    width: 100%;
  }

  .repayment-performance__snapshot {
    grid-column: 1;
    grid-row: 3;
  }

  .repayment-chart-band,
  .repayment-ledger__intro {
    margin-inline: -23px;
    padding-right: 23px;
    padding-left: 23px;
  }

  .repayment-chart-band__top,
  .repayment-ledger__intro {
    align-items: flex-start;
    flex-direction: column;
  }

  .repayment-chart-band__top {
    gap: 16px;
  }

  .repayment-chart-band {
    height: auto;
    overflow-x: auto;
    overscroll-behavior-inline: contain;
  }

  .repayment-chart-band__metric > div {
    display: grid;
    gap: 0;
  }

  .repayment-performance__legend {
    width: 100%;
    flex-wrap: wrap;
  }

  .repayment-chart {
    position: relative;
    inset: auto;
    width: 720px;
    height: 200px;
    min-height: 200px;
    margin-top: 16px;
    touch-action: pan-x pan-y;
  }

  .repayment-ledger,
  .repayment-ledger__footer {
    margin-inline: -23px;
  }

  .repayment-ledger__footer {
    min-height: 60px;
    padding: 12px 23px;
  }
}

@media (max-width: 480px) {
  .repayment-performance__header > div:first-child > span {
    font-size: 13px;
  }

  .repayment-performance__legend button {
    flex: 1 1 100%;
  }
}
</style>

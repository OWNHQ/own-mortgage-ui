<template>
  <section
    id="loan-overview"
    class="loan-stage"
    :class="[`is-${lifecycleState}`, { 'is-preparing': isLoanLoading }]"
    aria-labelledby="loan-workspace-title"
  >
    <div class="loan-surface" :aria-busy="isLoanLoading">
      <HouseBlueprintLoader
        v-if="isLoanLoading"
        announce
        class="loan-blueprint-loader"
      />

      <div v-if="showBlockingState" class="loan-state-gate" role="status">
        <p>{{ stateGateEyebrow }}</p>
        <h1 id="loan-workspace-title">{{ stateGateTitle }}</h1>
        <span>{{ stateGateSummary }}</span>
        <Button
          v-if="loanStatusError"
          variant="link"
          class="loan-state-gate__retry"
          :disabled="isLoanStateRetrying"
          @click="retryLoanState"
        >{{ isLoanStateRetrying ? 'RETRYING LOAN STATE…' : 'RETRY LOAN STATE' }}</Button>
      </div>

      <div
        v-else
        class="loan-grid"
        :class="{ 'is-preparing': isLoanLoading }"
        :aria-hidden="isLoanLoading || undefined"
        :inert="isLoanLoading || undefined"
      >
        <article class="loan-core">
          <header class="loan-header">
            <div class="loan-status-row">
              <p class="loan-status">
                <span class="loan-status__dot" aria-hidden="true" />
                <strong>{{ stateLabel.toUpperCase() }}</strong>
                <span aria-hidden="true">·</span>
                <span>{{ stateQualifier }}</span>
              </p>
            </div>

            <h1 id="loan-workspace-title">Community hackerspace - Prague, CZ</h1>
            <p class="loan-summary">
              <span>
                Fixed-rate USDC
                <TooltipProvider :delay-duration="150">
                  <TooltipRoot v-model:open="isOwngageTooltipOpen">
                    <TooltipTrigger as-child>
                      <button
                        type="button"
                        class="owngage-term"
                        aria-label="Owngage: a long-term, fixed-rate installment DeFi loan."
                        @click="isOwngageTooltipOpen = true"
                      >Owngage</button>
                    </TooltipTrigger>
                    <TooltipPortal>
                      <TooltipContent
                        class="loan-apr-tooltip"
                        side="top"
                        :side-offset="8"
                        :collision-padding="12"
                      >Owngage: a long-term, fixed-rate installment DeFi loan.<TooltipArrow class="loan-apr-tooltip__arrow" :width="10" :height="5" /></TooltipContent>
                    </TooltipPortal>
                  </TooltipRoot>
                </TooltipProvider>
                secured by weETH collateral for a co-working property in Prague 6, Czechia.
              </span>
              <span>It’s the first time ever that a mortgage-alternative DeFi loan has funded a real-estate purchase.</span>
            </p>

          </header>

          <template v-if="lifecycleState === 'under-review'">
            <dl class="review-facts" aria-label="Loan facts under review">
              <div>
                <dt>COLLATERAL CLASS</dt>
                <dd>Residential real estate</dd>
              </div>
              <div>
                <dt>INTENDED DURATION</dt>
                <dd>{{ displayTermMonths }} months</dd>
              </div>
            </dl>
          </template>

          <template v-else>
            <section id="loan-mechanics" class="loan-terms" aria-labelledby="loan-terms-title">
              <div class="section-heading">
                <h2 id="loan-terms-title">LOAN TERMS</h2>
              </div>

              <dl class="term-grid">
                <div>
                  <dt>{{ aprTermLabel }}</dt>
                  <dd v-if="showsLenderApr" class="apr-return">
                    <TooltipProvider :delay-duration="150">
                      <TooltipRoot v-model:open="isAprTooltipOpen">
                        <TooltipTrigger as-child>
                          <button
                            type="button"
                            class="apr-value-trigger"
                            :aria-label="lenderAprAriaLabel"
                            @click="isAprTooltipOpen = true"
                          >
                            <span>{{ aprTermValue }}</span>
                            <small>Borrower rate: {{ fixedApr }}</small>
                          </button>
                        </TooltipTrigger>
                        <TooltipPortal>
                          <TooltipContent
                            class="loan-apr-tooltip"
                            side="top"
                            :side-offset="8"
                            :collision-padding="12"
                          >
                            {{ sharelessContributionLabel }} funded the loan without receiving lender-vault shares. The borrower repays that amount at {{ fixedApr }}, and its principal and interest are distributed pro rata across lenders who hold shares.
                            <TooltipArrow class="loan-apr-tooltip__arrow" :width="10" :height="5" />
                          </TooltipContent>
                        </TooltipPortal>
                      </TooltipRoot>
                    </TooltipProvider>
                  </dd>
                  <dd v-else>{{ fixedApr }}</dd>
                </div>
                <div>
                  <dt>{{ ltvLabel }}</dt>
                  <dd
                    v-if="lifecycleState === 'running'"
                    class="ltv-current"
                    @focusin="isLtvTooltipOpen = true"
                    @focusout="isLtvTooltipOpen = false"
                  >
                    <TooltipProvider :delay-duration="150">
                      <TooltipRoot v-model:open="isLtvTooltipOpen">
                        <TooltipTrigger as-child>
                          <button
                            type="button"
                            class="ltv-value-trigger"
                            :class="ltvTone"
                            :aria-label="currentLtvAriaLabel"
                            @click="isLtvTooltipOpen = true"
                          >
                            <span>{{ currentLtvLabel }}</span>
                            <span v-if="ltvDirection" class="ltv-direction" aria-hidden="true">{{ ltvDirection }}</span>
                          </button>
                        </TooltipTrigger>
                        <TooltipPortal>
                          <TooltipContent
                            class="loan-ltv-tooltip"
                            side="top"
                            :side-offset="8"
                            :collision-padding="12"
                          >
                            <span>Amount owed</span>
                            <strong>{{ currentDebtAmountLabel }}</strong>
                            <span aria-hidden="true">·</span>
                            <span>Collateral value</span>
                            <strong>{{ currentCollateralValueLabel }}</strong>
                            <span aria-hidden="true">·</span>
                            <span>LTV at origination</span>
                            <strong>{{ originationLtv }}</strong>
                            <TooltipArrow class="loan-ltv-tooltip__arrow" :width="10" :height="5" />
                          </TooltipContent>
                        </TooltipPortal>
                      </TooltipRoot>
                    </TooltipProvider>
                  </dd>
                  <dd v-else>{{ originationLtv }}</dd>
                </div>
                <div class="term-duration">
                  <dt>TERM</dt>
                  <dd>
                    <span>{{ termYearsLabel }}</span>
                    <small>{{ termDatesLabel }}</small>
                  </dd>
                </div>
                <div class="amount-owed-term">
                  <dt>AMOUNT OWED</dt>
                  <dd>
                    <span>{{ currentDebtLabel }}</span>
                    <small>Originally borrowed {{ originalPrincipalLabel }}</small>
                  </dd>
                </div>
                <div>
                  <dt>COLLATERAL</dt>
                  <dd>{{ collateralDisplay }}</dd>
                </div>
                <div class="repayment-term">
                  <dt>REPAYMENT</dt>
                  <dd>
                    <span>{{ monthlyRepaymentLabel }} / mo</span>
                    <small>{{ totalRepaymentLabel }} estimated total</small>
                  </dd>
                </div>
              </dl>
            </section>

            <Teleport
              v-if="lifecycleState === 'fundraising'"
              to="#funding-progress-slot"
              defer
            >
              <section
                class="loan-performance"
                :aria-labelledby="`${lifecycleState}-performance-title`"
              >
                <div class="section-heading">
                  <h2 :id="`${lifecycleState}-performance-title`">{{ performanceLabel }}</h2>
                  <p>{{ performanceMeta }}</p>
                </div>

                <div class="performance-total">
                  <div class="performance-total__amount">
                    <span>{{ performanceAmountLabel }}</span>
                    <strong>{{ performanceAmount }}</strong>
                  </div>
                  <div class="performance-total__ratio">
                    <b>{{ performancePercent }}%</b>
                    <span>{{ performanceDenominator }}</span>
                  </div>
                </div>

                <div class="loan-meter-block">
                  <strong
                    v-if="lifecycleState === 'fundraising'"
                    class="minimum-label"
                    :style="{ left: `${minimumActivationPercent}%` }"
                  >MINIMUM {{ minimumActivationPercent }}%</strong>
                  <div
                    class="loan-meter"
                    role="progressbar"
                    :aria-label="performanceLabel"
                    :aria-valuenow="performancePercent"
                    aria-valuemin="0"
                    aria-valuemax="100"
                  >
                    <span class="loan-meter__fill" :style="{ width: `${performancePercent}%` }" />
                    <span
                      v-if="lifecycleState === 'fundraising'"
                      class="loan-meter__marker loan-meter__marker--minimum"
                      :style="{ left: `${minimumActivationPercent}%` }"
                    />
                    <span
                      v-if="lifecycleState === 'defaulted'"
                      class="loan-meter__marker loan-meter__marker--default"
                      :style="{ left: `${performancePercent}%` }"
                    />
                  </div>
                  <div class="meter-legend">
                    <span>{{ meterStartLabel }}</span>
                    <span>{{ meterEndLabel }}</span>
                  </div>
                </div>

                <dl
                  v-if="proofPoints.length"
                  class="proof-grid"
                  :class="{
                    'proof-grid--one': proofPoints.length === 1,
                    'proof-grid--two': proofPoints.length === 2,
                  }"
                >
                  <div v-for="proof in proofPoints" :key="proof.label" :class="proof.tone ? `is-${proof.tone}` : undefined">
                    <dt>{{ proof.label }}</dt>
                    <dd>{{ proof.value }}</dd>
                    <p v-if="proof.detail">{{ proof.detail }}</p>
                  </div>
                </dl>
              </section>
            </Teleport>
          </template>
        </article>

        <slot
          v-if="lifecycleState !== 'under-review'"
          name="rail"
          :state="lifecycleState"
          :funding-deadline-label="fundingDeadlineLabel"
          :next-deadline-label="nextDeadlineLabel"
          :defaulted-at-label="defaultedAtLabel"
          :settled-at-label="settledAtLabel"
        >
          <LenderActionRail
            :key="lifecycleState"
            :state="lifecycleState"
            :funding-deadline-label="fundingDeadlineLabel"
            :next-deadline-label="nextDeadlineLabel"
            :defaulted-at-label="defaultedAtLabel"
            :settled-at-label="settledAtLabel"
            :fixed-apr="fixedApr"
            :remaining-capacity-display-override="isDesignPreview && lifecycleState === 'fundraising' ? 320_000 : undefined"
            :term-months="displayTermMonths"
            @ready="handleRailReady"
          />
        </slot>
      </div>

      <div
        v-if="lifecycleState === 'fundraising'"
        id="funding-progress-slot"
        class="funding-progress-slot"
      />
    </div>

    <div
      class="loan-after"
      :class="{ 'is-preparing': !isLoanContentReady }"
      :aria-hidden="!isLoanContentReady || undefined"
      :inert="!isLoanContentReady || undefined"
    >
      <slot name="after" :state="lifecycleState" :ready="isLoanContentReady" />
    </div>
  </section>

  <slot name="after-stage" :state="lifecycleState" :ready="isLoanContentReady" />
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { computedAsync } from '@vueuse/core'
import { useBlockNumber } from '@wagmi/vue'
import Decimal from 'decimal.js'
import {
  TooltipArrow,
  TooltipContent,
  TooltipPortal,
  TooltipProvider,
  TooltipRoot,
  TooltipTrigger,
} from 'reka-ui'
import { formatUnits } from 'viem'
import useBorrow from '~/composables/useBorrow'
import { useCrowdsourceLender } from '~/composables/useCrowdsourceLender'
import useLoanStatus from '~/composables/useLoanStatus'
import useProposal from '~/composables/useProposal'
import {
  COLLATERAL_DECIMALS,
  COLLATERAL_NAME,
  CREDIT_DECIMALS,
  CREDIT_NAME,
  LOAN_DURATION_IN_MONTHS,
  LOAN_APY,
  LOAN_LTV,
  MAX_AMOUNT_FORMATTED,
  MINIMAL_APR,
  MINIMAL_CREDIT_AMOUNT,
  MINIMAL_CREDIT_AMOUNT_PERCENTAGE,
  PROPOSAL_CHAIN_ID,
  PROPOSAL_EXPIRATION,
  SHARELESS_CONTRIBUTION_AMOUNT,
} from '~/constants/proposalConstants'
import { calculateLenderNominalApr } from '~/lib/repayment-model'
import HouseBlueprintLoader from './HouseBlueprintLoader.vue'
import LenderActionRail from './LenderActionRail.vue'
import type { LoanLifecycleViewState } from './types'

const props = defineProps<{
  stateOverride?: LoanLifecycleViewState
}>()
const emit = defineEmits<{
  ready: [state: LoanLifecycleViewState]
}>()
const isAprTooltipOpen = ref(false)
const isLtvTooltipOpen = ref(false)
const isOwngageTooltipOpen = ref(false)
const isLoanStateRetrying = ref(false)
const isCurrentLtvEvaluating = ref(false)
const currentLtvError = ref(false)
const isRailReady = ref(false)

const route = useRoute()

const {
  loanStatus,
  isLoanStatusReady,
  loanStatusError,
  loanCollateralAmount,
  loanLastUpdateTimestamp,
  apr,
  aprDecimals,
  totalAmountRepaid,
  originalPrincipal,
  remainingDebt,
  repaymentProgress,
  nextPaymentDeadline,
  defaultTimestamp,
  loanDurationMonths,
  loanPostponementMonths,
  loanStartTimestamp,
  repaymentPlan,
  refetchLoanData,
} = useLoanStatus()
const { totalDepositedAssetsFormatted } = useProposal()
const { getCollateralAmountFromCreditAmount } = useBorrow()

const detectedState = computed<LoanLifecycleViewState>(() => {
  if (!isLoanStatusReady.value && !loanStatusError.value) return 'running'
  if (loanStatus.value === 'funding') return 'fundraising'
  return ({
    active: 'running',
    repaid: 'repaid',
    defaulted: 'defaulted',
  } as const)[loanStatus.value]
})

const previewState = computed<LoanLifecycleViewState | undefined>(() => {
  if (!import.meta.dev) return undefined
  const requested = typeof route.query.state === 'string' ? route.query.state : ''
  return ['under-review', 'fundraising', 'running', 'repaid', 'defaulted'].includes(requested)
    ? requested as LoanLifecycleViewState
    : undefined
})
const lifecycleState = computed(() => props.stateOverride ?? previewState.value ?? detectedState.value)
watch(lifecycleState, (state) => {
  isRailReady.value = state === 'under-review' || state === 'fundraising'
}, { immediate: true })
const { data: currentBlockNumber } = useBlockNumber({
  chainId: PROPOSAL_CHAIN_ID,
  watch: { pollingInterval: 30_000 },
})
const isBorrowerDesignPreview = computed(() => import.meta.dev
  && props.stateOverride === 'running'
  && (route.query.previewWallet === '1' || typeof route.query.repaymentStep === 'string'))
const isDesignPreview = computed(() => Boolean(previewState.value) || isBorrowerDesignPreview.value)
const shouldLoadLenders = computed(() => !isDesignPreview.value && lifecycleState.value === 'fundraising')
const { totalLenders, isLoading: areLendersLoading } = useCrowdsourceLender(shouldLoadLenders)
const isFundingUnavailable = computed(() => !isDesignPreview.value
  && isLoanStatusReady.value
  && !loanStatusError.value
  && loanStatus.value === 'funding'
  && Math.floor(Date.now() / 1000) > PROPOSAL_EXPIRATION)
const showBlockingState = computed(() => !isDesignPreview.value
  && (Boolean(loanStatusError.value) || isFundingUnavailable.value))
const stateGateEyebrow = computed(() => {
  if (loanStatusError.value) return 'LOAN STATE UNAVAILABLE'
  if (isFundingUnavailable.value) return 'FUNDING UNAVAILABLE'
  return 'SYNCING LOAN STATE'
})
const stateGateTitle = computed(() => {
  if (loanStatusError.value) return 'Onchain state could not be verified.'
  if (isFundingUnavailable.value) return 'This proposal is no longer open.'
  return 'Verifying the current loan state.'
})
const stateGateSummary = computed(() => {
  if (loanStatusError.value) return 'Actions remain unavailable until the loan status can be read safely.'
  if (isFundingUnavailable.value) return 'No lender action is available for this proposal.'
  return 'Current terms and available actions will appear once verification completes.'
})
const stateLabel = computed(() => ({
  'under-review': 'Under review',
  fundraising: 'Fundraising',
  running: 'Running',
  repaid: 'Repaid',
  defaulted: 'Defaulted',
})[lifecycleState.value])
const stateQualifier = computed(() => ({
  'under-review': 'TERMS NOT FINAL',
  fundraising: 'FUNDING OPEN TO ELIGIBLE LENDERS',
  running: 'REPAYMENTS ACTIVE',
  repaid: 'FULLY SETTLED',
  defaulted: 'LIQUIDATION IN PROGRESS',
})[lifecycleState.value])

const displayTermMonths = computed(() => isDesignPreview.value
  ? 36
  : loanDurationMonths.value || LOAN_DURATION_IN_MONTHS)
const termYearsLabel = computed(() => {
  const years = displayTermMonths.value / 12
  const value = Number.isInteger(years) ? years.toFixed(0) : years.toFixed(1)
  return `${value} ${years === 1 ? 'year' : 'years'}`
})
const termDatesLabel = computed(() => {
  if (loanStartTimestamp.value <= 0n || defaultTimestamp.value <= 0n) return 'Dates syncing…'
  return `${formatDateMixedCase(loanStartTimestamp.value)} - ${formatDateMixedCase(defaultTimestamp.value)}`
})
const proposalAprPercent = LOAN_APY / 100
const liveAprPercent = computed(() => aprDecimals.value > 0n
  ? Number(apr.value) / 10 ** Number(aprDecimals.value) * 100
  : 0)
const fixedApr = computed(() => {
  if (isDesignPreview.value) return '8.75%'
  const percent = lifecycleState.value === 'fundraising' || lifecycleState.value === 'under-review'
    ? proposalAprPercent
    : liveAprPercent.value || proposalAprPercent || MINIMAL_APR
  return `${percent.toFixed(2)}%`
})
const sharelessContributionLabel = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0,
}).format(SHARELESS_CONTRIBUTION_AMOUNT)
const lenderCapitalSupplied = computed(() => Math.max(
  0,
  Number(formatUnits(originalPrincipal.value, CREDIT_DECIMALS)) - SHARELESS_CONTRIBUTION_AMOUNT,
))
const lenderApr = computed(() => calculateLenderNominalApr({
  capitalSupplied: lenderCapitalSupplied.value,
  holidayMonths: loanPostponementMonths.value,
  monthlyPayment: repaymentPlan.value.monthlyPayment,
  paymentCount: repaymentPlan.value.paymentCount,
}))
const showsLenderApr = computed(() => !isDesignPreview.value
  && ['running', 'repaid', 'defaulted'].includes(lifecycleState.value)
  && lenderApr.value > 0)
const aprTermLabel = computed(() => showsLenderApr.value ? 'FIXED-APR' : 'FIXED APR')
const aprTermValue = computed(() => `${(lenderApr.value * 100).toFixed(2)}%`)
const lenderAprAriaLabel = computed(() => `${aprTermValue.value} estimated lender APR. Borrower rate ${fixedApr.value}. ${sharelessContributionLabel} funded the loan without receiving lender shares, so its principal and interest are distributed across the remaining lenders.`)
const originationLtvNumber = computed(() => LOAN_LTV / 100)
const originationLtv = computed(() => `${formatPercent(originationLtvNumber.value)}%`)
const ltvLabel = computed(() => {
  if (lifecycleState.value === 'running') return 'CURRENT LTV'
  if (lifecycleState.value === 'fundraising') return 'LTV'
  return 'ORIGINATION LTV'
})

const collateralDisplay = computed(() => {
  if (loanCollateralAmount.value <= 0n) return COLLATERAL_NAME

  const amount = Number(formatUnits(loanCollateralAmount.value, COLLATERAL_DECIMALS))
  if (!Number.isFinite(amount)) return COLLATERAL_NAME
  return `${amount.toLocaleString('en-US', { maximumFractionDigits: 4 })} ${COLLATERAL_NAME}`
})
// Convert current debt (principal plus accrued interest) into its collateral
// equivalent at 100% LTV, then compare it with the collateral locked.
const currentLtvSnapshot = computedAsync(async () => {
  currentLtvError.value = false
  void currentBlockNumber.value
  if (remainingDebt.value <= 0n || loanCollateralAmount.value <= 0n) return undefined

  try {
    const debtInCollateral = await getCollateralAmountFromCreditAmount(remainingDebt.value, 10_000n)
    const ltv = new Decimal(debtInCollateral.toString())
      .mul(100)
      .div(loanCollateralAmount.value.toString())
    const collateralValue = new Decimal(formatUnits(remainingDebt.value, CREDIT_DECIMALS))
      .mul(loanCollateralAmount.value.toString())
      .div(debtInCollateral.toString())

    return {
      collateralValue: collateralValue.toDecimalPlaces(2).toNumber(),
      ltv: ltv.toDecimalPlaces(1).toNumber(),
    }
  } catch {
    currentLtvError.value = true
    return undefined
  }
}, undefined, isCurrentLtvEvaluating)
const isCurrentLtvSettled = computed(() => lifecycleState.value !== 'running'
  || currentLtvSnapshot.value !== undefined
  || currentLtvError.value
  || (isLoanStatusReady.value && (remainingDebt.value <= 0n || loanCollateralAmount.value <= 0n)))
const isLoanContentReady = computed(() => isDesignPreview.value
  || (!showBlockingState.value
    && isLoanStatusReady.value
    && isCurrentLtvSettled.value
    && isRailReady.value))
const isLoanLoading = computed(() => !isDesignPreview.value
  && !showBlockingState.value
  && !isLoanContentReady.value)
const isLoanStageSettled = computed(() => showBlockingState.value || isLoanContentReady.value)
const hasEmittedReady = ref(false)

watch(isLoanStageSettled, (isSettled) => {
  if (!isSettled || hasEmittedReady.value) return
  hasEmittedReady.value = true
  emit('ready', lifecycleState.value)
}, { immediate: true })
const currentLtv = computed(() => currentLtvSnapshot.value?.ltv)
const currentDebtAmountLabel = computed(() => remainingDebt.value > 0n
  ? formatCurrency(Number(formatUnits(remainingDebt.value, CREDIT_DECIMALS)))
  : '—')
const originalPrincipalLabel = computed(() => originalPrincipal.value > 0n
  ? `${formatCurrency(Number(formatUnits(originalPrincipal.value, CREDIT_DECIMALS)))} ${CREDIT_NAME}`
  : '—')
const currentDebtLabel = computed(() => `${formatCurrency(
  Number(formatUnits(remainingDebt.value, CREDIT_DECIMALS)),
)} ${CREDIT_NAME}`)
const monthlyRepaymentLabel = computed(() => repaymentPlan.value.monthlyPayment > 0
  ? formatEstimateCurrency(repaymentPlan.value.monthlyPayment)
  : '—')
const totalRepaymentLabel = computed(() => repaymentPlan.value.totalRepayment > 0
  ? formatEstimateCurrency(repaymentPlan.value.totalRepayment)
  : '—')
const currentCollateralValueLabel = computed(() => currentLtvSnapshot.value
  ? formatCurrency(currentLtvSnapshot.value.collateralValue)
  : '—')
const currentLtvLabel = computed(() => {
  if (isCurrentLtvEvaluating.value && currentLtv.value === undefined) return '…'
  return currentLtv.value === undefined ? '—' : `${formatPercent(currentLtv.value)}%`
})
const ltvDifference = computed(() => currentLtv.value === undefined
  ? undefined
  : Number((currentLtv.value - originationLtvNumber.value).toFixed(1)))
const ltvDirection = computed(() => {
  if (ltvDifference.value === undefined || ltvDifference.value === 0) return ''
  return ltvDifference.value > 0 ? '▲' : '▼'
})
const ltvTone = computed(() => {
  if (ltvDifference.value === undefined || ltvDifference.value === 0) return 'is-neutral'
  return ltvDifference.value > 0 ? 'is-up' : 'is-down'
})
const currentLtvAriaLabel = computed(() => {
  if (isCurrentLtvEvaluating.value) return `Syncing current LTV. LTV at origination ${originationLtv.value}.`
  if (currentLtvError.value) return `Current LTV unavailable. LTV at origination ${originationLtv.value}.`
  if (ltvDifference.value === undefined) return `Current LTV unavailable. LTV at origination ${originationLtv.value}.`
  if (ltvDifference.value > 0) return `Current LTV ${currentLtvLabel.value}, up from ${originationLtv.value} at origination.`
  if (ltvDifference.value < 0) return `Current LTV ${currentLtvLabel.value}, down from ${originationLtv.value} at origination.`
  return `Current LTV ${currentLtvLabel.value}, unchanged from origination.`
})

const depositedAmount = computed(() => isDesignPreview.value ? 680_000 : Number(totalDepositedAssetsFormatted.value) || 0)
const fundingGoalAmount = computed(() => isDesignPreview.value ? 1_000_000 : MAX_AMOUNT_FORMATTED)
const fundingProgress = computed(() => clampPercent(depositedAmount.value / fundingGoalAmount.value * 100))
const originalPrincipalAmount = computed(() => isDesignPreview.value
  ? 1_000_000
  : Number(formatUnits(originalPrincipal.value, CREDIT_DECIMALS)))
const minimumActivationPercent = computed(() => isDesignPreview.value
  ? 60
  : Math.round(Number(MINIMAL_CREDIT_AMOUNT_PERCENTAGE) * 100))
const minimumActivationAmount = computed(() => isDesignPreview.value
  ? 600_000
  : Number(formatUnits(MINIMAL_CREDIT_AMOUNT, CREDIT_DECIMALS)))

const performanceLabel = computed(() => ({
  fundraising: 'FUNDING PROGRESS',
  running: 'REPAYMENT STATUS',
  repaid: 'REPAYMENT HISTORY',
  defaulted: 'REPAYMENT HISTORY',
  'under-review': '',
})[lifecycleState.value])

const performanceMeta = computed(() => ({
  fundraising: `OPEN UNTIL ${formatDate(PROPOSAL_EXPIRATION)}`,
  running: `NEXT DUE ${nextDeadlineShort.value}`,
  repaid: `REPAID ${formatDate(loanLastUpdateTimestamp.value)}`,
  defaulted: 'DEFAULT CONDITION ACTIVE',
  'under-review': '',
})[lifecycleState.value])

const performanceAmount = computed(() => {
  if (lifecycleState.value === 'fundraising') return formatCurrency(depositedAmount.value)
  if (isDesignPreview.value && lifecycleState.value === 'running') return '$300,000'
  if (isDesignPreview.value && lifecycleState.value === 'defaulted') return '$416,667'
  if (lifecycleState.value === 'repaid') return formatCurrency(originalPrincipalAmount.value)
  return formatCurrency(Number(formatUnits(totalAmountRepaid.value, CREDIT_DECIMALS)))
})
const performanceAmountLabel = computed(() => ({
  fundraising: 'FUNDED',
  running: 'PRINCIPAL REPAID',
  repaid: 'PRINCIPAL REPAID',
  defaulted: 'PRINCIPAL REPAID',
  'under-review': '',
})[lifecycleState.value])
const performancePercent = computed(() => {
  if (lifecycleState.value === 'fundraising') return fundingProgress.value
  if (lifecycleState.value === 'repaid') return 100
  if (isDesignPreview.value && lifecycleState.value === 'running') return 30
  if (isDesignPreview.value && lifecycleState.value === 'defaulted') return 42
  return repaymentProgress.value
})
const performanceDenominator = computed(() => {
  const denominator = lifecycleState.value === 'fundraising' ? fundingGoalAmount.value : originalPrincipalAmount.value
  return `of ${formatCurrency(denominator)}`
})
const meterStartLabel = computed(() => lifecycleState.value === 'fundraising' ? '$0' : 'START')
const meterEndLabel = computed(() => {
  if (lifecycleState.value === 'fundraising') return `GOAL ${formatCurrency(fundingGoalAmount.value)}`
  if (lifecycleState.value === 'repaid') return `REPAID · ${formatMonthYear(loanLastUpdateTimestamp.value)}`
  if (lifecycleState.value === 'defaulted') return 'DEFAULT CONDITION'
  return `MATURITY · ${formatMonthYear(defaultTimestamp.value)}`
})

type ProofPoint = { label: string, value: string, detail?: string, tone?: 'positive' | 'negative' }
const proofPoints = computed<ProofPoint[]>(() => {
  if (lifecycleState.value !== 'fundraising') return []

  const remaining = Math.max(0, fundingGoalAmount.value - depositedAmount.value)
  const minimumMet = depositedAmount.value >= minimumActivationAmount.value
  return [
    { label: 'REMAINING', value: formatCurrency(remaining), detail: 'to funding goal' },
    { label: minimumMet ? 'MINIMUM MET' : 'MINIMUM', value: minimumMet ? 'Yes' : formatCurrency(Math.max(0, minimumActivationAmount.value - depositedAmount.value)), detail: minimumMet ? `${formatCurrency(minimumActivationAmount.value)} threshold` : 'still required', tone: minimumMet ? 'positive' : undefined },
    { label: 'LENDERS', value: isDesignPreview.value ? '14' : areLendersLoading.value ? '…' : totalLenders.value.toLocaleString('en-US'), detail: 'currently committed' },
  ]
})

const fundingDeadlineLabel = computed(() => `CLOSES ${formatDate(PROPOSAL_EXPIRATION)}`)
const nextDeadlineShort = computed(() => nextPaymentDeadline.value ? formatDate(nextPaymentDeadline.value) : '—')
const nextDeadlineLabel = computed(() => `NEXT DUE ${nextDeadlineShort.value}`)
const defaultedAtLabel = computed(() => 'DEFAULT CONDITION ACTIVE')
const settledAtLabel = computed(() => formatDate(loanLastUpdateTimestamp.value))

async function retryLoanState() {
  if (isLoanStateRetrying.value) return
  isLoanStateRetrying.value = true
  try {
    await refetchLoanData()
  } finally {
    isLoanStateRetrying.value = false
  }
}

function handleRailReady() {
  isRailReady.value = true
}

function clampPercent(value: number) {
  if (!Number.isFinite(value)) return 0
  return Math.min(100, Math.max(0, Math.round(value)))
}

function formatPercent(value: number) {
  return Number.isInteger(value) ? value.toFixed(0) : value.toFixed(1)
}

function formatCurrency(value: number) {
  if (!Number.isFinite(value)) return '—'
  return `$${Math.round(value).toLocaleString('en-US')}`
}

function formatEstimateCurrency(value: number) {
  if (!Number.isFinite(value)) return '—'
  return new Intl.NumberFormat('en-US', {
    currency: 'USD',
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
    style: 'currency',
  }).format(value)
}

function formatMonthYear(timestamp: bigint | number, uppercase = true) {
  const numericTimestamp = Number(timestamp)
  if (!numericTimestamp) return '—'
  const formatted = new Intl.DateTimeFormat('en-GB', {
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(numericTimestamp * 1000))
  return uppercase ? formatted.toUpperCase() : formatted
}

function formatDate(timestamp: bigint | number) {
  const numericTimestamp = Number(timestamp)
  if (!numericTimestamp) return '—'
  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(numericTimestamp * 1000)).toUpperCase()
}

function formatDateMixedCase(timestamp: bigint | number) {
  const numericTimestamp = Number(timestamp)
  if (!numericTimestamp) return '—'
  return new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(numericTimestamp * 1000))
}
</script>

<style scoped>
.loan-stage {
  --paper: #f3f0e8;
  --paper-deep: #e8e2d7;
  --ink: #171a19;
  --muted: #5d605c;
  --rule: #b7b2a8;
  --teal: #008f8b;
  --teal-ink: #006f6c;
  --amber: #db8a00;
  --danger: #b42318;
  width: 100%;
  padding: 37.6px;
  border: 1px solid var(--rule);
  border-radius: 12px;
  background: var(--paper);
  scroll-margin-top: 24px;
  color: var(--ink);
  font-family: var(--font-geist);
}

.loan-stage.is-preparing {
  border-color: transparent;
  border-radius: 0;
  background: transparent;
}

.loan-surface {
  position: relative;
  width: 100%;
  min-height: 620px;
  isolation: isolate;
}

.loan-after {
  position: relative;
  width: 100%;
  margin-inline: auto;
}

.loan-after.is-preparing,
.loan-grid.is-preparing {
  visibility: hidden;
}

.loan-blueprint-loader {
  position: absolute;
  z-index: 0;
  top: clamp(66px, 8vw, 116px);
  left: 50%;
  transform: translateX(-50%);
}

.loan-state-gate {
  position: relative;
  z-index: 1;
  display: grid;
  max-width: 720px;
  align-content: start;
  gap: 12px;
  padding-top: 8px;
}

.loan-state-gate p,
.loan-state-gate h1,
.loan-state-gate span {
  margin: 0;
}

.loan-state-gate__retry {
  width: fit-content;
  min-height: 44px;
  justify-content: flex-start;
  padding: 0;
  font: 700 10px/16px var(--font-mono);
  letter-spacing: .06em;
}

.loan-state-gate__retry:focus-visible {
  outline: 2px solid var(--teal);
  outline-offset: 3px;
}

.loan-state-gate p {
  color: var(--teal-ink);
  font: 700 10px/16px var(--font-mono);
  letter-spacing: .08em;
}

.loan-state-gate h1 {
  font-family: var(--font-newsreader);
  font-size: 42px;
  font-variation-settings: "wght" 500;
  font-weight: 500;
  line-height: 48px;
}

.loan-state-gate span {
  max-width: 560px;
  color: var(--muted);
  font-size: 16px;
  line-height: 24px;
}

.loan-grid {
  position: relative;
  z-index: 1;
  display: grid;
  grid-template-columns: minmax(0, 818px) minmax(0, 386px);
  align-items: start;
  gap: 46px;
}

.loan-stage.is-under-review .loan-grid {
  grid-template-columns: minmax(0, 1fr);
}

.loan-core {
  min-width: 0;
  min-height: 620px;
}

.loan-stage.is-under-review .loan-core {
  min-height: 0;
}

.funding-progress-slot {
  width: 100%;
  margin-top: 32px;
}

.funding-progress-slot .loan-performance {
  margin-top: 0;
}

.loan-header {
  min-height: 211px;
}

.loan-status-row,
.section-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 24px;
}

.loan-status-row {
  min-height: 24px;
}

.loan-status,
.section-heading h2,
.section-heading p,
.term-grid dt,
.proof-grid dt,
.proof-grid > div > p,
.meter-legend {
  margin: 0;
  font-family: var(--font-mono);
  font-size: 10px;
  font-weight: 700;
  line-height: 16px;
  letter-spacing: .08em;
  text-transform: uppercase;
}

.loan-status {
  display: flex;
  align-items: center;
  gap: 10px;
  color: var(--muted);
  font-size: 11px;
  font-weight: 400;
  letter-spacing: .02em;
}

.loan-status strong {
  color: var(--teal-ink);
  font-size: 12px;
  font-weight: 700;
  letter-spacing: .04em;
}

.loan-status__dot {
  width: 8px;
  height: 8px;
  flex: 0 0 auto;
  background: var(--teal);
}

.is-under-review .loan-status strong { color: #9a5b00; }
.is-under-review .loan-status__dot { background: var(--amber); }
.is-defaulted .loan-status strong { color: var(--danger); }
.is-defaulted .loan-status__dot { background: var(--danger); }

.loan-header h1 {
  max-width: 720px;
  margin: 24px 0 0;
  font-family: var(--font-newsreader);
  font-size: 42px;
  font-variation-settings: "wght" 500;
  font-weight: 500;
  line-height: 48px;
  letter-spacing: -.025em;
}

.loan-summary {
  display: grid;
  max-width: 730px;
  height: auto;
  margin: 20px 0 0;
  color: var(--muted);
  font-size: 15px;
  line-height: 24px;
}

.owngage-term {
  margin: 0 .16em;
  padding: 0;
  border: 0;
  background: transparent;
  color: inherit;
  cursor: help;
  font: inherit;
  text-decoration-line: underline;
  text-decoration-style: dotted;
  text-underline-offset: 3px;
}

.owngage-term:focus-visible {
  border-radius: 2px;
  outline: 2px solid var(--teal);
  outline-offset: 2px;
}

.loan-terms {
  display: flex;
  height: 290px;
  margin-top: 15px;
  flex-direction: column;
  gap: 16px;
  padding-bottom: 11px;
  border-bottom: 1px solid var(--rule);
}

.section-heading {
  min-height: 22px;
}

.section-heading h2 {
  color: var(--ink);
  font-size: 11px;
  letter-spacing: .12em;
}

.section-heading p {
  color: var(--muted);
  font-weight: 500;
}

.term-grid {
  display: grid;
  height: 241px;
  flex: 0 0 241px;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  grid-template-rows: repeat(2, 1fr);
  margin: 0;
  border-top: 1px solid var(--rule);
}

.term-grid > div {
  min-width: 0;
  padding: 20px 20px 18px;
}

.term-grid > div:not(:nth-child(3n + 1)) { border-left: 1px solid var(--rule); }
.term-grid > div:nth-child(n + 4) { border-top: 1px solid var(--rule); }
.term-grid > div:nth-child(3n + 1) { padding-left: 0; }

.term-grid dt,
.proof-grid dt {
  color: var(--muted);
}

.term-grid dt { line-height: 14px; }

.term-grid dd {
  margin: 6px 0 0;
  color: var(--ink);
  font-size: 30px;
  font-weight: 600;
  line-height: 35px;
  letter-spacing: -.012em;
}

.term-grid > div:nth-child(n + 4) dd {
  font-size: 20px;
  line-height: 26px;
}

.term-grid > div:nth-child(n + 4) { padding-top: 20px; }

.term-grid .repayment-term dd,
.term-grid .amount-owed-term dd,
.term-grid .term-duration dd {
  display: grid;
  align-content: start;
  gap: 0;
}

.repayment-term dd > span,
.repayment-term dd > small,
.amount-owed-term dd > span,
.amount-owed-term dd > small,
.term-duration dd > span,
.term-duration dd > small {
  white-space: nowrap;
}

.repayment-term dd > small,
.amount-owed-term dd > small,
.term-duration dd > small {
  color: var(--muted);
  font: 500 12px/16px var(--font-geist);
  letter-spacing: 0;
}

.apr-value-trigger {
  display: grid;
  min-height: 52px;
  align-content: start;
  justify-items: start;
  gap: 0;
  padding: 0;
  border: 0;
  background: transparent;
  color: inherit;
  cursor: help;
  font: inherit;
  letter-spacing: inherit;
  text-align: left;
}

.apr-value-trigger > span {
  text-decoration: none;
}

.apr-value-trigger small {
  color: var(--muted);
  font: 500 12px/16px var(--font-geist);
  letter-spacing: 0;
  text-decoration: underline dotted;
  text-decoration-thickness: 1px;
  text-underline-offset: 3px;
  white-space: nowrap;
}

.apr-value-trigger:focus-visible {
  border-radius: 2px;
  outline: 2px solid var(--teal);
  outline-offset: 4px;
}

.ltv-value-trigger {
  display: inline-flex;
  min-height: 44px;
  align-items: center;
  gap: 7px;
  padding: 0;
  border: 0;
  background: transparent;
  color: inherit;
  cursor: help;
  font: inherit;
  letter-spacing: inherit;
  margin-block: -7px;
}

.ltv-value-trigger:focus-visible {
  border-radius: 2px;
  outline: 2px solid var(--teal);
  outline-offset: 4px;
}

.ltv-value-trigger > span:first-child {
  text-decoration: underline dotted;
  text-decoration-thickness: 1px;
  text-underline-offset: 4px;
}

.ltv-direction {
  font-family: var(--font-geist);
  font-size: 11px;
  line-height: 1;
}

.ltv-value-trigger.is-up .ltv-direction { color: var(--danger); }
.ltv-value-trigger.is-down .ltv-direction { color: var(--teal-ink); }

:global(.loan-ltv-tooltip) {
  z-index: 50;
  display: flex;
  align-items: baseline;
  gap: 5px;
  padding: 7px 9px;
  border: 1px solid #314244;
  border-radius: 5px;
  background: #172426;
  box-shadow: 0 6px 18px rgb(23 26 25 / 18%);
  color: #c8c6bf;
  font-family: var(--font-geist);
  font-size: 11px;
  font-weight: 500;
  line-height: 16px;
  white-space: nowrap;
}

:global(.loan-ltv-tooltip strong) {
  color: #f3f0e8;
  font-weight: 700;
}

:global(.loan-ltv-tooltip__arrow) { fill: #172426; }

:global(.loan-apr-tooltip) {
  z-index: 50;
  max-width: 330px;
  padding: 9px 11px;
  border: 1px solid #314244;
  border-radius: 5px;
  background: #172426;
  box-shadow: 0 6px 18px rgb(23 26 25 / 18%);
  color: #f3f0e8;
  font-family: var(--font-geist);
  font-size: 11px;
  font-weight: 500;
  line-height: 16px;
}

:global(.loan-apr-tooltip__arrow) { fill: #172426; }

.loan-performance {
  display: flex;
  height: 398px;
  margin-top: 16px;
  flex-direction: column;
  justify-content: space-between;
}

.loan-performance .section-heading {
  min-height: 22px;
}

.loan-performance .section-heading h2 { color: var(--teal-ink); }
.is-defaulted .loan-performance .section-heading h2,
.is-defaulted .loan-performance .section-heading p { color: var(--danger); }

.performance-total {
  display: flex;
  height: 88px;
  align-items: flex-end;
  justify-content: space-between;
  gap: 24px;
  margin-top: 0;
}

.performance-total__amount {
  display: grid;
  width: min(560px, 66%);
  height: 88px;
  align-content: start;
  gap: 1px;
}

.performance-total__amount > span {
  font: 700 10px/14px var(--font-mono);
  letter-spacing: .08em;
  text-transform: uppercase;
}

.performance-total__amount > strong {
  font-family: var(--font-newsreader);
  font-size: 44px;
  font-variation-settings: "wght" 500;
  font-weight: 500;
  line-height: 50px;
  letter-spacing: -.025em;
}

.performance-total__ratio {
  display: flex;
  width: 200px;
  height: 70px;
  align-items: flex-end;
  justify-content: flex-start;
  flex-direction: column;
  gap: 0;
  padding-bottom: 0;
  color: var(--muted);
  transform: none;
}

.performance-total__ratio b {
  color: var(--teal-ink);
  font: 700 32px/36px var(--font-mono);
}

.performance-total__ratio span {
  font: 400 13px/18px var(--font-geist);
  text-transform: lowercase;
}

.is-defaulted .performance-total b { color: var(--danger); }

.loan-meter-block {
  position: relative;
  height: 74px;
  margin-top: 0;
}

.minimum-label {
  position: absolute;
  top: 0;
  transform: translateX(-50%);
  color: #9a5b00;
  font: 700 10px/14px var(--font-mono);
  letter-spacing: .04em;
  white-space: nowrap;
}

.loan-meter {
  position: relative;
  height: 8px;
  margin-top: 30px;
  background: #d6d0c5;
}

.loan-meter__fill {
  position: absolute;
  inset: 0 auto 0 0;
  background: var(--teal-ink);
  transition: width 220ms ease-out;
}

.is-defaulted .loan-meter__fill { background: var(--teal-ink); }

.loan-meter__marker {
  position: absolute;
  top: -8px;
  width: 2px;
  height: 24px;
  transform: translateX(-1px);
}

.loan-meter__marker--minimum { background: var(--amber-ink); }
.loan-meter__marker--default { background: var(--danger); }

.meter-legend {
  position: relative;
  display: flex;
  justify-content: space-between;
  margin-top: 10px;
  color: var(--muted);
  font-size: 9px;
  font-weight: 500;
  line-height: 14px;
  transform: none;
}

.proof-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  height: 96px;
  margin: 0;
  border-top: 1px solid var(--rule);
}

.proof-grid--two { grid-template-columns: repeat(2, minmax(0, 1fr)); }
.proof-grid--one { grid-template-columns: minmax(0, 1fr); }

.proof-grid > div {
  min-width: 0;
  padding: 15px 20px 12px;
}

.proof-grid > div:first-child { padding-left: 0; }
.proof-grid > div + div { border-left: 1px solid var(--rule); }

.proof-grid dd {
  margin: 8px 0 0;
  color: var(--ink);
  font-size: 18px;
  font-weight: 600;
  line-height: 24px;
  letter-spacing: -.012em;
}

.proof-grid dt {
  font-size: 9px;
  line-height: 13px;
}

.proof-grid > div > p {
  margin-top: 3px;
  color: var(--muted);
  font-family: var(--font-geist);
  font-size: 11px;
  font-weight: 400;
  line-height: 15px;
  letter-spacing: 0;
  text-transform: none;
}

.proof-grid .is-positive dd { color: var(--teal-ink); }
.proof-grid .is-negative dd { color: var(--danger); }

.review-facts {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  height: 126px;
  margin: 29px 0 0;
  border-top: 1px solid var(--rule);
  border-bottom: 1px solid var(--rule);
}

.review-facts > div { padding: 23px 24px 20px; }
.review-facts > div:first-child { padding-left: 0; }
.review-facts > div + div { border-left: 1px solid var(--rule); }
.review-facts dt { color: var(--muted); font: 700 10px/14px var(--font-mono); letter-spacing: .08em; }
.review-facts dd { margin: 6px 0 0; font-size: 20px; font-weight: 600; line-height: 26px; }
.review-facts > div:nth-child(2) dd { font-size: 26px; line-height: 30px; }

@media (prefers-reduced-motion: reduce) {
  .loan-meter__fill { transition: none; }
}

@media (max-width: 1399px) {
  .loan-grid { grid-template-columns: minmax(0, 1fr); gap: 32px; }
  .loan-core { min-height: auto; }
  .loan-grid > :deep(.lender-action-rail),
  .loan-grid > :deep(.lender-action-column),
  .loan-grid > :deep(.borrower-rail) { justify-self: end; }
}

@media (max-width: 820px) {
  .loan-stage { padding: 23px; border-radius: 10px; }
  .loan-surface { min-height: 520px; }
  .loan-blueprint-loader { top: 76px; }
  .loan-header { min-height: auto; }
  .loan-status-row, .section-heading { align-items: flex-start; flex-direction: column; gap: 4px; }
  .loan-header h1 { margin-top: 24px; font-size: 34px; line-height: 39px; }
  .loan-summary { height: auto; margin-top: 12px; }
  .loan-terms, .loan-performance { height: auto; margin-top: 32px; }
  .section-heading { min-height: auto; margin-bottom: 16px; }
  .term-grid { height: auto; grid-template-columns: 1fr 1fr; grid-template-rows: none; }
  .term-grid > div { min-height: 104px; padding: 20px 16px; border-top: 1px solid var(--rule); }
  .term-grid > div:nth-child(odd) { padding-left: 0; border-left: 0; }
  .term-grid > div:nth-child(even) { border-left: 1px solid var(--rule); }
  .performance-total { height: auto; align-items: flex-start; flex-direction: column; gap: 8px; }
  .performance-total__amount { width: 100%; height: auto; }
  .performance-total__ratio { width: 100%; height: auto; align-items: flex-start; }
  .proof-grid, .proof-grid--two, .review-facts { height: auto; grid-template-columns: 1fr; }
  .proof-grid > div, .proof-grid > div:first-child, .review-facts > div, .review-facts > div:first-child { min-height: 92px; padding: 20px 0; }
  .proof-grid > div + div, .review-facts > div + div { border-top: 1px solid var(--rule); border-left: 0; }
  .loan-grid > :deep(.lender-action-rail),
  .loan-grid > :deep(.lender-action-column),
  .loan-grid > :deep(.borrower-rail) { justify-self: stretch; }
}
</style>

<template>
  <div class="lender-action-column">
    <aside
      class="lender-action-rail"
      :class="`is-${state}`"
      :aria-label="`${stateLabel} lender actions`"
    >
      <header v-if="state !== 'running'" class="rail-status">
        <p>
          <span aria-hidden="true" />
          {{ statusLabel }}
        </p>
        <strong>{{ statusMeta }}</strong>
      </header>

      <section class="rail-context">
        <p v-if="state === 'fundraising'" class="rail-eyebrow">LENDER ACTION</p>
        <h2>{{ context.title }}</h2>
        <p class="rail-summary">{{ context.summary }}</p>
      </section>

      <ContributeBox
        v-if="state === 'fundraising'"
        class="rail-transaction"
        :fixed-apr="fixedApr"
        :remaining-capacity-display-override="remainingCapacityDisplayOverride"
        :term-months="termMonths"
      />
      <WithdrawBox
        v-else
        class="rail-transaction"
        :state="state"
        @ready="emit('ready')"
      />
    </aside>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { LoanLifecycleViewState } from './types'

const props = defineProps<{
  state: LoanLifecycleViewState
  fundingDeadlineLabel: string
  nextDeadlineLabel: string
  defaultedAtLabel: string
  settledAtLabel: string
  fixedApr: string
  remainingCapacityDisplayOverride?: number
  termMonths: number
}>()
const emit = defineEmits<{
  ready: []
}>()

const stateLabel = computed(() => ({
  fundraising: 'Fundraising',
  running: 'Running',
  repaid: 'Repaid',
  defaulted: 'Defaulted',
})[props.state])

const statusLabel = computed(() => ({
  fundraising: 'FUNDING OPEN',
  running: 'REPAYMENTS ACTIVE',
  repaid: 'REPAID',
  defaulted: 'RECOVERY OPEN',
})[props.state])

const statusMeta = computed(() => {
  if (props.state === 'fundraising') return props.fundingDeadlineLabel
  if (props.state === 'running') return props.nextDeadlineLabel
  if (props.state === 'defaulted') return props.defaultedAtLabel
  return props.settledAtLabel
})

const context = computed(() => ({
  fundraising: {
    title: 'Commit capital',
    summary: 'Choose an amount, then connect your wallet to confirm the onchain commitment.',
  },
  running: {
    title: 'Your loan position',
    summary: 'Track your principal and claim repayments as they are received.',
  },
  repaid: {
    title: 'Loan fully repaid',
    summary: 'Your position is settled. Claim any remaining repayments.',
  },
  defaulted: {
    title: 'Recovery position',
    summary: 'Liquidation proceeds can be withdrawn as they settle onchain.',
  },
})[props.state])
</script>

<style scoped>
.lender-action-column {
  display: flex;
  width: 100%;
  max-width: 386px;
  justify-self: end;
  flex-direction: column;
  gap: 16px;
}

@media (min-width: 1400px) {
  .lender-action-column {
    position: sticky;
    z-index: 2;
    top: 24px;
    align-self: start;
  }
}

.lender-action-rail {
  display: flex;
  width: 100%;
  max-width: 386px;
  justify-self: end;
  min-height: 620px;
  flex-direction: column;
  overflow: hidden;
  padding: 32px 31px;
  border: 1px solid #314244;
  border-radius: 12px;
  background: #172426;
  color: #f3f0e8;
}

.lender-action-rail.is-fundraising {
  background: #233032;
}

.lender-action-rail.is-running {
  min-height: 0;
  border-radius: 36px;
}

.rail-status {
  display: flex;
  min-height: 24px;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.rail-status p,
.rail-status strong,
.rail-eyebrow {
  margin: 0;
  font-family: var(--font-mono);
  text-transform: uppercase;
}

.rail-status p {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  color: #13aaa5;
  font-size: 10px;
  font-weight: 700;
  line-height: 1.3;
  letter-spacing: .08em;
}

.rail-status p span {
  width: 8px;
  height: 8px;
  flex: 0 0 auto;
  border-radius: 999px;
  background: #13aaa5;
}

.lender-action-rail.is-defaulted .rail-status p {
  color: #e08c72;
}

.lender-action-rail.is-defaulted .rail-status p span {
  background: #e08c72;
}

.rail-status strong {
  color: #c8c6bf;
  font-size: 9px;
  font-weight: 400;
  line-height: 1.35;
  letter-spacing: .03em;
  text-align: right;
}

.rail-context {
  margin-top: 24px;
}

.rail-eyebrow {
  color: #c8c6bf;
  font-size: 10px;
  font-weight: 700;
  line-height: 1.3;
  letter-spacing: .08em;
}

.rail-context h2 {
  margin: 0;
  color: #f5f1e8;
  font-family: var(--font-newsreader);
  font-size: 36px;
  font-weight: 500;
  line-height: 1;
  letter-spacing: -.02em;
}

.rail-eyebrow + h2 {
  margin-top: 10px;
}

.rail-summary {
  max-width: 336px;
  margin: 10px 0 0;
  color: #c8c6bf;
  font-family: var(--font-geist);
  font-size: 14px;
  font-weight: 400;
  line-height: 1.5;
}

.rail-transaction {
  min-height: 0;
  flex: 1 1 auto;
}

@media (max-width: 620px) {
  .lender-action-column {
    max-width: none;
    justify-self: stretch;
  }

  .lender-action-rail {
    max-width: none;
    justify-self: stretch;
    min-height: 0;
    padding: 24px 20px;
    border-radius: 10px;
  }

  .rail-status {
    align-items: flex-start;
  }

  .rail-status strong {
    max-width: 120px;
  }

  .rail-context h2 {
    font-size: 32px;
  }
}
</style>

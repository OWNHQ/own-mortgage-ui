<template>
  <section id="rewards-section" class="commitment-benefits" aria-labelledby="commitment-benefits-title">
    <header>
      <h2 id="commitment-benefits-title">Commitment has benefits.</h2>
      <p>Benefits accumulate with commitment size and remain subordinate to the loan terms.</p>
    </header>

    <div class="commitment-benefits__grid">
      <article
        v-for="perk in LENDER_PERKS"
        :key="perk.threshold"
        class="perk-card"
        :class="{ 'is-current': activeThreshold === perk.threshold }"
        :aria-current="activeThreshold === perk.threshold ? 'true' : undefined"
      >
        <span class="perk-card__rank">{{ perk.rankLabel }}</span>
        <strong class="perk-card__threshold">{{ perk.thresholdLabel }}</strong>
        <span class="perk-card__label">PERKS</span>
        <p
          class="perk-card__inherited"
          :aria-hidden="perk.inheritedLabel ? undefined : 'true'"
        >
          {{ perk.inheritedLabel || '\u00a0' }}
        </p>
        <ul>
          <li v-for="benefit in perk.perks" :key="benefit">{{ benefit }}</li>
        </ul>
        <span class="perk-card__membership">{{ perk.membershipLabel }}</span>
      </article>
    </div>
  </section>
</template>

<script setup lang="ts">
import { formatUnits } from 'viem'
import { CREDIT_DECIMALS } from '~/constants/proposalConstants'
import { LENDER_PERKS } from '~/constants/lenderPerks'

const userDepositStore = useUserDepositStore()
const { userDeposit } = storeToRefs(userDepositStore)

const committedAmount = computed(() =>
  Number(formatUnits(userDeposit.value, CREDIT_DECIMALS)),
)

const activeThreshold = computed(() =>
  [...LENDER_PERKS].reverse().find(perk => committedAmount.value >= perk.threshold)?.threshold,
)
</script>

<style scoped>
.commitment-benefits {
  min-width: 0;
  padding: 31px;
  background: var(--paper);
  color: var(--ink);
}

.commitment-benefits header h2,
.commitment-benefits header p,
.perk-card p,
.perk-card ul {
  margin: 0;
}

.commitment-benefits header h2 {
  font-family: var(--font-newsreader);
  font-size: 25px;
  font-variation-settings: "wght" 500;
  font-weight: 500;
  line-height: 31px;
}

.commitment-benefits header p {
  margin-top: 14px;
  color: var(--muted-ink);
  font-size: 13px;
  line-height: 20px;
}

.commitment-benefits__grid {
  display: grid;
  grid-template-columns: repeat(6, minmax(0, 1fr));
  gap: 12px;
  margin-top: 24px;
}

.perk-card {
  display: flex;
  min-width: 0;
  min-height: 234px;
  flex-direction: column;
  padding: 14px 12px;
  border: 1px solid var(--rule);
  border-radius: 7px;
  background: var(--paper);
}

.perk-card.is-current {
  border-color: var(--teal);
  box-shadow: inset 0 3px 0 var(--teal);
}

.perk-card__rank,
.perk-card__label,
.perk-card__inherited,
.perk-card__membership {
  font-family: var(--font-mono);
}

.perk-card__rank {
  color: var(--teal);
  font-size: 9px;
  font-weight: 700;
  line-height: 14px;
}

.perk-card__threshold {
  margin-top: 11px;
  color: var(--teal);
  font: 700 27px/31px var(--font-mono);
  letter-spacing: -.02em;
}

.perk-card__label {
  margin-top: 12px;
  color: var(--teal-dark);
  font-size: 8px;
  font-weight: 700;
  line-height: 12px;
}

.perk-card__inherited {
  margin-top: 8px !important;
  color: var(--muted-ink);
  font-size: 8px;
  line-height: 12px;
}

.perk-card ul {
  margin-top: 7px;
  padding-inline-start: 17px;
  list-style: disc;
}

.perk-card li {
  font-family: var(--font-geist);
  font-size: 15px;
  font-variation-settings: "wght" 500;
  font-weight: 500;
  line-height: 19px;
}

.perk-card li::marker {
  font-size: .7em;
}

.perk-card__membership {
  display: flex;
  min-height: 30px;
  align-items: center;
  margin-top: auto;
  padding: 0 9px;
  border-radius: 4px;
  background: var(--paper-deep);
  color: var(--ink);
  font-size: 8px;
  font-weight: 700;
  line-height: 12px;
}

@media (max-width: 1100px) {
  .commitment-benefits__grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}

@media (max-width: 720px) {
  .commitment-benefits {
    padding: 28px 23px;
  }

  .commitment-benefits__grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 440px) {
  .commitment-benefits__grid {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>

<template>
  <div class="position-transaction">
    <template v-if="!isConnected">
      <div class="position-transaction__empty">
        <span>SUPPLIED</span>
        <strong>Connect wallet</strong>
        <p>Connect to view your lender position and available repayments.</p>
      </div>

      <Button class="position-transaction__primary" size="lg" @click="open({ view: 'Connect' })">
        <span>CONNECT WALLET</span>
        <span aria-hidden="true">→</span>
      </Button>
    </template>

    <template v-else>
      <dl class="position-summary">
        <div>
          <dt>SUPPLIED</dt>
          <dd>{{ principalPositionDisplay }}</dd>
        </div>
        <div>
          <dt>LOAN SHARE</dt>
          <dd>{{ loanShareDisplay }}</dd>
        </div>
      </dl>

      <section class="claimable-position" aria-labelledby="claimable-position-title">
        <h3 id="claimable-position-title">{{ claimableLabel }}</h3>
        <div class="claimable-position__amount">
          <strong>{{ totalClaimableDisplay }}</strong>
          <span>{{ CREDIT_NAME }}</span>
        </div>
      </section>

      <Button
        v-if="maxWithdraw > 0n"
        class="position-transaction__primary"
        size="lg"
        :disabled="isWithdrawing"
        @click="handleWithdraw"
      >
        <span>{{ isWithdrawing ? 'CLAIMING…' : 'CLAIM REPAYMENTS' }}</span>
        <span aria-hidden="true">→</span>
      </Button>

      <Button
        v-if="oldVaultMaxWithdraw > 0n"
        class="position-transaction__secondary"
        size="lg"
        variant="outline"
        :disabled="isRedeemingOldVault"
        @click="handleRedeemOldVault"
      >
        <span>{{ isRedeemingOldVault ? 'CLAIMING…' : 'CLAIM LEGACY VAULT' }}</span>
        <span aria-hidden="true">→</span>
      </Button>

      <p v-if="!hasPosition" class="position-transaction__notice">
        This wallet does not have a position in the loan.
      </p>
    </template>
  </div>
</template>

<script setup lang="ts">
import { watch } from 'vue'
import { formatUnits } from 'viem'
import { useAccount, useReadContract } from '@wagmi/vue'
import { useAppKit } from '@reown/appkit/vue'
import {
  CREDIT_DECIMALS,
  CREDIT_NAME,
  PROPOSAL_CHAIN_ID,
} from '~/constants/proposalConstants'
import {
  OLD_PWN_CROWDSOURCE_LENDER_VAULT_ADDRESS,
  PWN_CROWDSOURCE_LENDER_VAULT_ADDRESS,
} from '~/constants/addresses'
import PWN_CROWDSOURCE_LENDER_VAULT_ABI from '~/assets/abis/v1.5/PWNCrowdsourceLenderVault'
import { Toast, ToastActionEnum, ToastStep } from '~/components/ui/toast/useToastsStore'
import useActionFlow from '~/components/ui/toast/useActionFlow'
import type { LoanLifecycleViewState } from '~/components/loan-lifecycle/types'

const props = withDefaults(defineProps<{
  state?: LoanLifecycleViewState
}>(), {
  state: 'running',
})
const emit = defineEmits<{
  ready: []
}>()

const { address, isConnected } = useAccount()
const { open } = useAppKit()
const userDepositStore = useUserDepositStore()
const { userDeposit } = storeToRefs(userDepositStore)

const {
  maxWithdrawQuery,
  originalPrincipal,
  refetchLoanData,
} = useLoanStatus()

const maxWithdrawResult = maxWithdrawQuery(address)
const maxWithdraw = computed<bigint>(() => maxWithdrawResult.data.value ?? 0n)

const oldVaultMaxWithdrawResult = useReadContract({
  abi: PWN_CROWDSOURCE_LENDER_VAULT_ABI,
  address: OLD_PWN_CROWDSOURCE_LENDER_VAULT_ADDRESS,
  functionName: 'maxWithdraw',
  args: computed(() => [address.value!] as const),
  query: {
    enabled: computed(() => Boolean(address.value)),
  },
})
const oldVaultMaxWithdraw = computed<bigint>(() => oldVaultMaxWithdrawResult.data.value ?? 0n)
const isPositionReady = computed(() => !isConnected.value || (
  Boolean(address.value)
  && userDepositStore.isUserDepositReady
  && !maxWithdrawResult.isPending.value
  && !maxWithdrawResult.isFetching.value
  && !oldVaultMaxWithdrawResult.isPending.value
  && !oldVaultMaxWithdrawResult.isFetching.value
))
const hasEmittedReady = ref(false)

watch(isPositionReady, (isReady) => {
  if (!isReady || hasEmittedReady.value) return
  hasEmittedReady.value = true
  emit('ready')
}, { immediate: true })

const positionAmount = computed(() => userDeposit.value)
const totalClaimable = computed(() => maxWithdraw.value + oldVaultMaxWithdraw.value)
const hasPosition = computed(() => positionAmount.value > 0n)

const currencyFormatter = new Intl.NumberFormat('en-US', {
  currency: 'USD',
  maximumFractionDigits: 2,
  minimumFractionDigits: 0,
  style: 'currency',
})

const principalPositionDisplay = computed(() =>
  currencyFormatter.format(Number(formatUnits(positionAmount.value, CREDIT_DECIMALS))),
)

const totalClaimableDisplay = computed(() =>
  currencyFormatter.format(Number(formatUnits(totalClaimable.value, CREDIT_DECIMALS))),
)

const currentClaimableDisplay = computed(() =>
  currencyFormatter.format(Number(formatUnits(maxWithdraw.value, CREDIT_DECIMALS))),
)

const loanShareDisplay = computed(() => {
  const denominator = Number(formatUnits(originalPrincipal.value, CREDIT_DECIMALS))
  if (!denominator) return '—'

  const position = Number(formatUnits(positionAmount.value, CREDIT_DECIMALS))
  return `${(position / denominator * 100).toLocaleString('en-US', {
    maximumFractionDigits: 2,
    minimumFractionDigits: position > 0 ? 1 : 0,
  })}%`
})

const claimableLabel = computed(() =>
  props.state === 'defaulted' ? 'CLAIMABLE RECOVERY' : 'CLAIMABLE REPAYMENTS',
)

const { withdraw } = useLend()
const toast = ref<Toast>()
let continueFlow: () => Promise<void> | undefined
const isWithdrawing = ref(false)
const isRedeemingOldVault = ref(false)

async function handleWithdraw() {
  const steps = [
    new ToastStep({
      text: `Claiming ${currentClaimableDisplay.value} in repayments…`,
      async fn(step) {
        await withdraw(maxWithdraw.value, step, PWN_CROWDSOURCE_LENDER_VAULT_ADDRESS)
        await refreshPosition(maxWithdrawResult.refetch)
        return true
      },
    }),
  ]

  toast.value = new Toast({
    steps,
    chainId: PROPOSAL_CHAIN_ID,
    title: 'Claiming repayments',
  }, ToastActionEnum.WITHDRAW_LENDER, address.value!)

  ;({ continueFlow } = useActionFlow(toast as Ref<Toast>))
  isWithdrawing.value = true
  try {
    await continueFlow()
  }
  finally {
    isWithdrawing.value = false
  }
}

async function handleRedeemOldVault() {
  const steps = [
    new ToastStep({
      text: 'Claiming repayments from the legacy vault…',
      async fn(step) {
        await withdraw(oldVaultMaxWithdraw.value, step, OLD_PWN_CROWDSOURCE_LENDER_VAULT_ADDRESS)
        await refreshPosition(oldVaultMaxWithdrawResult.refetch)
        return true
      },
    }),
  ]

  toast.value = new Toast({
    steps,
    chainId: PROPOSAL_CHAIN_ID,
    title: 'Claiming legacy repayments',
  }, ToastActionEnum.WITHDRAW_LENDER, address.value!)

  ;({ continueFlow } = useActionFlow(toast as Ref<Toast>))
  isRedeemingOldVault.value = true
  try {
    await continueFlow()
  }
  finally {
    isRedeemingOldVault.value = false
  }
}

async function refreshPosition(refetchWithdraw: () => Promise<unknown>) {
  await Promise.allSettled([
    refetchLoanData(),
    userDepositStore.refetchUserShares(),
    refetchWithdraw(),
  ])
}
</script>

<style scoped>
.position-transaction {
  display: flex;
  min-height: 0;
  flex: 1 1 auto;
  flex-direction: column;
  padding-top: 24px;
  color: #f3f0e8;
}

.position-summary {
  display: grid;
  grid-template-columns: 1fr 1fr;
  margin: 0;
  border-top: 1px solid #314244;
  border-bottom: 1px solid #314244;
}

.position-summary > div {
  min-width: 0;
  padding: 18px 0;
}

.position-summary > div + div {
  padding-left: 20px;
  border-left: 1px solid #314244;
}

.position-summary dt,
.claimable-position h3,
.position-transaction__empty > span {
  margin: 0;
  color: #c8c6bf;
  font: 700 9px/14px var(--font-mono);
  letter-spacing: .06em;
  text-transform: uppercase;
}

.position-summary dd {
  margin: 5px 0 0;
  color: #f3f0e8;
  font-size: 20px;
  font-weight: 600;
  line-height: 25px;
}

.claimable-position {
  margin-top: 24px;
}

.claimable-position__amount {
  display: flex;
  min-height: 78px;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin-top: 12px;
  padding: 0 18px;
  border: 1px solid #314244;
  border-radius: 10px;
  background: #203033;
}

.claimable-position__amount strong {
  min-width: 0;
  overflow: hidden;
  color: #f3f0e8;
  font-size: 31px;
  font-weight: 600;
  line-height: 38px;
  letter-spacing: -.02em;
  text-overflow: ellipsis;
}

.claimable-position__amount span {
  flex: 0 0 auto;
  font: 700 10px/14px var(--font-mono);
}

.position-transaction__primary,
.position-transaction__secondary {
  display: flex;
  min-height: 54px;
  justify-content: space-between;
  margin-top: 18px;
  padding: 0 18px;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 650;
}

.position-transaction__secondary {
  margin-top: 10px;
  border-color: #617174;
  background: transparent;
  color: #f3f0e8;
}

.position-transaction__empty {
  display: grid;
  gap: 8px;
  padding-block: 6px 28px;
}

.position-transaction__empty strong {
  font-family: var(--font-newsreader);
  font-size: 28px;
  font-weight: 500;
  line-height: 34px;
}

.position-transaction__empty p,
.position-transaction__notice {
  margin: 0;
  color: #c8c6bf;
  font-size: 13px;
  line-height: 20px;
}

.position-transaction__notice {
  margin-top: 14px;
}

@media (max-width: 620px) {
  .claimable-position__amount strong {
    font-size: 28px;
  }
}
</style>

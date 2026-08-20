<template>
  <Button
    variant="ghost"
    class="account-trigger"
    :aria-label="accountAriaLabel"
    @click="handleConnectClick"
  >
    <span v-if="walletRole" class="account-trigger__role">{{ walletRole }}</span>
    <span v-if="walletRole" aria-hidden="true">·</span>
    <span v-if="isConnected" class="account-trigger__network">Ethereum</span>
    <span v-if="isConnected" aria-hidden="true">·</span>
    <span>{{ buttonText }}</span>
  </Button>
</template>

<script setup lang="ts">
import { useAppKit } from '@reown/appkit/vue'
import { useAccount } from '@wagmi/vue'
import { formatUnits, isAddressEqual } from 'viem'
import { BORROWER_ADDRESS, CREDIT_DECIMALS } from '~/constants/proposalConstants'
import { getLenderPerkRankTitle } from '~/constants/lenderPerks'

const { open } = useAppKit()
const { address, isConnected } = useAccount()
const userDepositStore = useUserDepositStore()
const { userDeposit } = storeToRefs(userDepositStore)

const positionAmount = computed(() => Number(formatUnits(userDeposit.value, CREDIT_DECIMALS)))
const perkRankTitle = computed(() => getLenderPerkRankTitle(positionAmount.value))

const walletRole = computed(() => {
  if (!isConnected.value || !address.value) return undefined
  if (isAddressEqual(address.value, BORROWER_ADDRESS)) return 'Borrower'
  if (perkRankTitle.value) return perkRankTitle.value
  if (userDeposit.value > 0n) return 'Lender'
  return undefined
})

const buttonText = computed(() => address.value
  ? `${address.value.slice(0, 6).toUpperCase()}…${address.value.slice(-4).toUpperCase()}`
  : 'CONNECT WALLET')

const accountAriaLabel = computed(() => {
  if (!address.value) return 'Connect wallet'
  const role = walletRole.value ? `, ${walletRole.value}` : ''
  return `Connected wallet${role}, on Ethereum, ${buttonText.value}. Open wallet menu.`
})

function handleConnectClick() {
  open()
}
</script>

<style scoped>
.account-trigger {
  min-height: 44px;
  padding: 0;
  color: var(--muted-ink);
  font: 400 10px/16px var(--font-mono);
  letter-spacing: .02em;
}

.account-trigger__role,
.account-trigger__network {
  font-size: 9px;
}

@media (max-width: 620px) {
  .account-trigger__role,
  .account-trigger__role + span {
    display: none;
  }
}
</style>

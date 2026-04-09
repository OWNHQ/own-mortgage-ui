<template>
  <div class="max-w-3xl mx-auto py-6">
    <div class="bg-card border rounded-xl p-5 sm:p-6 shadow-lg">
      <div class="mb-5">
        <p class="text-xs uppercase tracking-[0.3em] text-bordel-green mb-2">ETHPrague Reward</p>
        <h1 class="font-heading text-2xl sm:text-3xl mb-2">ETHPrague Voucher Claim</h1>
        <p class="text-sm sm:text-base text-gray-300">
          Connect the lending wallet, verify ownership by signing a standard SIWE message, and reveal the voucher code assigned to that address.
        </p>
      </div>

      <div v-if="!isConnected" class="border rounded-lg p-4 bg-background/40">
        <p class="text-sm text-gray-300 mb-4">Connect the wallet that funded the loan to check ETHPrague voucher eligibility.</p>
        <Button @click="open({ view: 'Connect' })">
          Connect Wallet
        </Button>
      </div>

      <div v-else class="space-y-4">
        <div class="border rounded-lg p-4 bg-background/40">
          <div class="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
            <span class="text-sm text-gray-300">Connected wallet</span>
            <code class="text-sm text-white break-all">{{ address }}</code>
          </div>
        </div>

        <div v-if="eligibilityQuery.isLoading.value" class="border rounded-lg p-4 bg-background/40 text-sm text-gray-300">
          Checking ETHPrague voucher eligibility...
        </div>

        <div v-else-if="eligibilityErrorMessage" class="border rounded-lg p-4 bg-red-900/20 border-red-500/40 text-sm text-red-200">
          {{ eligibilityErrorMessage }}
        </div>

        <div v-else-if="!isVoucherConfigured" class="border rounded-lg p-4 bg-yellow-900/20 border-yellow-500/40 text-sm text-yellow-100">
          ETHPrague voucher claiming is not configured on this deployment yet.
        </div>

        <div v-else-if="!isEligible" class="border rounded-lg p-4 bg-background/40 text-sm text-gray-300">
          This connected wallet is not currently eligible for an ETHPrague voucher.
        </div>

        <div v-else class="space-y-4">
          <div class="border rounded-lg p-4 bg-green-900/15 border-green-500/30">
            <p class="text-sm text-green-100 font-medium mb-1">Eligible wallet detected</p>
            <p class="text-sm text-green-50/90">
              This address is on the ETHPrague voucher allowlist. Verify wallet ownership to unlock the code assigned to it.
            </p>
          </div>

          <div
            v-if="statusQuery.isLoading.value && !revealedVoucherCode"
            class="border rounded-lg p-4 bg-background/40 text-sm text-gray-300"
          >
            Loading wallet verification state...
          </div>

          <div
            v-else-if="statusErrorMessage"
            class="border rounded-lg p-4 bg-red-900/20 border-red-500/40 text-sm text-red-200"
          >
            {{ statusErrorMessage }}
          </div>

          <div
            v-else-if="needsSignature"
            class="border rounded-lg p-4 bg-background/40"
          >
            <p class="text-sm text-gray-300 mb-4">
              One wallet signature is required before the voucher code can be revealed. This proves you control the eligible address and creates a short-lived authenticated session.
            </p>
            <Button
              :disabled="verifyOwnershipMutation.isPending.value"
              @click="handleVerifyOwnershipClick"
            >
              {{ verifyOwnershipMutation.isPending.value ? "Waiting for signature..." : "Verify Wallet Ownership" }}
            </Button>
          </div>

          <div
            v-else-if="canRevealVoucher"
            class="border rounded-lg p-4 bg-background/40"
          >
            <p class="text-sm text-gray-300 mb-4">
              {{ statusQuery.data.value?.status === "eligible-claimed"
                ? "This wallet has already claimed its voucher. You can reveal the same assigned code again after signing in."
                : "Wallet ownership verified. Reveal the voucher code assigned to this address." }}
            </p>
            <Button
              :disabled="claimVoucherMutation.isPending.value"
              @click="handleRevealVoucherClick"
            >
              {{ claimVoucherMutation.isPending.value ? "Revealing Voucher..." : "Reveal Voucher Code" }}
            </Button>
          </div>

          <div
            v-else
            class="border rounded-lg p-4 bg-yellow-900/20 border-yellow-500/40 text-sm text-yellow-100"
          >
            The current voucher session is no longer valid. Refresh the page and sign again to continue.
          </div>

          <div
            v-if="actionErrorMessage"
            class="border rounded-lg p-4 bg-red-900/20 border-red-500/40 text-sm text-red-200"
          >
            {{ actionErrorMessage }}
          </div>

          <div
            v-if="revealedVoucherCode"
            class="border rounded-lg p-4 bg-black/30 border-bordel-green/40"
          >
            <div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div class="space-y-2">
                <p class="text-sm text-gray-300">Assigned voucher code</p>
                <code class="block text-lg sm:text-xl text-bordel-green break-all">{{ revealedVoucherCode }}</code>
                <p v-if="revealedClaimedAt" class="text-xs text-gray-400">
                  Claimed {{ new Date(revealedClaimedAt).toLocaleString() }}
                </p>
              </div>
              <Button
                class="sm:self-center"
                variant="outline"
                @click="handleCopyVoucherCode"
              >
                {{ copyButtonText }}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useMutation } from "@tanstack/vue-query"
import { useAppKit } from "@reown/appkit/vue"
import { useAccount, useSignMessage } from "@wagmi/vue"
import type {
  ConferenceVoucherChallengeResponse,
  ConferenceVoucherClaimResponse,
} from "~/typing/conferenceVoucher"
import { extractErrorMessage } from "~/lib/web3"

const { open } = useAppKit()
const { address, isConnected } = useAccount()
const { signMessageAsync } = useSignMessage()

const eligibilityQuery = useConferenceVoucherEligibility()
const statusQuery = useConferenceVoucherStatus()

const actionErrorMessage = ref<string | null>(null)
const copyButtonText = ref("Copy Code")
const revealedClaimedAt = ref<string | null>(null)
const revealedVoucherCode = ref<string | null>(null)

watch(
  () => address.value,
  () => {
    actionErrorMessage.value = null
    copyButtonText.value = "Copy Code"
    revealedClaimedAt.value = null
    revealedVoucherCode.value = null
  },
)

const verifyOwnershipMutation = useMutation({
  mutationFn: async () => {
    if (!address.value) {
      throw new Error("Connect the eligible wallet before verifying ownership.")
    }

    const challenge = await $fetch<ConferenceVoucherChallengeResponse>("/api/voucher/auth/challenge", {
      body: {
        address: address.value,
      },
      method: "POST",
    })

    const signature = await signMessageAsync({
      message: challenge.message,
    })

    await $fetch("/api/voucher/auth/verify", {
      body: {
        message: challenge.message,
        signature,
      },
      method: "POST",
    })
  },
  onMutate() {
    actionErrorMessage.value = null
  },
  async onSuccess() {
    await statusQuery.refetch()
  },
  onError(error) {
    actionErrorMessage.value = extractErrorMessage(error as Error) ?? "Wallet verification failed."
  },
})

const claimVoucherMutation = useMutation({
  mutationFn: async () => {
    return await $fetch<ConferenceVoucherClaimResponse>("/api/voucher/claim", {
      method: "POST",
    })
  },
  onMutate() {
    actionErrorMessage.value = null
  },
  async onSuccess(data) {
    revealedClaimedAt.value = data.claimedAt
    revealedVoucherCode.value = data.voucherCode
    await statusQuery.refetch()
  },
  onError(error) {
    actionErrorMessage.value = extractErrorMessage(error as Error) ?? "Voucher reveal failed."
  },
})

const eligibilityErrorMessage = computed(() => {
  if (!eligibilityQuery.error.value) {
    return null
  }

  return extractErrorMessage(eligibilityQuery.error.value as Error) ?? "Could not check ETHPrague voucher eligibility."
})

const statusErrorMessage = computed(() => {
  if (!statusQuery.error.value) {
    return null
  }

  return extractErrorMessage(statusQuery.error.value as Error) ?? "Could not load voucher claim status."
})

const isVoucherConfigured = computed(() => eligibilityQuery.data.value?.configured ?? false)
const isEligible = computed(() => eligibilityQuery.data.value?.eligible ?? false)
const needsSignature = computed(() => statusQuery.data.value?.status === "unverified")
const canRevealVoucher = computed(() => {
  const currentStatus = statusQuery.data.value?.status
  return currentStatus === "eligible-unclaimed" || currentStatus === "eligible-claimed"
})

async function handleVerifyOwnershipClick() {
  await verifyOwnershipMutation.mutateAsync()
}

async function handleRevealVoucherClick() {
  await claimVoucherMutation.mutateAsync()
}

async function handleCopyVoucherCode() {
  if (!revealedVoucherCode.value) {
    return
  }

  await navigator.clipboard.writeText(revealedVoucherCode.value)
  copyButtonText.value = "Copied"
  setTimeout(() => {
    copyButtonText.value = "Copy Code"
  }, 2000)
}
</script>

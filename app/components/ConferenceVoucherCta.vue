<template>
  <Button
    v-if="shouldShowClaimButton"
    as-child
    class="px-3 text-xs sm:text-sm"
  >
    <NuxtLink to="/conference-voucher">
      <span class="hidden sm:inline">Claim Conference Voucher</span>
      <span class="sm:hidden">Voucher</span>
    </NuxtLink>
  </Button>
</template>

<script setup lang="ts">
const route = useRoute()
const eligibilityQuery = useConferenceVoucherEligibility()

const shouldShowClaimButton = computed(() => {
  if (route.path === "/conference-voucher") {
    return false
  }

  return Boolean(
    eligibilityQuery.data.value?.configured
    && eligibilityQuery.data.value?.eligible,
  )
})
</script>

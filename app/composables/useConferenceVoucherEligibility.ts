import { useQuery } from "@tanstack/vue-query"
import { useAccount } from "@wagmi/vue"
import type { ConferenceVoucherEligibilityResponse } from "~/typing/conferenceVoucher"

export default function useConferenceVoucherEligibility() {
  const { address, isConnected } = useAccount()

  return useQuery({
    enabled: computed(() => isConnected.value && Boolean(address.value)),
    queryKey: computed(() => ["conference-voucher-eligibility", address.value ?? "disconnected"]),
    queryFn: async (): Promise<ConferenceVoucherEligibilityResponse> => {
      if (!address.value) {
        return {
          configured: false,
          eligible: false,
        }
      }

      return await $fetch<ConferenceVoucherEligibilityResponse>("/api/voucher/eligibility", {
        query: {
          address: address.value,
        },
      })
    },
    retry: false,
    staleTime: 60_000,
  })
}

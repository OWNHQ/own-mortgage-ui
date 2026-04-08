import { useQuery } from "@tanstack/vue-query"
import { useAccount } from "@wagmi/vue"
import type { ConferenceVoucherStatusResponse } from "~/typing/conferenceVoucher"

export default function useConferenceVoucherStatus() {
  const { address, isConnected } = useAccount()

  return useQuery({
    enabled: computed(() => isConnected.value && Boolean(address.value)),
    queryKey: computed(() => ["conference-voucher-status", address.value ?? "disconnected"]),
    queryFn: async (): Promise<ConferenceVoucherStatusResponse> => {
      return await $fetch<ConferenceVoucherStatusResponse>("/api/voucher/status")
    },
    retry: false,
    staleTime: 5_000,
  })
}

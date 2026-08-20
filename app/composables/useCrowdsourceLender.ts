import { useLocalStorage } from "@vueuse/core"
import { toValue, type MaybeRefOrGetter } from 'vue'
import { getAddress, type Address } from "viem"
import { PWN_CROWDSOURCE_LENDER_VAULT_ADDRESS, OLD_PWN_CROWDSOURCE_LENDER_VAULT_ADDRESS } from '~/constants/addresses'
import { readContracts } from "@wagmi/core/actions"
import { wagmiConfig } from '~/config/appkit'
import { PROPOSAL_CHAIN_ID, CREDIT_DECIMALS } from '~/constants/proposalConstants'
import PWN_CROWDSOURCE_LENDER_VAULT_ABI from '~/assets/abis/v1.5/PWNCrowdsourceLenderVault'
import { mainnet, sepolia } from "viem/chains"
import { formatAmount } from "~/lib/format-decimals"

import type { MoralisTransferEvent, MoralisResponse } from '~/typing/moralis'

interface CrowdsourceLender {
  address: string
  balance: bigint
  formattedBalance: string
}

// Moralis API configuration
const CHAIN_ID_TO_MORALIS_CHAIN_ARG = {
  [mainnet.id]: 'eth',
  [sepolia.id]: 'sepolia'
} as const
const CHAIN = CHAIN_ID_TO_MORALIS_CHAIN_ARG[PROPOSAL_CHAIN_ID]

// TODO does this caching makes sense? or shall we turn this to tanstack query?
// Local storage for caching
const lastFetchTimestamp = useLocalStorage<null | string>('crowdsource_lender_last_fetch_timestamp', null)
const crowdsourceLendersCache = useLocalStorage<null | CrowdsourceLender[]>('crowdsource_lenders_cache', null)

// Fetch transfer events from Moralis API with pagination
const fetchAllTransferEvents = async (vaultAddress: Address, fromDate?: string): Promise<MoralisTransferEvent[]> => {
  const config = useRuntimeConfig()
  const apiKey = config.public.moralisApiKey as string

  if (!apiKey) {
    throw new Error('NUXT_PUBLIC_MORALIS_API_KEY environment variable is required')
  }

  const allEvents: MoralisTransferEvent[] = []
  let cursor: string | null = null
  let page = 0
  const MORALIS_BASE_URL = 'https://deep-index.moralis.io/api/v2.2'

  do {
    try {
      const url = new URL(`${MORALIS_BASE_URL}/erc20/${vaultAddress}/transfers`)
      url.searchParams.set('chain', CHAIN)
      url.searchParams.set('order', 'DESC')
      url.searchParams.set('page_size', '100')
      
      if (fromDate) {
        url.searchParams.set('from_date', fromDate)
      }
      
      if (cursor) {
        url.searchParams.set('cursor', cursor)
      }

      const response = await fetch(url.toString(), {
        headers: {
          'accept': 'application/json',
          'X-API-Key': apiKey
        }
      })

      if (!response.ok) {
        throw new Error(`Moralis API error: ${response.status} ${response.statusText}`)
      }

      const data: MoralisResponse = await response.json()
      allEvents.push(...data.result)

      cursor = data.cursor
      page++

      // Safety check to prevent infinite loops
      if (page > 10000) {
        console.warn('Reached maximum page limit (10000) for transfer events')
        break
      }
    } catch (e) {
      console.error('Error fetching events from Moralis:', e)
      throw e
    }

  } while (cursor)

  return allEvents
}

// Round balance to nearest integer (rounds to nearest 10^CREDIT_DECIMALS)
const roundToNearestInteger = (balance: bigint): bigint => {
  const decimals = BigInt(CREDIT_DECIMALS)
  const decimalUnit = 10n ** decimals
  const half = decimalUnit / 2n
  // Round to nearest integer: (balance + half) / decimalUnit * decimalUnit
  return ((balance + half) / decimalUnit) * decimalUnit
}

// Convert balances to lender array
const balancesToLenders = (balances: Record<string, bigint>): CrowdsourceLender[] => {
  return Object.entries(balances)
    .map(([address, balance]) => ({
      address,
      balance: roundToNearestInteger(balance), // Round to nearest integer
      formattedBalance: formatAmount(roundToNearestInteger(balance))
    }))
    .sort((a, b) => {
      // Sort by balance descending
      if (a.balance > b.balance) return -1
      if (a.balance < b.balance) return 1
      return 0
    })
}

// Calculate lender balances from transfer events
// Converts shares to assets using convertToAssets contract function
const calculateLenderBalances = async (events: MoralisTransferEvent[], vaultAddress: Address): Promise<Record<string, bigint>> => {
  const balances: Record<string, bigint> = {}

  // Convert shares to assets in batches of 25
  const BATCH_SIZE = 25
  const shareValues: bigint[] = []
  const eventIndices: number[] = []

  // Collect all share values and their indices
  for (let i = 0; i < events.length; i++) {
    const event = events[i]
    if (!event) continue
    const value = BigInt(event.value)
    shareValues.push(value)
    eventIndices.push(i)
  }

  // Process in batches
  const assetValues: bigint[] = new Array(events.length).fill(0n)

  for (let i = 0; i < shareValues.length; i += BATCH_SIZE) {
    const batch = shareValues.slice(i, i + BATCH_SIZE)
    const batchIndices = eventIndices.slice(i, i + BATCH_SIZE)

    // Create contracts array for this batch
    const contracts = batch.map((shares) => ({
      abi: PWN_CROWDSOURCE_LENDER_VAULT_ABI,
      address: vaultAddress,
      functionName: 'convertToAssets' as const,
      args: [shares] as const,
      chainId: PROPOSAL_CHAIN_ID,
    }))

    // Call convertToAssets for the batch
    const results = await readContracts(wagmiConfig, {
      contracts,
      allowFailure: false,
    })

    // Store the converted asset values
    for (let j = 0; j < batch.length; j++) {
      const eventIndex = batchIndices[j]
      const result = results[j]
      if (eventIndex !== undefined && result !== undefined) {
        assetValues[eventIndex] = result as bigint
      }
    }
  }

  // Now process events with asset values instead of share values
  for (let i = 0; i < events.length; i++) {
    const event = events[i]
    if (!event) continue
    const value = assetValues[i] ?? 0n // Use converted asset value instead of share value
    const fromAddress = getAddress(event.from_address)
    const toAddress = getAddress(event.to_address)

    // Skip zero address transfers (minting/burning)
    if (fromAddress === '0x0000000000000000000000000000000000000000') {
      // Minting - add to recipient
      if (!balances[toAddress]) {
        balances[toAddress] = 0n
      }
      balances[toAddress] += value
    } else if (toAddress === '0x0000000000000000000000000000000000000000') {
      // Burning - subtract from sender
      if (!balances[fromAddress]) {
        balances[fromAddress] = 0n
      }
      balances[fromAddress] -= value
    } else {
      // Regular transfer
      if (!balances[fromAddress]) {
        balances[fromAddress] = 0n
      }
      if (!balances[toAddress]) {
        balances[toAddress] = 0n
      }

      balances[fromAddress] -= value
      balances[toAddress] += value
    }
  }

  // Remove addresses with zero or negative balances
  return Object.fromEntries(
    Object.entries(balances).filter(([_, balance]) => balance > 0n)
  )
}

// Merge lenders from two different vaults
const mergeLendersFromVaults = (oldVaultLenders: CrowdsourceLender[], newVaultLenders: CrowdsourceLender[]): CrowdsourceLender[] => {
  const mergedBalances: Record<string, bigint> = {}

  // Add balances from old vault
  for (const lender of oldVaultLenders) {
    const normalizedAddress = lender.address.toLowerCase()
    mergedBalances[normalizedAddress] = lender.balance
  }

  // Add/merge balances from new vault
  for (const lender of newVaultLenders) {
    const normalizedAddress = lender.address.toLowerCase()
    if (mergedBalances[normalizedAddress]) {
      mergedBalances[normalizedAddress] += lender.balance
    } else {
      mergedBalances[normalizedAddress] = lender.balance
    }
  }

  return balancesToLenders(mergedBalances)
}

export const loadCrowdsourceLenders = async (forceRefresh: boolean = false) => {
  try {
    const fromDate = forceRefresh ? undefined : (lastFetchTimestamp.value?.length ? lastFetchTimestamp.value : undefined)

    // Fetch transfer events from both vaults (either since last fetch or all)
    const [oldVaultEvents, newVaultEvents] = await Promise.all([
      fetchAllTransferEvents(OLD_PWN_CROWDSOURCE_LENDER_VAULT_ADDRESS, fromDate),
      fetchAllTransferEvents(PWN_CROWDSOURCE_LENDER_VAULT_ADDRESS, fromDate)
    ])

    let allOldEvents: MoralisTransferEvent[] = []
    let allNewEvents: MoralisTransferEvent[] = []

    if (!fromDate) {
      // Full refresh: use the events we just fetched since fromDate was undefined
      allOldEvents = oldVaultEvents
      allNewEvents = newVaultEvents
    } else {
      // Incremental check: if no new events, keep existing cache
      if (oldVaultEvents.length === 0 && newVaultEvents.length === 0) {
        return crowdsourceLendersCache.value || []
      }

      // If there are new events, we must fetch ALL events to recalculate balances
      const [allOld, allNew] = await Promise.all([
        fetchAllTransferEvents(OLD_PWN_CROWDSOURCE_LENDER_VAULT_ADDRESS),
        fetchAllTransferEvents(PWN_CROWDSOURCE_LENDER_VAULT_ADDRESS)
      ])
      allOldEvents = allOld
      allNewEvents = allNew
    }

    // Process balances from the events we've secured
    const [oldBalances, newBalances] = await Promise.all([
      calculateLenderBalances(allOldEvents, OLD_PWN_CROWDSOURCE_LENDER_VAULT_ADDRESS),
      calculateLenderBalances(allNewEvents, PWN_CROWDSOURCE_LENDER_VAULT_ADDRESS)
    ])

    const oldVaultLenders = balancesToLenders(oldBalances)
    const newVaultLenders = balancesToLenders(newBalances)

    // Merge lenders from both vaults
    let mergedLenders = mergeLendersFromVaults(oldVaultLenders, newVaultLenders)
    mergedLenders = mergedLenders.filter(lender => lender.balance > 0n && lender.formattedBalance !== '0')

    // Update cache
    crowdsourceLendersCache.value = mergedLenders
    lastFetchTimestamp.value = new Date().toISOString()

    return mergedLenders
  } catch (error) {
    console.error('Error loading crowdsource lenders:', error)
    throw error
  }
}

export const useCrowdsourceLender = (enabled: MaybeRefOrGetter<boolean> = true) => {
  const isLoading = ref(false)
  const error = ref<string | null>(null)
  const lenders = ref<CrowdsourceLender[]>([])

  // Load lenders on composable initialization
  // TODO change forceRefresh to false
  const loadLenders = async (forceRefresh: boolean = true) => {
    if (isLoading.value) return

    isLoading.value = true
    error.value = null

    try {
      const result = await loadCrowdsourceLenders(forceRefresh)
      lenders.value = result
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to load crowdsource lenders'
      console.error('Error in useCrowdsourceLender:', err)
    } finally {
      isLoading.value = false
    }
  }

  // Computed properties
  const totalLenders = computed(() => lenders.value.length)

  watch(
    () => toValue(enabled),
    shouldLoad => {
      if (shouldLoad) void loadLenders()
    },
    { immediate: true },
  )

  return {
    // Data
    lenders: readonly(lenders),
    totalLenders,
    lastFetchTime: readonly(lastFetchTimestamp),

    // State
    isLoading: readonly(isLoading),
    error: readonly(error),

    // Methods
    loadLenders,
    refreshLenders: () => loadLenders(true),
  }
}

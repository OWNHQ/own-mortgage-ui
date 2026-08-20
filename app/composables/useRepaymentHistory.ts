import { useQuery } from '@tanstack/vue-query'
import { computed, toValue, type MaybeRefOrGetter } from 'vue'
import { decodeEventLog, toHex, type Hex } from 'viem'
import PWN_LOAN_ABI from '~/assets/abis/v1.5/PWNLoan'
import { PWN_LOAN_ADDRESS } from '~/constants/addresses'

export const LOAN_CREATED_TOPIC = '0x76deed12f5d76e36e8ae0b5d4c11caffaf1ace88d1ba1a8199fb23e8913783c0'
export const LOAN_REPAID_TOPIC = '0xe291b2c43cef16b685166729aa6e525bb3132aca60cda179aa85486e08c14fd8'

const BLOCKSCOUT_LOGS_ENDPOINT = `https://eth.blockscout.com/api/v2/addresses/${PWN_LOAN_ADDRESS}/logs`
const HISTORY_REFETCH_INTERVAL = 30_000

type BlockscoutLog = {
  block_number?: number
  block_timestamp?: string
  data?: Hex
  index?: number
  topics?: Array<Hex | null>
  transaction_hash?: Hex
}

type BlockscoutLogsResponse = {
  items?: BlockscoutLog[]
  next_page_params?: Record<string, boolean | number | string> | null
}

export type RepaymentHistoryEvent = {
  blockNumber: number
  cumulativeRepayment: bigint
  logIndex: number
  newPrincipal: bigint
  repaymentAmount: bigint
  timestamp: number
  transactionHash: Hex
}

export type RepaymentHistoryData = {
  events: RepaymentHistoryEvent[]
  loanStartTimestamp: bigint
  originalPrincipal: bigint
}

type UseRepaymentHistoryOptions = {
  enabled?: MaybeRefOrGetter<boolean>
  loanId: MaybeRefOrGetter<bigint>
}

export default function useRepaymentHistory(options: UseRepaymentHistoryOptions) {
  const loanId = computed(() => toValue(options.loanId))
  const queryEnabled = computed(() => import.meta.client
    && loanId.value > 0n
    && (options.enabled === undefined || toValue(options.enabled)))
  const queryKey = computed(() => [
    'pwn-loan-history',
    PWN_LOAN_ADDRESS,
    loanId.value.toString(),
  ] as const)

  const query = useQuery<RepaymentHistoryData, Error>({
    enabled: queryEnabled,
    gcTime: 10 * 60_000,
    queryFn: ({ signal }) => fetchRepaymentHistory(loanId.value, signal),
    queryKey,
    refetchInterval: HISTORY_REFETCH_INTERVAL,
    refetchIntervalInBackground: false,
    staleTime: HISTORY_REFETCH_INTERVAL,
  })

  const events = computed(() => query.data.value?.events ?? [])
  const lastUpdatedAt = computed(() => query.dataUpdatedAt.value || null)
  const loanStartTimestamp = computed(() => query.data.value?.loanStartTimestamp ?? 0n)
  const originalPrincipal = computed(() => query.data.value?.originalPrincipal ?? 0n)

  const refresh = async () => {
    if (!queryEnabled.value) return
    await query.refetch()
  }

  return {
    error: query.error,
    events,
    isLoading: query.isLoading,
    lastUpdatedAt,
    loanStartTimestamp,
    originalPrincipal,
    refresh,
  }
}

async function fetchRepaymentHistory(loanId: bigint, signal: AbortSignal): Promise<RepaymentHistoryData> {
  const loanTopic = toHex(loanId, { size: 32 }).toLowerCase()
  const matchingLogs: BlockscoutLog[] = []
  const visitedPages = new Set<string>()
  let nextPageParams: BlockscoutLogsResponse['next_page_params'] = null

  do {
    const url = new URL(BLOCKSCOUT_LOGS_ENDPOINT)
    if (nextPageParams) {
      const pageKey = JSON.stringify(nextPageParams)
      if (visitedPages.has(pageKey)) throw new Error('Repayment history pagination repeated a page')
      visitedPages.add(pageKey)

      Object.entries(nextPageParams).forEach(([key, value]) => {
        url.searchParams.set(key, String(value))
      })
    }

    const response = await fetch(url, {
      headers: { Accept: 'application/json' },
      signal,
    })

    if (!response.ok) {
      throw new Error(`Repayment history request failed (${response.status})`)
    }

    const payload = await response.json() as BlockscoutLogsResponse
    for (const log of payload.items ?? []) {
      const topic0 = log.topics?.[0]?.toLowerCase()
      const topic1 = log.topics?.[1]?.toLowerCase()
      const isLoanEvent = topic0 === LOAN_CREATED_TOPIC || topic0 === LOAN_REPAID_TOPIC
      if (isLoanEvent && topic1 === loanTopic) matchingLogs.push(log)
    }

    nextPageParams = payload.next_page_params
  } while (nextPageParams)

  const uniqueLogs = new Map<string, BlockscoutLog>()
  for (const log of matchingLogs) {
    if (!log.transaction_hash) continue
    uniqueLogs.set(`${log.transaction_hash}:${log.index ?? 0}`, log)
  }

  const sortedLogs = [...uniqueLogs.values()].sort((a, b) => {
    const blockDifference = (a.block_number ?? 0) - (b.block_number ?? 0)
    return blockDifference || (a.index ?? 0) - (b.index ?? 0)
  })

  const creation = sortedLogs
    .map(decodeLoanEvent)
    .find(event => event?.eventName === 'LOANCreated')

  if (!creation || creation.eventName !== 'LOANCreated') {
    throw new Error(`Loan creation event not found for loan ${loanId}`)
  }

  const creationTimestamp = parseTimestamp(creation.log)
  if (creationTimestamp === null) {
    throw new Error(`Loan creation timestamp not found for loan ${loanId}`)
  }
  const loanStartTimestamp = BigInt(Math.floor(creationTimestamp))

  const originalPrincipal = creation.args.terms.principal
  let cumulativeRepayment = 0n

  const events = sortedLogs.flatMap((log) => {
    const decoded = decodeLoanEvent(log)
    if (!decoded || decoded.eventName !== 'LOANRepaid' || !log.transaction_hash) return []

    const timestamp = parseTimestamp(log)
    if (timestamp === null) return []

    const { newPrincipal, repaymentAmount } = decoded.args
    cumulativeRepayment += repaymentAmount

    return [{
      blockNumber: log.block_number ?? 0,
      cumulativeRepayment,
      logIndex: log.index ?? 0,
      newPrincipal,
      repaymentAmount,
      timestamp,
      transactionHash: log.transaction_hash,
    } satisfies RepaymentHistoryEvent]
  })

  return {
    events,
    loanStartTimestamp,
    originalPrincipal,
  }
}

function decodeLoanEvent(log: BlockscoutLog) {
  const topics = log.topics?.filter((topic): topic is Hex => topic !== null)
  if (!log.data || !topics?.length) return null

  try {
    return {
      ...decodeEventLog({
        abi: PWN_LOAN_ABI,
        data: log.data,
        strict: true,
        topics: topics as [Hex, ...Hex[]],
      }),
      log,
    }
  } catch {
    return null
  }
}

function parseTimestamp(log: BlockscoutLog) {
  if (!log.block_timestamp) return null
  const timestamp = Date.parse(log.block_timestamp) / 1000
  return Number.isFinite(timestamp) ? timestamp : null
}

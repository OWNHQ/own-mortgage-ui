import { useReadContract } from '@wagmi/vue'
import { formatUnits, parseUnits } from 'viem'
import { PWN_CROWDSOURCE_LENDER_VAULT_ADDRESS, PWN_LOAN_ADDRESS, PWN_INSTALLMENTS_PRODUCT_ADDRESS } from '~/constants/addresses'
import PWN_CROWDSOURCE_LENDER_VAULT_ABI from '~/assets/abis/v1.5/PWNCrowdsourceLenderVault'
import PWN_LOAN_ABI from '~/assets/abis/v1.5/PWNLoan'
import { PWN_INSTALLMENTS_PRODUCT_ABI } from '~/assets/abis/v1.5/PWNInstallmentsProduct'
import { CREDIT_DECIMALS, COLLATERAL_DECIMALS, PROPOSAL_CHAIN_ID } from '~/constants/proposalConstants'
import Decimal from 'decimal.js'
import { calculateNextPaymentDeadline } from '~/lib/loan-deadline'
import { calculateAmortizedRepaymentPlan, REPAYMENT_MONTH_IN_SECONDS } from '~/lib/repayment-model'
import useRepaymentHistory from '~/composables/useRepaymentHistory'

export default function useLoanStatus() {
    // Read loanId from vault
    const loanIdQuery = useReadContract({
        abi: PWN_CROWDSOURCE_LENDER_VAULT_ABI,
        address: PWN_CROWDSOURCE_LENDER_VAULT_ADDRESS,
        chainId: PROPOSAL_CHAIN_ID,
        functionName: 'loanId',
    })

    const loanId = computed<bigint>(() => loanIdQuery.data.value ?? 0n)
    const isLoanActive = computed<boolean>(() => loanId.value > 0n)

    const {
        error: loanEventsError,
        events: repaymentEvents,
        isLoading: areLoanEventsLoading,
        loanStartTimestamp,
        originalPrincipal,
        refresh: refetchLoanEvents,
    } = useRepaymentHistory({
        enabled: isLoanActive,
        loanId,
    })

    // Read remaining debt from PWNLoan
    const remainingDebtQuery = useReadContract({
        abi: PWN_LOAN_ABI,
        address: PWN_LOAN_ADDRESS,
        chainId: PROPOSAL_CHAIN_ID,
        functionName: 'getLOANDebt',
        args: computed(() => [loanId.value] as const),
        query: {
            enabled: isLoanActive,
            refetchInterval: 30_000,
        },
    })

    const remainingDebt = computed<bigint>(() => remainingDebtQuery.data.value ?? 0n)

    const remainingDebtFormatted = computed<string>(() => {
        if (!remainingDebt.value) return '0'
        return Math.floor(Number(formatUnits(remainingDebt.value, CREDIT_DECIMALS))).toLocaleString()
    })

    const loanDetailsQuery = useReadContract({
        abi: PWN_LOAN_ABI,
        address: PWN_LOAN_ADDRESS,
        chainId: PROPOSAL_CHAIN_ID,
        functionName: 'getLOAN',
        args: computed(() => [loanId.value] as const),
        query: {
            enabled: isLoanActive,
            refetchInterval: 30_000,
        },
    })

    const loanDetails = computed(() => loanDetailsQuery.data.value)
    const loanLastUpdateTimestamp = computed<bigint>(() => BigInt(loanDetails.value?.lastUpdateTimestamp ?? 0n))
    const loanPrincipal = computed<bigint>(() => BigInt(loanDetails.value?.principal ?? 0n))
    const loanCollateralAmount = computed<bigint>(() => BigInt(loanDetails.value?.collateral.amount ?? 0n))
    const loanPastAccruedInterest = computed<bigint>(() => BigInt(loanDetails.value?.pastAccruedInterest ?? 0n))

    // Read loan data from installments product: [apr, defaultTimestamp, debtLimitTangent]
    const loanDataQuery = useReadContract({
        abi: PWN_INSTALLMENTS_PRODUCT_ABI,
        address: PWN_INSTALLMENTS_PRODUCT_ADDRESS,
        chainId: PROPOSAL_CHAIN_ID,
        functionName: 'loanData',
        args: computed(() => [PWN_LOAN_ADDRESS, loanId.value] as const),
        query: {
            enabled: isLoanActive,
        },
    })

    const loanData = computed(() => loanDataQuery.data.value)
    const apr = computed<bigint>(() => loanData.value ? BigInt(loanData.value[0]) : 0n)
    const defaultTimestamp = computed<bigint>(() => loanData.value ? BigInt(loanData.value[1]) : 0n)
    const debtLimitTangent = computed<bigint>(() => loanData.value ? BigInt(loanData.value[2]) : 0n)
    const aprDecimalsQuery = useReadContract({
        abi: PWN_INSTALLMENTS_PRODUCT_ABI,
        address: PWN_INSTALLMENTS_PRODUCT_ADDRESS,
        chainId: PROPOSAL_CHAIN_ID,
        functionName: 'APR_DECIMALS',
    })

    const aprDecimals = computed<bigint>(() =>
        aprDecimalsQuery.data.value ? BigInt(aprDecimalsQuery.data.value) : 0n
    )

    // Read DEBT_LIMIT_TANGENT_DECIMALS
    const debtLimitTangentDecimalsQuery = useReadContract({
        abi: PWN_INSTALLMENTS_PRODUCT_ABI,
        address: PWN_INSTALLMENTS_PRODUCT_ADDRESS,
        chainId: PROPOSAL_CHAIN_ID,
        functionName: 'DEBT_LIMIT_TANGENT_DECIMALS',
    })

    const debtLimitTangentDecimals = computed<bigint>(() =>
        debtLimitTangentDecimalsQuery.data.value ? BigInt(debtLimitTangentDecimalsQuery.data.value) : 0n
    )

    const loanDurationSeconds = computed<number>(() => {
        if (loanStartTimestamp.value <= 0n || defaultTimestamp.value <= loanStartTimestamp.value) return 0
        return Number(defaultTimestamp.value - loanStartTimestamp.value)
    })

    const repaymentPeriodSeconds = computed<number>(() => {
        if (
            originalPrincipal.value <= 0n
            || debtLimitTangent.value <= 0n
            || debtLimitTangentDecimals.value <= 0n
        ) return 0

        const tangentScale = 10n ** debtLimitTangentDecimals.value
        return Number(originalPrincipal.value * tangentScale / debtLimitTangent.value)
    })

    const loanPostponementSeconds = computed<number>(() => Math.max(
        0,
        loanDurationSeconds.value - repaymentPeriodSeconds.value,
    ))
    const loanDurationMonths = computed<number>(() => Math.max(
        0,
        Math.round(loanDurationSeconds.value / REPAYMENT_MONTH_IN_SECONDS),
    ))
    const repaymentCount = computed<number>(() => Math.max(
        0,
        Math.round(repaymentPeriodSeconds.value / REPAYMENT_MONTH_IN_SECONDS),
    ))
    const loanPostponementMonths = computed<number>(() => Math.max(
        0,
        loanDurationMonths.value - repaymentCount.value,
    ))
    const annualRate = computed<number>(() => aprDecimals.value > 0n
        ? Number(apr.value) / 10 ** Number(aprDecimals.value)
        : 0)
    const repaymentPlan = computed(() => calculateAmortizedRepaymentPlan({
        annualRate: annualRate.value,
        holidayMonths: loanPostponementMonths.value,
        paymentCount: repaymentCount.value,
        principal: Number(formatUnits(originalPrincipal.value, CREDIT_DECIMALS)),
    }))

    // This is an origination-time conventional amortization estimate. Actual
    // lifetime interest changes when the borrower repays early or irregularly.
    const totalOwed = computed<bigint>(() => {
        if (repaymentPlan.value.totalRepayment <= 0) return 0n
        const amount = new Decimal(repaymentPlan.value.totalRepayment)
            .toDecimalPlaces(CREDIT_DECIMALS, Decimal.ROUND_HALF_UP)
            .toFixed(CREDIT_DECIMALS)
        return parseUnits(amount, CREDIT_DECIMALS)
    })
    const totalOwedFormatted = computed<string>(() => {
        if (totalOwed.value <= 0n) return '0'
        return Math.round(Number(formatUnits(totalOwed.value, CREDIT_DECIMALS))).toLocaleString()
    })

    // Repayment events expose the actual cash received, including both principal
    // and interest. Current debt cannot be subtracted from original principal to
    // recover this value because debt continues to accrue interest.
    const totalAmountRepaid = computed<bigint>(() => repaymentEvents.value.at(-1)?.cumulativeRepayment ?? 0n)
    const totalAmountRepaidFormatted = computed<string>(() => {
        if (!totalAmountRepaid.value) return '0'
        return Math.floor(Number(formatUnits(totalAmountRepaid.value, CREDIT_DECIMALS))).toLocaleString()
    })
    const repaymentProgress = computed<number>(() => {
        if (!isLoanActive.value || totalOwed.value === 0n) return 0
        const progress = new Decimal(totalAmountRepaid.value.toString())
            .div(new Decimal(totalOwed.value.toString()))
            .mul(100)
            .toNumber()
        return Math.min(Math.floor(progress), 100)
    })

    // Check if defaulted
    const isDefaultedQuery = useReadContract({
        abi: PWN_INSTALLMENTS_PRODUCT_ABI,
        address: PWN_INSTALLMENTS_PRODUCT_ADDRESS,
        chainId: PROPOSAL_CHAIN_ID,
        functionName: 'isDefaulted',
        args: computed(() => [PWN_LOAN_ADDRESS, loanId.value] as const),
        query: {
            enabled: isLoanActive,
        },
    })

    const isDefaulted = computed<boolean>(() => isDefaultedQuery.data.value ?? false)

    // Fully repaid = loan active but remaining debt is 0
    const isFullyRepaid = computed<boolean>(() => {
        if (!isLoanActive.value) return false
        // If remainingDebt query has loaded and is 0, it's fully repaid
        return remainingDebtQuery.data.value !== undefined && remainingDebt.value === 0n
    })

    // Loan status for badge display
    const loanStatus = computed<'active' | 'defaulted' | 'repaid' | 'funding'>(() => {
        if (!isLoanActive.value) return 'funding'
        if (isDefaulted.value) return 'defaulted'
        if (isFullyRepaid.value) return 'repaid'
        return 'active'
    })

    const loanStatusError = computed(() =>
        loanIdQuery.error.value
        ?? remainingDebtQuery.error.value
        ?? loanDetailsQuery.error.value
        ?? loanDataQuery.error.value
        ?? aprDecimalsQuery.error.value
        ?? debtLimitTangentDecimalsQuery.error.value
        ?? isDefaultedQuery.error.value
        ?? (originalPrincipal.value <= 0n || loanStartTimestamp.value <= 0n ? loanEventsError.value : null)
        ?? null
    )

    const isLoanStatusReady = computed(() => {
        if (loanIdQuery.isPending.value) return false
        if (!isLoanActive.value) return true

        return !remainingDebtQuery.isPending.value
            && !loanDetailsQuery.isPending.value
            && !loanDataQuery.isPending.value
            && !aprDecimalsQuery.isPending.value
            && !debtLimitTangentDecimalsQuery.isPending.value
            && !isDefaultedQuery.isPending.value
            && !areLoanEventsLoading.value
            && originalPrincipal.value > 0n
            && loanStartTimestamp.value > 0n
    })

    const nextPaymentDeadline = computed<bigint | null>(() => {
        if (!isLoanActive.value || remainingDebt.value === 0n || !loanDetails.value) return null
        if (aprDecimals.value === 0n || debtLimitTangentDecimals.value === 0n) return null

        return calculateNextPaymentDeadline({
            principal: loanPrincipal.value,
            pastAccruedInterest: loanPastAccruedInterest.value,
            lastUpdateTimestamp: loanLastUpdateTimestamp.value,
            apr: apr.value,
            aprDecimals: aprDecimals.value,
            defaultTimestamp: defaultTimestamp.value,
            debtLimitTangent: debtLimitTangent.value,
            debtLimitTangentDecimals: debtLimitTangentDecimals.value,
            currentTimestamp: BigInt(Math.floor(Date.now() / 1000)),
        })
    })

    // Reconstruct the first protocol deadline from the immutable origination
    // state. PWN stores a continuous debt limit rather than monthly due dates,
    // so this is the authoritative anchor for the modeled monthly ledger.
    const firstPaymentDeadline = computed<bigint | null>(() => {
        if (!isLoanActive.value || originalPrincipal.value === 0n || loanStartTimestamp.value === 0n) return null
        if (aprDecimals.value === 0n || debtLimitTangentDecimals.value === 0n) return null

        return calculateNextPaymentDeadline({
            principal: originalPrincipal.value,
            pastAccruedInterest: 0n,
            lastUpdateTimestamp: loanStartTimestamp.value,
            apr: apr.value,
            aprDecimals: aprDecimals.value,
            defaultTimestamp: defaultTimestamp.value,
            debtLimitTangent: debtLimitTangent.value,
            debtLimitTangentDecimals: debtLimitTangentDecimals.value,
            currentTimestamp: loanStartTimestamp.value,
        })
    })

    // Vault total assets (USDC available)
    const totalVaultAssetsQuery = useReadContract({
        abi: PWN_CROWDSOURCE_LENDER_VAULT_ABI,
        address: PWN_CROWDSOURCE_LENDER_VAULT_ADDRESS,
        chainId: PROPOSAL_CHAIN_ID,
        functionName: 'totalAssets',
    })

    const totalVaultAssets = computed<bigint>(() => totalVaultAssetsQuery.data.value ?? 0n)
    const totalVaultAssetsFormatted = computed<string>(() => {
        if (!totalVaultAssets.value) return '0'
        return Math.floor(Number(formatUnits(totalVaultAssets.value, CREDIT_DECIMALS))).toLocaleString()
    })

    // Vault total collateral assets (weETH claimable after default)
    const totalCollateralAssetsQuery = useReadContract({
        abi: PWN_CROWDSOURCE_LENDER_VAULT_ABI,
        address: PWN_CROWDSOURCE_LENDER_VAULT_ADDRESS,
        chainId: PROPOSAL_CHAIN_ID,
        functionName: 'totalCollateralAssets',
        query: {
            enabled: isLoanActive,
        },
    })

    const totalCollateralAssets = computed<bigint>(() => totalCollateralAssetsQuery.data.value ?? 0n)
    const totalCollateralAssetsFormatted = computed<string>(() => {
        if (!totalCollateralAssets.value) return '0'
        return Number(formatUnits(totalCollateralAssets.value, COLLATERAL_DECIMALS)).toFixed(4)
    })

    // Max withdraw for a given user address
    const maxWithdrawQuery = (userAddress: Ref<`0x${string}` | undefined>) => useReadContract({
        abi: PWN_CROWDSOURCE_LENDER_VAULT_ABI,
        address: PWN_CROWDSOURCE_LENDER_VAULT_ADDRESS,
        chainId: PROPOSAL_CHAIN_ID,
        functionName: 'maxWithdraw',
        args: computed(() => [userAddress.value!] as const),
        query: {
            enabled: computed(() => !!userAddress.value),
        },
    })

    const refetchLoanData = async () => {
        await Promise.allSettled([
            loanIdQuery.refetch(),
            remainingDebtQuery.refetch(),
            loanDetailsQuery.refetch(),
            loanDataQuery.refetch(),
            aprDecimalsQuery.refetch(),
            debtLimitTangentDecimalsQuery.refetch(),
            isDefaultedQuery.refetch(),
            totalVaultAssetsQuery.refetch(),
            totalCollateralAssetsQuery.refetch(),
            refetchLoanEvents(),
        ])
    }

    return {
        isLoanActive,
        isLoanStatusReady,
        loanStatusError,
        loanId,
        loanPrincipal,
        loanCollateralAmount,
        loanLastUpdateTimestamp,
        originalPrincipal,
        remainingDebt,
        remainingDebtFormatted,
        totalOwed,
        totalOwedFormatted,
        totalAmountRepaid,
        totalAmountRepaidFormatted,
        repaymentProgress,
        loanData,
        apr,
        aprDecimals,
        debtLimitTangent,
        debtLimitTangentDecimals,
        defaultTimestamp,
        loanStartTimestamp,
        loanDurationSeconds,
        loanDurationMonths,
        loanPostponementSeconds,
        loanPostponementMonths,
        repaymentPeriodSeconds,
        repaymentCount,
        repaymentPlan,
        repaymentEvents,
        loanEventsError,
        areLoanEventsLoading,
        refetchLoanEvents,
        isDefaulted,
        isFullyRepaid,
        loanStatus,
        firstPaymentDeadline,
        nextPaymentDeadline,
        totalVaultAssets,
        totalVaultAssetsFormatted,
        totalCollateralAssets,
        totalCollateralAssetsFormatted,
        maxWithdrawQuery,
        refetchLoanData,
    }
}

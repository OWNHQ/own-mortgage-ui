import { useReadContract } from '@wagmi/vue'
import { formatUnits } from 'viem'
import { PWN_CROWDSOURCE_LENDER_VAULT_ADDRESS, PWN_LOAN_ADDRESS, PWN_INSTALLMENTS_PRODUCT_ADDRESS } from '~/constants/addresses'
import PWN_CROWDSOURCE_LENDER_VAULT_ABI from '~/assets/abis/v1.5/PWNCrowdsourceLenderVault'
import PWN_LOAN_ABI from '~/assets/abis/v1.5/PWNLoan'
import { PWN_INSTALLMENTS_PRODUCT_ABI } from '~/assets/abis/v1.5/PWNInstallmentsProduct'
import { CREDIT_DECIMALS, COLLATERAL_DECIMALS, TOTAL_AMOUNT_TO_REPAY } from '~/constants/proposalConstants'
import Decimal from 'decimal.js'
import { calculateNextPaymentDeadline } from '~/lib/loan-deadline'

export default function useLoanStatus() {
    // Read loanId from vault
    const loanIdQuery = useReadContract({
        abi: PWN_CROWDSOURCE_LENDER_VAULT_ABI,
        address: PWN_CROWDSOURCE_LENDER_VAULT_ADDRESS,
        functionName: 'loanId',
    })

    const loanId = computed<bigint>(() => loanIdQuery.data.value ?? 0n)
    const isLoanActive = computed<boolean>(() => loanId.value > 0n)

    // Read remaining debt from PWNLoan
    const remainingDebtQuery = useReadContract({
        abi: PWN_LOAN_ABI,
        address: PWN_LOAN_ADDRESS,
        functionName: 'getLOANDebt',
        args: computed(() => [loanId.value] as const),
        query: {
            enabled: isLoanActive,
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
        functionName: 'getLOAN',
        args: computed(() => [loanId.value] as const),
        query: {
            enabled: isLoanActive,
        },
    })

    const loanDetails = computed(() => loanDetailsQuery.data.value)
    const loanLastUpdateTimestamp = computed<bigint>(() => BigInt(loanDetails.value?.lastUpdateTimestamp ?? 0n))
    const loanPrincipal = computed<bigint>(() => BigInt(loanDetails.value?.principal ?? 0n))
    const loanPastAccruedInterest = computed<bigint>(() => BigInt(loanDetails.value?.pastAccruedInterest ?? 0n))

    // Total amount to repay (principal + interest) from constants
    const totalOwed = computed<bigint>(() => {
        // TOTAL_AMOUNT_TO_REPAY is a Decimal, convert to bigint with CREDIT_DECIMALS
        const totalStr = TOTAL_AMOUNT_TO_REPAY.toFixed(CREDIT_DECIMALS)
        const [intPart, decPart = ''] = totalStr.split('.')
        const padded = decPart.padEnd(CREDIT_DECIMALS, '0').slice(0, CREDIT_DECIMALS)
        return BigInt(intPart + padded)
    })

    const totalOwedFormatted = computed<string>(() => {
        return Math.floor(Number(formatUnits(totalOwed.value, CREDIT_DECIMALS))).toLocaleString()
    })

    // Whether remaining debt query has loaded
    const hasRemainingDebtLoaded = computed(() => remainingDebtQuery.data.value !== undefined)

    // Hardcoded principal: 180,295 USDC (6 decimals)
    const principal = 180_295_000_000n

    // Total repaid = principal - remainingDebt (remaining debt accrues interest, so repaid only shows actual repayments)
    const totalAmountRepaid = computed<bigint>(() => {
        if (!isLoanActive.value || !hasRemainingDebtLoaded.value) return 0n
        const repaid = principal - remainingDebt.value
        return repaid > 0n ? repaid : 0n
    })

    const totalAmountRepaidFormatted = computed<string>(() => {
        if (!totalAmountRepaid.value) return '0'
        return Math.floor(Number(formatUnits(totalAmountRepaid.value, CREDIT_DECIMALS))).toLocaleString()
    })

    // Repayment progress percentage
    const repaymentProgress = computed<number>(() => {
        if (!isLoanActive.value || totalOwed.value === 0n) return 0
        const progress = new Decimal(totalAmountRepaid.value.toString())
            .div(new Decimal(totalOwed.value.toString()))
            .mul(100)
            .toNumber()
        return Math.min(Math.floor(progress), 100)
    })

    // Read loan data from installments product: [apr, defaultTimestamp, debtLimitTangent]
    const loanDataQuery = useReadContract({
        abi: PWN_INSTALLMENTS_PRODUCT_ABI,
        address: PWN_INSTALLMENTS_PRODUCT_ADDRESS,
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
        functionName: 'APR_DECIMALS',
    })

    const aprDecimals = computed<bigint>(() =>
        aprDecimalsQuery.data.value ? BigInt(aprDecimalsQuery.data.value) : 0n
    )

    // Read DEBT_LIMIT_TANGENT_DECIMALS
    const debtLimitTangentDecimalsQuery = useReadContract({
        abi: PWN_INSTALLMENTS_PRODUCT_ABI,
        address: PWN_INSTALLMENTS_PRODUCT_ADDRESS,
        functionName: 'DEBT_LIMIT_TANGENT_DECIMALS',
    })

    const debtLimitTangentDecimals = computed<bigint>(() =>
        debtLimitTangentDecimalsQuery.data.value ? BigInt(debtLimitTangentDecimalsQuery.data.value) : 0n
    )

    // Check if defaulted
    const isDefaultedQuery = useReadContract({
        abi: PWN_INSTALLMENTS_PRODUCT_ABI,
        address: PWN_INSTALLMENTS_PRODUCT_ADDRESS,
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

    // Vault total assets (USDC available)
    const totalVaultAssetsQuery = useReadContract({
        abi: PWN_CROWDSOURCE_LENDER_VAULT_ABI,
        address: PWN_CROWDSOURCE_LENDER_VAULT_ADDRESS,
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
            isDefaultedQuery.refetch(),
            totalVaultAssetsQuery.refetch(),
            totalCollateralAssetsQuery.refetch(),
        ])
    }

    return {
        isLoanActive,
        loanId,
        remainingDebt,
        remainingDebtFormatted,
        totalOwed,
        totalOwedFormatted,
        totalAmountRepaid,
        totalAmountRepaidFormatted,
        repaymentProgress,
        loanData,
        defaultTimestamp,
        isDefaulted,
        isFullyRepaid,
        loanStatus,
        nextPaymentDeadline,
        totalVaultAssets,
        totalVaultAssetsFormatted,
        totalCollateralAssets,
        totalCollateralAssetsFormatted,
        maxWithdrawQuery,
        refetchLoanData,
    }
}

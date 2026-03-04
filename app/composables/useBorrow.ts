import { erc20Abi, formatUnits, parseUnits, zeroAddress, type ContractFunctionArgs } from "viem"
import { PWN_CROWDSOURCE_LENDER_VAULT_ADDRESS, PWN_INSTALLMENTS_PRODUCT_ADDRESS, PWN_LOAN_ADDRESS } from "~/constants/addresses"
import { COLLATERAL_ADDRESS, COLLATERAL_DECIMALS, CREDIT_ADDRESS, PROPOSAL_CHAIN_ID } from "~/constants/proposalConstants"
import { useAccount } from "@wagmi/vue"
import { readContract, simulateContract } from "@wagmi/core/actions"
import { wagmiConfig } from "~/config/appkit"
import { sendTransaction } from "./useTransactions"
import type { ToastStep } from "~/components/ui/toast/useToastsStore"
import PWN_LOAN_ABI from "~/assets/abis/v1.5/PWNLoan"
import PWN_INSTALLMENTS_PRODUCT_ABI from "~/assets/abis/v1.5/PWNInstallmentsProduct"
import { proposal } from "~/lib/decode-proposal"
import Decimal from "decimal.js"
import PWN_CROWDSOURCE_LENDER_VAULT_ABI from "~/assets/abis/v1.5/PWNCrowdsourceLenderVault"

export default function useBorrow() {

    const { address: userAddress, chainId: connectedChainId } = useAccount()

    const getCollateralAmountFromCreditAmount = async (creditAmount: bigint) => {
        return await readContract(wagmiConfig, {
            abi: PWN_INSTALLMENTS_PRODUCT_ABI,
            functionName: 'getCollateralAmount',
            address: PWN_INSTALLMENTS_PRODUCT_ADDRESS,
            chainId: PROPOSAL_CHAIN_ID,
            args: [
                CREDIT_ADDRESS,
                creditAmount,
                COLLATERAL_ADDRESS,
                proposal.feedIntermediaryDenominations,
                proposal.feedInvertFlags,
                proposal.loanToValue
            ],
        })
    }

    const approveForAcceptIfNeeded = async (step: ToastStep, creditAmount: bigint) => {
        const collateralAmount = await getCollateralAmountFromCreditAmount(creditAmount)

        const currentAllowance = await readContract(wagmiConfig, {
            abi: erc20Abi,
            functionName: 'allowance',
            args: [userAddress.value!, PWN_LOAN_ADDRESS],
            address: COLLATERAL_ADDRESS,
            chainId: connectedChainId.value,
        })

        if (currentAllowance < collateralAmount) {
            // we are applying 1% buffer to the collateral amount when approving to not throw error when price of the collateral
            //  or credit would change in the time between approving and accepting the proposal...
            const buffer = new Decimal(formatUnits(collateralAmount, COLLATERAL_DECIMALS)).mul(0.01)
            const collateralAmountPlusBuffer = collateralAmount + parseUnits(buffer.toString(), COLLATERAL_DECIMALS)
            await sendTransaction({
                abi: erc20Abi,
                functionName: 'approve',
                args: [PWN_LOAN_ADDRESS, collateralAmountPlusBuffer],
                address: COLLATERAL_ADDRESS,
                chainId: connectedChainId.value,
            }, { step })
        }

        return true
    }

    const acceptProposal = async (step: ToastStep, creditAmount: bigint) => {
        const proposalData = await readContract(wagmiConfig, {
            abi: PWN_INSTALLMENTS_PRODUCT_ABI,
            functionName: 'encodeProposalData',
            address: PWN_INSTALLMENTS_PRODUCT_ADDRESS,
            chainId: PROPOSAL_CHAIN_ID,
            args: [
                proposal,
                { creditAmount }
            ]
        })
        const proposalSpec: ContractFunctionArgs<typeof PWN_LOAN_ABI, 'nonpayable', 'create'>[0] = {
            proposer: PWN_CROWDSOURCE_LENDER_VAULT_ADDRESS,
            product: PWN_INSTALLMENTS_PRODUCT_ADDRESS,
            proposalData: proposalData,
            proposalInclusionProof: [],
            // we are using onchain signatures, so here we pass just 0x (empty bytes)
            signature: '0x',
        }
        const lenderSpec: ContractFunctionArgs<typeof PWN_LOAN_ABI, 'nonpayable', 'create'>[1] = {
            createHook: PWN_CROWDSOURCE_LENDER_VAULT_ADDRESS,
            createHookData: '0x',
            repaymentHook: PWN_CROWDSOURCE_LENDER_VAULT_ADDRESS,
            repaymentHookData: '0x',
        }
        const borrowerSpec: ContractFunctionArgs<typeof PWN_LOAN_ABI, 'nonpayable', 'create'>[2] = {
            createHook: zeroAddress,
            createHookData: '0x',
        }

        // throws error if the tx would revert
        await simulateContract(wagmiConfig, {
            abi: PWN_LOAN_ABI,
            functionName: 'create',
            args: [proposalSpec, lenderSpec, borrowerSpec, '0x'],
            address: PWN_LOAN_ADDRESS,
            chainId: connectedChainId.value,
        })

        const txReceipt = await sendTransaction({
            abi: PWN_LOAN_ABI,
            functionName: 'create',
            args: [proposalSpec, lenderSpec, borrowerSpec, '0x'],
            address: PWN_LOAN_ADDRESS,
            chainId: connectedChainId.value,
        }, { step })
        return txReceipt
    }

    const approveForRepayIfNeeded = async (step: ToastStep, repaymentAmount: bigint) => {
        const currentAllowance = await readContract(wagmiConfig, {
            abi: erc20Abi,
            functionName: 'allowance',
            args: [userAddress.value!, PWN_LOAN_ADDRESS],
            address: CREDIT_ADDRESS,
            chainId: connectedChainId.value,
        })

        if (currentAllowance < repaymentAmount) {
            await sendTransaction({
                abi: erc20Abi,
                functionName: 'approve',
                args: [PWN_LOAN_ADDRESS, repaymentAmount],
                address: CREDIT_ADDRESS,
                chainId: connectedChainId.value,
            }, { step })
        }

        return true
    }

    const getLoanId = async () => {
        return await readContract(wagmiConfig, {
            abi: PWN_CROWDSOURCE_LENDER_VAULT_ABI,
            functionName: 'loanId',
            args: [],
            address: PWN_CROWDSOURCE_LENDER_VAULT_ADDRESS,
            chainId: connectedChainId.value,
        })
    }

    const getRemainingDebt = async (loanId: bigint) => {
        return await readContract(wagmiConfig, {
            abi: PWN_LOAN_ABI,
            functionName: 'getLOANDebt',
            args: [loanId],
            address: PWN_LOAN_ADDRESS,
            chainId: connectedChainId.value,
        })
    }

    const repay = async (step: ToastStep, repaymentAmount: bigint) => {
        const loanId = await getLoanId()
        const txReceipt = await sendTransaction({
            abi: PWN_LOAN_ABI,
            functionName: 'repay',
            args: [loanId, repaymentAmount],
            address: PWN_LOAN_ADDRESS,
            chainId: connectedChainId.value,
        }, { step })
        return txReceipt
    }

    /**
     * Calculate the timestamp when the next payment must be made to avoid default.
     * This is calculated by finding when the default debt limit equals the current debt.
     * 
     * Formula: timestamp = defaultTimestamp - (currentDebt * 10^DEBT_LIMIT_TANGENT_DECIMALS) / debtLimitTangent
     * 
     * @param loanId The loan ID
     * @returns The timestamp (in seconds) when payment is needed, or null if already defaulted or no loan exists
     */
    const getNextPaymentDeadline = async (loanId: bigint): Promise<bigint | null> => {
        try {
            // Get loan data (returns tuple: [apr, defaultTimestamp, debtLimitTangent])
            const loanData = await readContract(wagmiConfig, {
                abi: PWN_INSTALLMENTS_PRODUCT_ABI,
                functionName: 'loanData',
                address: PWN_INSTALLMENTS_PRODUCT_ADDRESS,
                chainId: connectedChainId.value,
                args: [PWN_LOAN_ADDRESS, loanId],
            })

            // Get DEBT_LIMIT_TANGENT_DECIMALS constant
            const debtLimitTangentDecimals = await readContract(wagmiConfig, {
                abi: PWN_INSTALLMENTS_PRODUCT_ABI,
                functionName: 'DEBT_LIMIT_TANGENT_DECIMALS',
                address: PWN_INSTALLMENTS_PRODUCT_ADDRESS,
                chainId: connectedChainId.value,
                args: [],
            })

            // Hardcoded principal amount: 180,295 USDC (6 decimals)
            const currentDebt = 180_295_000_000n

            // loanData is a tuple: [apr, defaultTimestamp, debtLimitTangent]
            const defaultTimestamp = BigInt(loanData[1])
            const debtLimitTangent = BigInt(loanData[2])

            // If already past default timestamp, return null
            const currentTimestamp = BigInt(Math.floor(Date.now() / 1000))
            if (currentTimestamp >= defaultTimestamp) {
                return null
            }

            // If debt is 0, no payment needed
            if (currentDebt === 0n) {
                return null
            }

            // Calculate: timestamp = defaultTimestamp - (currentDebt * 10^DEBT_LIMIT_TANGENT_DECIMALS) / debtLimitTangent
            const decimalsMultiplier = 10n ** BigInt(debtLimitTangentDecimals)
            const numerator = currentDebt * decimalsMultiplier
            const deadlineTimestamp = defaultTimestamp - (numerator / debtLimitTangent)

            // If the calculated deadline is in the past, the loan is already at risk
            // Return the deadline anyway so the UI can show it
            return deadlineTimestamp
        } catch (error) {
            console.error('Error calculating next payment deadline:', error)
            return null
        }
    }

    return {
        getCollateralAmountFromCreditAmount,
        approveForAcceptIfNeeded,
        acceptProposal,
        approveForRepayIfNeeded,
        repay,
        getRemainingDebt,
        getLoanId,
        getNextPaymentDeadline,
    }
}
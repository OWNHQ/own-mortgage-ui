import { erc20Abi, formatUnits, parseUnits, zeroAddress, type ContractFunctionArgs } from "viem"
import { PWN_CROWDSOURCE_LENDER_VAULT_ADDRESS, PWN_INSTALLMENTS_PRODUCT_ADDRESS, PWN_LOAN_ADDRESS } from "~/constants/addresses"
import { COLLATERAL_ADDRESS, COLLATERAL_DECIMALS, CREDIT_ADDRESS, PROPOSAL_CHAIN_ID } from "~/constants/proposalConstants"
import { useAccount } from "@wagmi/vue"
import { readContract, readContracts, simulateContract } from "@wagmi/core/actions"
import { wagmiConfig } from "~/config/appkit"
import { sendTransaction } from "./useTransactions"
import type { ToastStep } from "~/components/ui/toast/useToastsStore"
import PWN_LOAN_ABI from "~/assets/abis/v1.5/PWNLoan"
import PWN_INSTALLMENTS_PRODUCT_ABI from "~/assets/abis/v1.5/PWNInstallmentsProduct"
import { proposal } from "~/lib/decode-proposal"
import Decimal from "decimal.js"
import PWN_CROWDSOURCE_LENDER_VAULT_ABI from "~/assets/abis/v1.5/PWNCrowdsourceLenderVault"
import { calculateNextPaymentDeadline } from "~/lib/loan-deadline"

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

    const getNextPaymentDeadline = async (loanId: bigint): Promise<bigint | null> => {
        try {
            const [loanData, loanDetails, aprDecimals, debtLimitTangentDecimals] = await readContracts(wagmiConfig, {
                allowFailure: false,
                contracts: [
                    {
                        abi: PWN_INSTALLMENTS_PRODUCT_ABI,
                        functionName: 'loanData',
                        address: PWN_INSTALLMENTS_PRODUCT_ADDRESS,
                        chainId: connectedChainId.value,
                        args: [PWN_LOAN_ADDRESS, loanId],
                    },
                    {
                        abi: PWN_LOAN_ABI,
                        functionName: 'getLOAN',
                        args: [loanId],
                        address: PWN_LOAN_ADDRESS,
                        chainId: connectedChainId.value,
                    },
                    {
                        abi: PWN_INSTALLMENTS_PRODUCT_ABI,
                        functionName: 'APR_DECIMALS',
                        address: PWN_INSTALLMENTS_PRODUCT_ADDRESS,
                        chainId: connectedChainId.value,
                        args: [],
                    },
                    {
                        abi: PWN_INSTALLMENTS_PRODUCT_ABI,
                        functionName: 'DEBT_LIMIT_TANGENT_DECIMALS',
                        address: PWN_INSTALLMENTS_PRODUCT_ADDRESS,
                        chainId: connectedChainId.value,
                        args: [],
                    },
                ],
            })

            return calculateNextPaymentDeadline({
                principal: BigInt(loanDetails.principal ?? 0n),
                pastAccruedInterest: BigInt(loanDetails.pastAccruedInterest ?? 0n),
                lastUpdateTimestamp: BigInt(loanDetails.lastUpdateTimestamp ?? 0n),
                apr: BigInt(loanData[0]),
                aprDecimals: BigInt(aprDecimals),
                defaultTimestamp: BigInt(loanData[1]),
                debtLimitTangent: BigInt(loanData[2]),
                debtLimitTangentDecimals: BigInt(debtLimitTangentDecimals),
                currentTimestamp: BigInt(Math.floor(Date.now() / 1000)),
            })
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

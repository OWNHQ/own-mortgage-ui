import { erc20Abi, type Address } from "viem"
import PWN_CROWDSOURCE_LENDER_VAULT_ABI from "~/assets/abis/v1.5/PWNCrowdsourceLenderVault"
import { PWN_CROWDSOURCE_LENDER_VAULT_ADDRESS, OLD_PWN_CROWDSOURCE_LENDER_VAULT_ADDRESS } from "~/constants/addresses"
import { CREDIT_ADDRESS } from "~/constants/proposalConstants"
import { useAccount } from "@wagmi/vue"
import { readContract, simulateContract } from "@wagmi/core/actions"
import { wagmiConfig } from "~/config/appkit"
import { sendTransaction } from "./useTransactions"
import type { ToastStep } from "~/components/ui/toast/useToastsStore"

type ClaimVaultExitOptions = {
    ownerAddress: Address
    receiverAddress: Address
    step: ToastStep
    vaultAddress: Address
} & (
    | { assets: bigint, method: 'withdraw' }
    | { method: 'redeem', shares: bigint }
)

export default function useLend() {
    const amountInputStore = useAmountInputStore()
    const { address: userAddress, chainId: connectedChainId } = useAccount()

    const checkApprovalNeeded = async () => {
        try {
            const additionalApprovalNeeded = amountInputStore.amountToDepositAdditionally

            if (additionalApprovalNeeded <= 0n) {
                return false // No additional deposit, no approval needed
            }

            const currentAllowance = await readContract(wagmiConfig, {
                abi: erc20Abi,
                functionName: 'allowance',
                args: [userAddress.value!, PWN_CROWDSOURCE_LENDER_VAULT_ADDRESS],
                address: CREDIT_ADDRESS,
                chainId: connectedChainId.value,
            })

            return currentAllowance < additionalApprovalNeeded
        } catch (error) {
            console.error('Error checking allowance:', error)
            return true // Assume approval needed if we can't check
        }
    }

    const approveForDepositIfNeeded = async (step: ToastStep) => {
        const additionalApprovalNeeded = amountInputStore.amountToDepositAdditionally

        if (additionalApprovalNeeded <= 0n) {
            return true // No additional deposit, no approval needed
        }

        const currentAllowance = await readContract(wagmiConfig, {
            abi: erc20Abi,
            functionName: 'allowance',
            args: [userAddress.value!, PWN_CROWDSOURCE_LENDER_VAULT_ADDRESS],
            address: CREDIT_ADDRESS,
            chainId: connectedChainId.value,
        })

        if (currentAllowance < additionalApprovalNeeded) {
            await sendTransaction({
                abi: erc20Abi,
                functionName: 'approve',
                args: [PWN_CROWDSOURCE_LENDER_VAULT_ADDRESS, additionalApprovalNeeded],
                address: CREDIT_ADDRESS,
                chainId: connectedChainId.value,
            }, { step })
        }

        return true
    }

    const withdraw = async (
        withdrawAmount: bigint,
        step: ToastStep,
        vaultAddress: Address = PWN_CROWDSOURCE_LENDER_VAULT_ADDRESS,
    ) => {
        const withdrawTxReceipt = await sendTransaction({
            abi: PWN_CROWDSOURCE_LENDER_VAULT_ABI,
            functionName: 'withdraw',
            args: [withdrawAmount, userAddress.value!, userAddress.value!],
            address: vaultAddress,
            chainId: connectedChainId.value,
        }, { step })
        return withdrawTxReceipt
    }

    const claimVaultExit = async (options: ClaimVaultExitOptions) => {
        if (options.method === 'withdraw') {
            const transaction = {
                abi: PWN_CROWDSOURCE_LENDER_VAULT_ABI,
                functionName: 'withdraw',
                args: [options.assets, options.receiverAddress, options.ownerAddress],
                address: options.vaultAddress,
                account: options.ownerAddress,
                chainId: connectedChainId.value,
            } as const

            await simulateContract(wagmiConfig, transaction)
            return await sendTransaction(transaction, { step: options.step })
        }

        const transaction = {
            abi: PWN_CROWDSOURCE_LENDER_VAULT_ABI,
            functionName: 'redeem',
            args: [options.shares, options.receiverAddress, options.ownerAddress],
            address: options.vaultAddress,
            account: options.ownerAddress,
            chainId: connectedChainId.value,
        } as const

        await simulateContract(wagmiConfig, transaction)
        return await sendTransaction(transaction, { step: options.step })
    }

    const redeemAll = async (vaultAddress: Address, withdrawSharesAmount: bigint, step: ToastStep) => {
        const withdrawAllTxReceipt = await sendTransaction({
            abi: PWN_CROWDSOURCE_LENDER_VAULT_ABI,
            functionName: 'redeem',
            args: [withdrawSharesAmount, userAddress.value!, userAddress.value!],
            address: vaultAddress,
            chainId: connectedChainId.value,
        }, { step })
        return withdrawAllTxReceipt
    }

    const deposit = async (step: ToastStep) => {
        const txReceipt = await sendTransaction({
            abi: PWN_CROWDSOURCE_LENDER_VAULT_ABI,
            functionName: 'deposit',
            args: [amountInputStore.amountToDepositAdditionally, userAddress.value!],
            address: PWN_CROWDSOURCE_LENDER_VAULT_ADDRESS,
            chainId: connectedChainId.value,
        }, { step })
        return txReceipt
    }

    // Fallback: redeem from old vault (separate transaction)
    const redeemFromOldVault = async (withdrawAmount: bigint, step: ToastStep) => {
        const redeemTxReceipt = await sendTransaction({
            abi: PWN_CROWDSOURCE_LENDER_VAULT_ABI,
            functionName: 'redeem',
            args: [withdrawAmount, userAddress.value!, userAddress.value!],
            address: OLD_PWN_CROWDSOURCE_LENDER_VAULT_ADDRESS,
            chainId: connectedChainId.value,
        }, { step })
        return redeemTxReceipt
    }

    return {
        checkApprovalNeeded,
        claimVaultExit,
        approveForDepositIfNeeded,
        deposit,
        withdraw,
        redeemAll,
        redeemFromOldVault
    }
}

<template>
    <div class="bg-card border rounded-xl p-4 sm:p-6 order-3 lg:order-none shadow-lg">
        <h3 class="text-xl sm:text-2xl font-heading mb-2">Loan Terms</h3>
        <p class="text-gray-2 text-sm sm:text-base mb-4">Crypto-backed mortgage with gradual installments.</p>
        <div class="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4">
            <div v-for="item in TERMS_ITEMS" :key="item.label" class="border rounded-lg p-3 bg-background/50">
                <div class="text-sm text-gray">{{ item.label }}</div>
                <div
                    v-if="item.isMonthly"
                    class="text-lg sm:text-xl md:text-2xl font-semibold flex items-center gap-1"
                >
                    <span>${{ monthlyInstallment }}</span>
                    <span class="text-xs sm:text-sm text-gray-400">/mo</span>
                </div>
                <div
                    v-else-if="item.isToken"
                    class="text-lg sm:text-xl md:text-2xl font-semibold flex items-center gap-2"
                >
                    <span>{{ item.value }}</span>
                    <a :href="item.link" target="_blank" class="cursor-pointer group">
                        <img
                            src="/icons/external.svg"
                            alt="Block Explorer Link"
                            class="w-3 h-3 transition-all duration-200 group-hover:brightness-0 group-hover:invert"
                            style="filter: brightness(0) saturate(100%) invert(40%) sepia(0%) saturate(0%) hue-rotate(0deg) brightness(95%) contrast(89%);"
                        />
                    </a>
                </div>
                <div 
                    v-else 
                    class="text-lg sm:text-xl md:text-2xl font-semibold flex items-center gap-2">
                    <span>{{ item.value }}</span>
                </div>
            </div>
            <!-- Chain info on mobile only -->
            <div class="sm:hidden border rounded-lg p-3 bg-background/50">
                <div class="text-sm text-gray">Chain</div>
                <div class="text-lg sm:text-xl md:text-2xl font-semibold flex items-center gap-2">
                    <ChainInfo />
                </div>
            </div>
        </div>
        
        <!-- Expandable Details -->
        <Accordion type="single" collapsible class="mt-3">
            <AccordionItem value="loan-default">
                <AccordionTrigger class="text-sm text-gray-400 hover:text-gray-200">
                    Loan Default & Liquidation
                </AccordionTrigger>
                <AccordionContent>
                    <p class="leading-relaxed text-sm sm:text-base mb-4 text-justify">
                        The loan can be liquidated by anyone if repayments fall below the required threshold at any point in time. 
                        In this case, a liquidation means that the fungible collateral (weETH) will be claimable pro-rata based on the contribution in the ERC4626 vault. 
                        This is purely handled by smart contract functions that validate whether sufficient repayments were made at particular points in time following the liquidation threshold with no reliance on price oracles.
                    </p>
                    <LoanDefaultGraph />
                    <p class="leading-relaxed text-xs sm:text-sm mt-4 text-justify text-gray-400 italic">
                        Important: The loan mechanics do not purposefully include price-based liquidation. The decision to fund the loan should be made with the expectation that in 5 years the value of weETH will not be 25% lower than it is today.
                    </p>
                </AccordionContent>
            </AccordionItem>
            
            <AccordionItem value="instant-repayment">
                <AccordionTrigger class="text-sm text-gray-400 hover:text-gray-200">
                    Instant Repayment
                </AccordionTrigger>
                <AccordionContent>
                    <p class="leading-relaxed text-sm sm:text-base text-justify"> 
                        If the loan is repaid early, the same total amount will be paid back in a shorter duration, technically increasing the effective APR for lenders who receive their repayment sooner.
                    </p>
                </AccordionContent>
            </AccordionItem>
            
            <AccordionItem value="yield-generation">
                <AccordionTrigger class="text-sm text-gray-400 hover:text-gray-200">
                    How come the commitments earn yield before the loan is activated?
                </AccordionTrigger>
                <AccordionContent>
                    <p class="leading-relaxed text-sm sm:text-base text-justify">
                        The funds deposited are deployed to Aave V3 supply via a proxy ERC4626 vault, generating additional yield while waiting for loan activation. Once the loan is active and repayments begin, the repayments also earn extra yield via Aave before being withdrawn from the Lender vault. This dual-yield mechanism ensures lenders maximize their returns throughout the entire loan lifecycle.
                    </p>
                </AccordionContent>
            </AccordionItem>
        </Accordion>
    </div>
</template>

<script setup lang="ts">
import { COLLATERAL_ADDRESS, COLLATERAL_NAME, CREDIT_ADDRESS, CREDIT_NAME, LOAN_DURATION_IN_YEARS, LOAN_LTV, MAX_AMOUNT_FORMATTED, MINIMAL_APR } from '~/constants/proposalConstants';
import { getExplorerTokenAddressLink } from '~/constants/links';

const MONTHLY_INSTALLMENTS_LABEL = "Monthly Installments"

// Calculate monthly installment amount
const monthlyInstallment = computed(() => {
    const totalMonths = LOAN_DURATION_IN_YEARS * 12
    const monthlyAmount = MAX_AMOUNT_FORMATTED / totalMonths
    return Math.floor(monthlyAmount).toLocaleString()
})

// Terms grid items including token details and minimum fixed rate
const TERMS_ITEMS = [
    {
        label: 'LTV',
        value: `${LOAN_LTV / 100}%`,
        tooltip: 'Loan-to-Value Ratio'
    },
    {
        label: 'Duration',
        value: `${LOAN_DURATION_IN_YEARS}y`,
        tooltip: 'Loan Duration'
    },
    {
        label: MONTHLY_INSTALLMENTS_LABEL,
        value: null,
        tooltip: 'Monthly Installment Amount',
        isMonthly: true
    },
    {
        label: 'Minimum Fixed Rate',
        value: `${MINIMAL_APR}%`,
        tooltip: 'Minimum Fixed Rate APR'
    },
    {
        label: 'Collateral Token',
        value: COLLATERAL_NAME,
        tooltip: 'Collateral Token',
        isToken: true,
        link: getExplorerTokenAddressLink(COLLATERAL_ADDRESS)
    },
    {
        label: 'Credit Token',
        value: CREDIT_NAME,
        tooltip: 'Credit Token',
        isToken: true,
        link: getExplorerTokenAddressLink(CREDIT_ADDRESS)
    }
]

const _isCollateralOrCreditNameItem = (_itemLabel: string) => {
    return false // No longer needed in main grid
}
</script>


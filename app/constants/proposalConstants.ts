import { formatUnits, parseUnits, type Address } from "viem"
import { proposal } from "@/lib/decode-proposal"
import { mainnet } from "@reown/appkit/networks";
import Decimal from "decimal.js";

// note: for getting the proposal data, see code in decode-proposal.ts and then update the values here

export const CREDIT_ADDRESS = proposal.creditAddress as Address
export const COLLATERAL_ADDRESS = proposal.collateralAddress as Address
export const LOAN_LTV = Number(proposal.loanToValue) // e.g. 7500 is 75%
export const POSTPONEMENT = Number(proposal.postponement)  // how long till the first repayment, in seconds
export const POSTPONEMENT_IN_DAYS = Math.round(POSTPONEMENT / 86400)
export const POSTPONEMENT_IN_MONTHS = Math.round(POSTPONEMENT_IN_DAYS / 30)
export const LOAN_APY = Number(proposal.interestAPR) // e.g. 1000 is 10%
export const LOAN_DURATION = Number(proposal.duration) // in seconds
export const LOAN_DURATION_IN_DAYS = LOAN_DURATION / 86400
export const LOAN_DURATION_IN_MONTHS = Math.round(LOAN_DURATION_IN_DAYS / (365 / 12))
export const LOAN_DURATION_IN_YEARS = Math.round(LOAN_DURATION_IN_DAYS / 365)
export const PROPOSAL_EXPIRATION = Number(proposal.expiration) // in seconds
export const MINIMAL_CREDIT_AMOUNT = proposal.minCreditAmount

export type ProposalChainId = 1 | 11155111

// values required to update manually
export const PROPOSAL_CHAIN = mainnet
// export const PROPOSAL_CHAIN = sepolia
export const PROPOSAL_CHAIN_ID = mainnet.id as ProposalChainId
// export const PROPOSAL_CHAIN_ID = sepolia.id
export const CREDIT_DECIMALS = 6 // for USDC
// export const CREDIT_DECIMALS = 2 // for EURS
export const CREDIT_NAME = 'USDC'
// export const CREDIT_NAME = 'EURS'
export const CREDIT_ASSET_ICON = '/icons/usdc.svg'
// export const CREDIT_ASSET_ICON = '/icons/eurs.svg'

export const COLLATERAL_NAME = 'weETH'
// export const COLLATERAL_NAME = "WETH"
export const COLLATERAL_DECIMALS = 18
export const COLLATERAL_ASSET_ICON = '/icons/weeth.svg'
// export const COLLATERAL_ASSET_ICON = '/icons/chain/ethereum.svg'

// note: the max amount will be only enforced on frontend, there is no concept of max credit amount
//  in the smart contracts
export const MAX_AMOUNT_FORMATTED: number = 180000;
// export const MAX_AMOUNT_FORMATTED: number = 200;
export const MAX_AMOUNT: bigint = parseUnits(String(MAX_AMOUNT_FORMATTED), CREDIT_DECIMALS)

export const TOTAL_AMOUNT_TO_REPAY = new Decimal(String(MAX_AMOUNT_FORMATTED))
  .mul(
    new Decimal(1).add(
      new Decimal(LOAN_APY).div(10000).mul(LOAN_DURATION_IN_YEARS)
    )
  );

// note: holds value between 0 and 1 (e.g. 60% is represented as 0.6)
export const MINIMAL_CREDIT_AMOUNT_PERCENTAGE: string = new Decimal(formatUnits(MINIMAL_CREDIT_AMOUNT, CREDIT_DECIMALS)).div(formatUnits(MAX_AMOUNT, CREDIT_DECIMALS)).toDecimalPlaces(2, Decimal.ROUND_FLOOR).toString()

export const MINIMAL_APR = 2.5 // used only for displaying purposes

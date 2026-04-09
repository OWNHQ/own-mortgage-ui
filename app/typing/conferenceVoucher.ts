export type ConferenceVoucherStatus =
  | "unavailable"
  | "unverified"
  | "ineligible"
  | "eligible-unclaimed"
  | "eligible-claimed"

export interface ConferenceVoucherEligibilityResponse {
  configured: boolean
  eligible: boolean
}

export interface ConferenceVoucherStatusResponse {
  configured: boolean
  status: ConferenceVoucherStatus
  claimedAt?: string
}

export interface ConferenceVoucherChallengeResponse {
  message: string
  expiresAt: string
}

export interface ConferenceVoucherClaimResponse {
  voucherCode: string
  claimedAt: string
}

export interface DomainMetadata {
  title: string
  description: string
  ogImagePath: string
  ogImageAlt: string
  siteName: string
  keywords?: string
}

export const DEFAULT_METADATA: DomainMetadata = {
  title: 'OWN Loan #1 - Co-owned Hackerspace',
  description: 'Pilot of a DeFi alternative to a mortgage: a five-year, fixed-rate USDC installment loan secured by weETH, used to fund a co-owned hackerspace in Prague.',
  ogImagePath: '/images/own-loan-1-og.png',
  ogImageAlt: 'OWN Loan #1 - Co-owned Hackerspace',
  siteName: 'OWN.casa',
  keywords: 'OWN, DeFi loan, mortgage alternative, onchain credit, USDC, weETH, fixed-rate loan, co-owned hackerspace, Prague',
}

/**
 * Get the hardcoded metadata.
 * Domain argument is kept for compatibility but ignored.
 */
export function getMetadataForDomain(_hostname?: string): DomainMetadata {
  return DEFAULT_METADATA
}

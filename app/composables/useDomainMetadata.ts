import { getMetadataForDomain, type DomainMetadata } from '~/constants/domains'

export interface DomainMetadataResult extends DomainMetadata {
  /** Full URL to the OG image (includes origin) */
  ogImage: string
  /** The detected hostname */
  hostname: string
  /** The full origin (protocol + host) */
  origin: string
}

/**
 * Composable that returns metadata based on the current request domain.
 * Works on both server (SSR) and client side using `useRequestURL()`.
 */
export function useDomainMetadata(): DomainMetadataResult {
  const hostname = 'loan.bordel.wtf'
  const origin = 'https://loan.bordel.wtf'

  // Metadata is now hardcoded/static
  const metadata = getMetadataForDomain(hostname)

  return {
    ...metadata,
    ogImage: `${origin}${metadata.ogImagePath}`,
    hostname,
    origin,
  }
}

/**
 * Apply SEO meta tags based on the current domain.
 * Call this in your page's setup to set domain-specific metadata.
 */
export function useDomainSeoMeta(overrides?: Partial<DomainMetadata>) {
  const metadata = useDomainMetadata()

  useSeoMeta({
    title: () => overrides?.title ?? metadata.title,
    description: () => overrides?.description ?? metadata.description,
    ogTitle: () => overrides?.title ?? metadata.title,
    ogDescription: () => overrides?.description ?? metadata.description,
    ogImage: () => overrides?.ogImagePath ? `${metadata.origin}${overrides.ogImagePath}` : metadata.ogImage,
    ogImageAlt: () => overrides?.ogImageAlt ?? metadata.ogImageAlt,
    ogImageType: 'image/png',
    ogImageWidth: 1200,
    ogImageHeight: 630,
    ogUrl: () => `${metadata.origin}`,
    ogType: 'website',
    ogSiteName: () => overrides?.siteName ?? metadata.siteName,
    ogLocale: 'en_US',
    twitterCard: 'summary_large_image',
    twitterTitle: () => overrides?.title ?? metadata.title,
    twitterDescription: () => overrides?.description ?? metadata.description,
    twitterImage: () => overrides?.ogImagePath ? `${metadata.origin}${overrides.ogImagePath}` : metadata.ogImage,
    twitterImageAlt: () => overrides?.ogImageAlt ?? metadata.ogImageAlt,
    themeColor: '#f3f0e8',
    robots: 'index, follow',
    author: 'OWN Labs',
    keywords: () => overrides?.keywords ?? metadata.keywords,
  })
}

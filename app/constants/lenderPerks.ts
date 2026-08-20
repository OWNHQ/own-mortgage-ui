export interface LenderPerk {
  threshold: number
  thresholdLabel: string
  rankLabel: string
  inheritedLabel?: string
  perks: readonly string[]
  membershipLabel: string
  benefit: string
  title: string
  summary: string
}

export const LENDER_PERKS: readonly LenderPerk[] = [
  {
    threshold: 1_000,
    thresholdLabel: '$1,000+',
    rankLabel: '/1 Early member',
    perks: ['zk badge', 'opening-party invite', 'POAP NFT'],
    membershipLabel: 'MEMBERSHIP · 2 MONTHS',
    benefit: '2 months membership\n+ opening-party invite',
    title: '2 months membership',
    summary: 'zk badge · opening-party invite · POAP NFT',
  },
  {
    threshold: 3_000,
    thresholdLabel: '$3,000+',
    rankLabel: '/2 Supporter',
    inheritedLabel: 'All perks from /1 Early member',
    perks: ['BORDEL T-shirt'],
    membershipLabel: 'MEMBERSHIP · 6 MONTHS',
    benefit: '6 months membership\n+ BORDEL T-shirt',
    title: '6 months membership',
    summary: 'BORDEL T-shirt · all Early member perks',
  },
  {
    threshold: 5_000,
    thresholdLabel: '$5,000+',
    rankLabel: '/3 Insider',
    inheritedLabel: 'All perks from /2 Supporter',
    perks: ['free private event'],
    membershipLabel: 'MEMBERSHIP · 1 YEAR',
    benefit: '1 year membership\n+ free private event',
    title: '1 year membership',
    summary: 'Free private event · all Supporter perks',
  },
  {
    threshold: 10_000,
    thresholdLabel: '$10,000+',
    rankLabel: '/4 Patron',
    inheritedLabel: 'All perks from /3 Insider',
    perks: ['own private zone', 'server hosting', 'ETHPrague26 ticket'],
    membershipLabel: 'MEMBERSHIP · VIP · 2 YEARS',
    benefit: '2 years VIP membership\n+ ETHPrague26 ticket',
    title: '2 years VIP membership',
    summary: 'Own private zone · server hosting · ETHPrague26 ticket',
  },
  {
    threshold: 25_000,
    thresholdLabel: '$25,000+',
    rankLabel: '/5 Bordeliér',
    inheritedLabel: 'All perks from /4 Patron',
    perks: ['access to all events', 'supporter art plaque', 'ETHPrague26 VIP'],
    membershipLabel: 'MEMBERSHIP · VIP · 5 YEARS',
    benefit: '5 years VIP membership\n+ ETHPrague26 VIP',
    title: '5 years VIP membership',
    summary: 'All-event access · supporter art plaque · ETHPrague26 VIP',
  },
  {
    threshold: 50_000,
    thresholdLabel: '$50,000+',
    rankLabel: '/6 Goat',
    inheritedLabel: 'All perks from /5 Bordeliér',
    perks: ['custom reward', 'ETHPrague 26-30 VIP'],
    membershipLabel: 'MEMBERSHIP · VIP · 5 YEARS',
    benefit: '5 years VIP membership\n+ custom reward',
    title: '5 years VIP membership',
    summary: 'Custom reward · ETHPrague 26-30 VIP',
  },
]

export function getLenderPerk(amount: number) {
  return [...LENDER_PERKS].reverse().find(perk => amount >= perk.threshold)
}

export function getLenderPerkRankTitle(amount: number) {
  return getLenderPerk(amount)?.rankLabel.replace(/^\/\d+\s+/, '')
}

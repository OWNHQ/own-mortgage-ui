export interface ProjectFeedImage {
  alt: string
  height: number
  src: string
  width: number
}

export interface ProjectFeedEntry {
  body: string
  date: string
  dateTime: string
  href: string
  image?: ProjectFeedImage
  source: string
  title: string
}

export const BORDEL_BLUESKY_HANDLE = 'bordelwtf.bsky.social'
export const BORDEL_BLUESKY_PROFILE_URL = `https://bsky.app/profile/${BORDEL_BLUESKY_HANDLE}`
export const BORDEL_BLUESKY_AUTHOR_FEED_URL = `https://public.api.bsky.app/xrpc/app.bsky.feed.getAuthorFeed?actor=${encodeURIComponent(BORDEL_BLUESKY_HANDLE)}&filter=posts_no_replies&limit=10`

export const PROJECT_FEED_SNAPSHOT: ProjectFeedEntry = {
  body: `Come discuss plans for our new space & prototype projects we'll run there.
Perfect corner also for hardware hackers to hang, meet & build 🛠️

Who's in?
@ethprague.bsky.social`,
  date: '06 MAY 2026',
  dateTime: '2026-05-06T06:55:05.872Z',
  href: 'https://bsky.app/profile/bordelwtf.bsky.social/post/3ml64mgrhhc23',
  image: {
    alt: 'Bordel neon sign above a hackerspace workstation in an ornate illustrated frame.',
    height: 1168,
    src: 'https://cdn.bsky.app/img/feed_fullsize/plain/did:plc:mzip2zycjufaapqoyqt2xlgd/bafkreih3v55tjdt4qq5su6ycgyyxgbksyodkxp3kz7rsr3sonxldpoygwi',
    width: 784,
  },
  source: 'BLUESKY',
  title: 'Bordel will be at EthPrague this weekend!',
}

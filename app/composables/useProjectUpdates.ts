import type { ProjectFeedEntry, ProjectFeedImage } from '~/constants/projectFeed'
import {
  BORDEL_BLUESKY_AUTHOR_FEED_URL,
  BORDEL_BLUESKY_HANDLE,
  PROJECT_FEED_SNAPSHOT,
} from '~/constants/projectFeed'

interface BlueskyPostRecord {
  createdAt?: string
  text?: string
}

interface BlueskyImageView {
  alt?: string
  aspectRatio?: {
    height?: number
    width?: number
  }
  fullsize?: string
}

interface BlueskyPostEmbed {
  images?: BlueskyImageView[]
}

interface BlueskyFeedPost {
  embed?: BlueskyPostEmbed
  indexedAt?: string
  record?: BlueskyPostRecord
  uri?: string
}

interface BlueskyFeedItem {
  post?: BlueskyFeedPost
  reason?: unknown
}

interface BlueskyAuthorFeedResponse {
  feed?: BlueskyFeedItem[]
}

function formatBlueskyDate(value: string) {
  const date = new Date(value)

  if (Number.isNaN(date.getTime())) return null

  return {
    date: new Intl.DateTimeFormat('en-GB', {
      day: '2-digit',
      month: 'short',
      timeZone: 'UTC',
      year: 'numeric',
    }).format(date).toUpperCase(),
    dateTime: date.toISOString(),
  }
}

function postUrl(uri: string) {
  const recordKey = uri.split('/').at(-1)
  if (!recordKey) return null

  return `https://bsky.app/profile/${BORDEL_BLUESKY_HANDLE}/post/${encodeURIComponent(recordKey)}`
}

function postCopy(text: string) {
  const lines = text.replace(/\r/g, '').split('\n')
  const titleIndex = lines.findIndex(line => line.trim())

  if (titleIndex < 0) return null

  const title = lines[titleIndex]!.trim()
  const body = lines
    .slice(titleIndex + 1)
    .join('\n')
    .trim()
    .replace(/\n{3,}/g, '\n\n')

  if (!body) {
    return {
      body: '',
      title,
    }
  }

  return { body, title }
}

function toProjectFeedImage(image: BlueskyImageView | undefined): ProjectFeedImage | null {
  if (!image?.fullsize) return null

  const width = Number(image.aspectRatio?.width)
  const height = Number(image.aspectRatio?.height)

  return {
    alt: image.alt?.trim() || '',
    height: Number.isFinite(height) && height > 0 ? height : PROJECT_FEED_SNAPSHOT.image.height,
    src: image.fullsize,
    width: Number.isFinite(width) && width > 0 ? width : PROJECT_FEED_SNAPSHOT.image.width,
  }
}

function toProjectFeedEntry(post: BlueskyFeedPost): ProjectFeedEntry | null {
  const text = post.record?.text?.trim()
  const timestamp = post.record?.createdAt || post.indexedAt
  const href = post.uri ? postUrl(post.uri) : null
  const image = toProjectFeedImage(post.embed?.images?.[0])

  if (!text || !timestamp || !href) return null

  const formattedDate = formatBlueskyDate(timestamp)
  const copy = postCopy(text)
  if (!formattedDate || !copy) return null

  return {
    body: copy.body,
    date: formattedDate.date,
    dateTime: formattedDate.dateTime,
    href,
    ...(image ? { image } : {}),
    source: 'BLUESKY',
    title: copy.title,
  }
}

export function useProjectUpdates() {
  const { data, error, refresh, status } = useAsyncData(
    'bordel-project-updates',
    async () => {
      const response = await $fetch<BlueskyAuthorFeedResponse>(BORDEL_BLUESKY_AUTHOR_FEED_URL, {
        retry: 0,
        timeout: 5_000,
      })

      const entries: ProjectFeedEntry[] = []
      for (const item of response.feed ?? []) {
        if (item.reason || !item.post) continue
        const entry = toProjectFeedEntry(item.post)
        if (entry) entries.push(entry)
      }

      return entries.length ? entries : null
    },
    {
      default: () => null,
      lazy: true,
      server: false,
    },
  )

  const entries = computed(() => data.value?.length ? data.value : [PROJECT_FEED_SNAPSHOT])
  const entry = computed(() => entries.value[0]!)
  const feedState = computed(() => {
    if (status.value === 'idle' || status.value === 'pending') return 'checking'
    if (error.value) return 'unavailable'
    if (!data.value?.length) return 'snapshot'
    return 'live'
  })

  return {
    entries,
    entry,
    error,
    feedState,
    refresh,
  }
}

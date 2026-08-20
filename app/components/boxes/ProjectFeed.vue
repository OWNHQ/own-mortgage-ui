<template>
  <section id="project-updates" class="project-feed" aria-labelledby="project-feed-title">
    <header class="project-feed__header">
      <h2 id="project-feed-title">
        <GetUpdatesModal />
      </h2>
    </header>

    <p class="sr-only" aria-live="polite">{{ feedStateLabel }}</p>

    <div
      v-if="projectUpdates.feedState.value === 'unavailable'"
      class="project-feed__notice"
      role="status"
    >
      <p>LIVE FEED UNAVAILABLE · SHOWING SAVED UPDATE</p>
      <button type="button" @click="projectUpdates.refresh()">RETRY</button>
    </div>

    <div class="project-feed__scroller" tabindex="0" aria-label="Bluesky project updates">
      <article v-for="entry in entries" :key="entry.href" class="project-feed__entry">
        <p class="project-feed__meta">
          <time :datetime="entry.dateTime">{{ entry.date }}</time>
          <span aria-hidden="true"> · </span>
          <a
            :href="entry.href"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="View this update on Bluesky (opens in a new tab)"
          >{{ entry.source }} <span aria-hidden="true">↗</span></a>
        </p>

        <h3>{{ entry.title }}</h3>
        <p v-if="entry.body" class="project-feed__body">{{ entry.body }}</p>

        <a
          v-if="entry.image"
          class="project-feed__image-link"
          :href="entry.href"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="View the illustrated Bordel project update on Bluesky (opens in a new tab)"
        >
          <img
            :src="entry.image.src"
            :alt="entry.image.alt"
            :width="entry.image.width"
            :height="entry.image.height"
            :style="{ aspectRatio: `${entry.image.width} / ${entry.image.height}` }"
            loading="lazy"
            decoding="async"
          >
        </a>
      </article>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useProjectUpdates } from '~/composables/useProjectUpdates'

const emit = defineEmits<{
  ready: []
}>()
const projectUpdates = useProjectUpdates()
const entries = projectUpdates.entries
const hasEmittedReady = ref(false)

watch(projectUpdates.feedState, (state) => {
  if (state === 'checking' || hasEmittedReady.value) return
  hasEmittedReady.value = true
  emit('ready')
}, { immediate: true })

const feedStateLabel = computed(() => {
  switch (projectUpdates.feedState.value) {
    case 'checking':
      return 'Checking Bluesky for project updates.'
    case 'live':
      return `Showing ${entries.value.length} live updates from Bluesky.`
    case 'unavailable':
      return 'The live feed is unavailable. Showing the saved project update.'
    default:
      return 'Showing the saved project update.'
  }
})
</script>

<style scoped>
.project-feed {
  display: flex;
  width: 100%;
  height: 100%;
  min-width: 0;
  min-height: 0;
  flex-direction: column;
  overflow: hidden;
  padding: 31px;
  border: 1px solid var(--border);
  border-radius: 12px;
  background: var(--paper);
  color: var(--ink);
}

.project-feed__header {
  display: flex;
  min-height: 16px;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
}

.project-feed__header h2,
.project-feed__header a,
.project-feed__meta {
  margin: 0;
  font-family: var(--font-mono);
  text-transform: uppercase;
}

.project-feed__header h2 {
  color: var(--teal-dark);
  font-size: 9px;
  font-weight: 700;
  line-height: 14px;
  letter-spacing: .035em;
}

.project-feed__header a,
.project-feed__meta a {
  color: var(--teal-dark);
  text-decoration: underline;
  text-underline-offset: 3px;
}

.project-feed__header a {
  display: inline-flex;
  min-height: 44px;
  flex: 0 0 auto;
  align-items: center;
  gap: 3px;
  margin-block: -14px;
  font-size: 10px;
  font-weight: 700;
  line-height: 16px;
}

.project-feed__header a:focus-visible,
.project-feed__meta a:focus-visible,
.project-feed__image-link:focus-visible,
.project-feed__scroller:focus-visible {
  border-radius: 4px;
  outline: 2px solid var(--teal);
  outline-offset: 3px;
}

.project-feed__scroller {
  width: 100%;
  min-height: 0;
  flex: 1 1 0;
  margin-top: 32px;
  padding-right: 8px;
  overflow-y: auto;
  overscroll-behavior: contain;
  scrollbar-color: var(--teal-dark) transparent;
  scrollbar-gutter: stable;
  scrollbar-width: thin;
}

.project-feed__scroller::-webkit-scrollbar {
  width: 6px;
}

.project-feed__scroller::-webkit-scrollbar-track {
  background: transparent;
}

.project-feed__scroller::-webkit-scrollbar-thumb {
  border-radius: 3px;
  background: var(--teal-dark);
}

.project-feed__scroller::-webkit-scrollbar-thumb:hover {
  background: var(--teal);
}

.project-feed__entry {
  display: flex;
  min-width: 0;
  flex-direction: column;
  align-items: stretch;
}

.project-feed__entry + .project-feed__entry {
  margin-top: 28px;
  padding-top: 28px;
  border-top: 1px solid var(--border);
}

.project-feed__notice {
  display: flex;
  min-height: 44px;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-top: 16px;
  padding: 8px 10px;
  border: 1px solid var(--border);
  background: var(--paper-deep);
}

.project-feed__notice p,
.project-feed__notice button {
  margin: 0;
  color: var(--muted-foreground);
  font: 700 9px/14px var(--font-mono);
}

.project-feed__notice button {
  min-height: 44px;
  margin-block: -8px;
  color: var(--teal-dark);
  cursor: pointer;
  text-decoration: underline;
  text-underline-offset: 3px;
}

.project-feed__notice button:focus-visible {
  outline: 2px solid var(--teal);
  outline-offset: 2px;
}

.project-feed__meta {
  align-self: flex-end;
  color: var(--muted-foreground);
  font-size: 9px;
  line-height: 14px;
  text-align: right;
}

.project-feed__meta a {
  position: relative;
  font-weight: 500;
}

.project-feed__meta a::after {
  position: absolute;
  inset: -15px -8px;
  content: '';
}

.project-feed__entry h3 {
  margin: 14px 0 0;
  font-family: var(--font-newsreader);
  font-size: 22px;
  font-variation-settings: "wght" 500;
  font-weight: 500;
  line-height: 27px;
  letter-spacing: -.01em;
}

.project-feed__body {
  margin: 9px 0 0;
  color: var(--muted-foreground);
  font-size: 14px;
  line-height: 20px;
  white-space: pre-line;
}

.project-feed__image-link {
  display: block;
  width: 100%;
  margin-top: 20px;
  overflow: hidden;
  border-radius: 8px;
  background: var(--paper-deep);
}

.project-feed__image-link img {
  display: block;
  width: 100%;
  height: auto;
  object-fit: cover;
}

@media (max-width: 720px) {
  .project-feed {
    min-height: 0;
    overflow: visible;
    padding: 23px;
    border-radius: 10px;
  }

  .project-feed__scroller {
    max-height: 42vh;
    flex: 0 1 auto;
    min-height: 100px;
    margin-top: 28px;
  }

  .project-feed__meta {
    align-self: flex-start;
    text-align: left;
  }

  .project-feed__image-link {
    width: min(100%, 420px);
  }
}
</style>

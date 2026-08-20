<template>
  <Dialog v-model:open="isOpen">
    <DialogTrigger as-child>
      <button type="button" class="inline-dialog-trigger">SHARE ↗</button>
    </DialogTrigger>

    <DialogContent>
      <DialogHeader class="dialog-intro">
        <p class="dialog-eyebrow"><span /> PROJECT</p>
        <DialogTitle>Share this loan</DialogTitle>
        <DialogDescription>
          Send the Bordel mortgage page or copy its canonical link.
        </DialogDescription>
      </DialogHeader>

      <section class="share-options" aria-labelledby="share-via-title">
        <h3 id="share-via-title">SHARE VIA</h3>
        <div class="share-options__grid">
          <a
            v-for="button in socialButtons"
            :key="button.name"
            :href="button.link.value"
            target="_blank"
            rel="noopener noreferrer"
          >
            <img :src="button.icon" :alt="button.name">
            <span>{{ button.name }}</span>
            <span aria-hidden="true">↗</span>
          </a>
        </div>
      </section>

      <section class="copy-link" aria-labelledby="copy-link-title">
        <h3 id="copy-link-title">COPY LINK</h3>
        <div>
          <span :title="linkToThisPage">{{ linkToThisPage }}</span>
          <Button variant="outline" @click="copyLink">{{ buttonText }}</Button>
        </div>
      </section>

      <DialogClose as-child>
        <Button class="dialog-primary">
          <span>DONE</span>
          <span aria-hidden="true">→</span>
        </Button>
      </DialogClose>
    </DialogContent>
  </Dialog>
</template>

<script setup lang="ts">
import { useBrowserLocation, useClipboard } from '@vueuse/core'

const browserLocation = useBrowserLocation()
const isOpen = ref(false)
const linkToThisPage = computed(() => browserLocation.value.href ?? '')
const encodedLink = computed(() => encodeURIComponent(linkToThisPage.value))
const message = 'Explore the Bordel community mortgage on OWN.'
const encodedMessage = encodeURIComponent(message)

const socialButtons = [
  {
    name: 'X',
    icon: '/icons/twitter.svg',
    link: computed(() => `https://x.com/intent/tweet?text=${encodedMessage}&url=${encodedLink.value}`),
  },
  {
    name: 'Telegram',
    icon: '/icons/telegram.svg',
    link: computed(() => `https://t.me/share/url?text=${encodedMessage}&url=${encodedLink.value}`),
  },
  {
    name: 'Farcaster',
    icon: '/icons/warpcaster.svg',
    link: computed(() => `https://warpcast.com/~/compose?text=${encodedMessage}%20${encodedLink.value}`),
  },
]

const { copy, copied } = useClipboard({
  source: linkToThisPage,
  copiedDuring: 2_000,
})
const buttonText = computed(() => copied.value ? 'COPIED' : 'COPY')

function copyLink() {
  void copy(linkToThisPage.value)
}
</script>

<style scoped>
.inline-dialog-trigger {
  display: inline-flex;
  min-height: 44px;
  align-items: center;
  margin-block: -15px;
  border: 0;
  background: transparent;
  color: var(--teal-dark);
  cursor: pointer;
  font: 700 9px/14px var(--font-mono);
  text-decoration: underline;
  text-underline-offset: 3px;
}

.inline-dialog-trigger:focus-visible {
  border-radius: 3px;
  outline: 2px solid var(--teal);
  outline-offset: 3px;
}

.dialog-intro {
  display: grid;
  gap: 12px;
  padding-top: 8px;
}

.dialog-eyebrow,
.share-options h3,
.copy-link h3 {
  margin: 0;
  font: 700 10px/14px var(--font-mono);
  letter-spacing: .08em;
}

.dialog-eyebrow {
  display: flex;
  align-items: center;
  gap: 9px;
  color: var(--teal-dark);
}

.dialog-eyebrow span {
  width: 8px;
  height: 8px;
  border-radius: 999px;
  background: var(--teal-bright);
}

.share-options,
.copy-link {
  display: grid;
  gap: 12px;
}

.share-options__grid {
  display: grid;
  gap: 8px;
}

.share-options__grid a {
  display: grid;
  min-height: 56px;
  grid-template-columns: 22px 1fr auto;
  align-items: center;
  gap: 12px;
  padding: 0 16px;
  border: 1px solid var(--rule);
  border-radius: 8px;
  background: var(--paper-deep);
  color: var(--ink);
  font-weight: 600;
  text-decoration: none;
}

.share-options__grid img {
  width: 18px;
  height: 18px;
}

.copy-link > div {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 8px;
}

.copy-link > div > span {
  min-width: 0;
  overflow: hidden;
  padding: 13px 14px;
  border: 1px solid var(--rule);
  border-radius: 8px;
  background: var(--paper-deep);
  color: var(--muted-ink);
  font: 400 11px/18px var(--font-mono);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.dialog-primary {
  min-height: 56px;
  justify-content: space-between;
  padding-inline: 18px;
  font-size: 13px;
}
</style>

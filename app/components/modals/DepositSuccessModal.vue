<template>
  <Dialog v-model:open="isOpen">
    <DialogContent>
      <DialogHeader class="dialog-intro">
        <p class="dialog-eyebrow"><span /> TRANSACTION CONFIRMED</p>
        <DialogTitle>Capital committed.</DialogTitle>
        <DialogDescription>
          Your position is recorded onchain. The loan view will update as the transaction is indexed.
        </DialogDescription>
      </DialogHeader>

      <section class="confirmation-block">
        <span>POSITION</span>
        <strong>FUNDED</strong>
        <p>Capital remains non-custodial and follows the proposal terms.</p>
      </section>

      <Button as-child class="dialog-primary">
        <a
          href="https://preview.mailerlite.io/forms/1856832/168246520956585532/share"
          target="_blank"
          rel="noopener noreferrer"
        >
          <span>GET PROJECT UPDATES</span>
          <span aria-hidden="true">→</span>
        </a>
      </Button>

      <section class="confirmation-share">
        <h3>SHARE YOUR COMMITMENT</h3>
        <div>
          <a
            v-for="button in socialButtons"
            :key="button.name"
            :href="button.link.value"
            target="_blank"
            rel="noopener noreferrer"
          >
            {{ button.name }} ↗
          </a>
        </div>
      </section>

      <p class="dialog-contact">
        QUESTIONS · <a href="mailto:info@bordel.wtf">INFO@BORDEL.WTF ↗</a>
      </p>
    </DialogContent>
  </Dialog>
</template>

<script setup lang="ts">
import { useBrowserLocation } from '@vueuse/core'

const isOpen = ref(false)
const browserLocation = useBrowserLocation()
const linkToThisPage = computed(() => browserLocation.value.href ?? '')
const encodedLink = computed(() => encodeURIComponent(linkToThisPage.value))
const message = encodeURIComponent('I committed capital to the Bordel community mortgage on OWN.')

const socialButtons = [
  {
    name: 'X',
    link: computed(() => `https://x.com/intent/tweet?text=${message}&url=${encodedLink.value}`),
  },
  {
    name: 'Telegram',
    link: computed(() => `https://t.me/share/url?text=${message}&url=${encodedLink.value}`),
  },
  {
    name: 'Farcaster',
    link: computed(() => `https://warpcast.com/~/compose?text=${message}%20${encodedLink.value}`),
  },
]

function openModal() {
  isOpen.value = true
}

defineExpose({ openModal })
</script>

<style scoped>
.dialog-intro {
  display: grid;
  gap: 12px;
  padding-top: 8px;
}

.dialog-eyebrow,
.confirmation-block > span,
.confirmation-share h3,
.dialog-contact {
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

.confirmation-block {
  padding: 18px;
  border: 1px solid var(--rule);
  border-radius: 8px;
  background: var(--paper-deep);
}

.confirmation-block > span {
  color: var(--muted-ink);
}

.confirmation-block strong {
  display: block;
  margin-top: 8px;
  color: var(--teal);
  font: 600 36px/42px var(--font-geist);
}

.confirmation-block p {
  margin: 8px 0 0;
  color: var(--muted-ink);
  font-size: 13px;
  line-height: 20px;
}

.dialog-primary {
  min-height: 56px;
  justify-content: space-between;
  padding-inline: 18px;
  font-size: 13px;
}

.confirmation-share {
  display: grid;
  gap: 10px;
}

.confirmation-share > div {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
}

.confirmation-share a,
.dialog-contact a {
  color: var(--teal-dark);
  font: 700 10px/16px var(--font-mono);
  text-decoration: underline;
  text-underline-offset: 3px;
}

.dialog-contact {
  color: var(--muted-ink);
  font-size: 9px;
}
</style>

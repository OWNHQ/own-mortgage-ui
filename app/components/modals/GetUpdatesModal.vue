<template>
  <Dialog v-model:open="isOpen">
    <DialogTrigger v-if="displayOpenButton" as-child>
      <button type="button" class="inline-dialog-trigger">GET UPDATES ↗</button>
    </DialogTrigger>

    <DialogContent>
      <DialogHeader class="dialog-intro">
        <p class="dialog-eyebrow"><span /> PROJECT FEED</p>
        <DialogTitle>Stay close to the project.</DialogTitle>
        <DialogDescription>
          Get borrower updates, repayment milestones, and important changes by email.
        </DialogDescription>
      </DialogHeader>

      <section class="updates-summary">
        <h3>WHAT YOU'LL RECEIVE</h3>
        <ul>
          <li>Project and property updates</li>
          <li>Material loan events</li>
          <li>Perk and community notices</li>
        </ul>
      </section>

      <Button as-child class="dialog-primary">
        <a
          href="https://preview.mailerlite.io/forms/1856832/168246520956585532/share"
          target="_blank"
          rel="noopener noreferrer"
        >
          <span>SIGN UP FOR EMAIL UPDATES</span>
          <span aria-hidden="true">→</span>
        </a>
      </Button>

      <p class="dialog-contact">
        QUESTIONS · <a href="mailto:info@bordel.wtf">INFO@BORDEL.WTF ↗</a>
      </p>
    </DialogContent>
  </Dialog>
</template>

<script setup lang="ts">
interface Props {
  displayOpenButton?: boolean
}

withDefaults(defineProps<Props>(), {
  displayOpenButton: true,
})

const isOpen = ref(false)

function openModal() {
  isOpen.value = true
}

defineExpose({ openModal })
</script>

<style scoped>
.inline-dialog-trigger {
  display: inline-flex;
  min-height: 44px;
  align-items: center;
  margin-block: -14px;
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
.updates-summary h3,
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

.updates-summary {
  padding: 18px;
  border: 1px solid var(--rule);
  border-radius: 8px;
  background: var(--paper-deep);
}

.updates-summary ul {
  display: grid;
  gap: 8px;
  margin: 12px 0 0;
  padding: 0;
  list-style: none;
}

.updates-summary li {
  color: var(--muted-ink);
  font-size: 14px;
  line-height: 20px;
}

.updates-summary li::before {
  color: var(--teal);
  content: "· ";
}

.dialog-primary {
  min-height: 56px;
  justify-content: space-between;
  padding-inline: 18px;
  font-size: 13px;
}

.dialog-contact {
  color: var(--muted-ink);
  font-size: 9px;
}

.dialog-contact a {
  color: var(--teal-dark);
  text-decoration: underline;
  text-underline-offset: 3px;
}
</style>

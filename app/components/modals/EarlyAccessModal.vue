<template>
  <Dialog v-model:open="isOpen">
    <span v-if="displayOpenButton" class="footer-dialog-cta">
      <DialogTrigger as-child>
        <button
          type="button"
          class="footer-dialog-trigger"
          aria-describedby="owngage-definition"
        >
          Get your own Owngage <span aria-hidden="true">↗</span>
        </button>
      </DialogTrigger>
      <span id="owngage-definition" class="footer-dialog-tooltip" role="tooltip">
        Owngage: a long-term, fixed-rate installment DeFi loan.
      </span>
    </span>

    <DialogContent>
      <DialogHeader class="dialog-intro">
        <p class="dialog-eyebrow"><span /> BORROWER</p>
        <DialogTitle>Start a mortgage conversation.</DialogTitle>
        <DialogDescription>
          Tell us how to reach you and what you want to finance. We will follow up with the relevant next step.
        </DialogDescription>
      </DialogHeader>

      <form class="early-access-form" @submit.prevent="handleSubmit">
        <label>
          <span>PREFERRED COMMUNICATION CHANNEL</span>
          <input
            v-model="formData.commsChannel"
            type="text"
            required
            autocomplete="off"
            placeholder="Email, Telegram, Signal…"
          >
        </label>

        <label>
          <span>PROJECT DESCRIPTION</span>
          <textarea
            v-model="formData.projectDescription"
            required
            rows="5"
            placeholder="Property, project, financing need, and timing."
          ></textarea>
        </label>

        <Button type="submit" class="dialog-primary" :disabled="isSubmitting">
          <span>{{ isSubmitting ? 'SUBMITTING…' : 'SUBMIT APPLICATION' }}</span>
          <span aria-hidden="true">→</span>
        </Button>

        <p
          v-if="submitMessage"
          class="submission-message"
          :class="submitSuccess ? 'is-success' : 'is-error'"
          role="status"
        >
          {{ submitMessage }}
        </p>
      </form>
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
const isSubmitting = ref(false)
const submitMessage = ref('')
const submitSuccess = ref(false)
const formData = ref({
  commsChannel: '',
  projectDescription: '',
})

const GOOGLE_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbw03rLMfrOQSbX2MkRrpFHxTHM6qWjOkgTUZON7qv9qii-coSHXHmDW-vKu5NxZzgPVpA/exec'

async function handleSubmit() {
  isSubmitting.value = true
  submitMessage.value = ''

  try {
    await fetch(GOOGLE_SCRIPT_URL, {
      method: 'POST',
      mode: 'no-cors',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        commsChannel: formData.value.commsChannel,
        projectDescription: formData.value.projectDescription,
        timestamp: new Date().toISOString(),
      }),
    })

    submitMessage.value = 'Application sent. We will follow up shortly.'
    submitSuccess.value = true
    formData.value.commsChannel = ''
    formData.value.projectDescription = ''

    setTimeout(() => {
      isOpen.value = false
      submitMessage.value = ''
    }, 2_000)
  }
  catch (error) {
    console.error('Submission error:', error)
    submitMessage.value = 'Submission failed. Please try again.'
    submitSuccess.value = false
  }
  finally {
    isSubmitting.value = false
  }
}

function openModal() {
  isOpen.value = true
}

defineExpose({ openModal })
</script>

<style scoped>
.footer-dialog-cta {
  position: relative;
  display: inline-flex;
}

.footer-dialog-trigger {
  min-height: 40px;
  border: 0;
  background: transparent;
  color: var(--teal-dark);
  cursor: pointer;
  font: 700 10px/14px var(--font-mono);
  text-decoration: underline;
  text-underline-offset: 3px;
}

.footer-dialog-trigger:focus-visible {
  border-radius: 3px;
  outline: 2px solid var(--teal);
  outline-offset: 2px;
}

.footer-dialog-tooltip {
  position: absolute;
  z-index: 10;
  bottom: calc(100% + 8px);
  left: 0;
  width: max-content;
  max-width: min(300px, calc(100vw - 32px));
  padding: 8px 10px;
  border: 1px solid var(--ink);
  border-radius: 7px;
  background: var(--paper);
  box-shadow: 0 8px 24px rgb(23 26 25 / 14%);
  color: var(--ink);
  font: 600 10px/15px var(--font-mono);
  opacity: 0;
  pointer-events: none;
  transform: translateY(4px);
  transition:
    opacity 120ms ease,
    transform 120ms ease,
    visibility 120ms ease;
  visibility: hidden;
}

.footer-dialog-cta:hover .footer-dialog-tooltip,
.footer-dialog-cta:focus-within .footer-dialog-tooltip {
  opacity: 1;
  transform: translateY(0);
  visibility: visible;
}

.dialog-intro {
  display: grid;
  gap: 12px;
  padding-top: 8px;
}

.dialog-eyebrow,
.early-access-form label > span {
  font: 700 10px/14px var(--font-mono);
  letter-spacing: .08em;
}

.dialog-eyebrow {
  display: flex;
  align-items: center;
  gap: 9px;
  margin: 0;
  color: var(--teal-dark);
}

.dialog-eyebrow span {
  width: 8px;
  height: 8px;
  border-radius: 999px;
  background: var(--teal-bright);
}

.early-access-form {
  display: grid;
  gap: 18px;
}

.early-access-form label {
  display: grid;
  gap: 9px;
}

.early-access-form input,
.early-access-form textarea {
  width: 100%;
  border: 1px solid var(--rule);
  border-radius: 8px;
  background: var(--paper-deep);
  color: var(--ink);
  outline: none;
}

.early-access-form input {
  height: 56px;
  padding-inline: 16px;
}

.early-access-form textarea {
  min-height: 144px;
  padding: 14px 16px;
  resize: vertical;
}

.early-access-form input:focus-visible,
.early-access-form textarea:focus-visible {
  border-color: var(--teal);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--teal) 20%, transparent);
}

.dialog-primary {
  min-height: 56px;
  justify-content: space-between;
  padding-inline: 18px;
  font-size: 13px;
}

.submission-message {
  margin: 0;
  font: 600 12px/18px var(--font-mono);
}

.submission-message.is-success {
  color: var(--teal-dark);
}

.submission-message.is-error {
  color: var(--danger-ink);
}
</style>

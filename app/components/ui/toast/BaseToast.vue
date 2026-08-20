<template>
    <div
      v-if="toast"
      :class="[
        'transaction-toast flex h-full flex-col p-5 opacity-100 transition-opacity duration-[1400ms]',
        { 'opacity-0': startFadeOut }
      ]"
      @mouseenter="isHovering = true"
      @mouseleave="isHovering = false">
      <div class="transaction-toast__header flex min-h-16 items-center justify-between border-b pb-4">
        <div class="flex items-center gap-4">
          <div class="relative mr-2">
            <img
              height="40"
              width="40"
              :src="CREDIT_ASSET_ICON"/>
            <img
              :src="COLLATERAL_ASSET_ICON"
              height="40"
              width="40"
              class="absolute top-4 left-4"/>
          </div>
          <div class="transaction-toast__title">
            {{ toast.title }}
          </div>
        </div>
        <button
          v-if="isCloseable"
          type="button"
          class="transaction-toast__close"
          aria-label="Dismiss notification"
          @click="handleCloseToast">
          <svg viewBox="0 0 12 12" aria-hidden="true">
            <path d="M1 11 11 1M1 1l10 10" />
          </svg>
        </button>
      </div>
      <div class="flex max-h-[180px] flex-col overflow-auto py-4 scroll-smooth">
        <div
          v-for="(step, index) in toast.steps"
          :key="step.text">
          <BaseToastStep
            :toast="toast"
            :step="step"
            :step-index="index"/>
          <img
            v-if="index !== toast.steps.length - 1"
            src="/icons/line-separator.svg"
            class="mt-2 mb-2 ml-2"/>
        </div>
        <div
          v-if="isRunningLong"
          class="text-xs w-3/4 text-[var(--warning)] mt-8">
          The action you're trying to perform is taking longer than expected. You can safely close this message.
        </div>
      </div>
      <div class="mb-2">
        <component
          :is="toastsStore.customBottomComponent"
          v-if="toastsStore.customBottomComponent"/>
      </div>
      <div
        v-if="!toast.hideFooter"
        class="mt-auto flex justify-between items-center">
        <div class="text-[0.625rem]">
          {{ toast.created }}
        </div>
        <ChainInfo
          v-if="toast.chainId"
          class="text-xs"
          :chain-id="toast.chainId"/>
      </div>
    </div>
  </template>
  
<script setup lang="ts">
import { computed, ref, toRefs, watchEffect } from 'vue'
import ChainInfo from '~/components/ChainInfo.vue'
import BaseToastStep from '~/components/ui/toast/BaseToastStep.vue'
import { useToastsStore, ToastStepStatus } from '~/components/ui/toast/useToastsStore'
import type { ToastActionId } from '~/components/ui/toast/useToastsStore'
import { COLLATERAL_ASSET_ICON, CREDIT_ASSET_ICON } from '~/constants/proposalConstants'
import type { IntervalId } from '~/typing/customTypes'

interface Props {
  toastId: ToastActionId
}
const props = defineProps<Props>()
const { toastId } = toRefs(props)

const emit = defineEmits<{(e: 'close-toast'): void}>()

const toastsStore = useToastsStore()
const toast = computed(() => toastsStore.displayedToasts.find(toast => toast.id === toastId.value))

const startFadeOutInterval = ref<IntervalId>()
const dismissInterval = ref<IntervalId>()

const isHovering = ref(false)

const startFadeOut = ref()

const handleCloseToast = () => {
  emit('close-toast')
  toastsStore.customBottomComponent = undefined
}

watchEffect(() => {
  if (isHovering.value) {
    startFadeOut.value = false
    clearInterval(startFadeOutInterval.value)
    startFadeOutInterval.value = undefined
    clearInterval(dismissInterval.value)
    dismissInterval.value = undefined
    return
  }

  if (toast.value?.steps.every(step => step.status === ToastStepStatus.SUCCESS) && startFadeOutInterval.value === undefined) {
    startFadeOutInterval.value = setInterval(() => {
      startFadeOut.value = true
      dismissInterval.value = setInterval(() => {
        handleCloseToast()
      }, 1400)
    }, 5200)
  }
})

// @ts-expect-error FIXME: strictNullChecks
const isError = computed(() => toast.value.steps.some(step => step.status === ToastStepStatus.ERROR))
// @ts-expect-error FIXME: strictNullChecks
const isAllStepsCompleted = computed(() => toast.value.steps.every(step => step.status === ToastStepStatus.SUCCESS))

const isRunningLong = computed(() => {
  // @ts-expect-error FIXME: strictNullChecks
  const pendingStep = toast.value.steps.find(step => step.status === ToastStepStatus.PENDING)
  return pendingStep?.isRunningLong
})

// TODO how to handle closable? do we need to set the toast._toastOptions?
const isCloseable = computed(() => isError.value || isRunningLong.value || isAllStepsCompleted.value || toast.value?.isAlwaysClosable)
</script>

<style>
/* reset component wrap styles */
.Vue-Toastification__container.bottom-right {
  bottom: 50px !important;
  right: 50px !important;

  @media (max-width: 600px) {
    bottom: 80px !important;
    right: 0 !important;
    margin: auto;
  }
}

.Vue-Toastification__container {
  padding: 0 !important;
  width: 457px !important;

  @media (max-width: 600px) {
    width: 340px !important;
    bottom: 0 !important;
    right: 0 !important;
  }
}

.Vue-Toastification__toast {
  max-width: 100% !important;
  min-height: 126px !important;
  margin: 60px 0 0 !important;
  padding: 0 !important;
  background-color: transparent !important;
  border-radius: 24px !important;
  overflow: visible !important;

  &:not(:first-child) {
    /* to prevent double borders with multiple notifications stacking on top of each other */
    box-shadow: 0 2px var(--background);
  }

  @media (max-width: 600px) {
    margin-top: 1rem !important;
  }
}

.Vue-Toastification__toast-component-body {
  width: 100%;
  overflow: hidden;
  border: 1px solid var(--rule);
  border-radius: 24px;
  box-shadow: 0 20px 40px rgb(0 0 0 / 28%);
}

.transaction-toast {
  border-radius: 24px;
  background: var(--paper);
  color: var(--ink);
  font-family: var(--font-geist);
}

.transaction-toast__header {
  border-color: var(--rule);
}

.transaction-toast__title {
  font-family: var(--font-newsreader);
  font-size: 24px;
  font-weight: 500;
  line-height: 30px;
}

.transaction-toast__close {
  display: inline-flex;
  width: 44px;
  height: 44px;
  flex: 0 0 auto;
  align-items: center;
  justify-content: center;
  margin-right: -8px;
  border: 0;
  border-radius: 6px;
  background: transparent;
  color: var(--ink);
  cursor: pointer;
}

.transaction-toast__close svg {
  width: 20px;
  height: 20px;
  fill: none;
  stroke: currentcolor;
  stroke-linecap: round;
  stroke-width: 1.5;
}

.transaction-toast__close:hover {
  background: var(--paper-deep);
  color: var(--teal-dark);
}

.transaction-toast__close:focus-visible {
  outline: 2px solid var(--teal);
  outline-offset: 2px;
}

.Vue-Toastification__close-button {
  position: absolute;
  right: 14px;
  top: 14px;
  opacity: 1 !important;
  box-sizing: content-box;

  &:hover {
    opacity: 0.3 !important;
  }
}

@keyframes fade-in {
  from {
    opacity: 0;
  }

  to {
    opacity: 1;
  }
}

@keyframes fade-out {
  from {
    opacity: 1;
  }

  to {
    opacity: 0;
  }
}

.fade-enter-active {
  animation-name: fade-in;
  animation-duration: 750ms;
  animation-fill-mode: both;
}

.fade-leave-active {
  animation-name: fade-out;
  animation-duration: 750ms;
  animation-fill-mode: both;
}

.fade-move {
  transition-timing-function: ease-in-out;
  transition-property: all;
  transition-duration: 400ms;
}

</style>

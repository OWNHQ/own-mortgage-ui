<script setup lang="ts">
import type { DialogContentEmits, DialogContentProps } from 'reka-ui'
import type { HTMLAttributes } from 'vue'
import { reactiveOmit } from '@vueuse/core'
import {
  DialogClose,
  DialogContent,
  DialogPortal,
  useForwardPropsEmits,
} from 'reka-ui'
import { cn } from '@/lib/utils'
import DialogOverlay from './DialogOverlay.vue'

const props = defineProps<DialogContentProps & { class?: HTMLAttributes['class'] }>()
const emits = defineEmits<DialogContentEmits>()
const delegatedProps = reactiveOmit(props, 'class')
const forwarded = useForwardPropsEmits(delegatedProps, emits)
</script>

<template>
  <DialogPortal>
    <DialogOverlay />
    <DialogContent
      data-slot="dialog-content"
      v-bind="forwarded"
      :class="cn(
        'bg-card text-card-foreground data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 fixed top-1/2 right-4 z-50 grid max-h-[calc(100vh-2rem)] w-[440px] max-w-[calc(100%-2rem)] -translate-y-1/2 gap-6 overflow-y-auto rounded-[24px] border border-border p-8 shadow-[0_16px_40px_-8px_rgba(0,0,0,0.18)] duration-200 sm:right-8 sm:p-8',
        props.class,
      )"
    >
      <slot />

      <DialogClose
        class="absolute top-8 right-8 min-h-11 cursor-pointer border-0 bg-transparent p-0 text-[11px] font-medium text-muted-foreground transition-colors hover:text-foreground focus-visible:rounded-sm focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-offset-4 disabled:pointer-events-none"
      >
        CLOSE
        <span class="sr-only">Close dialog</span>
      </DialogClose>
    </DialogContent>
  </DialogPortal>
</template>

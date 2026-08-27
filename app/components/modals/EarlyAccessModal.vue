<template>
  <Dialog v-model:open="isOpen">
    <DialogTrigger v-if="props.displayOpenButton" as-child>
      <Button variant="default" class="font-semibold">
        Get your OWN mortgage!
      </Button>
    </DialogTrigger>
    <DialogContent class="max-w-2xl max-h-[90vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle class="mb-6">Early Access Registration</DialogTitle>
        <DialogDescription>
          <div class="flex flex-col max-w-full">
            <p class="text-base text-white mb-4">
              Interested in getting a DeFi mortgage for your project? <br />
              Fill out the form and we'll reach out to discuss how to do this!
            </p>
          </div>
        </DialogDescription>
      </DialogHeader>

      <form class="space-y-4" @submit.prevent="handleSubmit">
        <div class="space-y-2">
          <label for="commsChannel" class="text-base font-medium mb-3 block text-white">Preferred communication channel:</label>
          <input 
            id="commsChannel" 
            v-model="formData.commsChannel"
            type="text" 
            required 
            autocomplete="off"
            :maxlength="INBOUND_CONTACT_MAX_LENGTH"
            placeholder="Email, Telegram, Signal, etc."
            class="w-full px-3 py-2 border rounded-md bg-background"
          >
        </div>

        <div class="space-y-2">
          <label for="projectDescription" class="text-base font-medium mb-3 block text-white">
            Describe the project you'd like to get mortgage financing for:
          </label>
          <textarea 
            id="projectDescription" 
            v-model="formData.projectDescription"
            required
            :maxlength="INBOUND_MESSAGE_MAX_LENGTH"
            rows="6"
            placeholder="Tell us about your project..."
            class="w-full px-3 py-2 border rounded-md bg-background resize-y"
          ></textarea>
        </div>

        <div class="form-honeypot" aria-hidden="true">
          <label for="early-access-company-fax">Company fax</label>
          <input
            id="early-access-company-fax"
            v-model="formData.gotcha"
            type="text"
            name="companyFax"
            autocomplete="off"
            tabindex="-1"
          >
        </div>

        <Button type="submit" class="w-full" :disabled="isSubmitting">
          {{ isSubmitting ? 'Submitting...' : 'Submit Application' }}
        </Button>

        <p v-if="submitMessage" class="text-sm text-center" :class="submitSuccess ? 'text-green-400' : 'text-red-400'">
          {{ submitMessage }}
        </p>
      </form>
    </DialogContent>
  </Dialog>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import {
  INBOUND_CONTACT_MAX_LENGTH,
  INBOUND_MESSAGE_MAX_LENGTH,
  buildBorrowerSubmission,
} from '~/utils/inboundSubmission'

interface Props {
    displayOpenButton?: boolean
}
const props = withDefaults(defineProps<Props>(), {
    displayOpenButton: true
})

const isOpen = ref(false)
const isSubmitting = ref(false)
const submitMessage = ref('')
const submitSuccess = ref(false)
const runtimeConfig = useRuntimeConfig()

const formData = ref({
  commsChannel: '',
  projectDescription: '',
  gotcha: '',
})

const handleSubmit = async () => {
  isSubmitting.value = true
  submitMessage.value = ''
  
  try {
    await $fetch(runtimeConfig.public.inboundGatewayUrl, {
      method: 'POST',
      body: buildBorrowerSubmission({
        ...formData.value,
        pageSource: window.location.href,
      }),
    })
    
    submitMessage.value = 'Application submitted successfully!'
    submitSuccess.value = true
    
    // Reset form
    formData.value.commsChannel = ''
    formData.value.projectDescription = ''
    formData.value.gotcha = ''
    
    // Close modal after 2 seconds
    setTimeout(() => {
      isOpen.value = false
      submitMessage.value = ''
    }, 2000)
  } catch (error) {
    console.error('Submission error:', error)
    submitMessage.value = 'Failed to submit. Please try again.'
    submitSuccess.value = false
  } finally {
    isSubmitting.value = false
  }
}

// Expose method to open modal programmatically
const openModal = () => {
    isOpen.value = true
}

defineExpose({
    openModal
})
</script>

<style scoped>
.form-honeypot {
  position: absolute;
  left: -10000px;
  width: 1px;
  height: 1px;
  overflow: hidden;
}
</style>

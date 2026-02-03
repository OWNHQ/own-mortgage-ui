<template>
  <div class="bg-card border rounded-xl p-4 sm:p-6 order-4 lg:order-none shadow-lg">
    <div class="mb-4">
      <h3 class="font-heading text-lg sm:text-xl mb-4">Latest Updates</h3>
    </div>
    <hr class="mb-4">
    <ClientOnly>
      <div class="feed-wrapper overflow-y-auto rounded-lg custom-scrollbar">
        <bsky-embed
          :username="username"
          mode="dark"
          :limit="limit"
          link-target="_blank"
        />
      </div>
      <template #fallback>
        <div class="text-gray-400 text-sm py-8 text-center">Loading feed...</div>
      </template>
    </ClientOnly>
  </div>
</template>

<script setup lang="ts">
interface Props {
  username?: string
  limit?: string
}

const props = withDefaults(defineProps<Props>(), {
  username: 'bordelwtf.bsky.social',
  limit: '10'
})

const { username, limit } = toRefs(props)

// Load bsky-embed script
onMounted(() => {
  if (!document.getElementById('bsky-embed-script')) {
    const script = document.createElement('script')
    script.id = 'bsky-embed-script'
    script.type = 'module'
    script.src = 'https://cdn.jsdelivr.net/npm/bsky-embed/dist/bsky-embed.es.js'
    script.async = true
    document.head.appendChild(script)
  }
})
</script>

<style scoped>
.feed-wrapper {
  width: 100%;
  min-height: 100px;
  max-height: 42vh;
}

.custom-scrollbar::-webkit-scrollbar {
  width: 6px;
}

.custom-scrollbar::-webkit-scrollbar-track {
  background: transparent;
}

.custom-scrollbar::-webkit-scrollbar-thumb {
  background: #374151;
  border-radius: 3px;
}

.custom-scrollbar::-webkit-scrollbar-thumb:hover {
  background: #4b5563;
}

/* Firefox */
.custom-scrollbar {
  scrollbar-width: thin;
  scrollbar-color: #374151 transparent;
}
</style>

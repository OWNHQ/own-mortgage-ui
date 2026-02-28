<template>
  <div>
      <div class="relative text-center pt-3 sm:pt-2 pb-4 md:pb-6">
          <h1 class="text-xl sm:text-2xl md:text-3xl lg:text-3xl font-beon">
              FUNDING A <span class="text-bordel-green">HACKERSPACE</span> 
          </h1>
          <h2 class="text-lg sm:text-xl md:text-2xl mt-1 md:mt-2 font-screener">FIRST EVER PURE DEFI MORTGAGE</h2>
      </div>

      <!-- Chain Info Above -->
      <div class="hidden sm:flex mb-4 justify-end -mt-12">
          <div class="p-3 border rounded-lg flex gap-2 sm:gap-5 items-center bg-background/50 w-fit">
              <span class="text-gray-300 text-sm sm:text-base">Chain:</span>
              <div>
                  <ChainInfo />
              </div>
          </div>
      </div>

      <div class="bg-card border rounded-xl p-4 sm:p-6 mb-4 shadow-lg order-0">
          <div class="flex flex-col sm:flex-row items-start sm:items-center gap-3 mb-4">
              <div class="flex-2">
                  <h3 class="text-xl sm:text-2xl font-heading mb-1">Funding Progress</h3>
                  <p class="text-gray-2 text-sm sm:text-base">Fund this this community mortgage, get 
                    <a href="#rewards-section" class="text-green-400 underline hover:text-green-300 transition-colors cursor-pointer" @click.prevent="scrollToRewards">exclusive perks</a>, a <span class="text-green-400">fixed APR of {{ MINIMAL_APR }}%</span> for 5 years and become part of onchain history.</p>
              </div>
              
              <!-- Annual Return -->
              <!-- <div class="flex-1 flex items-center justify-center w-full">
                  <div class="flex items-center gap-1 px-3 py-2 bg-gradient-to-br from-green-900/20 to-green-900/5 border border-green-600/30 rounded-lg">
                      <span class="text-2xl text-green-400">Get <a href="#rewards-section" class="underline hover:text-green-300 transition-colors cursor-pointer" @click.prevent="scrollToRewards">rewards</a> +</span>
                      <span class="text-2xl font-bold text-green-400">{{ MINIMAL_APR }}% APR</span>
                  </div>
              </div> -->
              
              <div class="flex flex-1 items-center justify-end sm:justify-end">
                  <div class="flex items-center gap-2 py-2" :class="daysRemaining < 7 ? 'px-3 bg-yellow-900/20 border border-yellow-600/30 rounded-lg' : 'px-0'">
                      <span class="text-sm font-semibold" :class="daysRemaining < 7 ? 'text-yellow-400' : 'text-gray-400'">⏱ Deadline:</span>
                      <DeadlineCountdown class="font-bold text-base sm:text-lg" :class="daysRemaining < 7 ? 'text-yellow-400' : 'text-white'" />
                  </div>
              </div>
          </div>
          <ProgressBar />
      </div>

      <div class="flex flex-col gap-4">
          <!-- Mobile: single column with ordered boxes (using contents so boxes are direct children) -->
          <!-- Desktop: two columns - DescriptionBox & TermsBox left (2/3), ContributeBox right (1/3) (PRIMARY CTA) -->
          <div class="contents lg:flex lg:flex-row lg:gap-4">
              <!-- Left column: DescriptionBox, TermsBox (SUPPORTING INFO) - 2/3 width -->
              <div class="contents lg:flex lg:flex-col lg:gap-4 lg:w-2/3">
                  <DescriptionBox />
                  <TermsBox />
              </div>
              <!-- Right column: ContributeBox, RewardsBox, XFeed (PRIMARY ACTION & INCENTIVES) - 1/3 width -->
              <div class="contents lg:flex lg:flex-col lg:gap-4 lg:w-1/3">
                  <ContributeBox />
                  <RewardsBox />
                  <XFeed />
              </div>
          </div>
      </div>
  </div>
</template>

<script setup lang="ts">
import { PROPOSAL_EXPIRATION, MINIMAL_APR } from '~/constants/proposalConstants'

// SEO metadata is handled globally in app.vue via useDomainSeoMeta()

const daysRemaining = computed(() => {
    const deadline = new Date(PROPOSAL_EXPIRATION * 1000).getTime()
    const now = new Date().getTime()
    const distance = deadline - now
    return Math.floor(distance / (1000 * 60 * 60 * 24))
})

const scrollToRewards = () => {
    const rewardsSection = document.getElementById('rewards-section')
    if (rewardsSection) {
        rewardsSection.scrollIntoView({ behavior: 'smooth', block: 'start' })
        // Update hash after smooth scroll starts
        setTimeout(() => {
            window.location.hash = 'rewards-section'
        }, 100)
    }
}
</script>

<template>
  <div class="running-loan-site">
    <LoanLifecycleWorkspace @ready="handleLoanReady">
      <template #after="{ state }">
        <div
          v-if="state !== 'under-review'"
          class="content-stage repayment-stage"
          :class="{ 'is-preparing': !isRepaymentVisible }"
          :aria-busy="!isRepaymentVisible"
        >
          <div
            class="content-stage__body"
            :class="{ 'is-preparing': !isRepaymentVisible }"
            :aria-hidden="!isRepaymentVisible || undefined"
            :inert="!isRepaymentVisible || undefined"
          >
            <RepaymentPerformanceChart
              :state="state"
              default-expanded
              @ready="handleRepaymentReady"
            />
          </div>
        </div>
      </template>

      <template #after-stage="{ state }">
        <div
          v-if="state !== 'under-review' && !isRepaymentVisible"
          class="content-stage repayment-loader-stage"
          aria-busy="true"
        >
          <HouseBlueprintLoader class="content-stage__blueprint" />
        </div>
      </template>
    </LoanLifecycleWorkspace>

    <section
      class="project-panel content-stage"
      :class="{ 'is-preparing': !isProjectVisible }"
      aria-label="Bordel project information"
      :aria-busy="!isProjectVisible"
    >
      <HouseBlueprintLoader
        v-if="!isProjectVisible"
        class="content-stage__blueprint project-panel__blueprint"
      />
      <div
        class="content-stage__body project-panel__content"
        :class="{ 'is-preparing': !isProjectVisible }"
        :aria-hidden="!isProjectVisible || undefined"
        :inert="!isProjectVisible || undefined"
      >
        <div class="project-panel__story-grid">
          <DescriptionBox />
          <ProjectFeed @ready="handleProjectFeedReady" />
        </div>
        <ProjectTeam />
        <RewardsBox />
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import ProjectFeed from '~/components/boxes/ProjectFeed.vue'
import ProjectTeam from '~/components/boxes/ProjectTeam.vue'
import HouseBlueprintLoader from '~/components/loan-lifecycle/HouseBlueprintLoader.vue'
import LoanLifecycleWorkspace from '~/components/loan-lifecycle/LoanLifecycleWorkspace.vue'
import RepaymentPerformanceChart from '~/components/loan-lifecycle/RepaymentPerformanceChart.vue'
import type { LoanLifecycleViewState } from '~/components/loan-lifecycle/types'

const isLoanReady = ref(false)
const isRepaymentReady = ref(false)
const isProjectFeedReady = ref(false)
const isRepaymentVisible = ref(false)
const isProjectVisible = ref(false)
const isRepaymentRevealQueued = ref(false)
const isProjectRevealQueued = ref(false)

function afterNextPaint(callback: () => void) {
  requestAnimationFrame(() => {
    requestAnimationFrame(callback)
  })
}

function handleLoanReady(state: LoanLifecycleViewState) {
  isLoanReady.value = true
  if (state === 'under-review') isRepaymentReady.value = true
}

function handleRepaymentReady() {
  isRepaymentReady.value = true
}

function handleProjectFeedReady() {
  isProjectFeedReady.value = true
}

watch([isLoanReady, isRepaymentReady], ([loanReady, repaymentReady]) => {
  if (!loanReady || !repaymentReady || isRepaymentVisible.value || isRepaymentRevealQueued.value) return
  isRepaymentRevealQueued.value = true
  afterNextPaint(() => {
    isRepaymentVisible.value = true
  })
})

watch([isRepaymentVisible, isProjectFeedReady], ([repaymentVisible, projectFeedReady]) => {
  if (!repaymentVisible || !projectFeedReady || isProjectVisible.value || isProjectRevealQueued.value) return
  isProjectRevealQueued.value = true
  afterNextPaint(() => {
    isProjectVisible.value = true
  })
})
</script>

<style scoped>
.running-loan-site {
  width: 100%;
}

.content-stage {
  position: relative;
  isolation: isolate;
}

.content-stage__body {
  position: relative;
  z-index: 1;
}

.content-stage__body.is-preparing {
  visibility: hidden;
}

.content-stage__blueprint {
  position: absolute;
  z-index: 0;
  top: clamp(56px, 8vw, 112px);
  left: 50%;
  transform: translateX(-50%);
}

.repayment-stage.is-preparing {
  height: 0;
  min-height: 0;
  overflow: hidden;
}

.repayment-loader-stage {
  min-height: 1040px;
}

.project-panel {
  width: 100%;
  margin-top: 24px;
  overflow: hidden;
  border: 1px solid var(--rule);
  border-radius: 12px;
  background: var(--paper);
}

.project-panel.is-preparing {
  border-color: transparent;
  border-radius: 0;
  background: transparent;
}

.project-panel__content {
  width: 100%;
}

.project-panel__blueprint {
  top: 112px;
}

.project-panel__story-grid {
  display: grid;
  grid-template-columns: minmax(0, 2.137fr) minmax(330px, 1fr);
  min-height: 1000px;
}

.project-panel :deep(.project-feed) {
  border-width: 0 0 0 1px;
  border-radius: 0;
}

.project-panel :deep(.project-team) {
  width: 100%;
}

.project-panel :deep(.commitment-benefits) {
  border-top: 1px solid var(--rule);
}

@media (max-width: 900px) {
  .project-panel__story-grid {
    grid-template-columns: minmax(0, 1fr);
    min-height: 0;
  }

  .project-panel :deep(.project-feed) {
    min-height: 760px;
    border-top-width: 1px;
    border-left-width: 0;
  }

  .project-panel :deep(.project-team) {
    width: 100%;
    border-right: 0;
  }
}

@media (max-width: 720px) {
  .repayment-loader-stage { min-height: 960px; }

  .project-panel {
    border-radius: 10px;
  }

  .project-panel :deep(.project-feed) {
    min-height: 0;
  }
}
</style>

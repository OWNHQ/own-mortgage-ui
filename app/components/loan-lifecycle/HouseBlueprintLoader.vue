<template>
  <div
    class="blueprint-loader"
    :role="announce ? 'status' : undefined"
    :aria-live="announce ? 'polite' : undefined"
  >
    <span v-if="announce" class="sr-only">Preparing verified loan information.</span>
    <p class="blueprint-loader__label" aria-hidden="true">DRAWING…</p>

    <svg
      viewBox="0 0 560 340"
      aria-hidden="true"
      focusable="false"
    >
      <g class="blueprint-loader__grid">
        <path d="M72 44H488M72 76H488M72 108H488M72 140H488M72 172H488M72 204H488M72 236H488M72 268H488M72 300H488" />
        <path d="M88 28V316M120 28V316M152 28V316M184 28V316M216 28V316M248 28V316M280 28V316M312 28V316M344 28V316M376 28V316M408 28V316M440 28V316M472 28V316" />
      </g>

      <g class="blueprint-loader__walls">
        <path class="blueprint-loader__wall-heavy" pathLength="1" style="--step: 0" d="M112 76H448V264H326V246H250V264H112Z" />
        <path pathLength="1" style="--step: 1" d="M120 84H440V256H334V238H242V256H120Z" />
        <path pathLength="1" style="--step: 2" d="M228 84V132M228 158V256" />
        <path pathLength="1" style="--step: 3" d="M120 168H182M208 168H440" />
        <path pathLength="1" style="--step: 4" d="M358 84V118M358 144V256" />
        <path pathLength="1" style="--step: 5" d="M228 216H278M306 216H440" />
        <path pathLength="1" style="--step: 6" d="M276 168V216M326 168V216" />
      </g>
      <path
        class="blueprint-loader__wall-trace"
        pathLength="1"
        d="M112 76H448V264H326V246H250V264H112ZM228 84V132M228 158V256M120 168H182M208 168H440"
      />
    </svg>
  </div>
</template>

<script setup lang="ts">
withDefaults(defineProps<{
  announce?: boolean
}>(), {
  announce: false,
})
</script>

<style scoped>
.blueprint-loader {
  width: min(92%, clamp(270px, 38vw, 480px));
  color: var(--teal-ink, var(--teal-dark, #006f6c));
  contain: layout paint;
  pointer-events: none;
}

.blueprint-loader svg {
  display: block;
  width: 100%;
  height: auto;
  overflow: visible;
}

.blueprint-loader__label {
  margin: 0 0 8px;
  color: currentColor;
  font: 700 9px/14px var(--font-mono);
  letter-spacing: .12em;
  opacity: .62;
  text-align: center;
  animation: blueprint-label-breathe 1.8s ease-in-out infinite alternate;
}

.blueprint-loader__grid,
.blueprint-loader__walls,
.blueprint-loader__wall-trace {
  fill: none;
}

.blueprint-loader__grid {
  stroke: var(--rule);
  stroke-width: .7;
  stroke-dasharray: 2 8;
  opacity: .38;
  animation: blueprint-grid-breathe 2.8s ease-in-out infinite alternate;
}

.blueprint-loader__walls {
  stroke: currentColor;
  stroke-width: 1.7;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.blueprint-loader__wall-heavy {
  stroke-width: 3.4;
}

.blueprint-loader__walls path {
  stroke-dasharray: 1;
  stroke-dashoffset: 1;
  animation: blueprint-draw 760ms cubic-bezier(.55, 0, .25, 1) calc(var(--step) * 95ms) forwards;
}

.blueprint-loader__wall-trace {
  stroke: var(--teal);
  stroke-width: 2.8;
  stroke-linecap: round;
  stroke-dasharray: .035 .965;
  stroke-dashoffset: 1;
  animation: blueprint-trace 2.6s linear 1.05s infinite;
}

@keyframes blueprint-draw {
  to { stroke-dashoffset: 0; }
}

@keyframes blueprint-grid-breathe {
  to { opacity: .55; }
}

@keyframes blueprint-label-breathe {
  to { opacity: .9; }
}

@keyframes blueprint-trace {
  to { stroke-dashoffset: 0; }
}

@media (prefers-reduced-motion: reduce) {
  .blueprint-loader * {
    animation: none !important;
  }

  .blueprint-loader__walls path {
    stroke-dashoffset: 0;
  }

  .blueprint-loader__wall-trace {
    display: none;
  }
}
</style>

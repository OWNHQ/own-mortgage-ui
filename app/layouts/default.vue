<template>
  <div class="platform-canvas">
    <div class="platform-shell">
      <TheHeader />
      <main class="platform-main">
        <slot />
      </main>
      <TheFooter />
    </div>
  </div>
</template>

<style scoped>
.platform-canvas {
  min-height: 100vh;
  background: var(--canvas);
}

.platform-shell {
  width: 100%;
  max-width: 1410px;
  min-height: 100vh;
  margin-inline: auto;
  padding: 32px 40px;
}

.platform-main {
  margin-top: 20px;
}

@media (max-width: 820px) {
  .platform-shell {
    padding: 16px;
  }

  .platform-main {
    margin-top: 16px;
  }
}
</style>

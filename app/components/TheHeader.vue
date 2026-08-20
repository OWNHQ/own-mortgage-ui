<template>
  <header class="platform-header">
    <NuxtLink to="/" class="platform-logo" aria-label="OWN loan home">
      <img src="/images/own-logo.svg" width="105" height="35" alt="OWN">
    </NuxtLink>

    <nav class="platform-navigation" aria-label="Project sections">
      <NuxtLink to="/#project-details">PROJECT STORY</NuxtLink>
      <span aria-hidden="true" />
      <NuxtLink to="/#ownership-and-lender-claim">OWNERSHIP</NuxtLink>
      <span aria-hidden="true" />
      <NuxtLink to="/#project-team">TEAM</NuxtLink>
      <span aria-hidden="true" />
      <NuxtLink to="/#rewards-section">LENDER PERKS</NuxtLink>
    </nav>

    <div class="platform-account">
      <ConferenceVoucherCta />
      <ConnectWalletBtn />
    </div>
  </header>
</template>

<style scoped>
.platform-header {
  display: grid;
  width: 100%;
  height: 56px;
  grid-template-columns: 270px minmax(0, 1fr) 270px;
  align-items: center;
  border-bottom: 1px solid var(--rule);
}

.platform-logo {
  display: inline-flex;
  width: 105px;
  height: 35px;
  align-items: center;
  background: #0b5d5f;
  -webkit-mask: url('/images/own-logo.svg') center / contain no-repeat;
  mask: url('/images/own-logo.svg') center / contain no-repeat;
}

.platform-logo img {
  display: block;
  width: 105px;
  height: 35px;
  opacity: 0;
}

.platform-navigation {
  display: flex;
  min-width: 0;
  align-items: center;
  justify-content: center;
  gap: 12px 24px;
}

.platform-navigation a {
  display: inline-flex;
  min-height: 44px;
  flex: 0 0 auto;
  align-items: center;
  color: var(--teal-ink);
  font: 500 13px/17px var(--font-mono);
  letter-spacing: .04em;
  text-decoration: underline;
  text-underline-offset: 3px;
}

.platform-navigation > span {
  width: 4px;
  height: 4px;
  flex: 0 0 auto;
  border-radius: 999px;
  background: var(--teal-ink);
}

.platform-navigation a:focus-visible {
  border-radius: 2px;
  outline: 2px solid var(--teal);
  outline-offset: 3px;
}

.platform-account {
  display: flex;
  min-width: 0;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;
}

@media (max-width: 1100px) {
  .platform-header {
    grid-template-columns: 116px minmax(0, 1fr) auto;
  }

  .platform-navigation {
    justify-content: flex-start;
    gap: 10px 14px;
    overflow-x: auto;
    scrollbar-width: none;
  }

  .platform-navigation::-webkit-scrollbar {
    display: none;
  }

  .platform-navigation a {
    font-size: 12px;
    line-height: 16px;
  }
}

@media (max-width: 620px) {
  .platform-header {
    height: auto;
    min-height: 48px;
    grid-template-columns: minmax(0, 1fr) auto;
    row-gap: 4px;
    padding-bottom: 4px;
  }

  .platform-logo,
  .platform-logo img {
    width: 72px;
    height: auto;
  }

  .platform-navigation {
    min-height: 40px;
    grid-row: 2;
    grid-column: 1 / -1;
  }
}
</style>
